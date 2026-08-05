import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CookieConsent from './components/CookieConsent';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// Embedded ScoreHub (Phases 1-5): rendered inside the host app's Live Scores
// view. Uses a MemoryRouter so internal navigation never hijacks the host URL.
export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <CookieConsent />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
