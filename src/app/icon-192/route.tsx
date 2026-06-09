import { ImageResponse } from 'next/og'
import { BrandMark } from '@/lib/brand-icon'

export const dynamic = 'force-static'

// Ícono 192x192 del manifiesto.
export function GET() {
  return new ImageResponse(<BrandMark size={192} />, { width: 192, height: 192 })
}
