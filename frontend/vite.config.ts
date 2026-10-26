import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    // Keep the existing repository-root .env file available to the frontend.
    envDir: path.resolve(frontendDir, '..'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(frontendDir, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
