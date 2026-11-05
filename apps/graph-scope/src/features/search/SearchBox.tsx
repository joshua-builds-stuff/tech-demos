import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { GraphNode } from "@/lib/types"
import { KindBadge } from "../graph/KindBadge.tsx"

type Props = {
  nodes: GraphNode[]
  query: string
  onQuery: (query: string) => void
  onSelect: (id: string) => void
}

export function SearchBox({ nodes, query, onQuery, onSelect }: Props) {
  const needle = query.trim().toLowerCase()
  const matches = needle
    ? nodes.filter((node) => {
        const haystack = `${node.label} ${node.file} ${node.kind}`.toLowerCase()
        return haystack.includes(needle)
      })
    : []

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="graph-search"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        Search
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="graph-search"
          data-testid="search-input"
          value={query}
          placeholder="Filter by name or file"
          className="pl-8"
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && matches[0]) onSelect(matches[0].id)
          }}
        />
      </div>
      {needle ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </p>
          <ul className="flex max-h-40 flex-col gap-1 overflow-auto">
            {matches.slice(0, 8).map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => onSelect(node.id)}
                >
                  <span className="truncate text-sm">{node.label}</span>
                  <KindBadge kind={node.kind} />
                </button>
                <p className="truncate px-2 text-[11px] text-muted-foreground">
                  {node.file}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Type to dim everything else. Enter focuses the first hit.
        </p>
      )}
    </div>
  )
}
