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
    esbuild: {
      // Remove console.log/debug/info do bundle de produção via tree-shake
      // (marca como pure call — se valor não é usado, esbuild dropa).
      // Mantém console.error e console.warn intactos pra reporting de bugs em prod.
      // Em dev (mode !== 'production'), todos os logs continuam visíveis normalmente.
      pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
    },
    build: {
      rollupOptions: {
        output: {
          // Separa libs de terceiros em chunks dedicados — melhor cache de browser
          // entre deploys (só re-baixa o chunk que mudou em vez do bundle todo).
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'motion': ['motion/react'],
            'plotly': ['plotly.js-dist-min', 'react-plotly.js'],
            'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'office-export': ['pptxgenjs', 'exceljs', 'docx', 'jszip', 'file-saver'],
          },
        },
      },
      // Aumenta o limite do warning de chunk grande — agora que temos lazy loading,
      // chunks de rota podem passar de 500kB e está OK.
      chunkSizeWarningLimit: 1500,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
