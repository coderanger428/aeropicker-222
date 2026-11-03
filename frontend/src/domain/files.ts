export const MAX_RESUME_BYTES = 8 * 1024 * 1024

export function pdfRejection(file: { name: string; type: string; size: number }): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are supported. DOCX is planned for a later version."
  }
  if (file.type && file.type !== "application/pdf" && file.type !== "application/x-pdf") {
    return "Only PDF files are supported. DOCX is planned for a later version."
  }
  if (file.size <= 0) return "That PDF is empty."
  if (file.size > MAX_RESUME_BYTES) return "PDFs must be 8 MB or smaller."
  return null
}
