import type { NodeKind } from "@/lib/types"

export const KIND_COLOR: Record<NodeKind, string> = {
  file: "#9bb0d4",
  export: "#e0b15a",
  function: "#7dbaa6",
}

export const EDGE_COLOR = {
  import: "#8a847c",
  call: "#e0b15a",
} as const

export const KIND_LABEL: Record<NodeKind, string> = {
  file: "File",
  export: "Export",
  function: "Function",
}
