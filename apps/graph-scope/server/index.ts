import { Hono } from "hono"
import { cors } from "hono/cors"
import { renderContext } from "./context/markdown.ts"
import { dependents, nodesById, shortestPath } from "./graph/query.ts"
import { getProject, indexProject, readSnippet } from "./graph/store.ts"
import type { CodeGraph, GraphNode } from "./graph/types.ts"

const app = new Hono()
app.use("/api/*", cors())

function describe(graph: CodeGraph, id: string): GraphNode | undefined {
  return nodesById(graph).get(id)
}

function payload(project: Awaited<ReturnType<typeof getProject>>) {
  const { graph } = project
  return {
    root: project.root,
    displayPath: project.displayPath,
    cached: project.cached,
    indexedAt: graph.indexedAt,
    nodes: graph.nodes,
    edges: graph.edges,
    stats: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      files: graph.nodes.filter((node) => node.kind === "file").length,
      exports: graph.nodes.filter((node) => node.kind === "export").length,
      functions: graph.nodes.filter((node) => node.kind === "function").length,
    },
  }
}

app.get("/api/graph", async (c) => {
  try {
    return c.json(payload(await getProject()))
  } catch (error) {
    return c.json({ error: messageOf(error) }, 400)
  }
})

app.post("/api/index", async (c) => {
  const body = await c.req.json().catch(() => ({}) as { path?: string })
  try {
    return c.json(payload(await indexProject(body.path)))
  } catch (error) {
    return c.json({ error: messageOf(error) }, 400)
  }
})

app.get("/api/node", async (c) => {
  const id = c.req.query("id")
  if (!id) return c.json({ error: "Missing id" }, 400)
  const project = await getProject()
  const node = describe(project.graph, id)
  if (!node) return c.json({ error: "Node not found" }, 404)
  const incoming = project.graph.edges
    .filter((edge) => edge.target === id)
    .map((edge) => neighbor(project.graph, edge.source, edge.kind, "in"))
    .filter((item): item is Neighbor => Boolean(item))
  const outgoing = project.graph.edges
    .filter((edge) => edge.source === id)
    .map((edge) => neighbor(project.graph, edge.target, edge.kind, "out"))
    .filter((item): item is Neighbor => Boolean(item))
  return c.json({
    node,
    snippet: readSnippet(project.root, node),
    neighbors: [...incoming, ...outgoing],
  })
})

app.get("/api/dependents", async (c) => {
  const id = c.req.query("id")
  if (!id) return c.json({ error: "Missing id" }, 400)
  const project = await getProject()
  if (!describe(project.graph, id))
    return c.json({ error: "Node not found" }, 404)
  const ranked = dependents(project.graph, id)
  return c.json({
    id,
    dependents: ranked
      .map((item) => {
        const node = describe(project.graph, item.id)
        return node
          ? { ...publicNode(node), distance: item.distance }
          : undefined
      })
      .filter((item) => Boolean(item)),
  })
})

app.get("/api/path", async (c) => {
  const from = c.req.query("from")
  const to = c.req.query("to")
  if (!from || !to) return c.json({ error: "Missing from or to" }, 400)
  const project = await getProject()
  if (!describe(project.graph, from) || !describe(project.graph, to)) {
    return c.json({ error: "Node not found" }, 404)
  }
  const ids = shortestPath(project.graph, from, to)
  const pathNodes = ids
    ?.map((id) => describe(project.graph, id))
    .filter((node): node is GraphNode => Boolean(node))
    .map(publicNode)
  const steps = ids
    ? ids.slice(0, -1).map((id, index) => {
        const next = ids[index + 1]
        const edge = project.graph.edges.find(
          (item) =>
            (item.source === id && item.target === next) ||
            (item.source === next && item.target === id),
        )
        return {
          from: id,
          to: next,
          kind: edge?.kind ?? "import",
          forward: edge ? edge.source === id : true,
        }
      })
    : null
  return c.json({ from, to, path: pathNodes ?? null, steps })
})

app.get("/api/context", async (c) => {
  const id = c.req.query("id")
  if (!id) return c.json({ error: "Missing id" }, 400)
  const depth = Number(c.req.query("depth") ?? "1")
  const project = await getProject()
  const node = describe(project.graph, id)
  if (!node) return c.json({ error: "Node not found" }, 404)
  const markdown = renderContext(
    project.graph,
    id,
    depth,
    readSnippet(project.root, node),
  )
  return c.json({ id, depth: Number.isFinite(depth) ? depth : 1, markdown })
})

type Neighbor = {
  id: string
  label: string
  kind: GraphNode["kind"]
  file: string
  edgeKind: "import" | "call"
  direction: "in" | "out"
}

function neighbor(
  graph: CodeGraph,
  id: string,
  edgeKind: "import" | "call",
  direction: "in" | "out",
): Neighbor | undefined {
  const node = describe(graph, id)
  if (!node) return undefined
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    file: node.file,
    edgeKind,
    direction,
  }
}

function publicNode(node: GraphNode) {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    file: node.file,
    name: node.name,
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Index failed"
}

const port = Number(process.env.PORT ?? 8787)

if (import.meta.main) {
  Bun.serve({ port, fetch: app.fetch })
  console.log(`graph-scope api listening on http://127.0.0.1:${port}`)
}

export { app }
