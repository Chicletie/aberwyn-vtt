// Configuração do Vite (o programa que roda o site no seu computador e gera a versão publicável).
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Caminhos relativos: assim o site funciona dentro de uma subpasta do GitHub Pages
  // (ex.: usuario.github.io/errante-vtt/) sem precisar configurar o endereço.
  base: './',
  build: {
    // O projeto tem DUAS páginas: a mesa (index.html) e o palco (palco.html).
    // Sem isto, o Vite só publicaria a primeira.
    rollupOptions: {
      input: {
        mesa: resolve(import.meta.dirname, 'index.html'),
        palco: resolve(import.meta.dirname, 'palco.html'),
      },
    },
  },
  server: {
    // Abre o navegador sozinho quando você roda "npm run dev".
    open: '/palco.html',
  },
});
