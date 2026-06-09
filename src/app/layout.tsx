import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Control Local — Ventas, stock y ganancias sin planillas',
  description: 'Controla tus ventas, stock y ganancias en minutos, sin saber usar Excel.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={jakartaSans.variable}>
      <body>{children}</body>
    </html>
  )
}
