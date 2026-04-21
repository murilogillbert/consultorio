export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function openPrintableReport(filename: string, html: string) {
  const documentHtml = `<!doctype html>${html}`
  const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener,noreferrer')

  if (!win) {
    downloadTextFile(filename.replace(/\.pdf$/i, '.html'), documentHtml, 'text/html;charset=utf-8')
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export function handleExportClick(event: MouseEvent<HTMLButtonElement>, action: () => void) {
  event.preventDefault()
  event.stopPropagation()
  action()
}
import type { MouseEvent } from 'react'
