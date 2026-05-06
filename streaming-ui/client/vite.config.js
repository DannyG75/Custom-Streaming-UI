import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build directly into the Express server's public/ folder so a single
// `npm run build` here means the server can serve the UI immediately.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // During dev, proxy /api to the Express server on :3000 so the UI can
    // call relative URLs (`/api/sites`) and not care about CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
