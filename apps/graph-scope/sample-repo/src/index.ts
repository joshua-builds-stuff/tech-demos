import { buildSite } from "./build"
import { startServer } from "./serve"

export function main(argv: string[]): void {
  const command = parseCommand(argv)
  if (command === "serve") {
    startServer(".", 4321)
    return
  }
  buildSite(".")
}

function parseCommand(argv: string[]): "build" | "serve" {
  return argv.includes("serve") ? "serve" : "build"
}
