import type { MetadataRoute } from 'next'

// Manifiesto de la PWA. Next lo sirve en /manifest.webmanifest y lo enlaza solo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Control Local',
    short_name: 'Control Local',
    description: 'Controla tus ventas, stock y ganancias en minutos, sin planillas.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es-CL',
    background_color: '#FAF7F0',
    theme_color: '#647355',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
