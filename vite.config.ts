import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? '/guide/' : '/'
  return {
    base,
    plugins: [react(), tsconfigPaths()],
    // 代码分割:按 module id 命中 React 运行时与 Radix,避免空 facade chunk
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor'
            }
            if (id.includes('/@radix-ui/')) {
              return 'radix-vendor'
            }
          },
        },
      },
    },
  }
})
