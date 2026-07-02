import 'virtual:uno.css'
import '@/styles/base.scss'
import '@/styles/navhub.scss'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

app.mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).catch(() => {
    // Offline support is optional; keep the app usable if registration fails.
  })
}
