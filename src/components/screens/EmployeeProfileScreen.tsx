import React from 'react';
import { Employee, Project, ConnectedResource, Handover, ScreenId } from '../../types';
import {
  ArrowLeft,
  Plus,
  ArrowRightLeft,
  FolderGit2,
  Folder,
  FileText,
  Layers,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface EmployeeProfileScreenProps {
  employee: Employee;
  allProjects: Project[];
  connectedResources: ConnectedResource[];
  onBackToEmployees: () => void;
  onOpenConnectResource: (emp: Employee) => void;
  onStartHandoverForEmployee: (emp: Employee) => void;
  onSelectProject: (proj: Project) => void;
  onDisconnectResource: (resourceId: string) => void;
}

export const EmployeeProfileScreen: React.FC<EmployeeProfileScreenProps> = ({
  employee,
  allProjects,
  connectedResources,
  onBackToEmployees,
  onOpenConnectResource,
  onStartHandoverForEmployee,
  onSelectProject,
  onDisconnectResource,
}) => {
  // Filter resources associated with this employee
  const employeeResources = connectedResources.filter((r) => r.employeeId === employee.id);

  // Filter projects associated with this employee
  const employeeProjects = allProjects.filter((p) =>
    p.members.some((m) => m.employeeId === employee.id)
  );

  return (
    <div className="space-y-6">
      {/* Back button and Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEmployees}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            title="Back to Employees"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {employee.name}
              </h1>
              {employee.status === 'Departing' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-50 text-amber-800 border border-amber-300 font-semibold">
                  Departing: {employee.departureDate || 'Soon'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {employee.role} · {employee.team} · {employee.email}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenConnectResource(employee)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Connect Resource</span>
          </button>

          <button
            onClick={() => onStartHandoverForEmployee(employee)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Start Handover</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards (Section 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Knowledge Score</div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {employee.knowledgeScore}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Concentration index</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Continuity Risk</div>
          <div className="mt-2 text-2xl font-bold font-mono uppercase tabular-nums">
            <span
              className={
                employee.risk === 'critical' || employee.risk === 'high'
                  ? 'text-rose-600'
                  : employee.risk === 'medium'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }
            >
              {employee.risk}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {employee.risk === 'high' ? 'Sole custodian on key services' : 'Nominal redundancy'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Projects</div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {employeeProjects.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Active contributors</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Connected Sources</div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {employeeResources.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">GitHub, Drive, Notion, Jira</div>
        </div>
      </div>

      {/* Departure Banner if departing */}
      {employee.status === 'Departing' && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-950">
                Departure Scheduled for {employee.departureDate || 'November 2026'}
              </div>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {employee.name} owns critical knowledge across Payment Platform and Authentication Service. Create a knowledge handover to prevent institutional knowledge loss.
              </p>
            </div>
          </div>
          <button
            onClick={() => onStartHandoverForEmployee(employee)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors shadow-xs shrink-0"
          >
            Generate Handover Now &rarr;
          </button>
        </div>
      )}

      {/* Skills / Knowledge Areas */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
          Skills / Knowledge Areas
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {employee.skills.map((skill, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Projects Contributed */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
            Projects ({employeeProjects.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Contribution Breakdown</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {employeeProjects.map((proj) => {
            const memberInfo = proj.members.find((m) => m.employeeId === employee.id);
            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                className="p-3.5 border border-slate-200 hover:border-indigo-400 rounded cursor-pointer transition-all hover:bg-slate-50/50 group space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {proj.name}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {proj.code} · Team: {proj.team}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
                      Tier:{proj.tier}&nbsp;&nbsp;&nbsp;&nbsp;BF:{proj.busFactor}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase whitespace-nowrap ${
                        proj.risk === 'critical'
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : proj.risk === 'high'
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      }`}
                    >
                      {proj.risk}
                    </span>
                  </div>
                </div>

                {memberInfo && (
                  <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Knowledge Ownership:</span>
                      <strong className="text-slate-900 tabular-nums">
                        {memberInfo.contributionPercent}%
                      </strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600"
                        style={{ width: `${memberInfo.contributionPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Connected Resources Section (Critical Section 11) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Connected Resources ({employeeResources.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Repositories, folders, and documentation mapped to {employee.name}
            </p>
          </div>

          <button
            onClick={() => onOpenConnectResource(employee)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Resource</span>
          </button>
        </div>

        {employeeResources.length > 0 ? (
          <div className="space-y-3">
            {employeeResources.map((res) => {
              const getIcon = () => {
                switch (res.sourceType) {
                  case 'github':
                    return <FolderGit2 className="w-4 h-4 text-slate-800" />;
                  case 'googledrive':
                    return <Folder className="w-4 h-4 text-amber-600" />;
                  case 'notion':
                    return <FileText className="w-4 h-4 text-slate-700" />;
                  case 'jira':
                    return <Layers className="w-4 h-4 text-blue-600" />;
                }
              };

              const getProviderTitle = () => {
                switch (res.sourceType) {
                  case 'github':
                    return 'GitHub Public Repository';
                  case 'googledrive':
                    return 'Google Drive (Single Folder)';
                  case 'notion':
                    return 'Notion Page';
                  case 'jira':
                    return 'Jira Company Mapping';
                }
              };

              return (
                <div
                  key={res.id}
                  className="p-3.5 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 mt-0.5 shrink-0">
                      {getIcon()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{res.name}</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Connected</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {getProviderTitle()} · {res.details || 'Synchronized'}
                      </div>
                      {res.projectName && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Associated Project: <strong className="text-slate-700">{res.projectName}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center font-mono text-[11px] text-slate-400 shrink-0">
                    <span>Synced: {res.lastSynced}</span>
                    <button
                      onClick={() => onDisconnectResource(res.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Disconnect Resource"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 border border-dashed border-slate-300 rounded text-center text-xs text-slate-500 space-y-2">
            <p>No knowledge resources currently connected for {employee.name}.</p>
            <button
              onClick={() => onOpenConnectResource(employee)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              + Connect a GitHub repository, Drive folder, or Notion page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
