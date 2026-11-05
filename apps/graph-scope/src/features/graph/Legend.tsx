import type { NodeKind } from "@/lib/types"
import { EDGE_COLOR, KIND_COLOR, KIND_LABEL } from "./palette.ts"

const kinds: NodeKind[] = ["file", "export", "function"]

export function Legend() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Legend
      </p>
      <ul className="flex flex-col gap-1.5">
        {kinds.map((kind) => (
          <li key={kind} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-[3px] border"
              style={{ borderColor: KIND_COLOR[kind], background: "#221f1c" }}
            />
            {KIND_LABEL[kind]}
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="h-px w-4"
            style={{ background: EDGE_COLOR.import }}
          />
          Import
        </li>
        <li className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="h-px w-4 border-t border-dashed"
            style={{ borderColor: EDGE_COLOR.call }}
          />
          Call
        </li>
      </ul>
    </div>
  )
}
