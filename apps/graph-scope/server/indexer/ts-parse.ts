import { readdirSync, statSync } from "node:fs"
import path from "node:path"
import ts from "typescript"
import type {
  CodeGraph,
  EdgeKind,
  GraphEdge,
  GraphNode,
  NodeKind,
} from "../graph/types.ts"

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  ".git",
  ".cache",
  ".next",
])
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"])
const MAX_FILE_BYTES = 1_000_000

export function listSourceFiles(root: string): string[] {
  const absRoot = path.resolve(root)
  const files: string[] = []
  const walk = (dir: string) => {
    let entries: Array<{
      name: string
      isDirectory: () => boolean
      isFile: () => boolean
    }>
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        walk(full)
        continue
      }
      if (!entry.isFile()) continue
      if (entry.name.endsWith(".d.ts")) continue
      const ext = path.extname(entry.name)
      if (!SOURCE_EXTS.has(ext)) continue
      try {
        if (statSync(full).size > MAX_FILE_BYTES) continue
      } catch {
        continue
      }
      files.push(path.resolve(full))
    }
  }
  walk(absRoot)
  files.sort()
  return files
}

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  allowJs: true,
  checkJs: false,
  noEmit: true,
  strict: false,
  skipLibCheck: true,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
  types: [],
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
}

export function parseRepository(root: string): CodeGraph {
  const absRoot = path.resolve(root)
  const files = listSourceFiles(absRoot)
  const fileSet = new Set(files)
  const program = ts.createProgram({
    rootNames: files,
    options: compilerOptions,
  })
  const checker = program.getTypeChecker()
  const relOf = (fileName: string) =>
    path.relative(absRoot, path.resolve(fileName)).split(path.sep).join("/")

  const nodes = new Map<string, GraphNode>()
  const symbolToId = new Map<string, string>()
  const exportedKeys = new Set<string>()
  const edges = new Map<string, GraphEdge>()

  function localSymbol(symbol: ts.Symbol): ts.Symbol {
    if (symbol.flags & ts.SymbolFlags.Alias) {
      const aliased = checker.getAliasedSymbol(symbol)
      if (aliased && aliased !== symbol) return localSymbol(aliased)
    }
    return symbol
  }

  function symbolKey(symbol: ts.Symbol | undefined): string | undefined {
    if (!symbol) return undefined
    const resolved = localSymbol(symbol)
    const declaration = resolved.declarations?.find(
      (item) => !ts.isExportSpecifier(item) && !ts.isImportSpecifier(item),
    )
    if (!declaration) return undefined
    const source = declaration.getSourceFile()
    const fileName = path.resolve(source.fileName)
    if (!fileSet.has(fileName)) return undefined
    return `${fileName}:${declaration.getStart(source, false)}`
  }

  function hasExportModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined
    return (
      modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ?? false
    )
  }

  function isExportedNode(node: ts.Node): boolean {
    if (ts.isVariableDeclaration(node)) {
      const statement = node.parent?.parent
      return statement ? hasExportModifier(statement) : false
    }
    return hasExportModifier(node)
  }

  function rememberExport(symbol: ts.Symbol | undefined) {
    const key = symbolKey(symbol)
    if (key) exportedKeys.add(key)
  }

  function addEdge(kind: EdgeKind, source: string, target: string) {
    if (!source || !target || source === target) return
    if (!nodes.has(source) || !nodes.has(target)) return
    const id = `${kind}:${source}->${target}`
    if (edges.has(id)) return
    edges.set(id, { id, kind, source, target })
  }

  function addNode(
    kind: NodeKind,
    fileName: string,
    name: string,
    start: number,
    end: number,
    key?: string,
  ) {
    const rel = relOf(fileName)
    const base =
      kind === "file"
        ? `file:${rel}`
        : kind === "export"
          ? `export:${rel}:${name}`
          : `fn:${rel}:${name}`
    let id = base
    if (nodes.has(id)) id = `${base}:${start}`
    const node: GraphNode = {
      id,
      kind,
      label: name,
      file: rel,
      name,
      start,
      end,
    }
    nodes.set(id, node)
    if (key) symbolToId.set(key, id)
    return id
  }

  function rangeOf(node: ts.Node): { start: number; end: number } {
    if (
      ts.isVariableDeclaration(node) &&
      node.parent?.parent &&
      ts.isVariableStatement(node.parent.parent)
    ) {
      const statement = node.parent.parent
      return { start: statement.getStart(), end: statement.getEnd() }
    }
    return { start: node.getStart(), end: node.getEnd() }
  }

  function isFunctionValue(initializer: ts.Expression | undefined): boolean {
    return Boolean(
      initializer &&
        (ts.isArrowFunction(initializer) ||
          ts.isFunctionExpression(initializer)),
    )
  }

  for (const fileName of files) {
    const source = program.getSourceFile(fileName)
    if (!source) continue
    const mark = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name && isExportedNode(node)) {
        rememberExport(checker.getSymbolAtLocation(node.name))
      } else if (ts.isVariableStatement(node) && hasExportModifier(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            rememberExport(checker.getSymbolAtLocation(declaration.name))
          }
        }
      } else if (
        (ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isClassDeclaration(node)) &&
        node.name &&
        isExportedNode(node)
      ) {
        rememberExport(checker.getSymbolAtLocation(node.name))
      } else if (
        ts.isExportDeclaration(node) &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause)
      ) {
        for (const element of node.exportClause.elements) {
          rememberExport(
            checker.getSymbolAtLocation(element.propertyName ?? element.name),
          )
        }
      } else if (ts.isExportAssignment(node)) {
        rememberExport(checker.getSymbolAtLocation(node.expression))
      }
      ts.forEachChild(node, mark)
    }
    mark(source)
  }

  for (const fileName of files) {
    const source = program.getSourceFile(fileName)
    if (!source) continue
    const rel = relOf(fileName)
    addNode("file", fileName, path.posix.basename(rel), 0, source.getEnd())
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const key = symbolKey(checker.getSymbolAtLocation(node.name))
        const kind: NodeKind =
          key && exportedKeys.has(key) ? "export" : "function"
        const range = rangeOf(node)
        addNode(kind, fileName, node.name.text, range.start, range.end, key)
      } else if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        isFunctionValue(node.initializer)
      ) {
        const key = symbolKey(checker.getSymbolAtLocation(node.name))
        const kind: NodeKind =
          key && exportedKeys.has(key) ? "export" : "function"
        const range = rangeOf(node)
        addNode(kind, fileName, node.name.text, range.start, range.end, key)
      } else if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        (ts.isClassDeclaration(node) && node.name) ||
        (ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          !isFunctionValue(node.initializer))
      ) {
        const name = nameOf(node)
        if (name && isExportedNode(node)) {
          const nameNode =
            "name" in node && node.name && ts.isIdentifier(node.name)
              ? node.name
              : undefined
          const key = nameNode
            ? symbolKey(checker.getSymbolAtLocation(nameNode))
            : undefined
          const range = rangeOf(node)
          addNode("export", fileName, name, range.start, range.end, key)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }

  for (const fileName of files) {
    const source = program.getSourceFile(fileName)
    if (!source) continue
    const sourceId = `file:${relOf(fileName)}`
    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const resolved = ts.resolveModuleName(
          node.moduleSpecifier.text,
          source.fileName,
          compilerOptions,
          ts.sys,
        ).resolvedModule
        const targetFile = resolved
          ? path.resolve(resolved.resolvedFileName)
          : undefined
        if (targetFile && fileSet.has(targetFile)) {
          addEdge("import", sourceId, `file:${relOf(targetFile)}`)
          const clause = node.importClause
          if (clause?.name)
            linkImport(sourceId, checker.getSymbolAtLocation(clause.name))
          if (
            clause?.namedBindings &&
            ts.isNamedImports(clause.namedBindings)
          ) {
            for (const element of clause.namedBindings.elements) {
              linkImport(sourceId, checker.getSymbolAtLocation(element.name))
            }
          }
        }
      }
      if (ts.isCallExpression(node)) {
        const caller = enclosingFunctionId(node)
        const callee = calleeId(node.expression)
        if (caller && callee) addEdge("call", caller, callee)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }

  function linkImport(sourceId: string, symbol: ts.Symbol | undefined) {
    const key = symbolKey(symbol)
    if (!key) return
    const target = symbolToId.get(key)
    if (target) addEdge("import", sourceId, target)
  }

  function calleeId(expression: ts.Expression): string | undefined {
    const target =
      ts.isPropertyAccessExpression(expression) ||
      ts.isPropertyAccessChain(expression)
        ? expression.name
        : expression
    if (
      !ts.isIdentifier(target) &&
      !ts.isPropertyAccessExpression(expression)
    ) {
      if (!ts.isIdentifier(expression)) return undefined
    }
    const located = ts.isIdentifier(target) ? target : expression
    const symbol = checker.getSymbolAtLocation(located)
    const key = symbolKey(symbol)
    return key ? symbolToId.get(key) : undefined
  }

  function enclosingFunctionId(node: ts.Node): string | undefined {
    let current: ts.Node | undefined = node.parent
    while (current) {
      if (ts.isFunctionDeclaration(current) && current.name) {
        const key = symbolKey(checker.getSymbolAtLocation(current.name))
        if (key && symbolToId.has(key)) return symbolToId.get(key)
      }
      if (
        (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
        ts.isVariableDeclaration(current.parent) &&
        ts.isIdentifier(current.parent.name)
      ) {
        const key = symbolKey(checker.getSymbolAtLocation(current.parent.name))
        if (key && symbolToId.has(key)) return symbolToId.get(key)
      }
      current = current.parent
    }
    return undefined
  }

  return {
    root: absRoot,
    indexedAt: new Date().toISOString(),
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function nameOf(node: ts.Node): string | undefined {
  if (
    (ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isVariableDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text
  }
  return undefined
}
