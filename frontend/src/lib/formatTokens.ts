export function formatTokens(value: number): string {
  const sign = value < 0 ? "-" : ""
  const abs = Math.abs(value)
  const units = [
    { size: 1_000_000_000, suffix: "B" },
    { size: 1_000_000, suffix: "M" },
    { size: 1_000, suffix: "K" },
  ]
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index]
    if (abs < unit.size) continue
    let scaled = Math.round((abs / unit.size) * 10) / 10
    let suffix = unit.suffix
    if (scaled >= 1000 && index > 0) {
      const larger = units[index - 1]
      scaled = Math.round((abs / larger.size) * 10) / 10
      suffix = larger.suffix
    }
    const text = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1)
    return `${sign}${text}${suffix}`
  }
  return `${sign}${Math.round(abs)}`
}
