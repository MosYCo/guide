/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_GET_FAVICON_PATH: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}