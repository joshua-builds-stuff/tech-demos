import { ScrollArea } from "@/components/ui/scroll-area"
import type { NodeDetail } from "@/lib/types"
import { KindBadge } from "../graph/KindBadge.tsx"

type Props = {
  detail: NodeDetail | null
  onSelect: (id: string) => void
}

export function Inspector({ detail, onSelect }: Props) {
  if (!detail) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-4">
        <p className="text-sm font-medium">Inspector</p>
        <p className="text-sm text-muted-foreground">
          Click a node to read its source and the imports or calls on either
          side of it.
        </p>
      </div>
    )
  }
  const { node, snippet, neighbors } = detail
  const incoming = neighbors.filter((item) => item.direction === "in")
  const outgoing = neighbors.filter((item) => item.direction === "out")
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{node.label}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {node.file}
          </p>
        </div>
        <KindBadge kind={node.kind} />
      </div>
      <pre className="max-h-40 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre">
        {snippet || "No source captured."}
      </pre>
      <ScrollArea className="min-h-0 flex-1">
        <NeighborList title="Depends on" rows={outgoing} onSelect={onSelect} />
        <NeighborList
          title="Depended on by"
          rows={incoming}
          onSelect={onSelect}
        />
      </ScrollArea>
    </div>
  )
}

function NeighborList({
  title,
  rows,
  onSelect,
}: {
  title: string
  rows: NodeDetail["neighbors"]
  onSelect: (id: string) => void
}) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">None.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={`${row.direction}:${row.edgeKind}:${row.id}`}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-muted"
                onClick={() => onSelect(row.id)}
              >
                <span className="truncate text-sm">{row.label}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {row.edgeKind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
