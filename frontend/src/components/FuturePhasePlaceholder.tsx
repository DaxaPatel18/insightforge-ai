import type { LucideIcon } from 'lucide-react';
import { Clock, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FuturePhaseProps {
  title: string;
  phase: string;
  icon: LucideIcon;
  description: string;
  plannedCapabilities: string[];
}

export const FuturePhasePlaceholder = ({
  title,
  phase,
  icon: Icon,
  description,
  plannedCapabilities,
}: FuturePhaseProps) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-8 sm:p-12 text-center transition-all">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          <span>{phase} • Planned Milestone</span>
        </div>

        {/* Feature Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400 shadow-sm">
          <Icon className="w-8 h-8" />
        </div>

        {/* Title and Description */}
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-base sm:text-lg mb-8 leading-relaxed">
          {description}
        </p>

        {/* Planned Architecture / Capabilities */}
        <div className="text-left bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200/60 dark:border-slate-800 mb-8 max-w-xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Planned Capabilities for this Phase
          </div>
          <ul className="space-y-2.5">
            {plannedCapabilities.map((capability, idx) => (
              <li key={idx} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 mr-2.5 flex-shrink-0" />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Link to Active Day 1 Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/datasets"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            Go to Dataset Studio
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
          >
            Return to Overview
          </Link>
        </div>
      </div>
    </div>
  );
};
