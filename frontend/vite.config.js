import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 1. Properly include BOTH plugins in the array
  plugins: [
    react(),
    tailwindcss() 
  ],
  
  // 2. Set the relative base path at the root level so assets map properly
  base: '/', 
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true
  }
})