import 'virtual:uno.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/base.scss'
import '@/styles/navhub.scss'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

app.mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return

        worker.addEventListener('statechange', () => {
          if (worker.state !== 'installed' || !navigator.serviceWorker.controller) return

          window.dispatchEvent(
            new CustomEvent('navhub:update-available', {
              detail: { registration },
            }),
          )
        })
      })
    })
    .catch(() => {
      // Offline support is optional; keep the app usable if registration fails.
    })
}
