import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Quando sai um deploy novo, o navegador ainda tem o index antigo e falha ao
// buscar o chunk de uma aba (hash mudou). O Vite emite 'vite:preloadError' nesse
// caso — recarregamos 1x (guarda na sessão evita loop) pra pegar a versão nova.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'lbw-stale-reloaded';
  if (!sessionStorage.getItem(KEY)) {
    sessionStorage.setItem(KEY, '1');
    window.location.reload();
  }
});

// Após o app carregar com sucesso, limpa o flag pra permitir um futuro
// auto-reload quando vier o próximo deploy.
window.addEventListener('load', () => {
  setTimeout(() => { try { sessionStorage.removeItem('lbw-stale-reloaded'); } catch {} }, 4000);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
