import { expect, test } from "bun:test"
import type { CodeGraph } from "../graph/types.ts"
import { renderContext } from "./markdown.ts"

const graph: CodeGraph = {
  root: "/repo",
  indexedAt: "2026-01-01T00:00:00.000Z",
  nodes: [
    {
      id: "export:src/a.ts:foo",
      kind: "export",
      label: "foo",
      file: "src/a.ts",
      name: "foo",
      start: 0,
      end: 20,
    },
    {
      id: "fn:src/b.ts:bar",
      kind: "function",
      label: "bar",
      file: "src/b.ts",
      name: "bar",
      start: 0,
      end: 10,
    },
    {
      id: "file:src/a.ts",
      kind: "file",
      label: "a.ts",
      file: "src/a.ts",
      name: "a.ts",
      start: 0,
      end: 20,
    },
  ],
  edges: [
    {
      id: "import:file->foo",
      kind: "import",
      source: "file:src/a.ts",
      target: "export:src/a.ts:foo",
    },
    {
      id: "call:foo->bar",
      kind: "call",
      source: "export:src/a.ts:foo",
      target: "fn:src/b.ts:bar",
    },
  ],
}

test("renderContext summarizes the neighborhood as markdown", () => {
  const markdown = renderContext(
    graph,
    "export:src/a.ts:foo",
    1,
    "export function foo() {\n  bar()\n}",
  )
  expect(markdown).toContain("# foo")
  expect(markdown).toContain("export function foo()")
  expect(markdown).toContain("## Neighborhood (depth 1)")
  expect(markdown).toContain(
    "`foo` (export, `src/a.ts`) calls `bar` (function, `src/b.ts`)",
  )
  expect(markdown).toContain("`a.ts`")
})
