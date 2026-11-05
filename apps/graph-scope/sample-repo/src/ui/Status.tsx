import { log } from "../logger"

export function StatusLabel(ok: boolean) {
  log(ok ? "ok" : "failed")
  return <span data-ok={ok}>{ok ? "ready" : "failed"}</span>
}
