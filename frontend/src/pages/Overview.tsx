import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Database,
  BarChart3,
  FlaskConical,
  Bot,
  BrainCircuit,
  FileText,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  getPlatformSummary,
  listDatasets,
} from '../lib/api';
import type {
  PlatformSummaryResponse,
  DatasetItem,
} from '../lib/api';

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface CapabilityItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  path: string;
}

const capabilities: CapabilityItem[] = [
  {
    title: 'Automated EDA',
    icon: BarChart3,
    description: 'Statistical distributions, correlation matrices, Tukey IQR outlier detection, and data hygiene cleaning.',
    path: '/auto-eda',
  },
  {
    title: 'Machine Learning Lab',
    icon: FlaskConical,
    description: 'Automated model benchmarking (XGBoost, Random Forest, GBDT), cross-validation, and SHAP explainability.',
    path: '/ml-lab',
  },
  {
    title: 'AI Agent Studio',
    icon: Bot,
    description: 'Autonomous multi-persona reasoning agents executing analytical tool workflows and synthesized charts.',
    path: '/agents',
  },
  {
    title: 'Knowledge RAG',
    icon: BrainCircuit,
    description: 'Contextual semantic search over domain documents (PDF, CSV, TXT) with grounded citations.',
    path: '/rag',
  },
  {
    title: 'Executive Reports',
    icon: FileText,
    description: 'Automated analytics compilation into downloadable PDF intelligence reports and executive summaries.',
    path: '/reports',
  },
];

export const Overview: React.FC = () => {
  const [summary, setSummary] = useState<PlatformSummaryResponse | null>(null);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const [sum, dsList] = await Promise.all([
          getPlatformSummary().catch(() => null),
          listDatasets().catch(() => []),
        ]);
        setSummary(sum);
        setDatasets(dsList);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  const totalRows = datasets.reduce((sum, d) => sum + (d.rows || 0), 0);
  const totalExperiments = summary?.platform_stats?.total_experiments || 0;
  const totalReports = summary?.platform_stats?.total_reports || 0;

  // EMPTY STATE: No datasets uploaded yet
  if (!loading && datasets.length === 0) {
    return (
      <div className="space-y-8 pb-12 max-w-5xl mx-auto">
        {/* Clean Welcome Banner */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 shadow-xs">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-4 border border-indigo-200/60 dark:border-indigo-800/60">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Agentic Data Science Platform</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              Welcome to InsightForge AI
            </h1>

            <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 mb-3">
              Turn Data Into Intelligence.
            </p>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              An AI-powered data science workspace designed for automated exploratory data analysis,
              robust model benchmarking, multi-persona reasoning agents, domain RAG grounding, and
              executive-ready reporting. Upload a dataset to begin.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/datasets"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Dataset
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>

              <Link
                to="/settings"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
              >
                Platform Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Minimal Feature Capabilities Overview */}
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Platform Modules
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Workflows available once a tabular dataset is added to your workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <Link
                  key={idx}
                  to={cap.path}
                  className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
                      {cap.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE DATA STATE: User has uploaded real datasets
  return (
    <div className="space-y-8 pb-12">
      {/* Header with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Workspace Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time telemetry and data assets in your current analytics workspace.
          </p>
        </div>

        <Link
          to="/datasets"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-xs self-start sm:self-auto"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Dataset</span>
        </Link>
      </div>

      {/* Real Platform Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Datasets
            </span>
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {datasets.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Tabular datasets stored
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Observations
            </span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalRows.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Rows available for analysis
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ML Experiments
            </span>
            <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalExperiments}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Models benchmarked
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Executive Reports
            </span>
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalReports}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Generated dossiers
          </p>
        </div>
      </div>

      {/* Real Active Data Assets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Assets
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Datasets available in your workspace for profiling, modeling, and agents.
            </p>
          </div>
          <Link
            to="/datasets"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Manage Datasets <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800 text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Dataset</th>
                <th className="px-4 py-2.5">Rows</th>
                <th className="px-4 py-2.5">Columns</th>
                <th className="px-4 py-2.5">File Size</th>
                <th className="px-4 py-2.5">Duplicates</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 font-mono">
              {datasets.map((d) => (
                <tr key={d.dataset_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{d.filename}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {d.rows.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {d.columns}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {formatBytes(d.size_bytes)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {d.duplicate_rows}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 font-sans">
                    <Link
                      to={`/auto-eda?dataset_id=${d.dataset_id}`}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      EDA
                    </Link>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <Link
                      to={`/ml-lab?dataset_id=${d.dataset_id}`}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                    >
                      Train
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Capabilities Navigation Grid */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Analytical Modules
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Access automated pipelines and intelligence tools for active data assets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <Link
                key={idx}
                to={cap.path}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {cap.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
