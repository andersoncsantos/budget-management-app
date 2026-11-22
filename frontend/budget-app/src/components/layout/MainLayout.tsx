import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  TableProperties,
  Settings,
  Wallet,
  Menu,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Sun,
  Moon,
  Search,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ALL_MONTHS } from '../../features/budgets';
import {
  usePortalUrlState,
  type PortalPeriodCode,
} from '../../shared/hooks/usePortalUrlState';
import { usePrivacyMask } from '../../shared/hooks/usePrivacyMask';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Painel' },
  { to: '/details', icon: TableProperties, label: 'Detalhes Financeiros' },
  { to: '/statement', icon: FileText, label: 'Extrato' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
] as const;

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isHidden, togglePrivacy } = usePrivacyMask();
  const { period, setPeriod, globalQuery, setGlobalQuery, searchParams } = usePortalUrlState();
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: "/" or Cmd/Ctrl+K focuses global search (§6.1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === '/' && !isEditable && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Painel';
    if (path === '/details') return 'Detalhes Financeiros';
    if (path === '/statement') return 'Extrato';
    if (path === '/settings') return 'Configurações';
    return 'Visão Geral';
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.pathname !== '/statement' && globalQuery.trim()) {
      const next = new URLSearchParams(searchParams);
      next.set('q', globalQuery.trim());
      navigate(`/statement?${next.toString()}`);
    }
  };

  // Preserve active period/query parameters across top-level navigation links
  const buildNavHref = (pathname: string) => {
    const preserved = new URLSearchParams();
    const activePeriod = searchParams.get('period');
    if (activePeriod) preserved.set('period', activePeriod);
    const qs = preserved.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="min-h-screen bg-bg-app flex font-sans text-text-primary transition-colors duration-200">
      {/* Skip Link for Keyboard Accessibility (§9) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-primary focus:text-text-inverse focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-focus-ring"
      >
        Pular para o conteúdo principal
      </a>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-bg-overlay z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Menu lateral"
        className={`
          fixed inset-y-0 left-0 z-50 bg-bg-sidebar text-text-primary flex flex-col transition-all duration-200 ease-in-out lg:relative lg:translate-x-0 border-r border-border-default
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-20' : 'w-72'}
        `}
      >
        <div className={`p-5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {isCollapsed ? (
            <div className="p-2 bg-primary rounded-xl shadow-sm">
              <Wallet className="w-6 h-6 text-text-inverse" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl shadow-sm">
                <Wallet className="w-6 h-6 text-text-inverse" aria-hidden="true" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-text-primary">
                Financeiro
              </span>
            </div>
          )}
          <button
            type="button"
            aria-label="Fechar menu de navegação"
            className="lg:hidden min-w-9 min-h-9 p-2 text-text-muted hover:text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 px-3 space-y-1 mt-4">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-4 mb-4">
              Menu Principal
            </p>
          )}
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={buildNavHref(to)}
                onClick={() => setIsSidebarOpen(false)}
                title={isCollapsed ? label : undefined}
                aria-label={isCollapsed ? label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group hover:bg-primary-light text-text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                  isCollapsed ? 'justify-center' : ''
                } ${isActive ? 'bg-primary-light text-primary font-semibold' : ''}`}
              >
                <Icon
                  aria-hidden="true"
                  className={`w-5 h-5 transition-colors flex-shrink-0 ${
                    isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary'
                  }`}
                />
                {!isCollapsed && <span className="font-medium">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="p-6 mt-auto">
            <div className="bg-bg-app p-5 rounded-2xl border border-border-default shadow-sm">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Status do Plano
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-text-primary">Plano Premium</span>
                <span className="px-2 py-1 text-[10px] font-bold bg-primary-light text-primary rounded-full uppercase">
                  Ativo
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="min-h-20 bg-bg-header border-b border-border-default flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-3 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu de navegação"
              className="lg:hidden min-w-9 min-h-9 p-2 -ml-1 text-text-muted hover:text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              aria-expanded={!isCollapsed}
              className="hidden lg:flex min-w-9 min-h-9 items-center justify-center p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => setIsCollapsed((prev) => !prev)}
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              ) : (
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            <div className="h-6 w-px bg-border-default mx-1 hidden lg:block" aria-hidden="true" />
            <span className="text-lg font-semibold text-text-primary">{getPageTitle()}</span>
          </div>

          {/* Global Search & Period Selector (§6.1) */}
          <div className="flex flex-1 max-w-xl items-center gap-3 mx-auto">
            <form
              role="search"
              onSubmit={handleGlobalSearchSubmit}
              className="relative flex-1 hidden md:flex items-center"
            >
              <Search
                className="w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Buscar transações ou categorias ( / ou Ctrl+K )"
                aria-label="Buscar transações ou categorias"
                className="w-full pl-9 pr-14 py-2 text-sm rounded-xl border border-border-default bg-bg-input text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-focus-ring transition-all"
              />
              <kbd
                aria-hidden="true"
                className="hidden lg:inline-block absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-text-muted bg-bg-card border border-border-default rounded"
              >
                /
              </kbd>
            </form>

            <div className="flex items-center gap-1.5 bg-bg-input border border-border-default rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-focus-ring">
              <Calendar className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
              <label htmlFor="global-period-select" className="sr-only">
                Período de análise
              </label>
              <select
                id="global-period-select"
                aria-label="Período de análise"
                value={period}
                onChange={(e) => setPeriod(e.target.value as PortalPeriodCode)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-text-primary outline-none cursor-pointer pr-1"
              >
                <option value="YEAR">Ano Completo (2026)</option>
                <optgroup label="Trimestres Fiscais">
                  <option value="Q1">1º Trimestre (Jan–Mar)</option>
                  <option value="Q2">2º Trimestre (Abr–Jun)</option>
                  <option value="Q3">3º Trimestre (Jul–Set)</option>
                  <option value="Q4">4º Trimestre (Out–Dez)</option>
                </optgroup>
                <optgroup label="Meses">
                  {ALL_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m} / 2026
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={togglePrivacy}
              aria-pressed={isHidden}
              aria-label={
                isHidden ? 'Mostrar valores monetários' : 'Ocultar valores monetários'
              }
              title={isHidden ? 'Mostrar valores' : 'Ocultar valores'}
              className="min-w-9 min-h-9 p-2 text-text-muted hover:text-text-primary transition-all rounded-lg hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {isHidden ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
              }
              title={theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}
              className="min-w-9 min-h-9 p-2 text-text-muted hover:text-text-primary transition-all rounded-lg hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Sun className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              aria-label="Notificações"
              title="Notificações"
              className="min-w-9 min-h-9 p-2 text-text-muted hover:text-text-primary transition-colors relative rounded-lg hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-bg-header"
              />
            </button>

            <div className="flex items-center gap-3 pl-3 sm:pl-5 border-l border-border-default">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-text-primary">
                  {user?.email || 'Usuário'}
                </p>
                <p className="text-xs text-text-muted">Administrador</p>
              </div>
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-text-inverse font-bold shadow-sm"
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Sair da conta"
                title="Sair"
                className="min-w-9 min-h-9 p-2 text-text-muted hover:text-error rounded-lg hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto p-4 sm:p-8 bg-bg-app focus:outline-none"
        >
          <ErrorBoundary title="Erro ao renderizar a página">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
