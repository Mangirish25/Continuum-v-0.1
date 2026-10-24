import React, { useState, useEffect } from 'react';
import { ConnectedResource, SourceType } from '../../types';
import {
  getSources,
  syncSource,
  deleteSource,
  RegisteredSource,
  getJiraWorkspaceStatus,
  configureJiraWorkspace,
  verifyJiraWorkspace,
  disconnectJiraWorkspace,
  JiraWorkspaceStatusData,
} from '../../lib/api';
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
  Settings,
  Key,
  X,
  Check,
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

  // Jira Centralized Workspace States
  const [jiraStatus, setJiraStatus] = useState<JiraWorkspaceStatusData | null>(null);
  const [loadingJiraStatus, setLoadingJiraStatus] = useState(false);
  const [isConfigureJiraOpen, setIsConfigureJiraOpen] = useState(false);
  const [jiraUrlInput, setJiraUrlInput] = useState('');
  const [jiraEmailInput, setJiraEmailInput] = useState('');
  const [jiraTokenInput, setJiraTokenInput] = useState('');
  const [isSavingJira, setIsSavingJira] = useState(false);
  const [jiraConfigError, setJiraConfigError] = useState<string | null>(null);
  const [isVerifyingJira, setIsVerifyingJira] = useState(false);

  // Define provider types dynamically
  const providerTypes: { type: SourceType; name: string; description: string; scopeNotice: string }[] = [
    {
      type: 'github',
      name: 'GitHub',
      description: 'Connect selected public repositories to employees to track commit histories, pull requests, and code ownership.',
      scopeNotice: 'Only public repositories connected to employees are accessed. No private GitHub account access required.',
    },
    {
      type: 'googledrive',
      name: 'Google Drive',
      description: 'Employees authorize OAuth access, and the admin connects exactly one specific folder for synchronization.',
      scopeNotice: 'Continuum only synchronizes the single folder selected by the administrator. Entire Drive is never accessed.',
    },
    {
      type: 'notion',
      name: 'Notion',
      description: 'Employees authorize access to a selected Notion page or documentation workspace for knowledge indexing.',
      scopeNotice: 'Only selected documentation pages and child sub-pages are indexed.',
    },
    {
      type: 'jira',
      name: 'Jira',
      description: 'Company-level connection linking your Jira workspace to automatically map tasks to employees.',
      scopeNotice: 'Connected at company level. Employees do not separately authorize Jira.',
    },
  ];

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

  const loadJiraStatus = async () => {
    setLoadingJiraStatus(true);
    try {
      const data = await getJiraWorkspaceStatus();
      setJiraStatus(data);
      if (data?.workspace_url) {
        setJiraUrlInput(data.workspace_url);
      }
      if (data?.admin_email) {
        setJiraEmailInput(data.admin_email);
      }
    } catch {
      // Backend offline or not configured
    } finally {
      setLoadingJiraStatus(false);
    }
  };

  useEffect(() => {
    loadSources();
    loadJiraStatus();
  }, []);

  const handleVerifyJira = async () => {
    setIsVerifyingJira(true);
    setStatusNotice(null);
    try {
      const res = await verifyJiraWorkspace();
      setStatusNotice(res.message);
      await loadJiraStatus();
    } catch (err: any) {
      setStatusNotice(`Jira verification error: ${err.message}`);
    } finally {
      setIsVerifyingJira(false);
    }
  };

  const handleSaveJiraConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingJira(true);
    setJiraConfigError(null);
    try {
      const data = await configureJiraWorkspace({
        workspace_url: jiraUrlInput,
        admin_email: jiraEmailInput || undefined,
        api_token: jiraTokenInput,
      });
      setJiraStatus(data);
      setIsConfigureJiraOpen(false);
      setJiraTokenInput('');
      setStatusNotice('Centralized Jira workspace successfully configured and verified!');
      await loadSources();
      await loadJiraStatus();
    } catch (err: any) {
      setJiraConfigError(err.message || 'Failed to configure Jira workspace.');
    } finally {
      setIsSavingJira(false);
    }
  };

  const handleDisconnectJira = async () => {
    if (!confirm('Are you sure you want to disconnect the centralized Jira workspace? Existing mapped resources will be preserved with attribution.')) {
      return;
    }
    try {
      await disconnectJiraWorkspace();
      setStatusNotice('Jira workspace disconnected.');
      await loadJiraStatus();
      await loadSources();
    } catch (err: any) {
      setStatusNotice(`Failed to disconnect: ${err.message}`);
    }
  };

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
    ? providerTypes.find((p) => p.type === selectedProviderType)
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
        {providerTypes.map((provider) => {
          const isSelected = selectedProviderType === provider.type;
          const matching = [...dbSources.map(s => ({ sourceType: s.source_type, lastSynced: s.last_synced_at })), ...connectedResources].filter(s => {
            const st = (s.sourceType || '').toLowerCase();
            if (provider.type === 'googledrive') return st === 'googledrive' || st === 'google_drive';
            return st === provider.type;
          });
          const count = matching.length;
          const isConnected = count > 0;
          let countLabel = '';
          if (provider.type === 'github') countLabel = `${count} ${count === 1 ? 'Repository' : 'Repositories'} Connected`;
          else if (provider.type === 'googledrive') countLabel = `${count} ${count === 1 ? 'Folder' : 'Folders'} Connected`;
          else if (provider.type === 'notion') countLabel = `${count} ${count === 1 ? 'Page' : 'Pages'} Connected`;
          else if (provider.type === 'jira') countLabel = `${count} ${count === 1 ? 'Workspace' : 'Workspaces'} Connected`;

          const lastSync = matching[0]?.lastSynced ? new Date(matching[0].lastSynced).toLocaleDateString() : 'Never synced';

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
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 rounded border font-semibold ${
                          isConnected
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-slate-500 bg-slate-100 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-800">
                    {countLabel}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Last sync: {lastSync}
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
          {activeDetailProvider.type === 'jira' ? (
            /* =======================================================
               ADMINISTRATOR-MANAGED CENTRAL JIRA WORKSPACE UI
               ======================================================= */
            <div className="space-y-5">
              {/* Jira Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">
                        Company Jira Workspace (Centralized)
                      </h2>
                      {jiraStatus?.connected ? (
                        <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Connected & Verified</span>
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Not Configured</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Managed centrally by Continuum Administrator. Employees do not need individual Jira credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {jiraStatus?.connected && (
                    <button
                      onClick={handleVerifyJira}
                      disabled={isVerifyingJira}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                      title="Test Jira connection"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingJira ? 'animate-spin text-blue-600' : ''}`} />
                      <span>{isVerifyingJira ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setJiraConfigError(null);
                      setIsConfigureJiraOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{jiraStatus?.connected ? 'Update Credentials' : 'Configure Jira'}</span>
                  </button>

                  {jiraStatus?.connected && (
                    <button
                      onClick={handleDisconnectJira}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded transition-colors cursor-pointer"
                      title="Safely disconnect centralized Jira workspace"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>

              {/* Jira Workspace Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Workspace Identity</div>
                  <div className="font-bold text-slate-900 mt-0.5 font-mono">
                    {jiraStatus?.workspace_url || 'https://continuum.atlassian.net'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Admin Account</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {jiraStatus?.admin_email || 'Central Admin Configuration'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Mapped Resources</div>
                  <div className="font-semibold text-indigo-700 mt-0.5">
                    {jiraStatus?.resources_count || 0} Jira Project Sources Tracked
                  </div>
                </div>
              </div>

              {/* Security Scope Notice */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded text-xs text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-950">Security & Credential Guarantee:</div>
                  <div className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    All Jira credentials and API tokens are encrypted with AES/Fernet encryption and strictly stored server-side.
                    Credentials are never exposed to browser storage or client scripts. Individual employees do not configure Jira connections.
                  </div>
                </div>
              </div>

              {/* Available Jira Projects in Workspace */}
              {jiraStatus?.available_projects && jiraStatus.available_projects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                      Available Workspace Projects ({jiraStatus.available_projects.length})
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Click "+ Map to Employee" to associate tasks with knowledge attribution
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {jiraStatus.available_projects.map((jp) => (
                      <div
                        key={jp.id || jp.key}
                        className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900">{jp.name}</div>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Key: {jp.key}
                          </span>
                        </div>
                        <button
                          onClick={onOpenConnectResource}
                          className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded cursor-pointer transition-colors"
                          title="Map project to an employee"
                        >
                          + Map
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapped Resources Attributed to Employees */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                    Employee Attributed Jira Resources ({providerResources.length})
                  </h3>
                  <button
                    onClick={onOpenConnectResource}
                    className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-2xs cursor-pointer"
                  >
                    + Map Jira Resource
                  </button>
                </div>

                {providerResources.length > 0 ? (
                  <div className="space-y-2">
                    {providerResources.map((res) => (
                      <div
                        key={res.id}
                        className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{res.employeeName}</span>
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 rounded border border-blue-200">
                              Attributed Contributor
                            </span>
                          </div>
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
                            title="Disconnect mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded">
                    No Jira project resources are currently mapped to employees. Click "+ Map Jira Resource" to associate workspace projects with contributors.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =======================================================
               STANDARD VIEW FOR GITHUB, GOOGLE DRIVE, NOTION
               ======================================================= */
            <>
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
                      {providerResources.length > 0 || dbSources.some(s => {
                        const st = (s.source_type || '').toLowerCase();
                        if (activeDetailProvider.type === 'googledrive') return st === 'googledrive' || st === 'google_drive';
                        return st === activeDetailProvider.type;
                      }) ? (
                        <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                          🟢 Connected
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                          ⚪ Not Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Last synchronization: {providerResources[0]?.lastSynced || 'Never synced'}
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
            </>
          )}
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
        ) : connectedResources.length === 0 ? (
          <div className="p-12 text-center space-y-3 border border-slate-200 rounded-lg bg-slate-50/50">
            <Network className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">No Knowledge Sources Connected</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No knowledge connectors are currently active. Connect a GitHub repository, Google Drive folder, Notion workspace, or Jira board to begin indexing continuity.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenConnectResource}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Connect First Resource</span>
              </button>
            </div>
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

      {/* Configure Jira Modal */}
      {isConfigureJiraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Configure Company Jira Workspace
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Centrally managed Atlassian Jira credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigureJiraOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveJiraConfig} className="p-6 space-y-4">
              {jiraConfigError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Configuration Error</div>
                    <div>{jiraConfigError}</div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Admin Security:</strong> Jira API credentials are encrypted with AES-256 (Fernet) in the database. Employees do not configure or see these credentials.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jira Workspace URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://continuum.atlassian.net"
                  value={jiraUrlInput}
                  onChange={(e) => setJiraUrlInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The base URL of your Atlassian Cloud or Jira Server instance.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Email / Account
                </label>
                <input
                  type="email"
                  placeholder="admin@continuum.internal"
                  value={jiraEmailInput}
                  onChange={(e) => setJiraEmailInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Required for Atlassian Cloud Basic Auth with API token.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Token / PAT <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••••••••••••••"
                  value={jiraTokenInput}
                  onChange={(e) => setJiraTokenInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Generated from Atlassian Account Settings &gt; Security &gt; Create API token.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigureJiraOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingJira || !jiraUrlInput.trim() || !jiraTokenInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSavingJira && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingJira ? 'Saving & Verifying...' : 'Save & Verify Workspace'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
