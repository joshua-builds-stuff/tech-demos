# AGENTS.md — rules for agents working in this repo

This is a monorepo of small, self-contained tech demos. Follow these rules exactly.

## Layout
- One app per demo, under `apps/<kebab-slug>/` (e.g. `apps/graph-scope/`).
- Each app is fully self-contained: from its folder, `bun install && bun run dev` must start it. No shared root workspace, no cross-app imports.

## Process
1. **Plan first.** Read and follow `skills/project-planning/SKILL.md`, then write (or read, if it already exists) `apps/<slug>/PLAN.md` before writing code.
2. **`bunfig.toml` before any install.** Every app has `apps/<slug>/bunfig.toml` containing:
   ```toml
   [install]
   minimumReleaseAge = 259200
   ```
   Create it before running `bun install` / `bun add` / any scaffold that installs.
3. Build, run, and verify the app locally.

## Stack
- **Bun** runtime and package manager everywhere (`bun`, `bunx`; never npm/yarn/pnpm).
- When there is UI: **shadcn/ui**, minimalist preset (`bunx shadcn@latest init`), components added on demand.

## Scope
- Agents only touch files inside `apps/<slug>/` for the demo they were assigned.
- Exception: update tracking files (e.g. `tracking/seen-bookmarks.json`) only when explicitly asked.
- **Never create new repositories.**

## Pull requests
- Every PR must attach **at least one screenshot AND at least one video** (screen recording) of the running app in its description.
