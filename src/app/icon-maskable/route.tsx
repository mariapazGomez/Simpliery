import { ImageResponse } from 'next/og'
import { BrandMark } from '@/lib/brand-icon'

export const dynamic = 'force-static'

// Ícono "maskable" 512x512: fondo a sangre + glifo en zona segura (Android recorta).
export function GET() {
  return new ImageResponse(<BrandMark size={512} rounded={false} safe />, { width: 512, height: 512 })
}
