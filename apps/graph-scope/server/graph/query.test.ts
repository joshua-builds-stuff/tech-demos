import { describe, expect, test } from "bun:test"
import { dependents, shortestPath } from "./query.ts"
import type { CodeGraph } from "./types.ts"

function graph(partial: Pick<CodeGraph, "nodes" | "edges">): CodeGraph {
  return { root: "/repo", indexedAt: "2026-01-01T00:00:00.000Z", ...partial }
}

const diamond = graph({
  nodes: ["a", "b", "c", "d", "z"].map((id) => ({
    id,
    kind: "function" as const,
    label: id,
    file: `${id}.ts`,
    name: id,
    start: 0,
    end: 1,
  })),
  edges: [
    { id: "a-b", kind: "call", source: "a", target: "b" },
    { id: "a-c", kind: "call", source: "a", target: "c" },
    { id: "b-d", kind: "call", source: "b", target: "d" },
    { id: "c-d", kind: "call", source: "c", target: "d" },
  ],
})

describe("dependents", () => {
  test("walks dependencies backward, nearest first", () => {
    expect(dependents(diamond, "d")).toEqual([
      { id: "b", distance: 1 },
      { id: "c", distance: 1 },
      { id: "a", distance: 2 },
    ])
  })

  test("stops on cycles", () => {
    const cyclic = graph({
      nodes: diamond.nodes.filter((node) => node.id === "a" || node.id === "b"),
      edges: [
        { id: "a-b", kind: "call", source: "a", target: "b" },
        { id: "b-a", kind: "call", source: "b", target: "a" },
      ],
    })
    expect(dependents(cyclic, "a").map((item) => item.id)).toEqual(["b"])
  })

  test("returns nothing for an unknown node", () => {
    expect(dependents(diamond, "missing")).toEqual([])
  })
})

describe("shortestPath", () => {
  test("picks the shortest undirected path deterministically", () => {
    expect(shortestPath(diamond, "a", "d")).toEqual(["a", "b", "d"])
  })

  test("returns the node itself when from and to match", () => {
    expect(shortestPath(diamond, "z", "z")).toEqual(["z"])
  })

  test("returns null when no path exists", () => {
    expect(shortestPath(diamond, "a", "z")).toBeNull()
    expect(shortestPath(diamond, "missing", "a")).toBeNull()
  })
})
