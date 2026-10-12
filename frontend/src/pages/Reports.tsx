import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  listDatasets,
  generateReport,
  listReports,
  getReportDetails,
  downloadReportPdf,
  deleteReport,
} from '../lib/api';
import type {
  DatasetItem,
  ReportSummaryItem,
  ReportDetailResponse,
} from '../lib/api';

export const Reports: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [reports, setReports] = useState<ReportSummaryItem[]>([]);
  const [activeReport, setActiveReport] = useState<ReportDetailResponse | null>(null);

  const [generating, setGenerating] = useState<boolean>(false);
  const [, setLoading] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPdf = async (reportId: string, title?: string) => {
    try {
      setDownloadingPdf(true);
      setError(null);
      setDownloadSuccess(null);
      const filename = `${(title || 'InsightForge_Report').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await downloadReportPdf(reportId, filename);
      setDownloadSuccess(`Publication PDF (${filename}) downloaded successfully.`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      if (err?.status === 401) {
        setError('Your session has expired. Please sign in again to download reports.');
      } else if (err?.status === 404) {
        setError('The requested report was not found or access is denied.');
      } else {
        setError(err?.message || 'Failed to download report PDF. Please try again.');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };


  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dsList, repList] = await Promise.all([
        listDatasets(),
        listReports(),
      ]);
      setDatasets(dsList);
      if (dsList.length > 0) setSelectedDatasetId(dsList[0].dataset_id);
      setReports(repList);
      if (repList.length > 0) {
        const first = await getReportDetails(repList[0].id);
        setActiveReport(first);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDatasetId || generating) return;

    try {
      setGenerating(true);
      setError(null);
      const res = await generateReport({ dataset_id: selectedDatasetId });
      setActiveReport(res);
      const updated = await listReports();
      setReports(updated);
    } catch (err: any) {
      setError(err.message || 'Report synthesis failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectReport = async (reportId: string) => {
    try {
      const details = await getReportDetails(reportId);
      setActiveReport(details);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      await deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (activeReport?.id === reportId) {
        setActiveReport(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Executive Intelligence Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Synthesize comprehensive data audits, correlation matrices, ML benchmark results, and strategic action plans into PDF deliverables.
          </p>
        </div>

        {/* Generate Controls */}
        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            disabled={generating || datasets.length === 0}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            {datasets.map((d) => (
              <option key={d.dataset_id} value={d.dataset_id}>
                {d.filename} ({d.rows} rows)
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedDatasetId}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Compiling Intelligence & PDF...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Executive Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Main Grid: Left Past Reports, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left History Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-card">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Saved Dossiers</span>
              <span className="text-[10px] text-slate-400">{reports.length}</span>
            </h2>

            {reports.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No reports generated yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {reports.map((r) => {
                  const isSelected = activeReport?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectReport(r.id)}
                      className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold truncate mb-1">
                        <span className="truncate">{r.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdf(r.id, r.title);
                            }}
                            className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                            title={`Download ${r.title} PDF`}
                            aria-label={`Download report ${r.title}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                            title={`Delete report ${r.title}`}
                            aria-label={`Delete report ${r.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Active Report Preview (9 cols) */}
        <div className="lg:col-span-9">
          {activeReport ? (
            <div className="space-y-5">
              {/* Top Action Header */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeReport.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Generated: {activeReport.content?.generated_at || 'Just now'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(activeReport.id, activeReport.title)}
                  disabled={downloadingPdf}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  {downloadingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Publication PDF</span>
                    </>
                  )}
                </button>
              </div>

              {/* KPI Stat Cards */}
              {activeReport.content?.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card text-center">
                    <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {activeReport.content.metrics.total_rows.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-1">
                      Observations
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card text-center">
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {activeReport.content.metrics.total_columns}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-1">
                      Attributes
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card text-center">
                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {activeReport.content.metrics.health_score}/100
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-1">
                      Health Score
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card text-center">
                    <div className="text-2xl font-extrabold text-amber-500">
                      {activeReport.content.metrics.duplicate_rows}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-1">
                      Duplicate Rows
                    </div>
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  1. Executive Briefing
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeReport.executive_summary}
                </p>
              </div>

              {/* Correlations Table */}
              {activeReport.content?.top_correlations && activeReport.content.top_correlations.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    2. Statistical Dependencies & Correlations
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Feature A</th>
                          <th className="py-2.5 px-3">Feature B</th>
                          <th className="py-2.5 px-3">Pearson (r)</th>
                          <th className="py-2.5 px-3">Evaluation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeReport.content.top_correlations.map((c: any, i: number) => (
                          <tr key={i} className="text-slate-700 dark:text-slate-300">
                            <td className="py-2 px-3 font-semibold">{c.feat_a}</td>
                            <td className="py-2 px-3 font-semibold">{c.feat_b}</td>
                            <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {c.r}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[10px] text-slate-400">
                                {c.r > 0.6 ? 'Strong Positive' : c.r < -0.6 ? 'Strong Negative' : 'Moderate'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Machine Learning Benchmark Table */}
              {activeReport.content?.ml_benchmark && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    3. Machine Learning Scorecard
                  </h3>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                      Best Performing Algorithm:
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {activeReport.content.ml_benchmark.best_model}
                    </span>
                  </div>
                </div>
              )}

              {/* Strategic Action Items */}
              {activeReport.content?.recommendations && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    4. Strategic Action Items
                  </h3>
                  <div className="space-y-2">
                    {activeReport.content.recommendations.map((rec: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                No Report Selected
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Select a dataset and click "Generate Executive Report" to produce a publication-grade PDF briefing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
