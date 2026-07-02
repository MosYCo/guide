import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = mode === 'production' ? '/guide/' : '/'

  return {
    base,
    define: {
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || 'NAVHUB'),
    },
    plugins: [
      {
        name: 'app-name-html',
        transformIndexHtml: (html) =>
          html
            .replaceAll('%VITE_APP_NAME%', env.VITE_APP_NAME || 'NAVHUB')
            .replaceAll('%BASE_URL%', base),
      },
      vue(),
      UnoCSS()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
  }
})
