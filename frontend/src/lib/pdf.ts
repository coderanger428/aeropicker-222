function toAscii(text: string): string {
  return text
    .replace(/[•·●]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "")
}

function escapePdfText(text: string): string {
  return toAscii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function wrapLines(lines: readonly string[], width = 88): string[] {
  const wrapped: string[] = []
  for (const line of lines) {
    if (line.length <= width) {
      wrapped.push(line)
      continue
    }
    let rest = line
    while (rest.length > width) {
      let cut = rest.lastIndexOf(" ", width)
      if (cut < 16) cut = width
      wrapped.push(rest.slice(0, cut).trimEnd())
      rest = rest.slice(cut).trimStart()
    }
    wrapped.push(rest)
  }
  return wrapped
}

function pageStream(lines: readonly string[]): string {
  const commands = ["BT", "/F1 11 Tf", "50 750 Td", "15 TL"]
  lines.forEach((line, index) => {
    commands.push(`(${escapePdfText(line)}) Tj`)
    if (index < lines.length - 1) commands.push("T*")
  })
  commands.push("ET")
  return commands.join("\n")
}

export function buildPdf(lines: readonly string[]): Blob {
  const wrapped = wrapLines(lines)
  const pageSize = 46
  const pages: string[][] = []
  if (wrapped.length === 0) pages.push([""])
  for (let index = 0; index < wrapped.length; index += pageSize) {
    pages.push(wrapped.slice(index, index + pageSize))
  }

  const fontId = 3 + pages.length * 2
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    `2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, index) => `${3 + index * 2} 0 R`)
      .join(" ")}] >> endobj`,
  ]

  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2
    const contentId = pageId + 1
    const stream = pageStream(pageLines)
    objects.push(
      `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >> endobj`,
    )
    objects.push(`${contentId} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`)
  })
  objects.push(`${fontId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`)

  let body = "%PDF-1.4\n"
  const offsets = [0]
  for (const object of objects) {
    offsets.push(body.length)
    body += `${object}\n`
  }
  const xrefAt = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`
  }
  const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  return new Blob([body + xref + trailer], { type: "application/pdf" })
}
