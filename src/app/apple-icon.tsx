import { ImageResponse } from 'next/og'
import { BrandMark } from '@/lib/brand-icon'

// Ícono para "Agregar a inicio" en iPhone (iOS aplica su propio redondeo).
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<BrandMark size={180} rounded={false} />, size)
}
