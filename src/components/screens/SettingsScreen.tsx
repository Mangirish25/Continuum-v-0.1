import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { ADMIN_USER } from '../../data/mockData';
import { Settings, User, Building, Mail, Network, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SettingsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  const [adminName, setAdminName] = useState(ADMIN_USER.name);
  const [adminEmail, setAdminEmail] = useState(ADMIN_USER.email);
  const [orgName, setOrgName] = useState(ADMIN_USER.organization);
  const [outboundEmail, setOutboundEmail] = useState('notifications@continuum.acme.corp');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

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
          <span>Settings saved successfully.</span>
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
            {[
              { name: 'GitHub', status: '12 Repos', icon: '🟢' },
              { name: 'Google Drive', status: '8 Folders', icon: '🟢' },
              { name: 'Notion', status: '6 Pages', icon: '🟢' },
              { name: 'Jira Workspace', status: 'Company PAY', icon: '🟢' },
            ].map((conn, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-800">{conn.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {conn.icon} {conn.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-xs cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
