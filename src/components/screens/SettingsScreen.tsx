import React, { useState, useEffect } from 'react';
import { ScreenId, AdminUser, ConnectedResource } from '../../types';
import { Settings, User, Building, Mail, Network, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SettingsScreenProps {
  onNavigate: (screen: ScreenId) => void;
  adminUser: AdminUser;
  onUpdateAdminUser: (updated: Partial<AdminUser>) => void;
  connectedResources: ConnectedResource[];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigate,
  adminUser,
  onUpdateAdminUser,
  connectedResources,
}) => {
  const [adminName, setAdminName] = useState(adminUser.name || '');
  const [adminEmail, setAdminEmail] = useState(adminUser.email || '');
  const [orgName, setOrgName] = useState(adminUser.organization || '');
  const [outboundEmail, setOutboundEmail] = useState(() => {
    const saved = localStorage.getItem('continuum_outbound_email');
    if (saved) return saved;
    const domain = adminUser.email.includes('@') ? adminUser.email.split('@')[1] : 'continuum.internal';
    return `notifications@${domain}`;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize when adminUser updates from backend
  useEffect(() => {
    if (adminUser.name) setAdminName(adminUser.name);
    if (adminUser.email) setAdminEmail(adminUser.email);
    if (adminUser.organization) setOrgName(adminUser.organization);
  }, [adminUser]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdminUser({
      name: adminName.trim(),
      email: adminEmail.trim(),
      organization: orgName.trim(),
    });
    localStorage.setItem('continuum_outbound_email', outboundEmail.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Dynamic integration counts derived directly from connected resources
  const githubCount = connectedResources.filter(
    (r) => r.sourceType.toLowerCase() === 'github'
  ).length;
  const driveCount = connectedResources.filter(
    (r) => r.sourceType.toLowerCase() === 'googledrive' || r.sourceType.toLowerCase() === 'google_drive'
  ).length;
  const notionCount = connectedResources.filter(
    (r) => r.sourceType.toLowerCase() === 'notion'
  ).length;
  const jiraCount = connectedResources.filter(
    (r) => r.sourceType.toLowerCase() === 'jira'
  ).length;

  const integrationCards = [
    {
      name: 'GitHub',
      status: githubCount > 0 ? `${githubCount} Repos` : '0 Repos Connected',
      connected: githubCount > 0,
    },
    {
      name: 'Google Drive',
      status: driveCount > 0 ? `${driveCount} Folders` : '0 Folders Connected',
      connected: driveCount > 0,
    },
    {
      name: 'Notion',
      status: notionCount > 0 ? `${notionCount} Pages` : '0 Pages Connected',
      connected: notionCount > 0,
    },
    {
      name: 'Jira Workspace',
      status: jiraCount > 0 ? `${jiraCount} Workspaces` : '0 Workspaces Connected',
      connected: jiraCount > 0,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Administrator profile, organization details, and outbound handover email configuration.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Administrator settings saved and updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Admin Profile */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Admin Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Administrator Full Name
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Enter administrator full name"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Administrator Email Address
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Application Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Application & Organization
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Technologies"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Outbound Email Configuration
              </label>
              <input
                type="email"
                value={outboundEmail}
                onChange={(e) => setOutboundEmail(e.target.value)}
                placeholder="notifications@company.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
            Outbound email is used by Continuum to deliver verified AI handover packages when an administrator clicks "Send Handover by Email".
          </div>
        </div>

        {/* Section 3: Integrations Overview */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-teal-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Integrations & Connectors
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('connections')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Manage in Connections &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {integrationCards.map((integ) => (
              <div
                key={integ.name}
                className="p-3 bg-slate-50/70 border border-slate-200 rounded flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900">{integ.name}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {integ.status}
                  </div>
                </div>
                <span className="text-xs">{integ.connected ? '🟢' : '⚪'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
