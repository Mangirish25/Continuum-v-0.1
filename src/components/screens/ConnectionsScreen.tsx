import React, { useState, useEffect } from 'react';
import { ConnectedResource, ConnectionProvider, SourceType } from '../../types';
import { CONNECTION_PROVIDERS } from '../../data/mockData';
import { getSources, syncSource, deleteSource, RegisteredSource } from '../../lib/api';
import {
  Network,
  FolderGit2,
  Folder,
  FileText,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Clock,
  Database,
} from 'lucide-react';

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
  const [selectedProviderType, setSelectedProviderType] = useState<SourceType | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [dbSources, setDbSources] = useState<RegisteredSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const loadSources = async () => {
    setLoadingSources(true);
    try {
      const data = await getSources();
      if (data && Array.isArray(data)) {
        setDbSources(data);
      }
    } catch {
      // Backend offline or mock mode
    } finally {
      setLoadingSources(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSyncSource = async (sourceId: string) => {
    setSyncingSourceId(sourceId);
    setStatusNotice(null);
    try {
      const res = await syncSource(sourceId);
      setStatusNotice(res.message || 'Synchronization initiated successfully.');
      await loadSources();
    } catch (err: any) {
      setStatusNotice(`Sync notice: ${err.message}`);
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deleteSource(sourceId);
      onDisconnectResource(sourceId);
      await loadSources();
    } catch {
      onDisconnectResource(sourceId);
    }
  };

  const handleSyncProvider = (providerName: string) => {
    setSyncingProvider(providerName);
    setTimeout(() => {
      setSyncingProvider(null);
    }, 600);
  };

  const getProviderIcon = (type: SourceType | string) => {
    switch (type.toLowerCase()) {
      case 'github':
        return <FolderGit2 className="w-5 h-5 text-slate-800" />;
      case 'googledrive':
      case 'google_drive':
        return <Folder className="w-5 h-5 text-amber-600" />;
      case 'notion':
        return <FileText className="w-5 h-5 text-slate-700" />;
      case 'jira':
        return <Layers className="w-5 h-5 text-blue-600" />;
      default:
        return <Database className="w-5 h-5 text-indigo-600" />;
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'READY') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Ready
        </span>
      );
    }
    if (s === 'SYNCED') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Synced
        </span>
      );
    }
    if (s === 'SYNCING') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
          <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-500" />
          Syncing
        </span>
      );
    }
    if (s === 'NEEDS_AUTH') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
          Needs Auth
        </span>
      );
    }
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Failed
        </span>
      );
    }
    if (s === 'DISABLED') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-semibold">
          Disabled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-semibold">
        <Clock className="w-2.5 h-2.5 text-slate-400" />
        Pending
      </span>
    );
  };

  // If a provider is selected for detail view (Section 24)
  const activeDetailProvider = selectedProviderType
    ? CONNECTION_PROVIDERS.find((p) => p.type === selectedProviderType)
    : null;

  const providerResources = selectedProviderType
    ? connectedResources.filter((r) => r.sourceType === selectedProviderType)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Connections
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Knowledge integration connectors for GitHub, Google Drive, Notion, and company Jira.
          </p>
        </div>

        <button
          onClick={onOpenConnectResource}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Resource</span>
        </button>
      </div>

      {/* 4 Cards Overview (Section 23) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CONNECTION_PROVIDERS.map((provider) => {
          const isSelected = selectedProviderType === provider.type;
          return (
            <div
              key={provider.type}
              className={`bg-white border rounded-lg p-5 flex flex-col justify-between transition-all hover:shadow-xs ${
                isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      {getProviderIcon(provider.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{provider.name}</h3>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 rounded border border-emerald-200 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        🟢 Connected
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-800">
                    {provider.connectedCountLabel}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Last sync: {provider.lastSync}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  {provider.description}
                </p>
              </div>

              {/* Action buttons (Section 23: Configure, Sync now) */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() =>
                    setSelectedProviderType(isSelected ? null : provider.type)
                  }
                  className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {isSelected ? 'Hide Details' : 'Configure & View &rarr;'}
                </button>

                <button
                  onClick={() => handleSyncProvider(provider.name)}
                  disabled={syncingProvider === provider.name}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors inline-flex items-center gap-1"
                  title="Sync now"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      syncingProvider === provider.name ? 'animate-spin text-indigo-600' : ''
                    }`}
                  />
                  <span className="text-[11px] font-mono">Sync</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connection Detail (Section 24) */}
      {activeDetailProvider && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-xs animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                {getProviderIcon(activeDetailProvider.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {activeDetailProvider.name} Integration
                  </h2>
                  <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    🟢 Connected
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last synchronization: {activeDetailProvider.lastSync}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSyncProvider(activeDetailProvider.name)}
                disabled={syncingProvider === activeDetailProvider.name}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncingProvider === activeDetailProvider.name ? 'animate-spin' : ''
                  }`}
                />
                <span>Sync Now</span>
              </button>

              <button
                onClick={onOpenConnectResource}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-2xs"
              >
                + Link Resource
              </button>
            </div>
          </div>

          {/* Scope notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-800">Resource Scope Guarantee:</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {activeDetailProvider.scopeNotice}
              </div>
            </div>
          </div>

          {/* Connected resources mapped by employee (Section 24 tree view) */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
              Connected Resources ({providerResources.length})
            </h3>

            {providerResources.length > 0 ? (
              <div className="space-y-2">
                {providerResources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{res.employeeName}</div>
                      <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400">&boxur;</span>
                        <span className="font-semibold text-indigo-700">{res.name}</span>
                        {res.projectName && (
                          <span className="text-slate-400">({res.projectName})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                      <span>Synced: {res.lastSynced}</span>
                      <button
                        onClick={() => onDisconnectResource(res.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Disconnect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded">
                No resources currently linked for {activeDetailProvider.name}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: Registered Knowledge Sources (Supabase PostgreSQL) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Registered Knowledge Sources
              </h2>
              <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                Supabase PostgreSQL
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Administratively registered repositories, folders, pages, and projects tracked in database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSources}
              disabled={loadingSources}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              title="Refresh sources"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSources ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onOpenConnectResource}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Knowledge Source</span>
            </button>
          </div>
        </div>

        {/* Status notice banner */}
        {statusNotice && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-900 flex items-center justify-between animate-in fade-in">
            <span>{statusNotice}</span>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'github', label: 'GitHub' },
            { id: 'googledrive', label: 'Google Drive' },
            { id: 'notion', label: 'Notion' },
            { id: 'jira', label: 'Jira' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSourceFilter(tab.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                sourceFilter === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sources List / Table */}
        {dbSources.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {dbSources
              .filter((s) => sourceFilter === 'all' || s.source_type.toLowerCase() === sourceFilter)
              .map((source) => (
                <div
                  key={source.id}
                  className="p-4 bg-white hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded shrink-0 mt-0.5">
                      {getProviderIcon(source.source_type)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{source.name}</span>
                        {renderStatusBadge(source.status)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {source.url || source.external_resource_id}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-600">
                        <span>
                          Owner: <strong>{source.employee_name || 'Unassigned'}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Project: <strong>{source.project_name || 'General'}</strong>
                        </span>
                      </div>
                      {source.last_sync_error && (
                        <div className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 max-w-xl">
                          Error: {source.last_sync_error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-[11px] text-slate-500">
                    <div className="text-right space-y-0.5">
                      <div>
                        Last Sync:{' '}
                        {source.last_synced_at
                          ? new Date(source.last_synced_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Pending'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Success:{' '}
                        {source.last_successful_sync_at
                          ? new Date(source.last_successful_sync_at).toLocaleDateString()
                          : 'None'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSyncSource(source.id)}
                        disabled={syncingSourceId === source.id}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                        title="Trigger manual synchronization"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${
                            syncingSourceId === source.id ? 'animate-spin text-indigo-600' : ''
                          }`}
                        />
                        <span>Sync</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Deactivate or Remove Knowledge Source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {connectedResources
              .filter((r) => sourceFilter === 'all' || r.sourceType === sourceFilter)
              .map((res) => (
                <div
                  key={res.id}
                  className="p-4 bg-white hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded shrink-0 mt-0.5">
                      {getProviderIcon(res.sourceType)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{res.name}</span>
                        {renderStatusBadge(res.status === 'connected' ? 'READY' : res.status)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {res.url || res.details}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-600">
                        <span>
                          Owner: <strong>{res.employeeName}</strong>
                        </span>
                        {res.projectName && (
                          <>
                            <span>&bull;</span>
                            <span>
                              Project: <strong>{res.projectName}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-[11px] text-slate-500">
                    <div>Last sync: {res.lastSynced}</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSyncProvider(res.name)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Sync</span>
                      </button>
                      <button
                        onClick={() => onDisconnectResource(res.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Disconnect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
