import type { ReactElement } from 'react'

// Marca para los íconos de la PWA (manifiesto, favicon, apple-touch-icon).
// Se renderiza con ImageResponse (next/og) → no depende de fuentes: usa un
// glifo SVG de "tienda" en blanco sobre el verde olivo de la marca.
export const BRAND_COLOR = '#647355'
export const BRAND_BG = '#FAF7F0'

/** Cuadro con el glifo de la marca. `rounded` para íconos normales; `safe`
 *  agrega zona de seguridad para íconos "maskable" (Android los recorta). */
export function BrandMark({ size, rounded = true, safe = false }: { size: number; rounded?: boolean; safe?: boolean }): ReactElement {
  const glyph = Math.round(size * (safe ? 0.42 : 0.56))
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_COLOR,
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M9 20v-6h6v6" />
      </svg>
    </div>
  )
}
