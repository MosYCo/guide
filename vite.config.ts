import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = mode === 'production' ? '/guide/' : '/'
  return {
    base,
    define: {
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || 'Moss Guide'),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // T026: 代码分割——vendor 与 app 分 chunk,减小首屏 JS(FR-019)
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React 运行时单独成 chunk(稳定,长期缓存)
            'react-vendor': ['react', 'react-dom'],
            // Radix UI 基础原语(按实际安装的包)
            'radix-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-toast',
              '@radix-ui/react-label',
              '@radix-ui/react-slot',
            ],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.{test,spec}.ts', 'tests/integration/**/*.{test,spec}.ts'],
    },
  }
})
