import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { listSourceFiles, parseRepository } from "../indexer/ts-parse.ts"
import type { CodeGraph, GraphNode } from "./types.ts"

const APP_ROOT = path.resolve(import.meta.dir, "../..")
const CACHE_DIR = path.join(APP_ROOT, ".cache")

export type IndexedProject = {
  root: string
  displayPath: string
  cached: boolean
  graph: CodeGraph
}

let current: IndexedProject | null = null

export function appRoot(): string {
  return APP_ROOT
}

export function defaultRoot(): string {
  return path.join(APP_ROOT, "sample-repo")
}

export function displayPath(root: string): string {
  const relative = path.relative(APP_ROOT, root)
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative))
    return relative
  return root
}

export function resolveProjectPath(input?: string): string {
  const raw = input?.trim() || defaultRoot()
  const absolute = path.resolve(APP_ROOT, raw)
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
    throw new Error(`Not a directory: ${raw}`)
  }
  return absolute
}

function fingerprint(root: string): string {
  const lines = listSourceFiles(root).map((file) => {
    const relative = path.relative(root, file).split(path.sep).join("/")
    return `${relative}:${Math.round(statSync(file).mtimeMs)}`
  })
  return `${path.resolve(root)}\n${lines.join("\n")}`
}

function isGraph(value: unknown): value is CodeGraph {
  if (!value || typeof value !== "object") return false
  const graph = value as CodeGraph
  return Array.isArray(graph.nodes) && Array.isArray(graph.edges)
}

export async function indexProject(input?: string): Promise<IndexedProject> {
  const root = resolveProjectPath(input)
  const hash = createHash("sha256")
    .update(fingerprint(root))
    .digest("hex")
    .slice(0, 16)
  mkdirSync(CACHE_DIR, { recursive: true })
  const cacheFile = path.join(CACHE_DIR, `${hash}.json`)
  const cached = Bun.file(cacheFile)
  if (await cached.exists()) {
    const parsed: unknown = await cached.json()
    if (isGraph(parsed)) {
      current = {
        root,
        displayPath: displayPath(root),
        cached: true,
        graph: parsed,
      }
      return current
    }
  }
  const graph = parseRepository(root)
  await Bun.write(cacheFile, JSON.stringify(graph))
  current = { root, displayPath: displayPath(root), cached: false, graph }
  return current
}

export async function getProject(): Promise<IndexedProject> {
  if (!current) return indexProject()
  return current
}

export function readSnippet(root: string, node: GraphNode): string {
  const absolute = path.join(root, node.file)
  const text = readFileSync(absolute, "utf8")
  if (node.kind === "file") return text.split("\n").slice(0, 40).join("\n")
  const slice = text
    .slice(node.start, node.end)
    .split("\n")
    .slice(0, 80)
    .join("\n")
  return slice.length > 4000 ? `${slice.slice(0, 4000)}\n…` : slice
}
