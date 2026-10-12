import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          loja: path.resolve(__dirname, 'loja.html'),
          vender: path.resolve(__dirname, 'vender.html'),
          jogos: path.resolve(__dirname, 'jogos.html'),
          torneios: path.resolve(__dirname, 'torneios.html'),
          inscricao: path.resolve(__dirname, 'inscricao.html'),
          ranking: path.resolve(__dirname, 'ranking.html'),
          noticias: path.resolve(__dirname, 'noticias.html'),
          regulamento: path.resolve(__dirname, 'regulamento.html'),
          sobre: path.resolve(__dirname, 'sobre.html'),
          contacto: path.resolve(__dirname, 'contacto.html'),
          faq: path.resolve(__dirname, 'faq.html')
        }
      }
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
