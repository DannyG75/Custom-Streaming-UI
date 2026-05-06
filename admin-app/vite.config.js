import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The admin app runs on a separate PC and points at the NUC's IP.
// Set VITE_API_BASE in admin-app/.env (e.g., http://192.168.1.42:3000) so
// the dev server doesn't need a proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
});
