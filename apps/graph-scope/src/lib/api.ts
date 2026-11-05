import type {
  Dependent,
  GraphResponse,
  NodeDetail,
  PathResult,
} from "./types.ts"

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // The body was not JSON.
  }
  return `Request failed (${response.status})`
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(await readError(response))
  return (await response.json()) as T
}

export function fetchGraph(): Promise<GraphResponse> {
  return getJson<GraphResponse>("/api/graph")
}

export function indexPath(path: string): Promise<GraphResponse> {
  return fetch("/api/index", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(await readError(response))
    return (await response.json()) as GraphResponse
  })
}

export function fetchNode(id: string): Promise<NodeDetail> {
  return getJson<NodeDetail>(`/api/node?id=${encodeURIComponent(id)}`)
}

export function fetchDependents(
  id: string,
): Promise<{ id: string; dependents: Dependent[] }> {
  return getJson(`/api/dependents?id=${encodeURIComponent(id)}`)
}

export function fetchPath(from: string, to: string): Promise<PathResult> {
  const query = new URLSearchParams({ from, to })
  return getJson<PathResult>(`/api/path?${query.toString()}`)
}

export function fetchContext(
  id: string,
  depth: number,
): Promise<{ markdown: string }> {
  const query = new URLSearchParams({ id, depth: String(depth) })
  return getJson(`/api/context?${query.toString()}`)
}
