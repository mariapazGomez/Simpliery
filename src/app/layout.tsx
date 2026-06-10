import type { Metadata, Viewport } from 'next'
import { Nunito, Fraunces } from 'next/font/google'
import './globals.css'
import { PwaRegister } from '@/components/pwa-register'

// Fuente de cuerpo: redondeada y cálida, estilo Kyte ERP.
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})

// Fuente "display": elegante, solo para títulos y números destacados.
// 2 pesos + subset latín = ~50 KB en caché (no afecta la velocidad de uso).
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Control Local — Ventas, stock y ganancias sin planillas',
  description: 'Controla tus ventas, stock y ganancias en minutos, sin saber usar Excel.',
  applicationName: 'Control Local',
  appleWebApp: {
    capable: true,
    title: 'Control Local',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#647355',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={`${nunito.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
