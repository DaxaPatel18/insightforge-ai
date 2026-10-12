import React, { useState } from 'react';
import { Cookie, CheckCircle2, Shield, Trash2, Info, Lock } from 'lucide-react';

export const CookiePolicy: React.FC = () => {
  const [clearedMessage, setClearedMessage] = useState<string | null>(null);

  const handleClearLocalStorage = () => {
    localStorage.removeItem('insightforge-theme');
    localStorage.removeItem('insightforge_auth_token');
    setClearedMessage('Local preferences and stored session tokens have been cleared from this browser.');
    setTimeout(() => setClearedMessage(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
          <Cookie className="w-4 h-4" />
          <span>Storage &amp; Tracking Disclosures</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Cookie &amp; Local Storage Policy
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Last Updated: October 2026 • Platform Version 0.3.0
        </p>
      </div>

      {/* Operator Disclosure Notice */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
        <p>
          This policy applies to <strong>InsightForge AI</strong>, an independent technical project developed and operated by{' '}
          <strong>Daxa Antiya</strong> (&ldquo;Independent Developer &amp; Operator&rdquo;), located in <strong>Ahmedabad, Gujarat, India</strong>.
          InsightForge AI is not operated by an incorporated company or commercial enterprise.
        </p>
      </div>

      {/* Zero Tracker Guarantee Badge */}
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-emerald-950 dark:text-white">
            Zero Tracking Cookies &amp; Zero Advertising Pixels
          </p>
          <p>
            InsightForge AI does <strong>not</strong> set tracking cookies, behavioral profiling cookies, or third-party marketing beacons.
            We do not embed Google Analytics, Meta Pixels, Hotjar, or advertising trackers.
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8 text-xs leading-relaxed text-slate-700 dark:text-slate-300">

        {/* 1. What Are Cookies and Local Storage */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500" />
            1. Understanding Cookies vs. Browser Local Storage
          </h2>
          <p>
            Cookies are small text files transferred to your computer by websites to track sessions or activity across internet domains.
            Browser Local Storage (HTML5 Web Storage) is a sandboxed client-side key-value storage mechanism accessible exclusively
            by the origin page running in your own web browser.
          </p>
        </section>

        {/* 2. Actual Local Storage Inventory */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-500" />
            2. Verified Client-Side Storage Inventory
          </h2>
          <p>
            InsightForge AI uses only strictly essential, functional local storage keys. The table below lists all items stored:
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  <th className="p-3">Key Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Purpose &amp; Lifespan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                <tr>
                  <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">insightforge-theme</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3 font-sans"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Strictly Essential</span></td>
                  <td className="p-3 font-sans">Stores your selected UI appearance mode (&lsquo;light&rsquo; or &lsquo;dark&rsquo;). Persists until cleared.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">insightforge_auth_token</td>
                  <td className="p-3">localStorage</td>
                  <td className="p-3 font-sans"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">Strictly Essential</span></td>
                  <td className="p-3 font-sans">Cryptographically signed JWT bearer token maintaining session integrity and enforcing object-level authorization across tenant datasets, ML models, and knowledge documents. Persists for active session validity.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 italic mt-1">
            Note: External LLM provider API credentials (such as OpenAI, Anthropic, or Google Gemini environment variables) are configured server-side and are never stored in client browser local storage.
          </p>
        </section>

        {/* 3. Why We Do Not Display a Cookie Banner */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            3. Regulatory Basis for Cookie Banner Exemption
          </h2>
          <p>
            Under European Union ePrivacy Directive (Article 5(3)), GDPR guidelines, and international privacy standards,
            cookie consent banners are mandatory <em>only</em> when a website deploys non-essential cookies, third-party analytics,
            or tracking scripts. Because InsightForge AI employs zero non-essential cookies and zero tracking technologies,
            a decorative cookie banner is neither legally required nor introduced, avoiding unnecessary user friction.
          </p>
        </section>

        {/* 4. Interactive Storage Management */}
        <section className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-indigo-500" />
            4. Manage or Clear Local Browser Preferences
          </h2>
          <p>
            You can clear all local storage preferences created by InsightForge AI at any time using the control below:
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <button
              onClick={handleClearLocalStorage}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear InsightForge Local Storage</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Removes theme setting and active session tokens from this browser.
            </span>
          </div>

          {clearedMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{clearedMessage}</span>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
