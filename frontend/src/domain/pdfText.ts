import { getDocument, GlobalWorkerOptions, InvalidPDFException, PasswordException } from "pdfjs-dist"
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = workerSrc

const EXCERPT_LENGTH = 180
const MAX_TEXT_CHARS = 400_000

export function normalizePdfText(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function resumeExcerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim()
  if (flat.length <= EXCERPT_LENGTH) return flat
  return `${flat.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`
}

function pageText(items: readonly unknown[]): string {
  return items
    .map((item) => (item && typeof item === "object" && "str" in item ? String(item.str) : ""))
    .join(" ")
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const header = new TextDecoder().decode(bytes.slice(0, 5))
  if (header !== "%PDF-") throw new Error("That file is not a PDF.")
  try {
    const document = await getDocument({ data: bytes }).promise
    const pages: string[] = []
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number)
      const content = await page.getTextContent()
      pages.push(pageText(content.items))
      page.cleanup()
    }
    await document.cleanup()
    const text = normalizePdfText(pages.join("\n"))
    if (!text) throw new Error("This PDF has no extractable text. Upload a text-based PDF, not a scan.")
    return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text
  } catch (error) {
    if (error instanceof PasswordException) throw new Error("This PDF is encrypted. Upload an unlocked PDF.")
    if (error instanceof InvalidPDFException) throw new Error("That file is not a readable PDF.")
    if (error instanceof Error && (error.message.startsWith("That file") || error.message.startsWith("This PDF"))) {
      throw error
    }
    throw new Error("Could not read text from that PDF.")
  }
}
