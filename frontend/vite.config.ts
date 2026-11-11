import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Modos: "dev" lee .env.dev (npm run dev / build:dev) y "prod" lee .env.prod (npm run build).
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '') // '.' = esta carpeta (frontend)
  return {
    plugins: [react()],
    server: {
      // En desarrollo, las llamadas a /api/... se reenvían al backend Django
      // (BACKEND_URL de .env.dev). En el servidor lo hace el servidor web que publica la página.
      proxy: {
        '/api': env.BACKEND_URL || 'http://localhost:8000',
      },
    },
  }
})
