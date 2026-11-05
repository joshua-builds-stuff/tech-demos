import type { Page } from "./types"

export function readPages(root: string): Page[] {
  return [parseFrontMatter(`# ${root}`)]
}

function parseFrontMatter(raw: string): Page {
  return { slug: "index", body: raw }
}

export function renderPage(page: Page, title: string): string {
  return `<h1>${title}</h1>\n${page.body}`
}
