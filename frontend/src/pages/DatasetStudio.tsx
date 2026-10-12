import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Table,
  Columns,
  Layers,
  Database,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  Check,
  Trash2,
  BarChart2,
  FlaskConical,
  Shield,
} from 'lucide-react';

import type { DatasetDetailResponse, DatasetItem } from '../lib/api';
import { uploadDataset, listDatasets, getDataset, deleteDataset } from '../lib/api';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const DatasetStudio: React.FC = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datasetData, setDatasetData] = useState<DatasetDetailResponse | null>(null);
  const [savedDatasets, setSavedDatasets] = useState<DatasetItem[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSavedDatasets = async () => {
    setLoadingDatasets(true);
    try {
      const items = await listDatasets();
      setSavedDatasets(items);
      // Auto-select latest dataset if none is selected
      if (!datasetData && items.length > 0) {
        selectDataset(items[0].dataset_id);
      }
    } catch {
      // Backend might be offline
    } finally {
      setLoadingDatasets(false);
    }
  };

  const selectDataset = async (datasetId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getDataset(datasetId);
      setDatasetData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load dataset details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, datasetId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await deleteDataset(datasetId);
      if (datasetData?.dataset_id === datasetId) {
        setDatasetData(null);
      }
      await loadSavedDatasets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete dataset.');
    }
  };

  useEffect(() => {
    loadSavedDatasets();
  }, []);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      return 'Invalid file type. Supported formats are CSV (.csv) and Excel (.xlsx, .xls).';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File exceeds the 50 MB size limit (${formatBytes(file.size)}). Please upload a smaller file.`;
    }
    return null;
  };

  const handleFileSelection = async (file: File) => {
    setErrorMessage(null);
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await uploadDataset(file);
      setDatasetData(response);
      await loadSavedDatasets();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during dataset upload.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const totalMissingValues = datasetData
    ? datasetData.column_info.reduce((sum, col) => sum + col.missing, 0)
    : 0;
  const columnsWithMissing = datasetData
    ? datasetData.column_info.filter((col) => col.missing > 0).length
    : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dataset Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Ingest tabular CSV and Excel files, inspect schemas, and verify integrity for automated ML.
          </p>
        </div>

        {datasetData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/auto-eda?dataset_id=${datasetData.dataset_id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-xs"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Launch Auto EDA
            </button>
            <button
              onClick={() => navigate(`/ml-lab?dataset_id=${datasetData.dataset_id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs transition-colors shadow-xs"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Train ML Model
            </button>
          </div>
        )}
      </div>

      {/* Upload Box Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Data Ingestion
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Limit: 50 MB</span>
            <span>•</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">.csv, .xlsx, .xls</span>
          </div>
        </div>

        {/* Drag & Drop Container */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all p-8 sm:p-12 text-center flex flex-col items-center justify-center cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
              : 'border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-900/50'
          }`}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onInputChange}
            disabled={isLoading}
          />

          {isLoading ? (
            <div className="py-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Parsing & Persisting Dataset...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Generating data profile, statistics, and schema registry.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                  isDragging
                    ? 'scale-110 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
                    : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                <UploadCloud className="w-7 h-7" />
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Drag and drop your CSV or Excel dataset here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 max-w-md">
                Automatic data parsing, duplicate detection, and schema inference.
              </p>

              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Browse Files
              </button>

              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 mt-4">
                <span>CSV, XLSX, XLS</span>
                <span>•</span>
                <span>Comma, semicolon, tab auto-detection</span>
                <span>•</span>
                <span>Max 50 MB per file</span>
              </div>
            </div>
          )}
        </div>

        {/* Pre-Upload Privacy & Data Governance Notice */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
          <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Data Privacy & Ingestion Notice:
            </span>
            <p>
              Uploaded tabular datasets are processed locally in memory for statistical profiling and machine learning benchmarking, and persist in your local storage until you initiate deletion. Raw data is <strong>never transmitted to external AI providers</strong> unless you configure an external LLM API key in Settings. Do not upload confidential or third-party personal data without appropriate authorization. You can permanently erase datasets and derived models at any time below.
            </p>
          </div>
        </div>

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="mt-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-semibold text-rose-900 dark:text-rose-200 text-sm mb-0.5">
                Upload & Parsing Error
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Saved Datasets Selector / Switcher */}
        <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Workspace Datasets ({savedDatasets.length})
            </span>
            <button
              onClick={loadSavedDatasets}
              disabled={loadingDatasets}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingDatasets ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {savedDatasets.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Database className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No datasets in workspace
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Upload a CSV or Excel file above to begin profiling schemas and training models.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedDatasets.map((d) => (
                <div
                  key={d.dataset_id}
                  onClick={() => selectDataset(d.dataset_id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    datasetData?.dataset_id === d.dataset_id
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs ring-1 ring-indigo-500'
                      : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate font-mono">
                      {d.filename}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {d.rows.toLocaleString()} rows • {d.columns} cols • {formatBytes(d.size_bytes)}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, d.dataset_id)}
                    title="Delete dataset"
                    aria-label={`Delete dataset ${d.filename}`}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dataset Summary & Exploration (Rendered dynamically when response is received) */}
      {datasetData && (
        <div className="space-y-8">
          {/* Metadata KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Rows
                </span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {datasetData.rows.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Observations
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Features
                </span>
                <Columns className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {datasetData.columns}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Variables recorded
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Duplicates
                </span>
                {datasetData.duplicate_rows > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {datasetData.duplicate_rows}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {datasetData.duplicate_rows > 0 ? 'Duplicate rows' : 'Zero duplicates'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Missing Cells
                </span>
                {totalMissingValues > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {totalMissingValues}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {columnsWithMissing > 0
                  ? `Across ${columnsWithMissing} column(s)`
                  : 'Complete dataset (0 nulls)'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Memory Size
                </span>
                <HardDrive className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {formatBytes(datasetData.size_bytes)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Storage footprint
              </p>
            </div>
          </div>

          {/* Dataset Columns Information Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Columns className="w-4 h-4 text-indigo-500" />
              Schema & Feature Types
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Inferred data types, semantic categories, and distinct values.
            </p>

            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800 text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">Feature Name</th>
                    <th scope="col" className="px-4 py-3">Inferred Type</th>
                    <th scope="col" className="px-4 py-3">Semantic Role</th>
                    <th scope="col" className="px-4 py-3">Missing Cells</th>
                    <th scope="col" className="px-4 py-3">Unique Values</th>
                    <th scope="col" className="px-4 py-3">Completeness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {datasetData.column_info.map((col, idx) => {
                    const completeness = datasetData.rows > 0
                      ? (((datasetData.rows - col.missing) / datasetData.rows) * 100).toFixed(1)
                      : '100';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                          {col.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px]">
                            {col.dtype}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {col.semantic_type || 'feature'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {col.missing}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {col.unique}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  Number(completeness) === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${completeness}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {completeness}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dataset Preview Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-500" />
                Raw Data Preview (Top 10 Rows)
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Showing {datasetData.preview.length} of {datasetData.rows.toLocaleString()} rows
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Real observations streamed directly from server persistence.
            </p>

            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200/80 dark:divide-slate-800 text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-mono text-slate-400 dark:text-slate-500 w-12 text-center">
                      #
                    </th>
                    {datasetData.column_info.map((col, idx) => (
                      <th scope="col" key={idx} className="px-4 py-2.5 whitespace-nowrap">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {datasetData.preview.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-slate-400 dark:text-slate-500 text-center select-none">
                        {rowIdx + 1}
                      </td>
                      {datasetData.column_info.map((col, colIdx) => {
                        const val = row[col.name];
                        const isNull = val === null || val === undefined;

                        return (
                          <td
                            key={colIdx}
                            className="px-4 py-2 whitespace-nowrap font-mono text-slate-800 dark:text-slate-200"
                          >
                            {isNull ? (
                              <span className="italic text-slate-400 dark:text-slate-500 text-[11px]">
                                null
                              </span>
                            ) : typeof val === 'object' ? (
                              JSON.stringify(val)
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
