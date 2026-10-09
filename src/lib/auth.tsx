import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { clearToken, setToken } from './storage';

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  property_size_ha?: number;
  // AGR-22/AGR-23: conta de demonstração (único aviso no app é o DemoBanner).
  demo?: boolean;
};

export type SignUpForm = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  birth_date?: string;
  city?: string;
  state?: string;
  property_size_ha?: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (form: SignUpForm) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<User>('/me');
        setUser(data);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const { data } = await api.post('/sessions', { email, password });
    await setToken(data.token);
    setUser(data.user);
  }

  async function signUp(form: SignUpForm) {
    const { data } = await api.post('/registrations', { user: form });
    await setToken(data.token);
    setUser(data.user);
  }

  async function signOut() {
    // Always sign out locally, even if wiping the stored token throws
    // (SecureStore can reject on native; localStorage never does on web).
    try {
      await clearToken();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
