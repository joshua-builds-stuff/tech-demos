export interface SiteConfig {
  title: string
  outDir: string
}

export interface Page {
  slug: string
  body: string
}

export type BuildResult = {
  pages: number
  outDir: string
}
