import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { karaokeServerPlugin } from './server/vitePlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // API + phone-remote rooms, served from the same address as the app.
    !process.env.VITEST && karaokeServerPlugin(),
  ],
  // Listen on the local network so phones on the same Wi-Fi can connect.
  server: { host: true },
  preview: { host: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // Full-app UI flows can take a few seconds when every test file runs in parallel.
    testTimeout: 15000,
  },
})
