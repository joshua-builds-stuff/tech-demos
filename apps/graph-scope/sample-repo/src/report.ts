import { log } from "./logger"
import type { BuildResult } from "./types"

export function renderReport(result: BuildResult): string {
  const line = summarize(result)
  log(line)
  return line
}

function summarize(result: BuildResult): string {
  return `${result.pages} pages → ${result.outDir}`
}
