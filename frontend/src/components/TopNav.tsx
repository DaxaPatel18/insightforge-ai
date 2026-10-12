import React, { useEffect, useState, useRef } from 'react';
import { Menu, Sun, Moon, AlertCircle, LogOut, User as UserIcon, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { checkBackendHealth } from '../lib/api';

interface TopNavProps {
  onOpenSidebar: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Platform Overview',
    subtitle: 'Workspace metrics, data assets & analytical workflows',
  },
  '/datasets': {
    title: 'Dataset Studio',
    subtitle: 'Upload, inspect schemas, and prepare tabular datasets',
  },
  '/auto-eda': {
    title: 'Automated EDA',
    subtitle: 'Statistical distributions, pairwise correlations & data hygiene',
  },
  '/ml-lab': {
    title: 'ML Laboratory',
    subtitle: 'Automated model benchmarking, cross-validation & explainability',
  },
  '/agents': {
    title: 'AI Agent Studio',
    subtitle: 'Autonomous multi-persona reasoning and tool execution',
  },
  '/rag': {
    title: 'Knowledge RAG',
    subtitle: 'Contextual semantic retrieval over unstructured documents',
  },
  '/reports': {
    title: 'Executive Reports',
    subtitle: 'Publication-ready analytics summaries and documentation',
  },
  '/settings': {
    title: 'Platform Settings',
    subtitle: 'Profile, account security, data governance & preferences',
  },
};

function getInitials(fullName?: string | null, email?: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().slice(0, 2).toUpperCase();
  }
  return 'IF';
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentPage = pageTitles[location.pathname] || {
    title: 'InsightForge AI',
    subtitle: 'Agentic Data Science Platform',
  };

  const verifyBackend = async () => {
    try {
      await checkBackendHealth();
      setIsOffline(false);
    } catch {
      setIsOffline(true);
    }
  };

  useEffect(() => {
    verifyBackend();
    const interval = setInterval(verifyBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'User';
  const displayRole = user?.professional_role?.trim() || (user?.role === 'admin' ? 'Workspace Admin' : 'Workspace Member');
  const initials = getInitials(user?.full_name, user?.email);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left Section: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden focus:outline-none"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight">
              {currentPage.title}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
              {currentPage.subtitle}
            </p>
          </div>
        </div>

        {/* Right Section: Offline Alert, Theme Toggle & User Account Dropdown */}
        <div className="flex items-center gap-2.5">
          {isOffline && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60"
              title="Backend connectivity unavailable"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Offline mode</span>
            </div>
          )}

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* User Account Dropdown Menu */}
          {user && (
            <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800" ref={menuRef}>
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                aria-label="User account menu"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs select-none">
                  {initials}
                </div>
                <div className="hidden md:block max-w-[140px]">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                    {displayRole}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Content */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user.email}
                    </p>
                    {user.professional_role && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
                        {user.professional_role}
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      to="/settings?tab=profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-slate-400" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
