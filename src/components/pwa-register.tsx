'use client'

// Registra el service worker para habilitar la instalación como app (PWA).
import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registro fallido — no es crítico */
      })
    }
  }, [])
  return null
}
