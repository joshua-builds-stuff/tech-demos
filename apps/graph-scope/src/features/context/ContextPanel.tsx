import { Copy, Download } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

type Props = {
  markdown: string
  label: string
  depth: number
  onDepth: (depth: number) => void
}

export function ContextPanel({ markdown, label, depth, onDepth }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!markdown) return
    try {
      await navigator.clipboard.writeText(markdown)
    } catch {
      const area = document.createElement("textarea")
      area.value = markdown
      area.setAttribute("readonly", "true")
      area.style.position = "fixed"
      area.style.left = "-9999px"
      document.body.appendChild(area)
      area.select()
      document.execCommand("copy")
      area.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  function download() {
    if (!markdown) return
    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${label || "context"}.context.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Agent context</p>
          <p className="text-xs text-muted-foreground">
            Markdown for the neighborhood of this node.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Label
            htmlFor="context-depth"
            className="text-xs text-muted-foreground"
          >
            Depth
          </Label>
          <input
            id="context-depth"
            type="number"
            min={1}
            max={4}
            value={depth}
            onChange={(event) => onDepth(Number(event.target.value))}
            className="h-7 w-12 rounded-md border border-input bg-background px-1 text-center text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="copy-context"
          disabled={!markdown}
          onClick={() => void copy()}
        >
          <Copy />
          {copied ? "Copied" : "Copy"}
        </Button>
        {copied ? (
          <span
            aria-live="polite"
            className="self-center text-xs text-muted-foreground"
          >
            Copied to clipboard
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="download-context"
          disabled={!markdown}
          onClick={download}
        >
          <Download />
          Download
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 rounded-lg border">
        <pre
          data-testid="context-markdown"
          className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
        >
          {markdown || "Select a node to export its neighborhood."}
        </pre>
      </ScrollArea>
    </div>
  )
}
