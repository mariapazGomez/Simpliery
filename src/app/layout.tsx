import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { PwaRegister } from '@/components/pwa-register'

// Fuente redondeada estilo Kyte ERP
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
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
    <html lang="es-CL" className={nunito.variable}>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
