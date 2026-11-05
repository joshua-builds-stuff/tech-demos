# harbor

A tiny static-site builder used as graph-scope's bundled sample. `main` dispatches to `buildSite` or `startServer`. Both load config, read pages, and log through the same helpers, so the import and call graph has real paths.
