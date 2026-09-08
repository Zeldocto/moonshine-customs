import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this project from https://<user>.github.io/<repo>/
// so every asset URL must be prefixed with the repository name.
// Override with BASE_PATH at build time if you rename the repo or move to a
// custom domain (where the correct value is '/').
const base = process.env.BASE_PATH ?? '/moonshine-customs/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
