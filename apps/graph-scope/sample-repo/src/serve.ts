import { loadConfig } from "./config"
import { log, warn } from "./logger"
import { readPages } from "./pages"
import { StatusLabel } from "./ui/Status"

export function startServer(root: string, port: number): void {
  const config = loadConfig(root)
  const pages = readPages(root)
  const bound = bindPort(port)
  if (pages.length === 0) {
    warn(`no pages in ${config.title}`)
    return
  }
  StatusLabel(true)
  log(`${config.title} on ${bound}`)
}

function bindPort(port: number): number {
  return port
}
