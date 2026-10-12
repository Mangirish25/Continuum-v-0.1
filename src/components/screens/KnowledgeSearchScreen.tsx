import React, { useState } from 'react';
import { SemanticSearchResult, Employee } from '../../types';
import { MOCK_SEMANTIC_SEARCH_RESULTS } from '../../data/mockData';
import {
  Search,
  Sparkles,
  ArrowRight,
  FolderGit2,
  Layers,
  FileText,
  Folder,
  User,
  CheckCircle2,
} from 'lucide-react';

interface KnowledgeSearchScreenProps {
  onSelectEmployeeById: (employeeId: string) => void;
}

export const KnowledgeSearchScreen: React.FC<KnowledgeSearchScreenProps> = ({
  onSelectEmployeeById,
}) => {
  const [searchQuery, setSearchQuery] = useState('Who understands payment gateway integration?');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const suggestedQueries = [
    'Who understands payment gateway integration?',
    'Who knows about JWT token rotation and auth session blacklist?',
    'Who maintains real-time analytics data pipelines?',
    'What does Rahul know about payment-service?',
    'Where is the settlement reconciliation runbook?',
  ];

  const results = MOCK_SEMANTIC_SEARCH_RESULTS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Search Company Knowledge
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Semantic neural search across connected GitHub repositories, Drive folders, Notion specs, and Jira tasks.
        </p>
      </div>

      {/* Large Search Box (Section 15) */}
      <div className="bg-white border border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 rounded-lg p-3 shadow-xs space-y-3">
        <label className="block text-xs font-semibold text-slate-700">
          What are you looking for?
        </label>
        <div className="flex items-center gap-2">
          <div className="p-1.5 text-indigo-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask anything: 'Who understands payment gateway integration?' or 'Where is the reconciliation doc?'..."
            className="w-full text-sm bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
          <button
            onClick={() => {}}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            Search
          </button>
        </div>

        {/* Suggested Queries */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-mono text-slate-400 shrink-0">Try asking:</span>
          {suggestedQueries.map((query, idx) => (
            <button
              key={idx}
              onClick={() => setSearchQuery(query)}
              className="text-[11px] text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 px-2 py-0.5 rounded transition-colors truncate max-w-[280px]"
            >
              "{query}"
            </button>
          ))}
        </div>
      </div>

      {/* Simple Search Filters (Section 15) */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
            <span>Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="github">GitHub</option>
              <option value="googledrive">Google Drive</option>
              <option value="notion">Notion</option>
              <option value="jira">Jira</option>
            </select>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 border-l border-slate-200 pl-2">
            <span>Project:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">All Projects</option>
              <option value="payment">Payment Platform</option>
              <option value="auth">Authentication Service</option>
              <option value="analytics">Analytics Platform</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Showing <strong className="text-slate-800">{results.length}</strong> semantic recommendations
        </div>
      </div>

      {/* Semantic Results List (Section 15 & 16) */}
      <div className="space-y-4">
        {results.map((res) => (
          <div
            key={res.id}
            className="bg-white border border-slate-200 hover:border-indigo-400 rounded-lg p-5 space-y-4 transition-all hover:shadow-xs"
          >
            {/* Top result strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={res.employeeAvatar}
                  alt={res.employeeName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-slate-900">{res.employeeName}</h2>
                    <span className="text-[11px] text-slate-500">
                      ({res.employeeRole} · {res.employeeTeam})
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-indigo-700 mt-0.5">
                    {res.topicTitle}
                  </div>
                </div>
              </div>

              {/* Semantic Match Badge */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                  {res.relevancePercent}% Relevance Match
                </span>
                <button
                  onClick={() => onSelectEmployeeById(res.employeeId)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors inline-flex items-center gap-1"
                >
                  <span>View Employee</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Explainable AI Reasoning (Section 16: "Why is Rahul relevant?") */}
            <div className="bg-slate-50/80 border border-slate-200 rounded p-3.5 text-xs space-y-2">
              <div className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider">
                Explainable Evidence: Why is {res.employeeName.split(' ')[0]} relevant?
              </div>
              <pre className="text-slate-700 font-sans leading-relaxed whitespace-pre-line text-xs">
                {res.explanation}
              </pre>

              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-4 text-[11px] font-mono text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 text-slate-700">
                  <FolderGit2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>{res.evidence.githubCommitsCount} commits ({res.evidence.repositories.join(', ')})</span>
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>{res.evidence.jiraTasksCount} Jira tasks</span>
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>{res.evidence.notionDocsCount} Notion pages</span>
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  <span>{res.evidence.driveDocsCount} Drive docs</span>
                </span>
              </div>
            </div>

            {/* Relevant Snippet */}
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong>Context Snippet:</strong> {res.relevantSnippet}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
