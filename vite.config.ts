import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify("AIzaSyB9LDdd9E6wZOb5LQ1oLfU3BP5_69rLmvE"),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify("senha-92ce1.firebaseapp.com"),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify("senha-92ce1"),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify("senha-92ce1.firebasestorage.app"),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify("359510043151"),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify("1:237722279968:web:39532cfa0433e180999c45"),
      'import.meta.env.VITE_ANTHROPIC_API_KEY': JSON.stringify(env.VITE_ANTHROPIC_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
