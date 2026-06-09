import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'

// Fuente redondeada estilo Kyte ERP
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Control Local — Ventas, stock y ganancias sin planillas',
  description: 'Controla tus ventas, stock y ganancias en minutos, sin saber usar Excel.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={nunito.variable}>
      <body>{children}</body>
    </html>
  )
}
