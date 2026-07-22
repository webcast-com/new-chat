import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@movies': path.resolve(process.cwd(), 'src/movies'),
      '@/app': path.resolve(process.cwd(), 'src/livescore'),
      '@/lib/supabase': path.resolve(process.cwd(), 'src/livescore-lib/supabase.ts'),
      '@/utils': path.resolve(process.cwd(), 'src/livescore-utils'),
      '/utils/supabase/info': path.resolve(process.cwd(), 'src/livescore-supabase/info.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
