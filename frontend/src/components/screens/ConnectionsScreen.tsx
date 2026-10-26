import React, { useCallback, useEffect, useState } from 'react';
import { ConnectedResource } from '../../types';
import { getSources, RegisteredSource, syncSource, updateSource } from '../../lib/api';
import { AlertCircle, FileText, Folder, Plus, RefreshCw, Trash2 } from 'lucide-react';

interface ConnectionsScreenProps {
  connectedResources: ConnectedResource[];
  onOpenConnectResource: () => void;
  onDisconnectResource: (id: string) => void;
}

export const ConnectionsScreen: React.FC<ConnectionsScreenProps> = ({
  connectedResources,
  onOpenConnectResource,
  onDisconnectResource,
}) => {
  const [sources, setSources] = useState<RegisteredSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'drive' | 'notion'>('all');

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getSources();
      setSources(records.filter((item) => ['drive', 'notion'].includes(item.source_type.toLowerCase()) && item.status.toUpperCase() !== 'DISABLED'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load local connections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSources(); }, [loadSources]);

  const handleSync = async (source: RegisteredSource) => {
    setBusyId(source.id);
    setNotice('Indexing started. Refresh this list to see its latest status.');
    try {
      await syncSource(source.id);
      await loadSources();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not start indexing.');
    } finally {
      setBusyId(null);
    }
  };

  const handleChangePath = async (source: RegisteredSource) => {
    const nextPath = window.prompt('Enter the new local folder path:', source.local_path || source.url || '');
    if (!nextPath?.trim() || nextPath.trim() === (source.local_path || source.url || '')) return;
    setBusyId(source.id);
    setNotice('');
    try {
      await updateSource(source.id, { local_path: nextPath.trim() });
      setNotice('Folder path updated and indexing started.');
      await loadSources();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update this folder path.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (source: RegisteredSource) => {
    setBusyId(source.id);
    try {
      await onDisconnectResource(source.id);
      setNotice('Connection removed. The local folder and its files were left untouched.');
      await loadSources();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove this connection.');
    } finally {
      setBusyId(null);
    }
  };

  const visibleSources = sources.filter((source) => filter === 'all' || source.source_type.toLowerCase() === filter);
  const statusStyle = (status: string) => {
    const value = status.toUpperCase();
    if (value === 'SYNCED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (value === 'SYNCING') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (value === 'FAILED') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (value === 'DISABLED') return 'bg-slate-100 text-slate-500 border-slate-200';
    return 'bg-amber-50 text-amber-800 border-amber-200';
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Local Knowledge Connections</h1>
          <p className="mt-1 text-xs text-slate-500">Connect employee Drive and Notion folders inside the project data directory.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void loadSources()} disabled={loading} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={onOpenConnectResource} className="inline-flex items-center gap-2 rounded bg-[#3525cd] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2b1ea8]">
            <Plus className="h-3.5 w-3.5" /> Add Connection
          </button>
        </div>
      </div>

      {notice && <div className="flex items-start gap-2 rounded border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800"><AlertCircle className="h-4 w-4 shrink-0" />{notice}</div>}

      <div className="flex gap-2">
        {(['all', 'drive', 'notion'] as const).map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`rounded px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {item === 'all' ? 'All connections' : item}
          </button>
        ))}
      </div>

      {visibleSources.length ? (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {visibleSources.map((source) => {
            const path = source.local_path || source.url || source.external_resource_id;
            const indexedCount = source.resource_metadata?.indexed_documents_count;
            return (
              <article key={source.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded border border-slate-200 bg-slate-50 p-2 text-indigo-700">
                    {source.source_type.toLowerCase() === 'notion' ? <FileText className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">{source.name}</h2>
                      <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${statusStyle(source.status)}`}>{source.status}</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{path}</p>
                    <p className="mt-1 text-[11px] text-slate-600">Employee: <strong>{source.employee_name || 'Unassigned'}</strong>{indexedCount !== undefined && <> · {indexedCount} indexed document(s)</>}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Last indexed: {source.last_successful_sync_at ? new Date(source.last_successful_sync_at).toLocaleString() : 'Not yet indexed'}</p>
                    {source.last_sync_error && <p className="mt-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{source.last_sync_error}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button disabled={busyId === source.id} onClick={() => void handleChangePath(source)} className="rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Change path</button>
                  <button disabled={busyId === source.id} onClick={() => void handleSync(source)} className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${busyId === source.id ? 'animate-spin' : ''}`} /> Reindex</button>
                  <button disabled={busyId === source.id} onClick={() => void handleRemove(source)} aria-label="Remove connection" title="Remove connection (keeps local files)" className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Folder className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-3 text-sm font-semibold text-slate-800">No local folders connected</h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Add a Drive or Notion folder explicitly from an employee profile. Files stay in place when you remove a connection.</p>
          <button onClick={onOpenConnectResource} className="mt-4 inline-flex items-center gap-2 rounded bg-[#3525cd] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2b1ea8]"><Plus className="h-3.5 w-3.5" /> Add Connection</button>
        </div>
      )}

      {connectedResources.length === 0 && sources.length === 0 && loading && <p className="text-xs text-slate-400">Loading connections…</p>}
    </section>
  );
};
