import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
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
} from 'lucide-react';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Painel';
    if (path === '/details') return 'Detalhes Financeiros';
    if (path === '/statement') return 'Extrato';
    if (path === '/settings') return 'Configurações';
    return 'Visão Geral';
  };

  return (
    <div className="min-h-screen bg-bg-main flex font-sans text-text-main transition-colors duration-300">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-bg-overlay z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-bg-surface text-text-main flex flex-col transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 border-r border-border
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}>
        <div className={`p-5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {isCollapsed ? (
            <div className="p-2 bg-primary rounded-xl shadow-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl shadow-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-text-main">Financeiro</span>
            </div>
          )}
          <button
            className="lg:hidden p-2 text-text-muted hover:text-text-main transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-4 mb-4">Menu Principal</p>
          )}
          {[
            { to: '/', icon: LayoutDashboard, label: 'Painel' },
            { to: '/details', icon: LayoutDashboard, label: 'Detalhes Financeiros' },
            { to: '/statement', icon: FileText, label: 'Extrato' },
            { to: '/settings', icon: Settings, label: 'Configurações' },
          ].map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              title={isCollapsed ? label : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group hover:bg-primary/10 text-text-muted hover:text-primary ${isCollapsed ? 'justify-center' : ''} ${location.pathname === to ? 'bg-primary/10 text-primary font-semibold' : ''}`}
            >
              <Icon className={`w-5 h-5 transition-colors flex-shrink-0 ${location.pathname === to ? 'text-primary' : 'group-hover:text-primary'}`} />
              {!isCollapsed && <span className="font-medium">{label}</span>}
            </Link>
          ))}
        </nav>

        {!isCollapsed && (
          <div className="p-6 mt-auto">
            <div className="bg-bg-main p-5 rounded-2xl border border-border shadow-sm">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Status do Plano</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-text-main">Plano Premium</span>
                <span className="px-2 py-1 text-[10px] font-bold bg-primary/20 text-primary rounded-full uppercase">Ativo</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-bg-surface border-b border-border flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-text-muted hover:text-text-main transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <button
              className="hidden lg:flex p-2 -ml-2 text-text-muted hover:text-text-main transition-colors rounded-lg hover:bg-primary/10"
              onClick={() => setIsCollapsed(prev => !prev)}
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div className="h-6 w-px bg-border mx-2 hidden lg:block" />
            <h1 className="text-lg font-semibold text-text-main">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTheme}
              className="p-2 text-text-muted hover:text-text-main transition-all rounded-lg hover:bg-primary/10"
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button className="p-2 text-text-muted hover:text-text-main transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-bg-surface"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-text-main">{user?.email || 'User'}</p>
                <p className="text-xs text-text-muted">Administrador</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-lg">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                onClick={logout}
                className="p-2 text-text-muted hover:text-danger transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-bg-main/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
