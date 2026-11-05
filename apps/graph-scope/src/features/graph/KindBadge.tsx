import { Badge } from "@/components/ui/badge"
import type { NodeKind } from "@/lib/types"
import { KIND_COLOR, KIND_LABEL } from "./palette.ts"

export function KindBadge({ kind }: { kind: NodeKind }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span
        className="size-1.5 rounded-full"
        style={{ background: KIND_COLOR[kind] }}
      />
      {KIND_LABEL[kind]}
    </Badge>
  )
}
