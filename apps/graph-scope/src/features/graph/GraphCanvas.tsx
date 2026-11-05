import cytoscape from "cytoscape"
import fcose from "cytoscape-fcose"
import { useEffect, useRef } from "react"
import type { GraphEdge, GraphNode } from "@/lib/types"
import { EDGE_COLOR, KIND_COLOR } from "./palette.ts"

cytoscape.use(fcose)

type Props = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  view: "all" | "files"
  selectedId: string | null
  emphasisIds: string[] | null
  fitIds: string[] | null
  fitToken: number
  onSelect: (id: string) => void
}

const layoutOptions = {
  name: "fcose",
  quality: "proof",
  randomize: false,
  animate: false,
  fit: true,
  padding: 40,
  nodeSeparation: 110,
  idealEdgeLength: 140,
  nodeRepulsion: 9000,
  packComponents: true,
} as cytoscape.LayoutOptions

export function GraphCanvas({
  nodes,
  edges,
  view,
  selectedId,
  emphasisIds,
  fitIds,
  fitToken,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedRef = useRef(selectedId)
  const emphasisRef = useRef(emphasisIds)
  const fitIdsRef = useRef(fitIds)
  onSelectRef.current = onSelect
  selectedRef.current = selectedId
  emphasisRef.current = emphasisIds
  fitIdsRef.current = fitIds

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const visibleNodes =
      view === "files" ? nodes.filter((node) => node.kind === "file") : nodes
    const ids = new Set(visibleNodes.map((node) => node.id))
    const visibleEdges = edges.filter(
      (edge) => ids.has(edge.source) && ids.has(edge.target),
    )
    const cy = cytoscape({
      container,
      elements: [
        ...visibleNodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            kind: node.kind,
            file: node.file,
            width: Math.max(72, node.label.length * 8 + 28),
          },
          classes: node.kind,
        })),
        ...visibleEdges.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
          },
          classes: edge.kind,
        })),
      ],
      style: stylesheet,
      minZoom: 0.15,
      maxZoom: 2.6,
    })
    cy.on("tap", "node", (event) => {
      onSelectRef.current(event.target.id())
    })
    cyRef.current = cy
    let laidOut = false
    const layout = () => {
      if (laidOut || container.clientHeight === 0) return
      cy.resize()
      cy.layout(layoutOptions).run()
      laidOut = true
      paintEmphasis(cy, selectedRef.current, emphasisRef.current)
      fitCollection(cy, fitIdsRef.current)
    }
    const observer = new ResizeObserver(() => {
      cy.resize()
      layout()
    })
    observer.observe(container)
    layout()
    return () => {
      observer.disconnect()
      cy.destroy()
      cyRef.current = null
    }
  }, [nodes, edges, view])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    paintEmphasis(cy, selectedId, emphasisIds)
  }, [emphasisIds, selectedId])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    fitCollection(cy, fitIds)
  }, [fitIds])

  useEffect(() => {
    if (!fitToken) return
    cyRef.current?.fit(undefined, 40)
  }, [fitToken])

  return (
    <div
      ref={containerRef}
      data-testid="graph-canvas"
      className="graph-stage h-full w-full"
    />
  )
}

function paintEmphasis(
  cy: cytoscape.Core,
  selectedId: string | null,
  emphasisIds: string[] | null,
) {
  cy.batch(() => {
    cy.elements().removeClass("dim hit selected")
    if (selectedId) cy.getElementById(selectedId).addClass("selected")
    if (!emphasisIds) return
    const marked = new Set(emphasisIds)
    cy.nodes().forEach((node) => {
      node.addClass(marked.has(node.id()) ? "hit" : "dim")
    })
    cy.edges().forEach((edge) => {
      const onPath =
        marked.has(edge.source().id()) && marked.has(edge.target().id())
      edge.addClass(onPath ? "hit" : "dim")
    })
  })
}

function fitCollection(cy: cytoscape.Core, fitIds: string[] | null) {
  if (!fitIds || fitIds.length === 0) return
  const collection = cy.collection()
  for (const id of fitIds) {
    const element = cy.getElementById(id)
    if (element.nonempty()) collection.merge(element)
  }
  if (collection.empty()) return
  cy.animate({ fit: { eles: collection, padding: 56 } }, { duration: 280 })
}

const stylesheet: cytoscape.StylesheetStyle[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-size": 11,
      "font-family": '"Geist Variable", sans-serif',
      color: "#f4f1ea",
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": "120px",
      width: "data(width)",
      height: 30,
      padding: "10px",
      shape: "round-rectangle",
      "background-color": "#221f1c",
      "border-width": 1.5,
      "border-color": KIND_COLOR.file,
    },
  },
  {
    selector: "node.file",
    style: { "border-color": KIND_COLOR.file, "font-size": 12 },
  },
  { selector: "node.export", style: { "border-color": KIND_COLOR.export } },
  { selector: "node.function", style: { "border-color": KIND_COLOR.function } },
  {
    selector: "edge",
    style: {
      width: 1.25,
      "line-color": EDGE_COLOR.import,
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      "target-arrow-color": EDGE_COLOR.import,
      "arrow-scale": 0.7,
    },
  },
  {
    selector: "edge.call",
    style: {
      "line-color": EDGE_COLOR.call,
      "line-style": "dashed",
      "target-arrow-color": EDGE_COLOR.call,
    },
  },
  { selector: ".dim", style: { opacity: 0.12 } },
  {
    selector: "node.hit",
    style: {
      opacity: 1,
      "border-width": 2.5,
      "background-color": "#2c2824",
    },
  },
  {
    selector: "edge.hit",
    style: { opacity: 1, width: 2.25 },
  },
  {
    selector: "node.selected",
    style: {
      opacity: 1,
      "border-width": 3,
      "border-color": "#fafaf9",
      "background-color": "#322e29",
    },
  },
]
