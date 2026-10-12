import React, { useState } from 'react';
import { Mail, Shield, CheckCircle2, User, Send, FileQuestion, Loader2, AlertCircle, MapPin } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [requestType, setRequestType] = useState<string>('privacy_dsar');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !message) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/contact/dsar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          full_name: fullName.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to submit request');
      }
      const data = await res.json();
      setRequestId(data.request_id);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
          <Mail className="w-4 h-4" />
          <span>Support &amp; Inquiries</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Contact &amp; Privacy Inquiries
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Submit privacy inquiries, data subject access requests (DSAR), technical feedback, or questions directly to the developer.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Information Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4 text-xs text-slate-600 dark:text-slate-400">
          {/* Operator Information Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              Developer &amp; Operator
            </h2>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div><strong>Product:</strong> InsightForge AI</div>
              <div><strong>Developer:</strong> Daxa Antiya</div>
              <div><strong>Status:</strong> Independent Developer &amp; Operator</div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span><strong>Location:</strong> Ahmedabad, Gujarat, India</span>
              </div>
              <div className="pt-1 text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                Notice: InsightForge AI is an independently developed, non-corporate technical project. Dedicated public communication channels are pending final configuration prior to public release. Please use the form on this page for all inquiries.
              </div>
            </div>
          </div>

          {/* Privacy & Inquiries Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-card space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              Privacy &amp; Data Rights
            </h2>
            <p className="text-[11px] leading-relaxed">
              In accordance with Data Principal rights under India&apos;s Digital Personal Data Protection Act, 2023, privacy inquiries, data access summaries, and erasure requests are reviewed directly by the developer:
            </p>
            <div className="space-y-1 font-mono text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <div><strong>Contact Person:</strong> Daxa Antiya</div>
              <div><strong>Role:</strong> Independent Developer &amp; Operator</div>
              <div><strong>Inquiry Channel:</strong> On-platform request form on this page</div>
              <div><strong>Handling:</strong> Reviewed and addressed on a best-effort basis</div>
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/60 text-[11px] space-y-1.5 text-indigo-900 dark:text-indigo-300">
            <span className="font-bold flex items-center gap-1.5">
              <FileQuestion className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Instant Self-Service Erasure:
            </span>
            <p>
              You can immediately delete datasets in <strong>Dataset Studio</strong>, remove knowledge documents in <strong>Knowledge RAG</strong>, and clear conversation history in <strong>Agent Studio</strong> directly within your workspace without waiting for ticket processing.
            </p>
          </div>
        </div>

        {/* Right Form Card (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-card">
            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Request Recorded &amp; Logged
                </h3>
                {requestId && (
                  <div className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Tracking ID: <span className="font-bold text-indigo-600 dark:text-indigo-400">{requestId}</span>
                  </div>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  Your request has been securely recorded. As an independent developer project, inquiries are reviewed directly by Daxa Antiya and addressed via <strong>{email}</strong>.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                    setRequestId(null);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit Privacy or Technical Inquiry
                </h2>

                <div>
                  <label htmlFor="request-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Request Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="request-type"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="privacy_dsar">Data Subject Access Request (Access / Summary)</option>
                    <option value="data_correction">Data Correction or Rectification</option>
                    <option value="data_erasure">Complete Data Erasure Request</option>
                    <option value="dpdp_grievance">Privacy Inquiry / DPDP Grievance Notice</option>
                    <option value="technical_support">General Inquiry / Technical Feedback</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="full-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Message / Request Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your inquiry, dataset reference, or privacy question..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Request</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
