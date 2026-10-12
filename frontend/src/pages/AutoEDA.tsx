import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BarChart3,
  Table,
  Activity,
  Sparkles,
  Wrench,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Database,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type {
  DatasetItem,
  DatasetDetailResponse,
  CorrelationsResponse,
  DistributionsResponse,
  EDAInsight,
  CleaningOperation,
} from '../lib/api';
import {
  listDatasets,
  getDataset,
  getEDACorrelations,
  getEDADistributions,
  getEDAInsights,
  cleanDataset,
} from '../lib/api';

export const AutoEDA: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    searchParams.get('dataset_id') || ''
  );
  const [datasetDetail, setDatasetDetail] = useState<DatasetDetailResponse | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationsResponse | null>(null);
  const [distributions, setDistributions] = useState<DistributionsResponse | null>(null);
  const [insights, setInsights] = useState<EDAInsight[]>([]);

  const [activeTab, setActiveTab] = useState<'stats' | 'correlations' | 'distributions' | 'insights' | 'cleaning'>('stats');
  const [corrType, setCorrType] = useState<'pearson' | 'spearman'>('pearson');
  const [selectedDistCol, setSelectedDistCol] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available datasets
  useEffect(() => {
    async function load() {
      try {
        const list = await listDatasets();
        setDatasets(list);
        if (!selectedDatasetId && list.length > 0) {
          setSelectedDatasetId(list[0].dataset_id);
          setSearchParams({ dataset_id: list[0].dataset_id });
        }
      } catch (err: any) {
        setErrorMessage('Unable to connect to backend service. Please verify server connectivity.');
      }
    }
    load();
  }, []);

  // Load EDA data whenever selected dataset changes
  useEffect(() => {
    if (!selectedDatasetId) return;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);
      setCleanMessage(null);
      try {
        const [detail, corr, dist, ins] = await Promise.all([
          getDataset(selectedDatasetId),
          getEDACorrelations(selectedDatasetId),
          getEDADistributions(selectedDatasetId),
          getEDAInsights(selectedDatasetId),
        ]);
        setDatasetDetail(detail);
        setCorrelations(corr);
        setDistributions(dist);
        setInsights(ins);

        const distKeys = Object.keys(dist);
        if (distKeys.length > 0) {
          setSelectedDistCol(distKeys[0]);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error loading EDA analytics.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [selectedDatasetId]);

  const handleDatasetChange = (id: string) => {
    setSelectedDatasetId(id);
    setSearchParams({ dataset_id: id });
  };

  const handleApplyCleaning = async (operations: CleaningOperation[]) => {
    if (!selectedDatasetId) return;
    setIsCleaning(true);
    setCleanMessage(null);
    setErrorMessage(null);

    try {
      const res = await cleanDataset(selectedDatasetId, operations);
      setCleanMessage(`Transformation applied: ${res.transformations_applied.join(', ')}`);
      // Reload updated dataset and EDA metrics
      const [detail, corr, dist, ins] = await Promise.all([
        getDataset(selectedDatasetId),
        getEDACorrelations(selectedDatasetId),
        getEDADistributions(selectedDatasetId),
        getEDAInsights(selectedDatasetId),
      ]);
      setDatasetDetail(detail);
      setCorrelations(corr);
      setDistributions(dist);
      setInsights(ins);
    } catch (err: any) {
      setErrorMessage(err.message || 'Cleaning transformation failed.');
    } finally {
      setIsCleaning(false);
    }
  };

  if (datasets.length === 0 && !isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Database className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          No Datasets Available for EDA
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
          Upload a CSV or Excel tabular dataset in Dataset Studio to initiate automated exploratory profiling.
        </p>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs"
        >
          Go to Dataset Studio
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const numericStats = datasetDetail?.summary_stats?.numeric || {};
  const categoricalStats = datasetDetail?.summary_stats?.categorical || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Automated Exploratory Data Analysis
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Statistical distribution profiling, Pearson/Spearman correlations, and outlier diagnostics.
          </p>
          <div className="mt-2">
            <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              Scientific Notice: Correlation matrices represent empirical mathematical associations within this sample; correlation does not establish causation.
            </span>
          </div>
        </div>

        {/* Dataset Dropdown Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dataset:</span>
          <select
            value={selectedDatasetId}
            onChange={(e) => handleDatasetChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-mono font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-indigo-500 shadow-xs"
          >
            {datasets.map((d) => (
              <option key={d.dataset_id} value={d.dataset_id}>
                {d.filename} ({d.rows.toLocaleString()} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {cleanMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 text-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{cleanMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'stats', label: 'Descriptive Statistics', icon: Table },
          { id: 'correlations', label: 'Correlations Matrix', icon: TrendingUp },
          { id: 'distributions', label: 'Distributions & Outliers', icon: Activity },
          { id: 'insights', label: `Automated Insights (${insights.length})`, icon: Sparkles },
          { id: 'cleaning', label: 'Data Cleaning Toolkit', icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Computing statistical parameters...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DESCRIPTIVE STATISTICS */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Numeric Features Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Table className="w-4 h-4 text-indigo-500" />
                    Numerical Features — Moments & Percentiles
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {Object.keys(numericStats).length} numeric features
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800 text-left text-xs font-mono">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-sans font-semibold">
                      <tr>
                        <th className="px-4 py-3">Feature</th>
                        <th className="px-4 py-3">Mean</th>
                        <th className="px-4 py-3">Std Dev</th>
                        <th className="px-4 py-3">Min</th>
                        <th className="px-4 py-3">25% (Q1)</th>
                        <th className="px-4 py-3">Median</th>
                        <th className="px-4 py-3">75% (Q3)</th>
                        <th className="px-4 py-3">Max</th>
                        <th className="px-4 py-3">Skewness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {Object.entries(numericStats).map(([col, st]) => (
                        <tr key={col} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-sans">
                            {col}
                          </td>
                          <td className="px-4 py-3">{st.mean?.toLocaleString() ?? '-'}</td>
                          <td className="px-4 py-3">{st.std?.toLocaleString() ?? '-'}</td>
                          <td className="px-4 py-3">{st.min?.toLocaleString() ?? '-'}</td>
                          <td className="px-4 py-3">{st.q25?.toLocaleString() ?? '-'}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">
                            {st.median?.toLocaleString() ?? '-'}
                          </td>
                          <td className="px-4 py-3">{st.q75?.toLocaleString() ?? '-'}</td>
                          <td className="px-4 py-3">{st.max?.toLocaleString() ?? '-'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                Math.abs(st.skew || 0) > 1.5
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {st.skew ?? '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorical Features Summary */}
              {Object.keys(categoricalStats).length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-violet-500" />
                    Categorical Features — Cardinality & Top Modes
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(categoricalStats).map(([col, st]) => (
                      <div
                        key={col}
                        className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white font-mono">
                            {col}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-medium">
                            {st.unique} unique
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mb-2">
                          Mode: <span className="font-semibold text-slate-700 dark:text-slate-300">{st.top_value || 'N/A'}</span>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                          {Object.entries(st.top_frequencies).slice(0, 3).map(([val, count]) => (
                            <div key={val} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                              <span className="truncate pr-2">{val}</span>
                              <span className="font-mono font-medium">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CORRELATIONS MATRIX */}
          {activeTab === 'correlations' && correlations && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Correlation Heatmap Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Linear (Pearson) and monotonic rank (Spearman) bivariate dependencies.
                  </p>
                </div>

                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setCorrType('pearson')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      corrType === 'pearson' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Pearson
                  </button>
                  <button
                    onClick={() => setCorrType('spearman')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      corrType === 'spearman' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Spearman
                  </button>
                </div>
              </div>

              {correlations.columns.length < 2 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  Insufficient numeric features to compute correlation matrix (minimum 2 numeric columns required).
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800 text-center text-xs font-mono">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-sans font-semibold">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Feature</th>
                        {correlations.columns.map((c) => (
                          <th key={c} className="px-3 py-2.5 whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {(corrType === 'pearson' ? correlations.pearson : correlations.spearman).map((row) => (
                        <tr key={row.column}>
                          <td className="px-3 py-2 text-left font-sans font-semibold text-slate-800 dark:text-slate-200">
                            {row.column}
                          </td>
                          {row.values.map((val, idx) => {
                            const isPositive = val > 0;
                            const abs = Math.abs(val);
                            let bgClass = '';
                            if (abs >= 0.7) {
                              bgClass = isPositive
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'bg-rose-600 text-white font-bold';
                            } else if (abs >= 0.4) {
                              bgClass = isPositive
                                ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                                : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200';
                            }

                            return (
                              <td key={idx} className={`px-3 py-2 ${bgClass}`}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISTRIBUTIONS & OUTLIERS */}
          {activeTab === 'distributions' && distributions && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Feature Binned Distribution & IQR Diagnostics
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Histogram counts and Tukey IQR upper/lower bound outlier detection.
                    </p>
                  </div>

                  {/* Feature Selector */}
                  <select
                    value={selectedDistCol}
                    onChange={(e) => setSelectedDistCol(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {Object.keys(distributions).map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDistCol && distributions[selectedDistCol] ? (
                  <div className="space-y-6">
                    {/* IQR Summary Cards */}
                    {(() => {
                      const d = distributions[selectedDistCol];
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-center">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                              Interquartile Range (IQR)
                            </span>
                            <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                              {d.iqr.toFixed(2)}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-center">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                              Lower Bound [Q1 - 1.5*IQR]
                            </span>
                            <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                              {d.lower_bound.toFixed(2)}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-center">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                              Upper Bound [Q3 + 1.5*IQR]
                            </span>
                            <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                              {d.upper_bound.toFixed(2)}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-center">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                              IQR Outlier Count
                            </span>
                            <span
                              className={`text-base font-bold font-mono ${
                                d.outlier_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {d.outlier_count} ({d.outlier_percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recharts Histogram */}
                    <div className="h-72 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributions[selectedDistCol].bins}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              color: '#fff',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Frequency" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-slate-500">
                    No numeric distributions available.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUTOMATED INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Statistical Health & Rule-based Insights
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Algorithmic evaluation of sample size, multicollinearity, skewness, nullness, and variance.
                </p>

                <div className="space-y-3">
                  {insights.map((ins, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                        ins.type === 'warning'
                          ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-900/60'
                          : ins.type === 'success'
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60'
                          : 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-900/60'
                      }`}
                    >
                      {ins.type === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      ) : ins.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                      )}

                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {ins.title}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {ins.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA CLEANING TOOLKIT */}
          {activeTab === 'cleaning' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-500" />
                  Practical Data Cleaning & Transformations
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Transform missing values, prune duplicate rows, and apply variance-stabilizing functions.
                  All modifications are tracked in the database audit log.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Action 1: Remove Duplicate Rows */}
                  <div className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                        Prune Duplicate Observations
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        Removes identical duplicate records from the dataset. Currently {datasetDetail?.duplicate_rows} duplicate(s) identified.
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyCleaning([{ action: 'drop_duplicates' }])}
                      disabled={isCleaning}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold self-start"
                    >
                      {isCleaning ? 'Applying...' : 'Drop Duplicates'}
                    </button>
                  </div>

                  {/* Action 2: Drop Null Rows */}
                  <div className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                        Drop Rows With Missing Values
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        Removes any observation containing one or more null values across all features.
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyCleaning([{ action: 'drop_null_rows' }])}
                      disabled={isCleaning}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold self-start"
                    >
                      {isCleaning ? 'Applying...' : 'Drop Null Rows'}
                    </button>
                  </div>
                </div>

                {/* Transformation History Log */}
                {datasetDetail?.transformations && datasetDetail.transformations.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                      Dataset Transformation Audit Trail ({datasetDetail.transformations.length} events)
                    </h4>
                    <div className="space-y-2">
                      {datasetDetail.transformations.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                              #{t.step_number}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {t.description}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {t.rows_before} → {t.rows_after} rows
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
