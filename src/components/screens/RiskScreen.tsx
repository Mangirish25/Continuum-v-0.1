import React from 'react';
import { Project, Employee } from '../../types';
import { ShieldAlert, AlertTriangle, ArrowRight, Users, FolderGit2, FileText } from 'lucide-react';

interface RiskScreenProps {
  projects: Project[];
  employees: Employee[];
  onSelectProject: (proj: Project) => void;
  onSelectEmployee: (emp: Employee) => void;
}

export const RiskScreen: React.FC<RiskScreenProps> = ({
  projects,
  employees,
  onSelectProject,
  onSelectEmployee,
}) => {
  const highRiskProjects = projects.filter(
    (p) => p.risk === 'critical' || p.risk === 'high' || p.busFactor <= 2
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Continuity Risk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic knowledge dependency telemetry, bus factor vulnerabilities, and documentation gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">Overall Organization Risk:</span>
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-300 uppercase">
            HIGH
          </span>
        </div>
      </div>

      {/* Risk Metrics Cards (Section 17) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-rose-200 bg-rose-50/20 rounded p-4 shadow-xs">
          <div className="text-xs text-rose-700 font-medium">Critical Projects</div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-700 tabular-nums">
            1
          </div>
          <div className="mt-1 text-[11px] text-rose-600">Payment Platform</div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded p-4 shadow-xs">
          <div className="text-xs text-amber-700 font-medium">High-Risk Employees</div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700 tabular-nums">
            2
          </div>
          <div className="mt-1 text-[11px] text-amber-600">Rahul · Aditi</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Bus Factor = 1</div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            1
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Single-person point of failure</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Knowledge Concentration</div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            78%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Peak ownership on Rahul</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Documentation Gaps</div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            3
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Outdated specs identified</div>
        </div>
      </div>

      {/* High-Risk Projects Table (Section 17) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs space-y-2">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              High-Risk Projects & Dependencies
            </h2>
            <p className="text-[11px] text-slate-500">
              Projects with low bus-factor redundancy or impending staff transitions
            </p>
          </div>
          <span className="font-mono text-xs text-rose-700 font-semibold">
            {highRiskProjects.length} Flagged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Project</th>
                <th className="py-3 px-4 font-semibold">Primary Knowledge Owner</th>
                <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Tier & Bus Factor</th>
                <th className="py-3 px-4 font-semibold">Risk</th>
                <th className="py-3 px-4 font-semibold">Reason</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {highRiskProjects.map((proj) => {
                const primaryOwner = proj.members[0];
                return (
                  <tr
                    key={proj.id}
                    onClick={() => onSelectProject(proj)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {proj.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{proj.code} · Team: {proj.team}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900">
                      {primaryOwner ? `${primaryOwner.name} (${primaryOwner.contributionPercent}%)` : 'Unassigned'}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                      <span
                        className={`px-2.5 py-1 rounded border inline-block whitespace-nowrap text-xs ${
                          proj.busFactor === 1
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-amber-50 border-amber-300 text-amber-700'
                        }`}
                      >
                        Tier:{proj.tier}&nbsp;&nbsp;&nbsp;&nbsp;BF:{proj.busFactor}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase tabular-nums ${
                          proj.risk === 'critical'
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-amber-50 border-amber-300 text-amber-700'
                        }`}
                      >
                        {proj.risk}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      {proj.riskReasons[0] || 'Knowledge concentration'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(proj);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Knowledge Dependency Table (Section 18) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Employees with High Knowledge Dependency (Section 18)
            </h2>
            <p className="text-[11px] text-slate-500">
              Ranked by institutional knowledge score and departure impact
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Click to view profile</span>
        </div>

        <div className="space-y-2.5">
          {employees.map((emp) => (
            <div
              key={emp.id}
              onClick={() => onSelectEmployee(emp)}
              className="p-3 border border-slate-200 hover:border-indigo-300 rounded cursor-pointer transition-all hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={emp.avatar}
                  alt={emp.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {emp.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {emp.role} · {emp.team} {emp.status === 'Departing' ? '· ⚠️ Departing soon' : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center font-mono text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">DEPENDENCY</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {emp.knowledgeScore}%
                  </span>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tabular-nums ${
                    emp.risk === 'critical' || emp.risk === 'high'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : emp.risk === 'medium'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  }`}
                >
                  {emp.risk}
                </span>

                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
