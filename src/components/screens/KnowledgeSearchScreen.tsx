import React, { useState } from 'react';
import { SemanticSearchResult } from '../../types';
import { searchKnowledge } from '../../lib/api';
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
  Loader2,
  Inbox,
} from 'lucide-react';

interface KnowledgeSearchScreenProps {
  onSelectEmployeeById: (employeeId: string) => void;
}

export const KnowledgeSearchScreen: React.FC<KnowledgeSearchScreenProps> = ({
  onSelectEmployeeById,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [llmAnswer, setLlmAnswer] = useState<string | null>(null);

  const suggestedQueries: string[] = [];

  const handlePerformSearch = async (queryText?: string) => {
    const queryToRun = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!queryToRun) return;

    if (queryText !== undefined) {
      setSearchQuery(queryText);
    }

    setIsSearching(true);
    setHasSearched(true);
    setLlmAnswer(null);

    try {
      const response = await searchKnowledge({
        query: queryToRun,
        provider: sourceFilter !== 'all' ? sourceFilter.toUpperCase() : undefined,
      });

      if (response && response.results) {
        setResults(response.results);
        setLlmAnswer(response.llm_explanation || null);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.warn('Knowledge search error:', err);
      setResults([]);
      setLlmAnswer('Knowledge search service encountered an error or knowledge base is currently empty.');
    } finally {
      setIsSearching(false);
    }
  };

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

      {/* Large Search Box */}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePerformSearch();
              }
            }}
            placeholder="Ask anything: 'Who understands payment gateway integration?' or 'Where is the reconciliation doc?'..."
            className="w-full text-sm bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
          <button
            onClick={() => handlePerformSearch()}
            disabled={isSearching}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Simple Search Filters */}
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
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {hasSearched ? (
            <span>Found <strong className="text-slate-800">{results.length}</strong> indexed evidence results</span>
          ) : (
            <span>Ready for query</span>
          )}
        </div>
      </div>

      {/* LLM Grounded Answer if present */}
      {llmAnswer && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Continuum AI Synthesis</span>
          </div>
          <p className="text-xs text-indigo-950 leading-relaxed whitespace-pre-line">
            {llmAnswer}
          </p>
        </div>
      )}

      {/* Results Viewport */}
      {isSearching ? (
        <div className="p-12 text-center space-y-3 bg-white border border-slate-200 rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <div className="text-xs font-semibold text-slate-800">Synthesizing Neural Match...</div>
          <p className="text-[11px] text-slate-400">Querying Chroma vector embeddings and local LLM reasoning.</p>
        </div>
      ) : !hasSearched ? (
        <div className="p-12 text-center space-y-3 bg-white border border-slate-200 rounded-lg shadow-xs">
          <Search className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-800">Knowledge Search Ready</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Search across your indexed documentation, repositories, and specifications. Grounded answers and matching evidence will be displayed here.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white border border-slate-200 rounded-lg shadow-xs">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-800">No Knowledge Evidence Found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No matching documents or chunks were found in the index for "{searchQuery}". Connect and sync your knowledge sources to populate the database.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((res: any, idx: number) => (
            <div
              key={res.id || idx}
              className="bg-white border border-slate-200 hover:border-indigo-400 rounded-lg p-5 space-y-4 transition-all hover:shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-bold text-xs text-slate-700">
                    {res.provider ? res.provider.slice(0, 2).toUpperCase() : 'DOC'}
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-900">{res.title || res.name || 'Knowledge Document'}</h2>
                    <span className="text-[11px] font-mono text-slate-500">
                      Provider: {res.provider || 'Internal'} · Resource: {res.resource_name || 'Indexed'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    Score: {Math.round((res.similarity_score || res.relevance || 0.8) * 100)}%
                  </span>
                  {res.employee_id && (
                    <button
                      onClick={() => onSelectEmployeeById(res.employee_id)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Contributor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100 font-mono">
                {res.content || res.relevantSnippet || 'No snippet content available'}
              </div>

              {res.source_url && (
                <div className="text-[11px] text-slate-500">
                  <a href={res.source_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    View original source &rarr;
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
