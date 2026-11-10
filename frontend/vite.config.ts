import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, las llamadas a /api/... se reenvían al backend Django
    // (python manage.py runserver). En el servidor esto lo hace Nginx.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
