import { App } from './ui/app.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (!root) throw new Error('Root element #app not found');
  const app = new App(root);
  app.init();
});
