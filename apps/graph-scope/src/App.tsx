import { RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ContextPanel } from "@/features/context/ContextPanel"
import { GraphCanvas } from "@/features/graph/GraphCanvas"
import { Legend } from "@/features/graph/Legend"
import { Inspector } from "@/features/inspector/Inspector"
import { QueryPanel } from "@/features/query/QueryPanel"
import { SearchBox } from "@/features/search/SearchBox"
import { fetchContext, fetchGraph, fetchNode, indexPath } from "@/lib/api"
import type { GraphResponse, NodeDetail } from "@/lib/types"

export default function App() {
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [pathInput, setPathInput] = useState("sample-repo")
  const [view, setView] = useState<"all" | "files">("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [highlightIds, setHighlightIds] = useState<string[] | null>(null)
  const [fitIds, setFitIds] = useState<string[] | null>(null)
  const [fitToken, setFitToken] = useState(0)
  const [detail, setDetail] = useState<NodeDetail | null>(null)
  const [markdown, setMarkdown] = useState("")
  const [depth, setDepth] = useState(1)
  const [status, setStatus] = useState("Indexing sample-repo…")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const applyGraph = useCallback((next: GraphResponse) => {
    setGraph(next)
    setPathInput(next.displayPath)
    setHighlightIds(null)
    setFitIds(null)
    const buildSite = next.nodes.find((node) => node.name === "buildSite")
    const main = next.nodes.find(
      (node) => node.name === "main" && node.kind === "export",
    )
    const leaf = next.nodes.find((node) => node.name === "defaultTitle")
    const first = next.nodes[0]
    setSelectedId(buildSite?.id ?? main?.id ?? first?.id ?? null)
    setFromId(main?.id ?? first?.id ?? "")
    setToId(leaf?.id ?? next.nodes[1]?.id ?? "")
    setStatus(
      next.cached
        ? `Cached · ${next.stats.nodes} nodes`
        : `Indexed · ${next.stats.nodes} nodes`,
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchGraph()
      .then((next) => {
        if (!cancelled) applyGraph(next)
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "Could not load the graph",
          )
      })
    return () => {
      cancelled = true
    }
  }, [applyGraph])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setMarkdown("")
      return
    }
    let cancelled = false
    Promise.all([fetchNode(selectedId), fetchContext(selectedId, depth)])
      .then(([node, context]) => {
        if (cancelled) return
        setDetail(node)
        setMarkdown(context.markdown)
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "Could not load the node",
          )
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, depth])

  const matchIds = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle || !graph) return null
    return graph.nodes
      .filter((node) =>
        `${node.label} ${node.file} ${node.kind}`
          .toLowerCase()
          .includes(needle),
      )
      .map((node) => node.id)
  }, [search, graph])

  const emphasisIds = highlightIds ?? matchIds

  function selectNode(id: string, focus = false) {
    const node = graph?.nodes.find((item) => item.id === id)
    if (node && node.kind !== "file") setView("all")
    setSelectedId(id)
    if (focus) setFitIds([id])
  }

  async function reindex() {
    setBusy(true)
    setError(null)
    try {
      applyGraph(await indexPath(pathInput))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Index failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground lg:h-svh lg:overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 pr-2">
          <Reticle />
          <div>
            <p className="text-xs font-medium tracking-[0.22em] uppercase">
              Graph Scope
            </p>
            <p className="text-[11px] text-muted-foreground">
              See the repo the way an agent should
            </p>
          </div>
        </div>
        <form
          className="flex min-w-[240px] flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void reindex()
          }}
        >
          <Input
            data-testid="path-input"
            value={pathInput}
            aria-label="Repository path"
            placeholder="sample-repo or an absolute path"
            onChange={(event) => setPathInput(event.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            data-testid="index-button"
            disabled={busy}
          >
            <RefreshCw className={busy ? "animate-spin" : undefined} />
            Index
          </Button>
        </form>
        {graph ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{graph.stats.files} files</Badge>
            <span>
              {graph.stats.nodes} nodes · {graph.stats.edges} edges
            </span>
            <span>{graph.cached ? "cached" : "fresh"}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{status}</span>
        )}
      </header>
      {error ? (
        <p className="border-b px-4 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="flex max-h-[70vh] min-h-0 flex-col gap-4 overflow-auto border-b p-4 lg:max-h-none lg:border-r lg:border-b-0">
          <SearchBox
            nodes={graph?.nodes ?? []}
            query={search}
            onQuery={setSearch}
            onSelect={(id) => selectNode(id, true)}
          />
          <Separator />
          <Legend />
          <Separator />
          <QueryPanel
            nodes={graph?.nodes ?? []}
            selectedId={selectedId}
            fromId={fromId}
            toId={toId}
            onFrom={setFromId}
            onTo={setToId}
            onSelect={(id) => selectNode(id, true)}
            onHighlight={(ids) => {
              setHighlightIds(ids)
              setFitIds(ids)
            }}
          />
        </aside>
        <main className="relative min-h-[480px] lg:min-h-0">
          <div className="absolute top-3 left-3 z-10 flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={view === "all" ? "default" : "outline"}
              onClick={() => setView("all")}
            >
              All symbols
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "files" ? "default" : "outline"}
              onClick={() => setView("files")}
            >
              Files
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setFitToken((value) => value + 1)}
            >
              Fit
            </Button>
          </div>
          {graph && graph.nodes.length > 0 ? (
            <GraphCanvas
              nodes={graph.nodes}
              edges={graph.edges}
              view={view}
              selectedId={selectedId}
              emphasisIds={emphasisIds}
              fitIds={fitIds}
              fitToken={fitToken}
              onSelect={(id) => selectNode(id)}
            />
          ) : (
            <div className="graph-stage flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
              {error ? "The graph is empty." : status}
            </div>
          )}
        </main>
        <aside className="grid min-h-[640px] grid-rows-2 border-t lg:min-h-0 lg:border-t-0 lg:border-l">
          <div className="min-h-0 overflow-hidden border-b">
            <Inspector detail={detail} onSelect={selectNode} />
          </div>
          <div className="min-h-0 overflow-hidden">
            <ContextPanel
              markdown={markdown}
              label={detail?.node.label ?? "context"}
              depth={depth}
              onDepth={(value) =>
                setDepth(Math.max(1, Math.min(4, value || 1)))
              }
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Reticle() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
      className="text-foreground"
    >
      <circle
        cx="11"
        cy="11"
        r="4.5"
        fill="none"
        stroke="#e0b15a"
        strokeWidth="1.25"
      />
      <path
        d="M11 1.5v3.5M11 17v3.5M1.5 11h3.5M17 11h3.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  )
}
