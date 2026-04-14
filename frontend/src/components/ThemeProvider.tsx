import { useEffect } from 'react'
import { usePublicClinic } from '../hooks/useClinics'

/**
 * ThemeProvider injects clinic theme colors as CSS custom property overrides.
 * It reads themeColors from the clinic API and creates a <style> tag that
 * overrides the defaults in variables.css.
 *
 * Works for both public site and admin — mounted once in App.tsx.
 */
export default function ThemeProvider() {
  const { data: clinic } = usePublicClinic()

  useEffect(() => {
    const styleId = 'clinic-theme-overrides'

    // Remove existing override style if present
    const existing = document.getElementById(styleId)
    if (existing) existing.remove()

    const colors = clinic?.themeColors
    if (!colors || Object.keys(colors).length === 0) return

    // Build CSS custom property overrides
    // Only allow CSS custom property names (--xxx) with valid color values
    const declarations = Object.entries(colors)
      .filter(([key, val]) => key.startsWith('--') && typeof val === 'string' && val.length > 0)
      .map(([key, val]) => `  ${key}: ${val};`)
      .join('\n')

    if (!declarations) return

    // Also generate derivative variables (opacity variants for gold)
    const gold = colors['--color-accent-gold']
    let extras = ''
    if (gold) {
      // Convert hex to rgb for opacity variants
      const rgb = hexToRgb(gold)
      if (rgb) {
        extras += `  --color-accent-gold-40: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4);\n`
        extras += `  --color-accent-gold-60: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6);\n`
        extras += `  --color-border-accent: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6);\n`
      }
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `:root {\n${declarations}\n${extras}}`
    document.head.appendChild(style)

    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [clinic?.themeColors])

  return null // Renders nothing — pure side-effect component
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return null
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return { r, g, b }
}
