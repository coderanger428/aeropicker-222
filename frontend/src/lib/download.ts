import type { ExportedFile } from "../domain/types.ts"
import { buildPdf } from "./pdf.ts"

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function downloadExportedFile(file: ExportedFile): void {
  downloadBlob(file.filename, buildPdf(file.lines))
}

export async function downloadExportedFiles(files: readonly ExportedFile[]): Promise<void> {
  for (let index = 0; index < files.length; index += 1) {
    if (index > 0) await delay(400)
    downloadExportedFile(files[index])
  }
}
