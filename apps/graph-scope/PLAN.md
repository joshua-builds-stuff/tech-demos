# graph-scope — PLAN

> **See your repo the way your agent should.**
> Inspired by [Graphify](https://x.com/alannnfx/status/2109205523308654854), a popular Python tool (~120k+ stars per X posts, unverified) that turns a codebase into a local knowledge graph coding agents can query. This demo rebuilds the core idea in TypeScript.

## Goal
Point a local Bun app at a TS/JS repo and get an explorable, queryable code graph plus a Markdown "agent context" export for any node.

## MVP boundary (one user, one machine, no auth, no DB)
**In:**
1. **Index.** Bun server takes a local path, parses `.ts/.tsx/.js/.jsx`, extracts **file**, **export**, and **function** nodes plus **import** and **call** edges into a `{ nodes, edges }` JSON graph cached on disk (`.cache/<hash>.json`, keyed by path + file mtimes).
2. **Explore.** Single-page UI: force-directed graph, nodes colored by kind, search box, click a node → side panel with source snippet + neighbors.
3. **Query.** `GET /api/dependents?id=X` ("what depends on X?", reverse BFS) and `GET /api/path?from=A&to=B` (shortest path, BFS).
4. **Agent context.** `GET /api/context?id=X&depth=1` → short Markdown architecture summary of the node's neighborhood (files, exports, who calls/imports what), with a copy/download button.
5. **Zero setup.** Bundled small sample repo at `sample-repo/`, indexed by default on first load.

**Out:** languages other than TS/JS, any LLM features, multi-user, hosting/deploy, persistence beyond the JSON cache, incremental/watch indexing.

## Tasks (by user-visible outcome)
1. **"It opens with a graph"**: scaffold, bunfig.toml, sample repo, indexer, `/api/graph`, Cytoscape view.
2. **"I can find and inspect things"**: search (filter + focus), node detail panel (source + neighbors), kind legend.
3. **"I can ask questions"**: dependents + path endpoints, UI query panel that highlights results on the graph.
4. **"I can hand it to my agent"**: context endpoint + Markdown preview with copy/download.
5. **"I can point it at my repo"**: path input → `/api/index` re-index (uses cache).

## Stack (one-line rationale each)
- **Bun** runtime/package manager: repo rule; fast, and `Bun.serve` + `Bun.file` cover server and cache.
- **Vite + React + TS** via `bunx create-vite@latest . --template react-ts` (no install), then `bun install`: boring, official scaffold for a one-screen app; no meta-framework needed.
- **Hono on Bun** for the API (`server/`): typed routes and tiny overhead; Vite dev proxies `/api` to it. `bun run dev` runs both (e.g. `concurrently`).
- **Parser: TypeScript compiler API (`typescript` package)** instead of web-tree-sitter: zero WASM/grammar setup, handles TS/TSX/JS/JSX natively, and `ts.Program` + type checker resolve imports and call targets across files. Tree-sitter would need hand-written resolution for the same edges.
- **Graph UI: Cytoscape.js** (+ `cytoscape-fcose` layout) instead of react-force-graph: built-in selectors/styling by kind, highlight/filter APIs and BFS helpers (`elements.bfs`, `aStar`) that map directly onto the query features.
- **shadcn/ui** (minimalist preset): Input, Button, Card, Tabs, ScrollArea, Badge, Sheet as needed; source shown in a `<pre>` (no editor dependency).

## Layout
```
apps/graph-scope/
  bunfig.toml  package.json  vite.config.ts  PLAN.md  README.md
  sample-repo/                 # tiny TS project (~8–12 files) with real imports/calls
  server/
    index.ts                   # Hono app: /api/index, /api/graph, /api/node, /api/dependents, /api/path, /api/context
    indexer/ts-parse.ts        # TS compiler API → nodes/edges
    graph/store.ts             # load/save cache, adjacency maps
    graph/query.ts             # BFS dependents + shortest path   (unit-tested)
    context/markdown.ts        # neighborhood → Markdown          (unit-tested)
  src/
    features/graph/            # Cytoscape canvas, legend, styles
    features/search/
    features/inspector/        # node panel: source + neighbors
    features/query/            # dependents / path panel
    features/context/          # Markdown export
    components/ui/             # shadcn
```

## Quality gates (minimal)
- `bun test` for `graph/query.ts` and `indexer` on `sample-repo/` (expected node/edge counts, one known path).
- Pre-commit: format (Prettier or Biome) + `tsc --noEmit`.

## Deferred
Other languages via tree-sitter, LLM summaries, watch mode/incremental indexing, MCP server for agents, clustering/community detection, large-repo performance work.

## Re-evaluate
After slice 1 (sample repo renders as a graph end to end), check graph readability before adding features. If it's a hairball, default to file-level view with expand-on-click.
