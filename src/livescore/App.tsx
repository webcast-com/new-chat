import { AuthProvider } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/sports/AppLayout';

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
