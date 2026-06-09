import { ImageResponse } from 'next/og'
import { BrandMark } from '@/lib/brand-icon'

// Favicon / ícono del navegador (Next lo enlaza automáticamente).
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<BrandMark size={64} />, size)
}
