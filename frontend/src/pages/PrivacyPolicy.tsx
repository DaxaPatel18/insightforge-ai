import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Database, Brain, HardDrive, RefreshCw, Mail, User } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
          <Shield className="w-4 h-4" />
          <span>Legal & Data Governance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Effective Date: October 2026 • Platform Version 0.3.0
        </p>
      </div>

      {/* Operator Notice Alert */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <User className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">Independent Developer & Operator Disclosure</p>
          <p>
            <strong>InsightForge AI</strong> is an independent software project developed and operated by{' '}
            <strong>Daxa Antiya</strong> (&ldquo;Independent Developer &amp; Operator&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;),
            based in <strong>Ahmedabad, Gujarat, India</strong>. InsightForge AI is not an incorporated company, registered enterprise, commercial firm, or certified organization.
            This Privacy Policy explains how data is handled across the platform.
          </p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-8 text-xs leading-relaxed text-slate-700 dark:text-slate-300">

        {/* 1. Core Architecture & Local-First Philosophy */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-500" />
            1. Core Architecture & Local-First Processing
          </h2>
          <p>
            InsightForge AI is architected with strict data minimization principles. By default, tabular dataset profiling,
            automated exploratory data analysis (EDA), predictive machine learning algorithm benchmarking (XGBoost, Random Forest, Scikit-learn),
            SHAP feature explainability, semantic vector embeddings, and executive report generation execute{' '}
            <strong>within your configured server environment</strong> (local machine or self-hosted server) and store data in your local persistence layer (SQLite or PostgreSQL database and local ChromaDB directory).
          </p>
        </section>

        {/* 2. Data We Collect and Process */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            2. Verified Data Inventory & Purposes
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  <th className="p-3">Data Category</th>
                  <th className="p-3">Specific Elements</th>
                  <th className="p-3">Processing Purpose</th>
                  <th className="p-3">Storage Location & Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">Uploaded Tabular Datasets</td>
                  <td className="p-3">CSV, XLSX, XLS files (user-submitted data rows, column headers, numerical/categorical values)</td>
                  <td className="p-3 font-sans">Automated EDA profiling, schema inference, predictive modeling, outlier detection</td>
                  <td className="p-3 font-sans">Disk (<code className="text-indigo-600 dark:text-indigo-400">backend/uploads/</code>) &amp; local database. Retained until user initiates deletion.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">Unstructured Knowledge Docs</td>
                  <td className="p-3">PDF, TXT, MD documents</td>
                  <td className="p-3 font-sans">Semantic text chunking and contextual vector retrieval for domain queries</td>
                  <td className="p-3 font-sans">Disk (<code className="text-indigo-600 dark:text-indigo-400">backend/data/knowledge_docs/</code>), local ChromaDB vector directory (<code className="text-indigo-600 dark:text-indigo-400">backend/data/chroma_db/</code>), and database. Retained until deleted.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">ML Benchmarks &amp; Artifacts</td>
                  <td className="p-3">Model metrics, confusion matrices, SHAP values, feature importance weights</td>
                  <td className="p-3 font-sans">Performance comparison and historical evaluation tracking</td>
                  <td className="p-3 font-sans">Database (<code className="text-indigo-600 dark:text-indigo-400">ml_experiments</code> table) and local artifact store. Retained until dataset/experiment deletion.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">AI Agent Dialogues</td>
                  <td className="p-3">User questions, persona selections, autonomous tool reasoning traces</td>
                  <td className="p-3 font-sans">Session context continuity during analytical queries</td>
                  <td className="p-3 font-sans">Database (<code className="text-indigo-600 dark:text-indigo-400">agent_sessions</code> and <code className="text-indigo-600 dark:text-indigo-400">agent_messages</code>). Retained until deleted.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">Compiled Reports</td>
                  <td className="p-3">Executive PDF dossiers, chart summaries, strategic action items</td>
                  <td className="p-3 font-sans">Exportable executive documentation delivery</td>
                  <td className="p-3 font-sans">Disk (<code className="text-indigo-600 dark:text-indigo-400">backend/data/reports/</code>) and database (<code className="text-indigo-600 dark:text-indigo-400">reports</code> table). Retained until user initiates report deletion.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">Authentication Session</td>
                  <td className="p-3">Cryptographically signed JWT bearer token with subject ID</td>
                  <td className="p-3 font-sans">Session authentication and multi-user object-level access control</td>
                  <td className="p-3 font-sans">Client-side browser sandbox (<code className="text-indigo-600 dark:text-indigo-400">localStorage</code>). Essential for tenant isolation. Never logged or shared.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">LLM Provider Credentials</td>
                  <td className="p-3">Optional OpenAI, Anthropic, or Gemini provider keys</td>
                  <td className="p-3 font-sans">Cloud model inference if external LLM providers are enabled by server admin</td>
                  <td className="p-3 font-sans">Configured server-side via environment variables (<code className="text-indigo-600 dark:text-indigo-400">OPENAI_API_KEY</code>, <code className="text-indigo-600 dark:text-indigo-400">ANTHROPIC_API_KEY</code>, <code className="text-indigo-600 dark:text-indigo-400">GEMINI_API_KEY</code>, or <code className="text-indigo-600 dark:text-indigo-400">GOOGLE_API_KEY</code>). Not collected or stored in browser local storage; any request-level API key is processed ephemerally in server memory and never persisted.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold font-sans text-slate-900 dark:text-white">UI Preferences</td>
                  <td className="p-3">Theme choice (&lsquo;light&rsquo; or &lsquo;dark&rsquo;)</td>
                  <td className="p-3 font-sans">Maintaining visual user interface display preference</td>
                  <td className="p-3 font-sans">Client-side browser storage (<code className="text-indigo-600 dark:text-indigo-400">localStorage</code>). Strictly functional.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Third-Party Data Transmissions & External LLM Processing */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" />
            3. External LLM Processing & Third-Party Transmissions
          </h2>
          <p>
            We do <strong>not</strong> sell, monetize, or broker your data. Transmission to third parties is strictly governed:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Default Local Mode:</strong> By default, InsightForge AI executes analytical operations, ML training, EDA calculations, and multi-persona workflows using deterministic local routines without transmitting dataset rows or document contents to third-party cloud AI APIs.
            </li>
            <li>
              <strong>External LLM Inference (Server-Configured):</strong> If the server operator configures external AI API credentials (such as <code className="text-indigo-600 dark:text-indigo-400">OPENAI_API_KEY</code>, <code className="text-indigo-600 dark:text-indigo-400">ANTHROPIC_API_KEY</code>, <code className="text-indigo-600 dark:text-indigo-400">GEMINI_API_KEY</code>, or <code className="text-indigo-600 dark:text-indigo-400">GOOGLE_API_KEY</code>) in the server environment, agent dialogue queries and truncated analytical summaries (up to approximately 1,200 characters of high-level observations) may be transmitted to the configured external provider (OpenAI, Anthropic, or Google) to synthesize natural language responses. Bulk raw datasets are not transmitted.
            </li>
            <li>
              <strong>Zero Advertising &amp; Tracking SDKs:</strong> InsightForge AI does not embed Google Analytics, Meta Pixels, Mixpanel, Hotjar, or advertising tracking beacons.
            </li>
          </ul>
        </section>

        {/* 4. Data Deletion, Backups & Retention Limitations */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-500" />
            4. Data Deletion, Storage &amp; Backup Limitations
          </h2>
          <p>
            The platform provides complete user-initiated deletion mechanisms:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Dataset Deletion:</strong> Permanently removes uploaded raw CSV/Excel files from disk, unlinks associated chat sessions, deletes model experiment records and physical artifacts, and cascades across all database transformation records.
            </li>
            <li>
              <strong>Knowledge Document Deletion:</strong> Removes the document from disk, deletes text chunk records, and executes vector deletion across the ChromaDB collection.
            </li>
            <li>
              <strong>Session Deletion:</strong> Erases conversation history, messages, and associated tool traces from the database.
            </li>
            <li>
              <strong>Report Deletion:</strong> Permanently deletes the compiled ReportLab PDF file from disk and deletes the database record.
            </li>
            <li>
              <strong>Account Deletion:</strong> Permanently removes user credentials and triggers cascading deletion of all owned datasets, experiments, documents, and reports.
            </li>
          </ul>
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 mt-2 space-y-1">
            <p className="font-semibold text-xs text-amber-950 dark:text-amber-100">
              Retention &amp; Backup Disclaimers:
            </p>
            <p className="text-[11px] leading-relaxed">
              As an independently developed and operated technical project provided free of charge, InsightForge AI does not offer enterprise multi-region disaster recovery, automated cloud backup snapshots, or formal uptime service level agreements (SLAs). Uploaded data is stored in the local storage volume configured for the instance. Users are solely responsible for maintaining their own backup copies of important source datasets and reports.
            </p>
          </div>
        </section>

        {/* 5. India DPDP Act, 2023 & Privacy Rights */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-500" />
            5. Legal Grounds &amp; Rights Under India&apos;s DPDP Act, 2023
          </h2>
          <p>
            As an independent developer based in India, the operator respects the privacy principles established under India&apos;s{' '}
            <em>Digital Personal Data Protection Act, 2023 (DPDP Act, 2023)</em>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Right to Access &amp; Summary</span>
              <span>You may review what datasets, document chunks, and experiment logs are stored in your workspace at any time.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Right to Correction &amp; Erasure</span>
              <span>You have the right to request correction of inaccurate data or complete erasure of datasets, documents, and logs.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Direct Inquiries &amp; Grievances</span>
              <span>Privacy questions and data subject requests can be submitted directly to the developer through our integrated contact mechanism.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Right to Nominate</span>
              <span>You retain the right to nominate an authorized representative in accordance with applicable statutory guidelines.</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic mt-2">
            *Notice: InsightForge AI is an independently developed non-corporate project. Formal enterprise certifications, cross-border corporate transfer frameworks, and dedicated enterprise privacy committees do not apply.
          </p>
        </section>

        {/* 6. Security Safeguards */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            6. Technical Safeguards Implemented
          </h2>
          <p>
            InsightForge AI incorporates reasonable technical safeguards:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Strict filename sanitization and path traversal prevention on file uploads.</li>
            <li>Enforced 50 MB upload limits to prevent resource exhaustion.</li>
            <li>CSV and Excel formula injection protection on dataset preview displays.</li>
            <li>Query expression sanitization mitigating arbitrary code execution.</li>
            <li>HTTP security response headers (<code className="text-indigo-600 dark:text-indigo-400">X-Content-Type-Options: nosniff</code>, <code className="text-indigo-600 dark:text-indigo-400">X-Frame-Options: SAMEORIGIN</code>).</li>
            <li>Zero client-side storage of third-party LLM credentials.</li>
          </ul>
        </section>

        {/* 7. Operator & Privacy Inquiries */}
        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500" />
            7. Operator Identity &amp; Privacy Contact
          </h2>
          <p>
            To exercise your privacy rights, request data erasure, or submit an inquiry, please contact the developer:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px]">
            <div><strong>Product:</strong> InsightForge AI</div>
            <div><strong>Developer &amp; Operator:</strong> Daxa Antiya (Independent Developer &amp; Operator)</div>
            <div><strong>Operator Type:</strong> Independent Developer (Non-Corporate / Self-Operated Project)</div>
            <div><strong>Location:</strong> Ahmedabad, Gujarat, India</div>
            <div><strong>Communication Channel:</strong> On-platform <Link to="/contact" className="text-indigo-600 dark:text-indigo-400 underline font-medium">Privacy &amp; Contact Request Form</Link> (Dedicated public inquiries email pending final configuration prior to public release).</div>
            <div><strong>Response Time:</strong> Inquiries are reviewed and addressed on a best-effort basis in accordance with applicable norms.</div>
          </div>
          <p className="mt-3">
            You may submit inquiries directly using our on-platform <Link to="/contact" className="text-indigo-600 dark:text-indigo-400 underline font-medium">Privacy Request Form</Link>.
          </p>
        </section>

      </div>
    </div>
  );
};
