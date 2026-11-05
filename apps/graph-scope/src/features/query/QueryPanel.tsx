import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchDependents, fetchPath } from "@/lib/api"
import type { GraphNode, NodeKind } from "@/lib/types"

type Props = {
  nodes: GraphNode[]
  selectedId: string | null
  fromId: string
  toId: string
  onFrom: (id: string) => void
  onTo: (id: string) => void
  onSelect: (id: string) => void
  onHighlight: (ids: string[] | null) => void
}

const groups: NodeKind[] = ["file", "export", "function"]

export function QueryPanel({
  nodes,
  selectedId,
  fromId,
  toId,
  onFrom,
  onTo,
  onSelect,
  onHighlight,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [rows, setRows] = useState<
    Array<{ id: string; label: string; detail: string }>
  >([])
  const selected = nodes.find((node) => node.id === selectedId)

  async function runDependents() {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const result = await fetchDependents(selected.id)
      const ids = [selected.id, ...result.dependents.map((item) => item.id)]
      onHighlight(ids)
      setSummary(
        result.dependents.length === 0
          ? `Nothing depends on ${selected.label}.`
          : `${result.dependents.length} node${result.dependents.length === 1 ? "" : "s"} depend on ${selected.label}.`,
      )
      setRows(
        result.dependents.map((item) => ({
          id: item.id,
          label: item.label,
          detail: `d${item.distance} · ${item.kind} · ${item.file}`,
        })),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Query failed")
    } finally {
      setBusy(false)
    }
  }

  async function runPath() {
    if (!fromId || !toId) return
    setBusy(true)
    setError(null)
    try {
      const result = await fetchPath(fromId, toId)
      if (!result.path) {
        onHighlight(null)
        setSummary("No path between those nodes.")
        setRows([])
        return
      }
      const pathNodes = result.path
      onHighlight(pathNodes.map((node) => node.id))
      const chain = pathNodes
        .map((node, index) => {
          const step = result.steps?.[index]
          if (!step || index === pathNodes.length - 1) return node.label
          const arrow = step.forward ? ` —${step.kind}→ ` : ` ←${step.kind}— `
          return `${node.label}${arrow}`
        })
        .join("")
      setSummary(chain)
      setRows(
        result.path.map((node) => ({
          id: node.id,
          label: node.label,
          detail: `${node.kind} · ${node.file}`,
        })),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Query failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Query
      </p>
      <Tabs defaultValue="depends">
        <TabsList className="w-full">
          <TabsTrigger value="depends" className="flex-1">
            Depends
          </TabsTrigger>
          <TabsTrigger value="path" className="flex-1">
            Path
          </TabsTrigger>
        </TabsList>
        <TabsContent value="depends" className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {selected ? (
              <>
                What depends on{" "}
                <span className="text-foreground">{selected.label}</span>?
              </>
            ) : (
              "Select a node on the graph."
            )}
          </p>
          <Button
            type="button"
            size="sm"
            data-testid="dependents-button"
            disabled={!selected || busy}
            onClick={() => void runDependents()}
          >
            What depends on this
          </Button>
        </TabsContent>
        <TabsContent value="path" className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="path-from">From</Label>
            <NodeSelect
              id="path-from"
              nodes={nodes}
              value={fromId}
              onChange={onFrom}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="path-to">To</Label>
            <NodeSelect
              id="path-to"
              nodes={nodes}
              value={toId}
              onChange={onTo}
            />
          </div>
          <Button
            type="button"
            size="sm"
            data-testid="path-button"
            disabled={!fromId || !toId || busy}
            onClick={() => void runPath()}
          >
            Find path
          </Button>
        </TabsContent>
      </Tabs>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {summary ? (
        <div className="flex flex-col gap-1">
          <p
            data-testid="query-summary"
            className="text-xs leading-relaxed text-foreground"
          >
            {summary}
          </p>
          <ul className="flex max-h-36 flex-col gap-1 overflow-auto">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-md px-2 py-1 text-left hover:bg-muted"
                  onClick={() => onSelect(row.id)}
                >
                  <span className="text-sm">{row.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {row.detail}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onHighlight(null)}
          >
            Clear highlight
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function NodeSelect({
  id,
  nodes,
  value,
  onChange,
}: {
  id: string
  nodes: GraphNode[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {groups.map((kind) => (
        <optgroup key={kind} label={kind}>
          {nodes
            .filter((node) => node.kind === kind)
            .map((node) => (
              <option key={node.id} value={node.id}>
                {node.label} — {node.file}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}
