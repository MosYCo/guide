import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// Injects the built asset list and a content hash into dist/sw.js so the
// service worker precaches the complete app shell and busts its cache per build.
const swPrecacheManifest = (base: string): Plugin => ({
  name: 'sw-precache-manifest',
  apply: 'build',
  closeBundle() {
    const distDir = fileURLToPath(new URL('./dist', import.meta.url))
    const collect = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = join(dir, entry.name)
        return entry.isDirectory() ? collect(fullPath) : [fullPath]
      })

    const files = collect(distDir)
      .map((file) => relative(distDir, file).replaceAll('\\', '/'))
      .filter((file) => file !== 'sw.js' && !file.endsWith('.map'))
      .sort()
    const urls = files.map((file) => (file === 'index.html' ? base : `${base}${file}`))

    const hash = createHash('sha256')
    files.forEach((file) => hash.update(readFileSync(join(distDir, file))))
    const version = hash.digest('hex').slice(0, 12)

    const swPath = join(distDir, 'sw.js')
    const sw = readFileSync(swPath, 'utf8')
      .replace('self.__PRECACHE_MANIFEST = null', `self.__PRECACHE_MANIFEST = ${JSON.stringify(urls)}`)
      .replace('self.__CACHE_VERSION = null', `self.__CACHE_VERSION = ${JSON.stringify(version)}`)
    writeFileSync(swPath, sw)
  },
})

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
      UnoCSS(),
      swPrecacheManifest(base),
      AutoImport({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
  }
})
