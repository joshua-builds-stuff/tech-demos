import { expect, test } from "bun:test"
import path from "node:path"
import { renderContext } from "../context/markdown.ts"
import { dependents, shortestPath } from "../graph/query.ts"
import { parseRepository } from "./ts-parse.ts"

const root = path.join(import.meta.dir, "../../sample-repo")

const expectedNodes = [
  "export:src/build.ts:buildSite",
  "export:src/config.ts:loadConfig",
  "export:src/config.ts:resolveOutDir",
  "export:src/graph.ts:linkPages",
  "export:src/index.ts:main",
  "export:src/legacy/banner.js:banner",
  "export:src/logger.ts:log",
  "export:src/logger.ts:warn",
  "export:src/pages.ts:readPages",
  "export:src/pages.ts:renderPage",
  "export:src/report.ts:renderReport",
  "export:src/serve.ts:startServer",
  "export:src/types.ts:BuildResult",
  "export:src/types.ts:Page",
  "export:src/types.ts:SiteConfig",
  "export:src/ui/Status.tsx:StatusLabel",
  "file:src/build.ts",
  "file:src/config.ts",
  "file:src/graph.ts",
  "file:src/index.ts",
  "file:src/legacy/banner.js",
  "file:src/logger.ts",
  "file:src/pages.ts",
  "file:src/report.ts",
  "file:src/serve.ts",
  "file:src/types.ts",
  "file:src/ui/Status.tsx",
  "fn:src/build.ts:writeOutput",
  "fn:src/config.ts:defaultTitle",
  "fn:src/graph.ts:extractLinks",
  "fn:src/index.ts:parseCommand",
  "fn:src/logger.ts:stamp",
  "fn:src/pages.ts:parseFrontMatter",
  "fn:src/report.ts:summarize",
  "fn:src/serve.ts:bindPort",
]

test("indexes the bundled sample repo", () => {
  const graph = parseRepository(root)
  const ids = graph.nodes.map((node) => node.id)
  const expected = new Set(expectedNodes)
  const missing = expectedNodes.filter((id) => !ids.includes(id))
  const extra = ids.filter((id) => !expected.has(id))
  expect({ missing, extra, nodes: ids.length }).toEqual({
    missing: [],
    extra: [],
    nodes: expectedNodes.length,
  })

  const edgeIds = new Set(graph.edges.map((edge) => edge.id))
  const required = [
    "call:export:src/index.ts:main->export:src/build.ts:buildSite",
    "call:export:src/index.ts:main->export:src/serve.ts:startServer",
    "call:export:src/index.ts:main->fn:src/index.ts:parseCommand",
    "call:export:src/build.ts:buildSite->export:src/config.ts:loadConfig",
    "call:export:src/config.ts:loadConfig->fn:src/config.ts:defaultTitle",
    "call:export:src/build.ts:buildSite->export:src/legacy/banner.js:banner",
    "import:file:src/build.ts->file:src/config.ts",
    "import:file:src/build.ts->export:src/config.ts:loadConfig",
    "import:file:src/index.ts->export:src/build.ts:buildSite",
    "import:file:src/serve.ts->export:src/ui/Status.tsx:StatusLabel",
  ]
  const missingEdges = required.filter((id) => !edgeIds.has(id))
  expect(missingEdges).toEqual([])
  expect(graph.nodes).toHaveLength(35)
  expect(graph.edges).toHaveLength(68)

  const loadConfig = "export:src/config.ts:loadConfig"
  expect(dependents(graph, loadConfig).map((item) => item.id)).toEqual([
    "export:src/build.ts:buildSite",
    "export:src/serve.ts:startServer",
    "file:src/build.ts",
    "file:src/serve.ts",
    "export:src/index.ts:main",
    "file:src/index.ts",
  ])

  expect(
    shortestPath(
      graph,
      "export:src/index.ts:main",
      "fn:src/config.ts:defaultTitle",
    ),
  ).toEqual([
    "export:src/index.ts:main",
    "export:src/build.ts:buildSite",
    "export:src/config.ts:loadConfig",
    "fn:src/config.ts:defaultTitle",
  ])

  const near = renderContext(
    graph,
    "fn:src/config.ts:defaultTitle",
    1,
    "function defaultTitle() {}",
  )
  expect(near).toContain("loadConfig")
  expect(near).not.toContain("buildSite")
  const wider = renderContext(
    graph,
    "fn:src/config.ts:defaultTitle",
    2,
    "function defaultTitle() {}",
  )
  expect(wider).toContain("buildSite")
})
