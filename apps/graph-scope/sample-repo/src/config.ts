import type { SiteConfig } from "./types"

export function loadConfig(root: string): SiteConfig {
  return {
    title: defaultTitle(root),
    outDir: "dist",
  }
}

function defaultTitle(root: string): string {
  const parts = root.split("/")
  return parts[parts.length - 1] || "site"
}

export function resolveOutDir(config: SiteConfig): string {
  return `${config.outDir}/site`
}
