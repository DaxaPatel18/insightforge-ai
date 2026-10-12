import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Keyboard Accessibility: Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg outline-none ring-2 ring-indigo-400"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all">
        <TopNav onOpenSidebar={() => setSidebarOpen(true)} />

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none">
          <Outlet />
        </main>

        {/* Minimal Accessible Legal Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">InsightForge AI</span>
              <span>•</span>
              <span>Independently developed by Daxa Antiya</span>
              <span>•</span>
              <span>Ahmedabad, India</span>
            </div>

            <nav aria-label="Legal and Privacy navigation" className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Terms of Service
              </Link>
              <Link to="/cookies" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Cookie Policy
              </Link>
              <Link to="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Contact & DSAR
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
};
