import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['app-icon.jpg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'icon.png'],
        manifest: {
          id: '/',
          name: 'Missão Água | Barco Escola da Natureza',
          short_name: 'Missão Água',
          description: 'Cadastro para a Missão Água no Barco Escola da Natureza | 1º Experiências do Bem',
          theme_color: '#065f46',
          background_color: '#f0fdf4',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'https://i.ibb.co/MDLp9grD/Whats-App-Image-2026-09-25-at-1-11-48-PM.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: 'https://i.ibb.co/MDLp9grD/Whats-App-Image-2026-09-25-at-1-11-48-PM.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: 'https://i.ibb.co/MDLp9grD/Whats-App-Image-2026-09-25-at-1-11-48-PM.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
