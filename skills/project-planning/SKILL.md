---
name: project-planning
description: Use when starting a new project, scoping an idea, choosing a stack, or producing an MVP implementation plan — an opinionated Bun/shadcn planning skill.
---

# Project Planning

Turn a fresh idea into a focused, MVP-first plan that favors prebuilt solutions over bespoke code.

## Workflow

1. **Goal + boundary.** State the goal in one sentence. Define the single-user MVP boundary and list explicit outs (what you will *not* build).
2. **Decompose.** Break the work into a few tasks, grouped by user-visible outcome (not by technical layer).
3. **Research libraries.** Look for libraries that absorb whole tasks. Prefer prebuilt over hand-rolled.
4. **Scaffold from official starters.** Start from an official scaffold via `bunx create-*` (`create-vite`, `create-next-app`, `create-tanstack`, etc.).
5. **Lock install age first.** Create `bunfig.toml` with
   ```toml
   [install]
   minimumReleaseAge = 259200
   ```
   *before* any install. Prefer scaffold flags that skip install, then run `bun install`.
6. **Framework choice.** Pick one opinionated framework when it removes wiring decisions; skip it for one-screen utilities.
7. **UI.** `bunx shadcn@latest init` with the minimalist preset. Prefer shadcn blocks; add components on demand.
8. **Layout before code.** Lay out components and services by feature before writing code.
9. **Minimal quality gates.** Minimal tests (critical logic only) and minimal git hooks (format + fast static checks).
10. **Output a short plan:** goal, MVP scope, task list, stack with a one-line rationale per choice, deferred items.

## Rules

- Build for one user.
- Bun everywhere.
- Prebuilt over bespoke.
- Boring defaults.
- Cut features before cutting clarity.
- Defer anything off the MVP path.
- Re-evaluate after the first end-to-end slice works.
