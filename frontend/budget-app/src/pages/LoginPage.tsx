import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { login, register, error, clearError, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        if (password !== confirmPassword) {
          alert('As senhas não coincidem');
          return;
        }
        await register({ email, password });
      }
      navigate('/');
    } catch (err) {
      // Error is handled by the context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app">
      <div className="max-w-md w-full space-y-8 p-8 bg-bg-card rounded-lg shadow-md border border-border-default">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            {isLogin ? 'Entrar' : 'Criar conta'}
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            {isLogin ? 'Ou' : 'Já tem uma conta?'}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                clearError();
              }}
              className="font-medium text-primary hover:text-primary-hover ml-1"
            >
              {isLogin ? 'criar uma nova conta' : 'entrar'}
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border-default placeholder-text-placeholder text-text-primary rounded-t-md focus:outline-none focus:ring-focus-ring focus:border-focus-ring focus:z-10 sm:text-sm bg-bg-input"
                placeholder="Endereço de e-mail"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border-default placeholder-text-placeholder text-text-primary focus:outline-none focus:ring-focus-ring focus:border-focus-ring focus:z-10 sm:text-sm bg-bg-input"
                placeholder="Senha"
              />
            </div>
            {!isLogin && (
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required={!isLogin}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border-default placeholder-text-placeholder text-text-primary focus:outline-none focus:ring-focus-ring focus:border-focus-ring focus:z-10 sm:text-sm bg-bg-input"
                  placeholder="Confirmar Senha"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="text-error text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-text-inverse bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-ring disabled:opacity-50"
            >
              {isLoading ? 'Carregando...' : isLogin ? 'Entrar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
