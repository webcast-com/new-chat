import AppLayout from './components/AppLayout';
import { AppProvider } from './contexts/AppContext';

const MoviesApp = () => (
  <AppProvider>
    <AppLayout />
  </AppProvider>
);

export default MoviesApp;
