import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck, Scale, Cpu, UserCheck, User } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
          <Scale className="w-4 h-4" />
          <span>User Agreement</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Last Updated: October 2026 • Platform Version 0.3.0
        </p>
      </div>

      {/* Operator Notice Alert */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <User className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">Independent Project &amp; User Notice</p>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the <strong>InsightForge AI</strong> software
            developed and operated by <strong>Daxa Antiya</strong> (&ldquo;Independent Developer &amp; Operator&rdquo;, &ldquo;we&rdquo;, or &ldquo;us&rdquo;),
            located in <strong>Ahmedabad, Gujarat, India</strong>. InsightForge AI is an independently developed, non-corporate technical project
            and is not operated by an incorporated company, registered enterprise, or certified entity. By accessing or using this software, you agree to these Terms.
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8 text-xs leading-relaxed text-slate-700 dark:text-slate-300">

        {/* 1. Description of Service */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" />
            1. Description of Service
          </h2>
          <p>
            InsightForge AI is an agentic data science platform offering automated exploratory data analysis (EDA),
            machine learning algorithm benchmarking, SHAP explainability, retrieval-augmented generation (RAG) over domain documentation,
            and executive PDF reporting. The software is provided free of charge as a local-first, self-hostable analytics application.
          </p>
        </section>

        {/* 2. User Responsibilities & Acceptable Use */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            2. Acceptable Use &amp; Uploaded Content Responsibilities
          </h2>
          <p>
            You retain full responsibility for all tabular files, text documents, queries, and parameters you upload or provide:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Data Rights &amp; Authorization:</strong> You represent and warrant that you possess all necessary rights,
              licenses, and permissions to upload and process your datasets and documents, including compliance with relevant
              data protection laws (such as India&apos;s DPDP Act, GDPR, or applicable sectoral regulations).
            </li>
            <li>
              <strong>Sensitive &amp; Regulated Information:</strong> You agree not to upload unauthorized personally identifiable information (PII),
              protected health information (PHI), payment card data (PCI), or trade secrets into instances without appropriate administrative safeguards.
            </li>
            <li>
              <strong>Prohibited Conduct:</strong> You may not upload malicious code, attempt path traversal attacks, exploit API endpoints,
              reverse-engineer unauthorized modules, or use InsightForge AI for unlawful discriminatory profiling.
            </li>
          </ul>
        </section>

        {/* 3. AI & ML Output Limitations */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            3. Artificial Intelligence &amp; Machine Learning Output Limitations
          </h2>
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-semibold text-xs text-amber-900 dark:text-amber-100">
              Material Technical Disclaimers:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[11px]">
              <li>
                <strong>Correlation Does Not Imply Causation:</strong> Correlation heatmaps, pairwise Pearson/Spearman coefficients, and distribution metrics illustrate empirical mathematical associations within your dataset sample, not proven real-world causality.
              </li>
              <li>
                <strong>Predictive Model Accuracy:</strong> Model cross-validation scores, leaderboard rankings, and feature importance evaluations depend strictly upon the quality, balance, and representativeness of your input data. No model output guarantees business outcomes or zero-error predictions in production.
              </li>
              <li>
                <strong>AI Syntheses:</strong> Text produced by multi-agent personas and RAG syntheses is generated probabilistically. While citation verification and groundedness scoring are applied, automated insights must be reviewed by qualified human domain analysts before strategic or financial commitments.
              </li>
            </ul>
          </div>
        </section>

        {/* 4. Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            4. Intellectual Property Rights
          </h2>
          <p>
            <strong>Your Data:</strong> You retain all right, title, and interest in and to your uploaded datasets, proprietary documents, and generated reports. We claim no ownership over your analytical outputs or uploaded assets.
          </p>
          <p>
            <strong>The Platform:</strong> The InsightForge AI codebase, user interface, design assets, and architecture are the intellectual property of Daxa Antiya, protected by applicable copyright and intellectual property laws.
          </p>
        </section>

        {/* 5. Fees and Payment Obligations */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            5. Fees, Subscriptions &amp; Refund Terms
          </h2>
          <p>
            InsightForge AI Version 0.3.0 is provided as a free, self-hostable open analytics project.
            There are no active billing systems, payment gateway integrations, paid subscription tiers, or user processing fees.
            Consequently, payment obligations and refund policies are <strong>not applicable</strong>.
          </p>
        </section>

        {/* 6. Disclaimers & Legal Limitations */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-500" />
            6. Warranties Disclaimer &amp; Limitation of Liability
          </h2>
          <p className="uppercase text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW:
          </p>
          <p>
            INSIGHTFORGE AI IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND,
            WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR UNINTERRUPTED ACCURACY.
          </p>
          <p>
            UNDER NO CIRCUMSTANCES SHALL DAXA ANTIYA OR ANY PROJECT CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, DATA LOSS, DATA CORRUPTION, BUSINESS INTERRUPTION,
            OR HARDWARE MALFUNCTION) ARISING FROM OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SOFTWARE.
          </p>
        </section>

        {/* 7. Governing Law and Dispute Resolution */}
        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            7. Governing Law &amp; Dispute Resolution
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws applicable in India,
            with the independent developer based in <strong>Ahmedabad, Gujarat, India</strong>, without giving effect to conflict of law principles.
            Any concerns, differences, or disputes arising out of or relating to these Terms or the use of InsightForge AI
            should first be communicated amicably by contacting the developer directly.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
            <div><strong>Product:</strong> InsightForge AI</div>
            <div><strong>Developer &amp; Operator:</strong> Daxa Antiya (Independent Developer &amp; Operator)</div>
            <div><strong>Location:</strong> Ahmedabad, Gujarat, India</div>
            <div><strong>Inquiries Channel:</strong> On-platform <Link to="/contact" className="text-indigo-600 dark:text-indigo-400 underline font-medium">Contact &amp; Inquiries Page</Link> (Dedicated public email pending final configuration prior to public release).</div>
          </div>
          <p className="mt-3">
            Questions regarding these Terms may be directed via our <Link to="/contact" className="text-indigo-600 dark:text-indigo-400 underline font-medium">Contact Page</Link>.
          </p>
        </section>

      </div>
    </div>
  );
};
