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

export type GraphStats = {
  nodes: number
  edges: number
  files: number
  exports: number
  functions: number
}

export type GraphResponse = {
  root: string
  displayPath: string
  cached: boolean
  indexedAt: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: GraphStats
}

export type Neighbor = {
  id: string
  label: string
  kind: NodeKind
  file: string
  edgeKind: EdgeKind
  direction: "in" | "out"
}

export type NodeDetail = {
  node: GraphNode
  snippet: string
  neighbors: Neighbor[]
}

export type Dependent = {
  id: string
  label: string
  kind: NodeKind
  file: string
  name: string
  distance: number
}

export type PathStep = {
  from: string
  to: string
  kind: EdgeKind
  forward: boolean
}

export type PathResult = {
  from: string
  to: string
  path: Array<Pick<GraphNode, "id" | "label" | "kind" | "file" | "name">> | null
  steps: PathStep[] | null
}
