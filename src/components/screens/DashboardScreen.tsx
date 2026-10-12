import React from 'react';
import { ScreenId, Project, Employee, Handover } from '../../types';
import {
  Users,
  FolderGit2,
  Network,
  ArrowRightLeft,
  ShieldAlert,
  ArrowRight,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Layers,
  FileText,
  Menu,
} from 'lucide-react';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  employees: Employee[];
  projects: Project[];
  handovers: Handover[];
  onSelectEmployee: (emp: Employee) => void;
  onSelectProject: (proj: Project) => void;
  onSelectHandover: (handover: Handover) => void;
  onOpenAddEmployee: () => void;
  onOpenConnectResource: () => void;
  onOpenCreateHandover: () => void;
  onToggleMobileMenu?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  employees,
  projects,
  handovers,
  onSelectEmployee,
  onSelectProject,
  onSelectHandover,
  onOpenAddEmployee,
  onOpenConnectResource,
  onOpenCreateHandover,
  onToggleMobileMenu,
}) => {
  const activeHandovers = handovers.filter((h) => h.status !== 'Email Sent');

  const criticalAttentionItems = [
    {
      id: 'att-1',
      title: 'Payment Platform has a bus factor of 1',
      description: 'Single-person dependency on Rahul Sharma creates severe continuity risk.',
      action: () => {
        const p = projects.find((item) => item.id === 'proj-payment');
        if (p) onSelectProject(p);
      },
    },
    {
      id: 'att-2',
      title: 'Rahul owns most payment-service knowledge',
      description: 'Author of 78% of commits and all Stripe webhook signature handling.',
      action: () => {
        const emp = employees.find((e) => e.id === 'emp-rahul');
        if (emp) onSelectEmployee(emp);
      },
    },
    {
      id: 'att-3',
      title: 'Payment architecture documentation is outdated',
      description: 'Last verified Notion spec was updated 4 months ago.',
      action: () => onNavigate('knowledge'),
    },
    {
      id: 'att-4',
      title: '3 Jira tasks remain assigned to departing employees',
      description: 'Unresolved bug fixes in PAY project need deputy reassignment.',
      action: () => onNavigate('handovers'),
    },
  ];

  const recentActivities = [
    { text: 'Google Drive folder connected: Payment Project', time: '10 min ago', icon: Folder, color: 'text-amber-600' },
    { text: 'GitHub repository synchronized: payment-service', time: '25 min ago', icon: FolderGit2, color: 'text-slate-800' },
    { text: 'Jira tasks updated from Acme Technologies workspace', time: '1 hour ago', icon: Layers, color: 'text-blue-600' },
    { text: 'Risk score recalculated: Bus Factor remains 1', time: '2 hours ago', icon: ShieldAlert, color: 'text-rose-600' },
    { text: 'Knowledge handover generated for Rahul Sharma', time: '4 hours ago', icon: ArrowRightLeft, color: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Primary CTAs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Knowledge Continuity Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor employees, connected knowledge, continuity risk and active handovers.
            </p>
          </div>
        </div>

        {/* Dashboard CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAddEmployee}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Employee</span>
          </button>

          <button
            onClick={onOpenConnectResource}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors shadow-xs"
          >
            <Network className="w-3.5 h-3.5 text-teal-600" />
            <span>Connect Source</span>
          </button>

          <button
            onClick={() => onNavigate('knowledge')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search Knowledge</span>
          </button>

          <button
            onClick={onOpenCreateHandover}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Create Handover</span>
          </button>
        </div>
      </div>

      {/* Top Statistics Cards (5 Cards per Section 8) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white border border-slate-200 rounded p-4 cursor-pointer hover:border-slate-300 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Employees</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            42
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Acme Technologies</div>
        </div>

        <div
          onClick={() => onNavigate('connections')}
          className="bg-white border border-slate-200 rounded p-4 cursor-pointer hover:border-slate-300 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Connected Sources</span>
            <Network className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            118
          </div>
          <div className="mt-1 text-[11px] text-slate-400">GitHub, Drive, Notion, Jira</div>
        </div>

        <div
          onClick={() => onNavigate('projects')}
          className="bg-white border border-slate-200 rounded p-4 cursor-pointer hover:border-slate-300 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Projects</span>
            <FolderGit2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            12
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Across 4 core teams</div>
        </div>

        <div
          onClick={() => onNavigate('risk')}
          className="bg-white border border-rose-200 bg-rose-50/20 rounded p-4 cursor-pointer hover:border-rose-300 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>High-Risk Projects</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-700 tabular-nums">
            4
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-mono">Bus factor &le; 2</div>
        </div>

        <div
          onClick={() => onNavigate('handovers')}
          className="bg-white border border-indigo-200 bg-indigo-50/20 rounded p-4 cursor-pointer hover:border-indigo-300 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-indigo-700 font-medium">
            <span>Active Handovers</span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            2
          </div>
          <div className="mt-1 text-[11px] text-indigo-600 font-mono">In progress</div>
        </div>
      </div>

      {/* Continuity Risk Overview & Bus Factor Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Continuity Risk Overview (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Continuity Risk Overview
              </h2>
              <p className="text-[11px] text-slate-500">
                Categorized risk across services and knowledge assets
              </p>
            </div>
            <span
              onClick={() => onNavigate('risk')}
              className="text-xs text-indigo-600 hover:underline cursor-pointer font-medium"
            >
              Analyze &rarr;
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-rose-50/70 border border-rose-200 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="font-semibold text-rose-900">Critical</span>
              </div>
              <span className="font-mono font-bold text-rose-700 text-sm tabular-nums">2</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span className="font-semibold text-amber-900">High</span>
              </div>
              <span className="font-mono font-bold text-amber-700 text-sm tabular-nums">5</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-amber-50/30 border border-slate-200 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="font-semibold text-slate-800">Medium</span>
              </div>
              <span className="font-mono font-bold text-slate-700 text-sm tabular-nums">8</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-emerald-50/40 border border-emerald-200 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="font-semibold text-emerald-900">Low</span>
              </div>
              <span className="font-mono font-bold text-emerald-700 text-sm tabular-nums">17</span>
            </div>
          </div>
        </div>

        {/* Right: Bus Factor Overview (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Bus Factor Overview
              </h2>
              <p className="text-[11px] text-slate-500">
                Minimum employees whose departure puts system knowledge at risk
              </p>
            </div>
            <span
              onClick={() => onNavigate('projects')}
              className="text-xs text-indigo-600 hover:underline cursor-pointer font-medium"
            >
              All Projects &rarr;
            </span>
          </div>

          <div className="space-y-2">
            {projects.map((proj) => {
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className="flex items-center justify-between p-3 border border-slate-200 hover:border-slate-300 rounded cursor-pointer transition-all hover:bg-slate-50/50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-mono font-bold text-xs text-slate-700">
                      {proj.code}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {proj.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Team: {proj.team} · Coverage: {proj.knowledgeCoverage}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tier and Bus Factor in one line */}
                    <span className="whitespace-nowrap font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 tabular-nums tracking-wide">
                      Tier:{proj.tier}&nbsp;&nbsp;&nbsp;&nbsp;BF:{proj.busFactor}
                    </span>

                    {/* Risk Tag */}
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border uppercase tabular-nums whitespace-nowrap ${
                        proj.risk === 'critical'
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : proj.risk === 'high'
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : proj.risk === 'medium'
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      }`}
                    >
                      {proj.risk}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Attention & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Critical Attention (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Critical Attention
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Action Required</span>
          </div>

          <div className="space-y-2.5">
            {criticalAttentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50/80 border border-slate-200 rounded flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                </div>
                <button
                  onClick={item.action}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Recent Activity
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Live Ingestion</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {recentActivities.map((act, idx) => {
              const Icon = act.icon;
              return (
                <div key={idx} className="flex items-start gap-2.5 pb-2 border-b border-slate-100 last:border-none last:pb-0">
                  <div className={`mt-0.5 p-1 rounded bg-slate-100 ${act.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 leading-snug">{act.text}</p>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      {act.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
