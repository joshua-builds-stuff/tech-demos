import type { CodeGraph, GraphEdge, RankedNode } from "./types.ts"

// Edges point from the dependent to the dependency
// (importer → imported file or symbol, caller → callee).
// dependents() walks them backward. shortestPath() is undirected.

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort()
}

function adjacency(
  graph: CodeGraph,
  direction: "out" | "in" | "both",
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const node of graph.nodes) map.set(node.id, [])
  for (const edge of graph.edges) {
    if (direction === "out" || direction === "both") {
      map.get(edge.source)?.push(edge.target)
    }
    if (direction === "in" || direction === "both") {
      map.get(edge.target)?.push(edge.source)
    }
  }
  for (const [id, list] of map) map.set(id, uniqueSorted(list))
  return map
}

export function nodesById(
  graph: CodeGraph,
): Map<string, CodeGraph["nodes"][number]> {
  return new Map(graph.nodes.map((node) => [node.id, node]))
}

export function dependents(graph: CodeGraph, id: string): RankedNode[] {
  if (!graph.nodes.some((node) => node.id === id)) return []
  const incoming = adjacency(graph, "in")
  const seen = new Set<string>([id])
  const result: RankedNode[] = []
  let frontier = [id]
  let distance = 0
  while (frontier.length > 0) {
    distance += 1
    const layer: string[] = []
    for (const current of frontier) {
      for (const previous of incoming.get(current) ?? []) {
        if (seen.has(previous)) continue
        seen.add(previous)
        layer.push(previous)
      }
    }
    layer.sort()
    for (const nodeId of layer) result.push({ id: nodeId, distance })
    frontier = layer
  }
  return result
}

export function shortestPath(
  graph: CodeGraph,
  from: string,
  to: string,
): string[] | null {
  const ids = new Set(graph.nodes.map((node) => node.id))
  if (!ids.has(from) || !ids.has(to)) return null
  if (from === to) return [from]
  const adjacent = adjacency(graph, "both")
  const previous = new Map<string, string>()
  const seen = new Set<string>([from])
  const queue = [from]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    for (const next of adjacent.get(current) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      previous.set(next, current)
      if (next === to) {
        const path = [to]
        let cursor = to
        while (cursor !== from) {
          const step = previous.get(cursor)
          if (!step) return null
          cursor = step
          path.push(cursor)
        }
        path.reverse()
        return path
      }
      queue.push(next)
    }
  }
  return null
}

export function neighborhood(
  graph: CodeGraph,
  id: string,
  depth: number,
): { nodeIds: string[]; edges: GraphEdge[] } {
  const clamped = clampDepth(depth)
  if (!graph.nodes.some((node) => node.id === id)) {
    return { nodeIds: [], edges: [] }
  }
  const adjacent = adjacency(graph, "both")
  const distance = new Map<string, number>([[id, 0]])
  let frontier = [id]
  for (let hop = 1; hop <= clamped; hop += 1) {
    const layer: string[] = []
    for (const current of frontier) {
      for (const next of adjacent.get(current) ?? []) {
        if (distance.has(next)) continue
        distance.set(next, hop)
        layer.push(next)
      }
    }
    frontier = layer
  }
  const nodeIds = [...distance.keys()].sort()
  const inSet = new Set(nodeIds)
  const edges = graph.edges
    .filter((edge) => inSet.has(edge.source) && inSet.has(edge.target))
    .sort((a, b) => a.id.localeCompare(b.id))
  return { nodeIds, edges }
}

export function clampDepth(depth: number): number {
  if (!Number.isFinite(depth)) return 1
  return Math.max(1, Math.min(4, Math.floor(depth)))
}
