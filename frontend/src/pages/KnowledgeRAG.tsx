import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  UploadCloud,
  FileText,
  Search,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Layers,
  Shield,
} from 'lucide-react';
import {
  uploadRAGDocument,
  listRAGDocuments,
  deleteRAGDocument,
  queryKnowledgeRAG,
} from '../lib/api';
import type {
  RAGDocument,
  RAGQueryResponse,
} from '../lib/api';

export const KnowledgeRAG: React.FC = () => {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [querying, setQuerying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  // Search state
  const [queryText, setQueryText] = useState<string>('');
  const [queryResult, setQueryResult] = useState<RAGQueryResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await listRAGDocuments();
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch knowledge documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setSuccessMessage(null);
      const res = await uploadRAGDocument(file);
      setSuccessMessage(res.message || 'Document indexed successfully!');
      loadDocuments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to upload and index document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteRAGDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSearch = async (sampleQuery?: string) => {
    const q = sampleQuery || queryText;
    if (!q.trim() || querying) return;

    try {
      setQuerying(true);
      setError(null);
      const res = await queryKnowledgeRAG({ query: q, top_k: 5 });
      setQueryResult(res);
      if (sampleQuery) setQueryText(sampleQuery);
    } catch (err: any) {
      setError(err.message || 'Semantic query failed.');
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BrainCircuit className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Knowledge RAG Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Retrieval-Augmented Generation connecting domain documentation, business dictionaries, and research with analytical data.
          </p>
        </div>

        {/* Upload Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.md,.markdown,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Extracting & Indexing Chunks...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document (PDF, TXT, CSV)</span>
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

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Pre-Upload Document Privacy & Vector Governance Notice */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] leading-relaxed">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Document Privacy & Vector Governance Notice:
          </span>
          <p>
            Uploaded documents are extracted locally and indexed into your private, persistent ChromaDB vector store. Text passages and vector embeddings are <strong>never transmitted to external AI providers</strong> or shared across unauthorized users. Ensure you have rights to upload submitted materials and do not upload confidential or third-party personal records. Deleting any document permanently purges the file, database records, and ChromaDB vector embeddings.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Document Corpus, Right Semantic Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Corpus Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-card">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                Indexed Knowledge Base
              </span>
              <span className="text-[10px] text-slate-400">{documents.length} Docs</span>
            </h2>

            {documents.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  No documents indexed yet
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Upload a PDF report, research note, or data dictionary.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[550px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {doc.file_type}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {doc.filename}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                        <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{doc.chunk_count} Chunks</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                      title="Delete Document"
                      aria-label={`Delete document ${doc.filename}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Semantic Q&A Panel (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Query Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Ask a question across your domain documents & research..."
                  disabled={querying}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={querying || !queryText.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {querying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Search & Synthesize</span>
                  </>
                )}
              </button>
            </form>

            {/* Sample Prompts */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Try:</span>
              {[
                'What are the primary data quality constraints?',
                'Summarize the key metrics and target goals',
                'What business definitions are specified?',
              ].map((sp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(sp)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  "{sp}"
                </button>
              ))}
            </div>
          </div>

          {/* Results Area */}
          {queryResult ? (
            <div className="space-y-5">
              {/* Grounded Answer Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Synthesized Knowledge Answer
                    </h3>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                    Confidence: {Math.round(queryResult.confidence * 100)}%
                  </span>
                </div>

                {/* Answer Content */}
                <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {queryResult.answer}
                </div>

                {/* Citations Badges */}
                {queryResult.citations && queryResult.citations.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Source Citations:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {queryResult.citations.map((c) => (
                        <div
                          key={c.id}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 text-[10px] font-semibold flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3 h-3 text-indigo-500" />
                          <span>{c.label}</span>
                          <span className="text-indigo-500 font-mono">({Math.round(c.relevance_score * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Retrieved Chunks / Evidence Passages */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Retrieved Passages & Evidence ({queryResult.retrieved_chunks.length})
                </h4>

                <div className="space-y-3">
                  {queryResult.retrieved_chunks.map((ch, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {ch.filename} • Page {ch.page_number}
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {Math.round(ch.relevance_score * 100)}% match
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        {ch.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <BrainCircuit className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Awaiting Knowledge Query
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Type your query above to perform semantic vector retrieval across uploaded documentation with grounded citation references.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
