// Configuración de Vitest — tests unitarios de los INVARIANTES de la app.
// Los tests importan el código real (sin mocks de lógica); las env vars dummy
// existen solo para que los módulos que crean el cliente Supabase al cargar
// (store, cloud-state) puedan importarse en Node. Ningún test toca la red.
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://dummy-tests.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_dummy_para_tests',
    },
  },
})
