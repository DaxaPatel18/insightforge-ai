import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  UploadCloud,
  Table as TableIcon,
} from 'lucide-react';
import {
  listDatasets,
  getDataset,
  trainMLPipeline,
  listDatasetExperiments,
  getExperimentDetails,
} from '../lib/api';
import type {
  DatasetItem,
  DatasetDetailResponse,
  MLTrainResult,
} from '../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const MLLab: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [datasetDetail, setDatasetDetail] = useState<DatasetDetailResponse | null>(null);

  // Configuration state
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [problemType, setProblemType] = useState<string>('auto');
  const [testSplit, setTestSplit] = useState<number>(0.2);

  // Execution state
  const [, setLoading] = useState<boolean>(false);

  const [training, setTraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trainResult, setTrainResult] = useState<MLTrainResult | null>(null);

  // Past experiments
  const [pastExperiments, setPastExperiments] = useState<any[]>([]);

  // Active tab in results
  const [resultTab, setResultTab] = useState<'leaderboard' | 'explainability' | 'predictions'>('leaderboard');

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      loadDatasetDetails(selectedDatasetId);
      loadPastExperiments(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const data = await listDatasets();
      setDatasets(data);
      if (data.length > 0) {
        setSelectedDatasetId(data[0].dataset_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadDatasetDetails = async (id: string) => {
    try {
      setError(null);
      const data = await getDataset(id);
      setDatasetDetail(data);

      // Default target to last column, features to all others
      if (data.column_info && data.column_info.length > 0) {
        const lastCol = data.column_info[data.column_info.length - 1].name;
        setTargetColumn(lastCol);
        const feats = data.column_info.filter(c => c.name !== lastCol).map(c => c.name);
        setSelectedFeatures(feats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dataset details');
    }
  };

  const loadPastExperiments = async (id: string) => {
    try {
      const exps = await listDatasetExperiments(id);
      setPastExperiments(exps);
      if (exps.length > 0) {
        // Automatically load latest experiment result
        const latest = await getExperimentDetails(exps[0].id);
        setTrainResult(latest);
      } else {
        setTrainResult(null);
      }
    } catch {
      // ignore
    }
  };

  const handleTargetChange = (col: string) => {
    setTargetColumn(col);
    setSelectedFeatures(prev => prev.filter(c => c !== col));
  };

  const toggleFeature = (col: string) => {
    if (selectedFeatures.includes(col)) {
      setSelectedFeatures(selectedFeatures.filter(c => c !== col));
    } else {
      setSelectedFeatures([...selectedFeatures, col]);
    }
  };

  const selectAllFeatures = () => {
    if (!datasetDetail) return;
    const all = datasetDetail.column_info.filter(c => c.name !== targetColumn).map(c => c.name);
    setSelectedFeatures(all);
  };

  const handleTrain = async () => {
    if (!selectedDatasetId || !targetColumn) {
      setError('Please select a target column.');
      return;
    }
    if (selectedFeatures.length === 0) {
      setError('Please select at least one feature column.');
      return;
    }

    try {
      setTraining(true);
      setError(null);
      const result = await trainMLPipeline(selectedDatasetId, {
        target_column: targetColumn,
        feature_columns: selectedFeatures,
        problem_type: problemType === 'auto' ? undefined : problemType,
        test_size: testSplit,
        experiment_name: `${targetColumn} Benchmark`,
      });
      setTrainResult(result);
      loadPastExperiments(selectedDatasetId);
    } catch (err: any) {
      setError(err.message || 'Training failed. Check target column compatibility.');
    } finally {
      setTraining(false);
    }
  };

  if (datasets.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <FlaskConical className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Dataset Required for ML Benchmarking
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
          Automated model benchmarking, cross-validation, and SHAP explainability require an active tabular dataset in your workspace.
        </p>
        <Link
          to="/datasets"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-xs"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Dataset in Dataset Studio</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Machine Learning Laboratory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated model selection across Random Forest, Gradient Boosting, XGBoost, and Logistic/Ridge models with SHAP explainability.
          </p>
          <div className="mt-2">
            <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              Technical Notice: Benchmark scores, test metrics, and SHAP drivers reflect performance on this dataset split; real-world predictive validity depends on input data representativeness.
            </span>
          </div>
        </div>

        {/* Dataset selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dataset:</label>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            disabled={training || datasets.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {datasets.map((d) => (
              <option key={d.dataset_id} value={d.dataset_id}>
                {d.filename} ({d.rows} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Config Panel, Right Results Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Config Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Experiment Setup
            </h2>

            {/* Target Column */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Column (Y)
              </label>
              <select
                value={targetColumn}
                onChange={(e) => handleTargetChange(e.target.value)}
                disabled={training || !datasetDetail}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {datasetDetail?.column_info.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.semantic_type || c.dtype})
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Problem Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'classification', label: 'Classify' },
                  { id: 'regression', label: 'Regress' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProblemType(item.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      problemType === item.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Split Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Holdout Test Split</span>
                <span className="text-indigo-600 dark:text-indigo-400">{Math.round(testSplit * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.05"
                value={testSplit}
                onChange={(e) => setTestSplit(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Feature Selection */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Features ({selectedFeatures.length} selected)
                </label>
                <button
                  type="button"
                  onClick={selectAllFeatures}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Select All
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-800/40">
                {datasetDetail?.column_info
                  .filter((c) => c.name !== targetColumn)
                  .map((c) => {
                    const isChecked = selectedFeatures.includes(c.name);
                    return (
                      <label
                        key={c.name}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFeature(c.name)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {c.name}
                        </span>
                        <span className="ml-auto text-[10px] text-slate-400 font-mono">
                          {c.semantic_type || c.dtype}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleTrain}
              disabled={training || !targetColumn || selectedFeatures.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              {training ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Pipelines & Cross-Validation...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Train & Benchmark Pipeline</span>
                </>
              )}
            </button>
          </div>

          {/* Past Experiments List */}
          {pastExperiments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-card">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Previous Benchmark Runs ({pastExperiments.length})
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {pastExperiments.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={async () => {
                      const res = await getExperimentDetails(exp.id);
                      setTrainResult(res);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between border ${
                      trainResult?.experiment_id === exp.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {exp.target_column} ({exp.problem_type})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Best: {exp.best_model}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Results Panel (8 cols) */}
        <div className="lg:col-span-8">
          {trainResult ? (
            <div className="space-y-5">
              {/* Top Scorecard Banner */}
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold mb-2 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Optimal Model: {trainResult.best_model}
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">
                    Benchmark Completed: <span className="text-indigo-600 dark:text-indigo-400">{trainResult.target_column}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluated on {trainResult.train_samples} train / {trainResult.test_samples} test records ({trainResult.problem_type}).
                  </p>
                </div>

                <div className="flex gap-3 text-center">
                  <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {trainResult.best_model_metrics?.primary_metric?.toFixed(4) ?? '0.000'}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      {trainResult.best_model_metrics?.metric_name || 'Metric'}
                    </div>
                  </div>
                  <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                      {trainResult.best_model_metrics?.cv_score?.toFixed(4) ?? '0.000'}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      CV Mean Score
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs for Results */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setResultTab('leaderboard')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    resultTab === 'leaderboard'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Model Leaderboard
                </button>
                <button
                  onClick={() => setResultTab('explainability')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    resultTab === 'explainability'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  SHAP & Feature Importance
                </button>
                <button
                  onClick={() => setResultTab('predictions')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    resultTab === 'predictions'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Diagnostics & Predictions
                </button>
              </div>

              {/* Tab 1: Leaderboard */}
              {resultTab === 'leaderboard' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-card">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      K-Fold Cross-Validation & Test Benchmarking
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Algorithm</th>
                          <th className="py-3 px-4">CV Score (Mean ± Std)</th>
                          <th className="py-3 px-4">Test {trainResult.best_model_metrics?.metric_name}</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {trainResult.leaderboard.map((model, idx) => {
                          const isBest = model.model_name === trainResult.best_model;
                          return (
                            <tr
                              key={idx}
                              className={`transition-colors ${
                                isBest
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold text-slate-900 dark:text-white'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="py-3 px-4 flex items-center gap-2">
                                {isBest && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                                <span>{model.model_name}</span>
                              </td>
                              <td className="py-3 px-4 font-mono">
                                {model.cv_score?.toFixed(4)} ± {model.cv_std?.toFixed(4)}
                              </td>
                              <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                {model.primary_metric?.toFixed(4)}
                              </td>
                              <td className="py-3 px-4">
                                {isBest ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                    Selected Best
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Candidate</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Explainability (Feature Importance + SHAP) */}
              {resultTab === 'explainability' && (
                <div className="space-y-5">
                  {/* Feature Importance Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Global Feature Importance (Impact Ranking %)
                    </h3>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={trainResult.feature_importance}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={80} />
                          <Tooltip
                            formatter={(value: any) => [`${value}%`, 'Relative Impact']}
                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                          />
                          <Bar dataKey="normalized_pct" radius={[0, 4, 4, 0]}>
                            {trainResult.feature_importance.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={index === 0 ? '#4f46e5' : index < 3 ? '#6366f1' : '#94a3b8'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Local SHAP Samples */}
                  {trainResult.sample_explanations && trainResult.sample_explanations.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        Local Instance Explanations (SHAP Value Attribution)
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trainResult.sample_explanations.slice(0, 4).map((sample, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800"
                          >
                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-2">
                              Test Instance #{sample.sample_index}
                            </div>
                            <div className="space-y-1">
                              {sample.top_contributions.map((c, ci) => (
                                <div key={ci} className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                                    {c.feature}
                                  </span>
                                  <span
                                    className={`font-mono font-bold ${
                                      c.shap_value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {c.shap_value >= 0 ? '+' : ''}
                                    {c.shap_value.toFixed(4)}
                                  </span>
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

              {/* Tab 3: Predictions & Confusion Matrix */}
              {resultTab === 'predictions' && (
                <div className="space-y-5">
                  {trainResult.confusion_matrix && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
                        Confusion Matrix
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="text-center text-xs border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 text-slate-400">Actual \ Predicted</th>
                              {trainResult.confusion_matrix.labels.map((lbl, i) => (
                                <th key={i} className="p-2 font-semibold text-slate-700 dark:text-slate-300">
                                  {lbl}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {trainResult.confusion_matrix.matrix.map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td className="p-2 font-semibold text-slate-700 dark:text-slate-300 text-left">
                                  {trainResult.confusion_matrix?.labels[rIdx]}
                                </td>
                                {row.map((val, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`p-3 font-mono font-bold border border-slate-200 dark:border-slate-800 ${
                                      rIdx === cIdx
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {val}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sample Test Predictions */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
                      Sample Test Set Predictions (First 10 Instances)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Row Index</th>
                            <th className="py-2.5 px-3">Ground Truth</th>
                            <th className="py-2.5 px-3">Model Prediction</th>
                            <th className="py-2.5 px-3">Status / Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {trainResult.test_predictions.slice(0, 10).map((pred, i) => {
                            const isMatch = String(pred.actual) === String(pred.predicted);
                            return (
                              <tr key={i} className="text-slate-700 dark:text-slate-300">
                                <td className="py-2.5 px-3 font-mono text-slate-400">#{pred.index}</td>
                                <td className="py-2.5 px-3 font-medium">{String(pred.actual)}</td>
                                <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                                  {String(pred.predicted)}
                                </td>
                                <td className="py-2.5 px-3">
                                  {isMatch ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                                      Match
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-semibold">
                                      {pred.error !== null ? `Err: ${pred.error.toFixed(2)}` : 'Mismatch'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                No Active Model Benchmark
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
                Configure your target feature on the left and click "Train & Benchmark Pipeline" to evaluate Scikit-Learn, LightGBM, and XGBoost models.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
