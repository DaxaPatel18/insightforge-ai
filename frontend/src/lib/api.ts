/**
 * InsightForge AI - Typed API Client
 * Endpoints for Datasets, Automated EDA, Machine Learning & Explainable AI.
 */

export interface ColumnInfo {
  name: string;
  dtype: string;
  semantic_type?: string;
  missing: number;
  missing_pct?: number;
  unique: number;
}

export interface DatasetSummaryStats {
  numeric: Record<string, {
    mean: number | null;
    std: number | null;
    min: number | null;
    q25: number | null;
    median: number | null;
    q75: number | null;
    max: number | null;
    skew: number | null;
    kurtosis: number | null;
  }>;
  categorical: Record<string, {
    unique: number;
    top_value: string | null;
    top_frequencies: Record<string, number>;
  }>;
}

export interface DatasetItem {
  dataset_id: string;
  filename: string;
  file_format: string;
  rows: number;
  columns: number;
  size_bytes: number;
  duplicate_rows: number;
  created_at: string | null;
}

export interface DatasetDetailResponse extends DatasetItem {
  column_info: ColumnInfo[];
  preview: Record<string, any>[];
  summary_stats: DatasetSummaryStats;
  transformations?: Array<{
    id: string;
    step_number: number;
    operation: string;
    description: string;
    rows_before: number;
    rows_after: number;
    created_at: string | null;
  }>;
}

export interface CorrelationRow {
  column: string;
  values: number[];
}

export interface CorrelationsResponse {
  columns: string[];
  pearson: CorrelationRow[];
  spearman: CorrelationRow[];
}

export interface DistributionBin {
  range: string;
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface DistributionMetric {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  lower_bound: number;
  upper_bound: number;
  outlier_count: number;
  outlier_percentage: number;
  bins: DistributionBin[];
}

export type DistributionsResponse = Record<string, DistributionMetric>;

export interface EDAInsight {
  category: 'scale' | 'data_quality' | 'distribution' | 'correlation' | 'schema';
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
}

export interface CleaningOperation {
  action: 'drop_duplicates' | 'drop_null_rows' | 'impute_missing' | 'log_transform' | 'drop_columns';
  column?: string;
  columns?: string[];
  strategy?: 'mean' | 'median' | 'mode' | 'constant';
  fill_value?: any;
}

export interface ModelLeaderboardItem {
  model_name: string;
  cv_score: number;
  cv_std: number;
  primary_metric: number;
  metric_name: string;
  accuracy?: number;
  f1?: number;
  precision?: number;
  recall?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
}

export interface FeatureImportanceItem {
  rank: number;
  feature: string;
  importance: number;
  normalized_pct: number;
}

export interface LocalShapSample {
  sample_index: number;
  top_contributions: Array<{
    feature: string;
    shap_value: number;
  }>;
}

export interface MLTrainResult {
  experiment_id?: string;
  experiment_name?: string;
  problem_type: string;
  target_column: string;
  feature_columns: string[];
  test_size: number;
  train_samples: number;
  test_samples: number;
  best_model: string;
  leaderboard: ModelLeaderboardItem[];
  best_model_metrics: ModelLeaderboardItem;
  test_predictions: Array<{
    index: number;
    actual: any;
    predicted: any;
    error: number | null;
  }>;
  confusion_matrix?: {
    labels: string[];
    matrix: number[][];
  };
  residuals?: {
    mean_residual: number;
    std_residual: number;
    scatter: Array<{ actual: number; predicted: number; residual: number }>;
  };
  feature_importance: FeatureImportanceItem[];
  sample_explanations: LocalShapSample[];
}

const ENV_BACKEND_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)) ||
  ''
).replace(/\/+$/, '');

// Track active and verified connection URL
let activeBaseUrl: string | null = null;

export function getApiBaseUrls(): string[] {
  const urls: string[] = [];
  if (ENV_BACKEND_URL) {
    urls.push(ENV_BACKEND_URL);
  }
  // Try relative path first (seamlessly handled by Vite proxy / reverse proxy)
  urls.push('');
  // Explicit IPv4 loopback (prevents Windows IPv6 [::1] connection refused bug)
  urls.push('http://127.0.0.1:8000');
  // Localhost fallback
  urls.push('http://localhost:8000');
  return Array.from(new Set(urls));
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  professional_role?: string | null;
  created_at: string | null;
}

export interface UserDataSummary {
  dataset_count: number;
  total_rows: number;
  total_storage_bytes: number;
  report_count: number;
  document_count: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

let currentAuthToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('insightforge_auth_token') : null;

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined' && !currentAuthToken) {
    currentAuthToken = localStorage.getItem('insightforge_auth_token');
  }
  return currentAuthToken;
}

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('insightforge_auth_token', token);
    } else {
      localStorage.removeItem('insightforge_auth_token');
    }
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<AuthResponse>(res);
  setAuthToken(data.access_token);
  return data;
}

export async function registerUser(email: string, password: string, fullName?: string, professionalRole?: string): Promise<AuthResponse> {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName, professional_role: professionalRole }),
  });
  const data = await handleResponse<AuthResponse>(res);
  setAuthToken(data.access_token);
  return data;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const res = await apiFetch('/api/auth/me');
  return handleResponse<UserProfile>(res);
}

export async function updateUserProfile(payload: { full_name?: string; professional_role?: string }): Promise<UserProfile> {
  const res = await apiFetch('/api/auth/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<UserProfile>(res);
}

export async function changeUserPassword(payload: { current_password: string; new_password: string }): Promise<{ message: string }> {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ message: string }>(res);
}

export async function deleteUserAccount(password: string): Promise<{ message: string }> {
  const res = await apiFetch('/api/auth/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await handleResponse<{ message: string }>(res);
  setAuthToken(null);
  return data;
}

export async function getUserDataSummary(): Promise<UserDataSummary> {
  const res = await apiFetch('/api/auth/data-summary');
  return handleResponse<UserDataSummary>(res);
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const modifiedInit: RequestInit = { ...(init || {}) };
  const headers = new Headers(modifiedInit.headers || {});
  
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  modifiedInit.headers = headers;

  const candidates: string[] = [];

  if (activeBaseUrl !== null) {
    candidates.push(activeBaseUrl === '' ? normalizedPath : `${activeBaseUrl}${normalizedPath}`);
  }

  for (const base of getApiBaseUrls()) {
    const candidate = base === '' ? normalizedPath : `${base}${normalizedPath}`;
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  let lastError: any = null;
  let lastRes: Response | null = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, modifiedInit);
      // If a proxy returns 502/504 Bad Gateway, try next candidate before failing
      if ((res.status === 502 || res.status === 504) && candidates.length > 1) {
        lastRes = res;
        activeBaseUrl = null;
        continue;
      }
      activeBaseUrl = url.includes('://') ? new URL(url).origin : '';
      return res;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  if (lastRes) {
    return lastRes;
  }

  throw new Error(
    `Unable to connect to FastAPI backend at http://127.0.0.1:8000. Please verify the backend is running. (${lastError?.message || 'Failed to fetch'})`
  );
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Server responded with status ${res.status} (${res.statusText})`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        message = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/** Check FastAPI backend health */
export async function checkBackendHealth(): Promise<{ status: string }> {
  const res = await apiFetch('/health');
  return handleResponse<{ status: string }>(res);
}

/** Upload CSV or Excel file */
export async function uploadDataset(file: File): Promise<DatasetDetailResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch('/api/datasets/upload', {
    method: 'POST',
    body: formData,
  });
  return handleResponse<DatasetDetailResponse>(res);
}

/** List all uploaded datasets */
export async function listDatasets(): Promise<DatasetItem[]> {
  const res = await apiFetch('/api/datasets');
  return handleResponse<DatasetItem[]>(res);
}

/** Get single dataset details and schema */
export async function getDataset(datasetId: string): Promise<DatasetDetailResponse> {
  const res = await apiFetch(`/api/datasets/${datasetId}`);
  return handleResponse<DatasetDetailResponse>(res);
}

/** Delete dataset */
export async function deleteDataset(datasetId: string): Promise<{ message: string }> {
  const res = await apiFetch(`/api/datasets/${datasetId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ message: string }>(res);
}

/** EDA: Correlations */
export async function getEDACorrelations(datasetId: string): Promise<CorrelationsResponse> {
  const res = await apiFetch(`/api/eda/${datasetId}/correlations`);
  return handleResponse<CorrelationsResponse>(res);
}

/** EDA: Distributions and Outliers */
export async function getEDADistributions(datasetId: string): Promise<DistributionsResponse> {
  const res = await apiFetch(`/api/eda/${datasetId}/distributions`);
  return handleResponse<DistributionsResponse>(res);
}

/** EDA: Automated Rule-based Insights */
export async function getEDAInsights(datasetId: string): Promise<EDAInsight[]> {
  const res = await apiFetch(`/api/eda/${datasetId}/insights`);
  return handleResponse<EDAInsight[]>(res);
}

/** EDA: Apply Data Cleaning Operations */
export async function cleanDataset(datasetId: string, operations: CleaningOperation[]): Promise<any> {
  const res = await apiFetch(`/api/eda/${datasetId}/clean`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations }),
  });
  return handleResponse<any>(res);
}

/** ML: Train & Benchmark Pipeline */
export interface MLTrainPayload {
  target_column: string;
  feature_columns?: string[];
  problem_type?: string;
  test_size?: number;
  time_series_col?: string;
  experiment_name?: string;
  tune_hyperparameters?: boolean;
  cv_folds?: number;
}

export interface ExperimentComparisonItem {
  id: string;
  name: string;
  dataset_id: string;
  target_column: string;
  problem_type: string;
  best_model: string;
  primary_metric_name: string;
  primary_metric_value: number;
  cv_score: number;
  accuracy?: number;
  f1?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  feature_count: number;
  feature_columns: string[];
  hyperparameters: Record<string, any>;
  created_at: string | null;
}

export interface ExperimentComparisonResult {
  compared_count: number;
  winner_id: string;
  winner_name: string;
  winner_model: string;
  recommendation: string;
  experiments: ExperimentComparisonItem[];
}

export async function trainMLPipeline(datasetId: string, payload: MLTrainPayload): Promise<MLTrainResult> {
  const res = await apiFetch(`/api/ml/${datasetId}/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MLTrainResult>(res);
}

/** ML: List Experiments for Dataset */
export async function listDatasetExperiments(datasetId: string): Promise<any[]> {
  const res = await apiFetch(`/api/ml/${datasetId}/experiments`);
  return handleResponse<any[]>(res);
}

/** ML: Get Experiment Details */
export async function getExperimentDetails(experimentId: string): Promise<MLTrainResult> {
  const res = await apiFetch(`/api/ml/experiments/${experimentId}`);
  return handleResponse<MLTrainResult>(res);
}

/** ML: Compare multiple experiments */
export async function compareMLExperiments(experimentIds: string[]): Promise<ExperimentComparisonResult> {
  const query = encodeURIComponent(experimentIds.join(','));
  const res = await apiFetch(`/api/ml/experiments/compare?experiment_ids=${query}`);
  return handleResponse<ExperimentComparisonResult>(res);
}

/** AGENT STUDIO API **/
export interface AgentReasoningStep {
  step: number;
  type: 'thought' | 'tool_call' | 'observation' | 'reflection';
  title: string;
  content: string;
  tool?: string;
  args?: Record<string, any>;
}

export interface AgentChatResponse {
  session_id: string;
  agent_role: string;
  user_message: string;
  final_response: string;
  reasoning_steps: AgentReasoningStep[];
  data_payload?: {
    type: 'chart' | 'table';
    chart_type?: 'bar' | 'line' | 'scatter';
    title?: string;
    data?: any[];
    x_key?: string;
    y_key?: string;
    columns?: string[];
  };
}

export interface AgentSessionItem {
  id: string;
  title: string;
  dataset_id: string | null;
  agent_role: string;
  created_at: string | null;
  updated_at: string | null;
  message_count: number;
}

export async function sendAgentMessage(payload: {
  session_id?: string;
  dataset_id?: string;
  agent_role: string;
  message: string;
  api_key?: string;
}): Promise<AgentChatResponse> {
  const res = await apiFetch('/api/agents/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AgentChatResponse>(res);
}

export async function listAgentSessions(): Promise<AgentSessionItem[]> {
  const res = await apiFetch('/api/agents/sessions');
  return handleResponse<AgentSessionItem[]>(res);
}

export async function getAgentSessionHistory(sessionId: string): Promise<any> {
  const res = await apiFetch(`/api/agents/sessions/${sessionId}`);
  return handleResponse<any>(res);
}

export async function deleteAgentSession(sessionId: string): Promise<{ message: string }> {
  const res = await apiFetch(`/api/agents/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ message: string }>(res);
}

/** KNOWLEDGE RAG API **/
export interface RAGDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  chunk_count: number;
  created_at: string | null;
}

export interface RAGCitation {
  id: number;
  label: string;
  filename: string;
  page_number: number;
  relevance_score: number;
  snippet: string;
}

export interface RAGChunkResult {
  chunk_index: number;
  document_id?: string;
  filename: string;
  page_number: number;
  content: string;
  relevance_score: number;
}

export interface RAGQueryResponse {
  query: string;
  answer: string;
  confidence: number;
  retrieved_chunks: RAGChunkResult[];
  citations: RAGCitation[];
}

export async function uploadRAGDocument(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch('/api/rag/upload', {
    method: 'POST',
    body: formData,
  });
  return handleResponse<any>(res);
}

export async function listRAGDocuments(): Promise<RAGDocument[]> {
  const res = await apiFetch('/api/rag/documents');
  return handleResponse<RAGDocument[]>(res);
}

export async function deleteRAGDocument(docId: string): Promise<{ message: string }> {
  const res = await apiFetch(`/api/rag/documents/${docId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ message: string }>(res);
}

export async function queryKnowledgeRAG(payload: {
  query: string;
  top_k?: number;
  document_ids?: string[];
}): Promise<RAGQueryResponse> {
  const res = await apiFetch('/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<RAGQueryResponse>(res);
}

/** REPORTS API **/
export interface ReportSummaryItem {
  id: string;
  dataset_id: string;
  dataset_name: string;
  title: string;
  executive_summary: string;
  pdf_url: string;
  created_at: string | null;
}

export interface ReportDetailResponse {
  id: string;
  dataset_id: string;
  title: string;
  executive_summary: string;
  content: any;
  pdf_url: string;
  created_at: string | null;
}

export async function generateReport(payload: {
  dataset_id: string;
  experiment_id?: string;
  title?: string;
}): Promise<ReportDetailResponse> {
  const res = await apiFetch('/api/reports/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<ReportDetailResponse>(res);
}

export async function listReports(): Promise<ReportSummaryItem[]> {
  const res = await apiFetch('/api/reports');
  return handleResponse<ReportSummaryItem[]>(res);
}

export async function getReportDetails(reportId: string): Promise<ReportDetailResponse> {
  const res = await apiFetch(`/api/reports/${reportId}`);
  return handleResponse<ReportDetailResponse>(res);
}

export async function downloadReportPdf(reportId: string, filename = `InsightForge_Report_${reportId.slice(0, 8)}.pdf`): Promise<void> {
  const res = await apiFetch(`/api/reports/${reportId}/pdf`, {
    headers: {
      'Accept': 'application/pdf',
    },
  });

  if (!res.ok) {
    let errorDetail = 'Failed to download PDF report';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // response might not be json
    }
    const err = new Error(errorDetail) as any;
    err.status = res.status;
    throw err;
  }

  // Extract server-provided filename from Content-Disposition if present
  let resolvedFilename = filename;
  const disposition = res.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      resolvedFilename = match[1].trim();
    }
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = resolvedFilename.endsWith('.pdf') ? resolvedFilename : `${resolvedFilename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

export function getReportPdfDownloadUrl(reportId: string): string {
  const base = activeBaseUrl || ENV_BACKEND_URL || 'http://127.0.0.1:8000';
  return `${base}/api/reports/${reportId}/pdf`;
}

export async function deleteReport(reportId: string): Promise<{ message: string }> {
  const res = await apiFetch(`/api/reports/${reportId}`, {
    method: 'DELETE',
  });
  return handleResponse<{ message: string }>(res);
}

/** EVALUATIONS & HEALTH API **/
export interface PlatformSummaryResponse {
  platform_stats: {
    total_datasets: number;
    total_rows_analyzed: number;
    total_experiments: number;
    total_agent_sessions: number;
    total_agent_messages: number;
    total_rag_documents: number;
    total_rag_chunks: number;
    total_reports: number;
  };
  ml_evaluation: {
    evaluated_runs: number;
    average_cross_validation_score: number;
    top_selected_algorithm: string;
    algorithm_distribution: Record<string, number>;
    data_leakage_safeguard: string;
    cv_stability_index: string;
  };
  agent_evaluation: {
    tool_call_accuracy: string;
    reasoning_transparency: string;
    average_tool_latency_ms: number;
    supported_personas: number;
    safety_guardrails: string;
  };
  rag_evaluation: {
    groundedness_score: string;
    citation_fidelity: string;
    hybrid_retrieval_mode: string;
    indexed_chunks: number;
  };
}

export async function getPlatformSummary(): Promise<PlatformSummaryResponse> {
  const res = await apiFetch('/api/evaluations/summary');
  return handleResponse<PlatformSummaryResponse>(res);
}

