import { clampDepth, neighborhood, nodesById } from "../graph/query.ts"
import type { CodeGraph, GraphNode } from "../graph/types.ts"

function section(title: string, nodes: GraphNode[]): string[] {
  const lines = [`### ${title}`]
  if (nodes.length === 0) {
    lines.push("", "_None._")
    return lines
  }
  lines.push("")
  for (const node of nodes) {
    lines.push(`- \`${node.label}\` (\`${node.kind}\`) — \`${node.file}\``)
  }
  return lines
}

export function renderContext(
  graph: CodeGraph,
  id: string,
  depth: number,
  snippet: string,
): string {
  const node = graph.nodes.find((item) => item.id === id)
  if (!node) return `# Not found\n\nNo node \`${id}\`.\n`
  const clamped = clampDepth(depth)
  const view = neighborhood(graph, id, clamped)
  const byId = nodesById(graph)
  const members = view.nodeIds
    .map((nodeId) => byId.get(nodeId))
    .filter((item): item is GraphNode => Boolean(item))
  const lines = [
    `# ${node.label}`,
    "",
    `- Kind: \`${node.kind}\``,
    `- File: \`${node.file}\``,
    `- Id: \`${node.id}\``,
    "",
    "## Source",
    "",
    "```ts",
    snippet.trimEnd(),
    "```",
    "",
    `## Neighborhood (depth ${clamped})`,
    "",
    ...section(
      "Files",
      members.filter((item) => item.kind === "file"),
    ),
    "",
    ...section(
      "Exports",
      members.filter((item) => item.kind === "export"),
    ),
    "",
    ...section(
      "Functions",
      members.filter((item) => item.kind === "function"),
    ),
    "",
    "### Relationships",
    "",
  ]
  if (view.edges.length === 0) {
    lines.push("_None._")
  } else {
    for (const edge of view.edges) {
      const source = byId.get(edge.source)
      const target = byId.get(edge.target)
      if (!source || !target) continue
      const verb = edge.kind === "call" ? "calls" : "imports"
      lines.push(
        `- \`${source.label}\` (${source.kind}, \`${source.file}\`) ${verb} \`${target.label}\` (${target.kind}, \`${target.file}\`)`,
      )
    }
  }
  lines.push(
    "",
    `_${members.length} nodes, ${view.edges.length} edges in view._`,
    "",
  )
  return lines.join("\n")
}
