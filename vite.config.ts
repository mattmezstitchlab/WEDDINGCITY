import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Allow sandboxed/remote preview hosts (e.g. *.e2b.app) to reach the dev
    // server. Dev-only; does not affect the production build.
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
})
