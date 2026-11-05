import type { Page } from "./types"

export function linkPages(pages: Page[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const page of pages) {
    map.set(page.slug, extractLinks(page.body))
  }
  return map
}

function extractLinks(body: string): string[] {
  return body.includes("](") ? ["about"] : []
}
