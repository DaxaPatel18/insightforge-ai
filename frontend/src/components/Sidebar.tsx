import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  FlaskConical,
  Bot,
  BrainCircuit,
  FileText,
  Settings,
  Sparkles,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    name: 'Overview',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Dataset Studio',
    path: '/datasets',
    icon: Database,
  },
  {
    name: 'Auto EDA',
    path: '/auto-eda',
    icon: BarChart3,
  },
  {
    name: 'ML Lab',
    path: '/ml-lab',
    icon: FlaskConical,
  },
  {
    name: 'AI Agent Studio',
    path: '/agents',
    icon: Bot,
  },
  {
    name: 'Knowledge RAG',
    path: '/rag',
    icon: BrainCircuit,
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: FileText,
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 dark:border-slate-800">
          <NavLink to="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>InsightForge</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Turn Data Into Intelligence
              </p>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Platform Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
          {user && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user.full_name && user.full_name.trim().split(/\s+/).length >= 2
                    ? `${user.full_name.trim().split(/\s+/)[0][0]}${user.full_name.trim().split(/\s+/)[1][0]}`.toUpperCase()
                    : (user.full_name || user.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user.full_name || user.email.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {user.professional_role || (user.role === 'admin' ? 'Workspace Admin' : 'Workspace Member')}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-2.5 py-1 text-[10px] text-slate-400 dark:text-slate-500">
            <span>InsightForge AI</span>
            <span className="font-mono">v0.3.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
