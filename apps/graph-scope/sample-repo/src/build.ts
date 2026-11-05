import { banner } from "./legacy/banner.js"
import { loadConfig, resolveOutDir } from "./config"
import { linkPages } from "./graph"
import { log } from "./logger"
import { readPages, renderPage } from "./pages"
import { renderReport } from "./report"
import type { BuildResult } from "./types"

export function buildSite(root: string): BuildResult {
  const config = loadConfig(root)
  const outDir = resolveOutDir(config)
  const pages = readPages(root)
  const links = linkPages(pages)
  log(`${banner(config.title)} (${links.size} linked)`)
  let written = 0
  for (const page of pages) {
    const html = renderPage(page, config.title)
    writeOutput(html, outDir, page.slug)
    written += 1
  }
  const result: BuildResult = { pages: written, outDir }
  renderReport(result)
  return result
}

function writeOutput(html: string, outDir: string, slug: string): void {
  log(`${outDir}/${slug} (${html.length})`)
}
