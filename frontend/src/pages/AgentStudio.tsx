import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Database,
  ChevronDown,
  ChevronUp,
  Cpu,
  BarChart2,
  ShieldAlert,
  Briefcase,
  Trash2,
  Terminal,
} from 'lucide-react';
import {
  listDatasets,
  sendAgentMessage,
  listAgentSessions,
  getAgentSessionHistory,
  deleteAgentSession,
} from '../lib/api';
import type {
  DatasetItem,
  AgentReasoningStep,
  AgentSessionItem,
} from '../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';


const ROLES = [
  {
    id: 'data_analyst',
    name: 'Data Analyst',
    icon: BarChart2,
    color: 'text-indigo-600 dark:text-indigo-400',
    desc: 'Correlations, distributions, trends, and charts',
  },
  {
    id: 'ml_engineer',
    name: 'ML Engineer',
    icon: Cpu,
    color: 'text-emerald-600 dark:text-emerald-400',
    desc: 'Predictive modeling, algorithms, and feature drivers',
  },
  {
    id: 'data_quality_auditor',
    name: 'Quality Auditor',
    icon: ShieldAlert,
    color: 'text-amber-600 dark:text-amber-400',
    desc: 'Missing values, duplicates, and data hygiene audits',
  },
  {
    id: 'executive_advisor',
    name: 'Strategic Advisor',
    icon: Briefcase,
    color: 'text-violet-600 dark:text-violet-400',
    desc: 'Executive briefings, KPIs, and actionable strategy',
  },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning_steps?: AgentReasoningStep[];
  data_payload?: any;
  created_at?: string;
}

export const AgentStudio: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [activeRole, setActiveRole] = useState<string>('data_analyst');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<AgentSessionItem[]>([]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion toggle map for reasoning traces
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadInitialData = async () => {
    try {
      const [dsList, sessions] = await Promise.all([
        listDatasets(),
        listAgentSessions().catch(() => []),
      ]);
      setDatasets(dsList);
      if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].dataset_id);
      }
      setPastSessions(sessions);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSelectSession = async (sessId: string) => {
    try {
      setLoading(true);
      const hist = await getAgentSessionHistory(sessId);
      setSessionId(hist.id);
      if (hist.dataset_id) setSelectedDatasetId(hist.dataset_id);
      setActiveRole(hist.agent_role || 'data_analyst');
      setMessages(hist.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
  };

  const toggleTrace = (msgId: string) => {
    setExpandedTraces((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);
    setError(null);

    try {
      const res = await sendAgentMessage({
        session_id: sessionId || undefined,
        dataset_id: selectedDatasetId || undefined,
        agent_role: activeRole,
        message: query,
      });

      setSessionId(res.session_id);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.final_response,
        reasoning_steps: res.reasoning_steps,
        data_payload: res.data_payload,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Automatically expand trace for new response
      setExpandedTraces((prev) => ({ ...prev, [assistantMsg.id]: true }));

      // Refresh past sessions
      listAgentSessions().then(setPastSessions).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Agent reasoning loop failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            AI Agent Studio
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Autonomous multi-agent analytical system with tool reasoning traces, code execution, and data visualization.
          </p>
        </div>

        {/* Dataset & New Chat Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No dataset (General Agent)</option>
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.filename} ({d.rows} rows)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
          >
            New Session
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Sidebar: Personas & Past Sessions (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Persona Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-card">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
              Specialist Personas
            </h2>
            <div className="space-y-1.5">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = activeRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setActiveRole(role.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all border ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 shadow-xs'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${role.color}`} />
                      <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                        {role.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-6">
                      {role.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-card">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Recent Sessions</span>
                <span className="text-[10px] text-slate-400">{pastSessions.length}</span>
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {pastSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      sessionId === s.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                    onClick={() => handleSelectSession(s.id)}
                  >
                    <span className="truncate max-w-[150px]">{s.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAgentSession(s.id).then(() => {
                            setPastSessions((prev) => prev.filter((p) => p.id !== s.id));
                            if (sessionId === s.id) handleNewChat();
                          });
                        }}
                        className="text-slate-400 hover:text-rose-500 p-0.5"
                        aria-label={`Delete session ${s.title}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Chat Conversation & Execution Canvas (9 cols) */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card flex flex-col h-[700px]">
          {/* Chat Messages Scrollable Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Agent Ready for Directive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Select a specialist persona and explore dataset relationships, generate charts, or trigger predictive benchmarks.
                </p>

                {/* Prompt Starter Pills */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'Analyze top correlations across numeric columns',
                    'Detect outliers and examine distributions',
                    'Benchmark predictive models for target column',
                    'Audit data cleanliness, nulls, and duplicates',
                  ].map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(starter)}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-400 transition-colors border border-slate-200 dark:border-slate-700/60"
                    >
                      "{starter}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60'
                    }`}
                  >
                    {/* Assistant Reasoning Trace Accordion */}
                    {msg.reasoning_steps && msg.reasoning_steps.length > 0 && (
                      <div className="mb-3 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                        <button
                          type="button"
                          onClick={() => toggleTrace(msg.id)}
                          className="w-full px-3 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-between text-[11px] font-semibold"
                        >
                          <span className="flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                            Agent Reasoning & Tool Trace ({msg.reasoning_steps.length} steps)
                          </span>
                          {expandedTraces[msg.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedTraces[msg.id] && (
                          <div className="p-3 space-y-2 text-[11px] divide-y divide-slate-100 dark:divide-slate-800">
                            {msg.reasoning_steps.map((st, si) => (
                              <div key={si} className="pt-2 first:pt-0">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  <span>{st.title}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 pl-3">
                                  {st.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Markdown Message Body */}
                    <div className="whitespace-pre-wrap font-sans space-y-2">
                      {msg.content}
                    </div>

                    {/* Dynamic Chart / Table Data Payload */}
                    {msg.data_payload && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        {msg.data_payload.type === 'chart' && msg.data_payload.data && (
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-2">
                              {msg.data_payload.title}
                            </div>
                            <div className="h-44 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={msg.data_payload.data}>
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                  <XAxis dataKey={msg.data_payload.x_key} tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                  <Bar dataKey={msg.data_payload.y_key} fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {msg.data_payload.type === 'table' && msg.data_payload.data && (
                          <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2">
                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-2 px-1">
                              {msg.data_payload.title}
                            </div>
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500">
                                <tr>
                                  {msg.data_payload.columns?.map((c: string) => (
                                    <th key={c} className="p-1.5">{c}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {msg.data_payload.data.map((row: any, ri: number) => (
                                  <tr key={ri}>
                                    {msg.data_payload.columns?.map((c: string) => (
                                      <td key={c} className="p-1.5">{String(row[c] ?? '')}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl max-w-sm">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Agent decomposing query & executing tools...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={`Ask ${ROLES.find((r) => r.id === activeRole)?.name} about the dataset...`}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
