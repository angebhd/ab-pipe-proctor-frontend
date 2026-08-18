import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Pinned rather than left to drift. The backend allows origins by exact
    // port, so a silent fallback to 5174 when 5173 is busy turns every API
    // call into an opaque CORS failure. strictPort fails loudly instead.
    port: 5173,
    strictPort: true,
  },
})
