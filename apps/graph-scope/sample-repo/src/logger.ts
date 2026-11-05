export function log(message: string): void {
  console.log(stamp("info"), message)
}

export function warn(message: string): void {
  console.warn(stamp("warn"), message)
}

function stamp(level: string): string {
  return `[${level}]`
}
