'use client';

import { useState } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Q&A Chat State
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Analyze Repository
  async function analyzeRepo(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setChatHistory([]); // Reset chat history for the new repo

    try {
      const res = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze repository. Make sure the URL is correct.');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Ask Follow-up Question
  async function askQuestion(e) {
    e.preventDefault();
    if (!question.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: question };
    setChatHistory((prev) => [...prev, userMsg]);
    setQuestion('');
    setChatLoading(true);

    try {
      const res = await fetch('http://localhost:3001/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          question: userMsg.content,
          conversationHistory: chatHistory
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer.');
      }

      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error: ${err.message}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // Safe helper to extract just the numeric score (1-10) to prevent UI overflow
  const getCleanScore = (scoreString) => {
    if (!scoreString) return '8';
    const clean = scoreString.toString();
    const match = clean.match(/\b([1-9]|10)\b/);
    return match ? match[1] : '8';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background Subtle Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50 to-slate-50 pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/10">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">GitInsight AI</span>
          </div>
          <div className="text-xs font-semibold text-indigo-600 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 flex items-center gap-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> Live gorq Engine
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 relative z-10 flex flex-col gap-8">
        
        {/* Input & Search Section */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/5 blur-3xl rounded-full" />
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-3.5xl font-black text-slate-900 tracking-tight mb-2">Analyze Any GitHub Repository</h1>
            <p className="text-sm md:text-base text-slate-500 mb-6">Gain instant developer architecture briefs, active contributor metrics, open issue heatmaps, and ask follow-up questions directly to our AI expert.</p>
            
            <form onSubmit={analyzeRepo} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/expressjs/express"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white transition-all text-sm"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-start gap-2.5 animate-fadeIn">
                <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                  <h4 className="font-semibold text-red-800">Analysis Failed</h4>
                  <p className="mt-0.5 text-xs text-red-600">{error}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Loading Spinner Placeholder */}
        {loading && (
          <section className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-slate-800">Extracting codebase telemetry</h3>
              <p className="text-xs text-slate-500 mt-1">Fetching metadata, commit logs, branches, and firing AI analysis prompts...</p>
            </div>
          </section>
        )}

        {/* Results Screen Dashboard */}
        {result && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
            
            {/* Left/Middle Column - Insights Details */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              
              {/* Repository Overview Header Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      {result.owner} / {result.repo}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{result.repoInfo?.description || 'No description provided.'}</p>
                  </div>
                  {result.repoInfo?.language && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-600">
                      {result.repoInfo.language}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-5 mt-5">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      Stars
                    </span>
                    <span className="font-bold text-slate-900 text-sm md:text-base">{result.repoInfo?.stars?.toLocaleString() || 0}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Forks
                    </span>
                    <span className="font-bold text-slate-900 text-sm md:text-base">{result.repoInfo?.forks?.toLocaleString() || 0}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Open Issues
                    </span>
                    <span className="font-bold text-slate-900 text-sm md:text-base">{result.repoInfo?.openIssues?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              {/* AI Summarized Insights Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Health Score & Architecture summary */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm animate-fadeIn">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Project Health Score
                      </h3>
                    </div>
                    <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100 mb-4 flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full border border-emerald-200 bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="font-black text-emerald-600 text-lg">
                          {getCleanScore(result.insights?.healthScore)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                          {result.insights?.healthScore || 'Solid structural health score assessed dynamically.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Core Summary</h4>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{result.insights?.summary}</p>
                  </div>
                </div>

                {/* Merge Conflict Risk */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Merge Conflict Risk
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium mb-4">{result.insights?.mergeConflictRisk}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Open PRs Evaluated</h4>
                    <span className="text-lg font-black text-slate-900">{result.openPRs?.length || 0} Active PRs</span>
                  </div>
                </div>

                {/* New Developer Codebase Explanation */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 md:col-span-2 shadow-sm">
                  <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Codebase Explanation (Beginner Friendly)
                  </h3>
                  <div className="prose max-w-none">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{result.insights?.codebaseExplain}</p>
                  </div>
                </div>

              </div>

              {/* Developer Team Activity Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 flex items-center gap-2 mb-5">
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Contributors & Recent Commits
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Contributors list */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top Contributors</h4>
                    <div className="flex flex-col gap-3">
                      {result.contributors?.map((contrib) => (
                        <div key={contrib.username} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <img
                              src={contrib.avatar}
                              alt={contrib.username}
                              className="h-8 w-8 rounded-lg bg-slate-200 border border-slate-200"
                              onError={(e) => { e.target.src = 'https://github.com/identicons/git.png'; }}
                            />
                            <span className="text-sm font-semibold text-slate-700">{contrib.username}</span>
                          </div>
                          <span className="text-xs font-semibold bg-white text-slate-500 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-sm">
                            {contrib.contributions} commits
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Commits Timeline */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Code Updates</h4>
                    <div className="flex flex-col gap-3 max-h-[265px] overflow-y-auto pr-1">
                      {!result.recentCommits || result.recentCommits.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No commits pushed in the last 3 days.</p>
                      ) : (
                        result.recentCommits.map((commit) => (
                          <div key={commit.sha} className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-semibold text-indigo-600">{commit.author}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{commit.sha}</span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium line-clamp-1">{commit.message}</p>
                            <span className="text-[10px] text-slate-400 block mt-1.5">{new Date(commit.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Q&A Chat Assistant & PR Lists */}
            <div className="flex flex-col gap-8">
              
              {/* Q&A AI Assistant Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[500px] shadow-sm relative overflow-hidden">
                <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full" />
                <div className="border-b border-slate-100 pb-3.5 mb-4">
                  <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Repo AI Assistant
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Ask questions about dependencies, architecture patterns, or code ownership.</p>
                </div>

                {/* Chat window */}
                <div className="flex-grow overflow-y-auto flex flex-col gap-4 mb-4 pr-1 text-xs">
                  {chatHistory.length === 0 ? (
                    <div className="my-auto text-center flex flex-col items-center justify-center p-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-indigo-500 mb-3 shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      </div>
                      <h4 className="font-semibold text-slate-700">Ask a question</h4>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">"What libraries does this use?" or "Is this project active?"</p>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl max-w-[85%] leading-relaxed border ${
                          msg.role === 'user'
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-900 self-end'
                            : 'bg-slate-50 border-slate-100 text-slate-700 self-start'
                        }`}
                      >
                        <p className="font-medium whitespace-pre-line">{msg.content}</p>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 self-start max-w-[80%] flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                      Thinking...
                    </div>
                  )}
                </div>

                {/* Chat form Input */}
                <form onSubmit={askQuestion} className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about this codebase..."
                    disabled={chatLoading}
                    className="flex-grow px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !question.trim()}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white rounded-lg transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                  </button>
                </form>
              </div>

              {/* Open PR list */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm">
                <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                  <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19a2 2 0 10-4 0m4 0a2 2 0 100-4m-4 0a2 2 0 100 4m6 2a2 2 0 100-4m3-3v3m3-3l-3 3m-3-3l3 3M9 13H3m6 0a2 2 0 114 0l-4 0z" /></svg>
                    Branches & Pull Requests
                  </h3>
                  <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                    {result.branches?.length || 0} Branches
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Pull Requests</h4>
                  {!result.openPRs || result.openPRs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 border border-slate-100 rounded-xl">No open pull requests.</p>
                  ) : (
                    result.openPRs.map((pr) => (
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={pr.number}
                        className="p-3 bg-slate-50 hover:bg-slate-100/60 border border-slate-100 rounded-xl transition-all block group shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">
                            #{pr.number}
                          </span>
                          <span className="text-[10px] text-slate-400">by {pr.author}</span>
                        </div>
                        <h5 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{pr.title}</h5>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-xs">{pr.headBranch}</span>
                          <span>→</span>
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-xs">{pr.baseBranch}</span>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>

            </div>

          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 relative z-10">
        <p>© 2026 GitInsight AI · Developed cleanly as a beginner-friendly project.</p>
      </footer>
    </div>
  );
}