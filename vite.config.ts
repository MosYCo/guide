import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/guide/',
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src')
    }
  },
  plugins: [react()],
})
