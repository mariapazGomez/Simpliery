import { ImageResponse } from 'next/og'
import { BrandMark } from '@/lib/brand-icon'

export const dynamic = 'force-static'

// Ícono 512x512 del manifiesto.
export function GET() {
  return new ImageResponse(<BrandMark size={512} />, { width: 512, height: 512 })
}
