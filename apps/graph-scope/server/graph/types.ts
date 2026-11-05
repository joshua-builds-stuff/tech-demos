export type NodeKind = "file" | "export" | "function"
export type EdgeKind = "import" | "call"

export type GraphNode = {
  id: string
  kind: NodeKind
  label: string
  file: string
  name: string
  start: number
  end: number
}

export type GraphEdge = {
  id: string
  kind: EdgeKind
  source: string
  target: string
}

export type CodeGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  root: string
  indexedAt: string
}

export type RankedNode = {
  id: string
  distance: number
}
