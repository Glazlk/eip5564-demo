import { defineConfig } from 'vite';

export default defineConfig({
  base: '/eip5564-demo/',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
