/**
 * PDF generation utility — placeholder.
 * In production, integrate with PDFKit, Puppeteer, or a similar library.
 */
export async function generatePdf(htmlContent: string): Promise<Buffer> {
  // TODO: implement with Puppeteer or PDFKit
  console.warn('[pdfGenerator] PDF generation not yet implemented — returning empty buffer')
  return Buffer.from('')
}
