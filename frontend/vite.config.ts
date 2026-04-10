import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['psicologiaeexistir.com.br', 'front.psicologiaeexistir.com.br'],
  },
})
