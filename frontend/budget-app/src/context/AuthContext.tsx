import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { apiClient } from '../services/ApiClient';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/api';

interface AuthUser {
  userId: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getInitialAuthState(): { user: AuthUser | null; token: string | null } {
  const storedToken = apiClient.getToken();
  const storedUserId = localStorage.getItem('userId');
  const storedEmail = localStorage.getItem('userEmail');

  if (storedToken && storedUserId && storedEmail) {
    return {
      token: storedToken,
      user: { userId: storedUserId, email: storedEmail },
    };
  }
  return { user: null, token: null };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [initialAuth] = useState(getInitialAuthState);
  const [user, setUser] = useState<AuthUser | null>(initialAuth.user);
  const [token, setToken] = useState<string | null>(initialAuth.token);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await apiClient.login(data);
      apiClient.setToken(response.token);
      setToken(response.token);
      setUser({ userId: response.userId, email: response.email });
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('userEmail', response.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await apiClient.register(data);
      apiClient.setToken(response.token);
      setToken(response.token);
      setUser({ userId: response.userId, email: response.email });
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('userEmail', response.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.setToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};