export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return ''

  const headers = columns ?? Object.keys(rows[0])
  const escape = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"'

  const headerRow = headers.map(escape).join(',')
  const dataRows = rows.map(row => headers.map(h => escape(row[h])).join(','))

  return [headerRow, ...dataRows].join('\n')
}
