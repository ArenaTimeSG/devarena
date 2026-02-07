import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // Usar SWC para builds mais rápidos
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Definir variáveis de ambiente para o Vite (com fallback para manter funcionalidade)
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://bnonmzdwqdqjkdoyulqd.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJub25temR3cWRxamtkb3l1bHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MzE3MjMsImV4cCI6MjA4MDEwNzcyM30.HHCK1_PlhVwcUofTBngX3ChoQxEXCfToolHTrePmfj4'),
    'import.meta.env.VITE_MP_PUBLIC_KEY': JSON.stringify(process.env.VITE_MP_PUBLIC_KEY || 'APP_USR_12345678-1234-1234-1234-123456789012'),
  },
  build: {
    // Otimizações de build
    minify: 'terser', // Usar terser para melhor minificação
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.log em produção
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Code splitting manual para melhor cache
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'date-vendor': ['date-fns'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    // Otimizar tamanho do chunk
    chunkSizeWarningLimit: 1000,
    // Source maps apenas em desenvolvimento
    sourcemap: process.env.NODE_ENV === 'development',
  },
  // Otimizações de desenvolvimento
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
})