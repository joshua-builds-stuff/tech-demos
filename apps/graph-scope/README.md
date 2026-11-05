# Graph Scope

Point this local app at a TypeScript or JavaScript repo and get an explorable code graph: files, exports, and functions, with import and call edges. Ask what depends on a node, find a path between two nodes, and export the neighborhood as Markdown an agent can read.

The bundled `sample-repo/` (a tiny static-site builder called harbor) is indexed on first load. Results are cached in `.cache/` by path and file mtimes.

## Run

```bash
bun install
bun run dev
```

Open http://127.0.0.1:5173. The API listens on port 8787 and Vite proxies `/api` to it.

To index another checkout, enter its path and press Index. Relative paths resolve from this folder.

## Checks

```bash
bun test
bun run check
```

`bun test` covers reverse-dependency and shortest-path queries, plus the indexer against `sample-repo/` (35 nodes, 68 edges, one known path from `main` to `defaultTitle`). `bun run check` is `tsc -b` and Biome.
