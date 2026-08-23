import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing 3D vendor code from app code so it
        // can be cached independently and downloaded in parallel.
        manualChunks: {
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei', 'maath'],
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: true,
    // Allow sandboxed/remote preview hosts (e.g. *.e2b.app) to reach the dev
    // server. Dev-only; does not affect the production build.
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
})
