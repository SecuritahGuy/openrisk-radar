import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/data/")) return "location-data";
          if (
            id.includes("/node_modules/leaflet/") ||
            id.includes("/node_modules/react-leaflet/") ||
            id.includes("/node_modules/@react-leaflet/")
          ) {
            return "map-vendor";
          }
          if (id.includes("/node_modules/")) return "vendor";
        },
      },
    },
  },
})
