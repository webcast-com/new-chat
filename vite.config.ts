import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rapidApiKey = env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;

  return {
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
  server: {
    proxy: {
      '/api/tiktok-feed': {
        target: 'https://tiktok-scraper7.p.rapidapi.com',
        changeOrigin: true,
        rewrite: () => '/challenge/posts?challenge_id=33380&count=10&cursor=0',
        headers: {
          'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com',
          ...(rapidApiKey ? { 'x-rapidapi-key': rapidApiKey } : {}),
        },
      },
    },
  },
  };
});
