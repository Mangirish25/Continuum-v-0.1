import React, { useState, useMemo } from 'react';
import { Project, Employee } from '../../types';
import {
  FolderGit2,
  Users,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  ArrowLeft,
  Folder,
  FileText,
  Layers,
  Clock,
  ArrowRightLeft,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

interface ProjectsScreenProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (proj: Project | null) => void;
  onSelectEmployeeById: (employeeId: string) => void;
  onOpenCreateHandover: () => void;
  onOpenAddProject?: () => void;
  onEditProject?: (proj: Project) => void;
  onDeleteProject?: (proj: Project) => void;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onSelectEmployeeById,
  onOpenCreateHandover,
  onOpenAddProject,
  onEditProject,
  onDeleteProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  // Extract unique teams from actual project data
  const uniqueTeams = useMemo(() => {
    const teams = new Set(projects.map((p) => p.team).filter(Boolean));
    return Array.from(teams).sort();
  }, [projects]);

  // If a project is selected, render Project Detail view (Section 14)
  if (selectedProject) {
    return (
      <div className="space-y-6">
        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectProject(null)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {selectedProject.name}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold whitespace-nowrap">
                  {selectedProject.code} · Tier:{selectedProject.tier}&nbsp;&nbsp;&nbsp;&nbsp;BF:{selectedProject.busFactor}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Team: {selectedProject.team} · Status: {selectedProject.status} · Last Synced: {selectedProject.lastSync}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditProject && (
              <button
                onClick={() => onEditProject(selectedProject)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={onOpenCreateHandover}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Create Handover</span>
            </button>

            {onDeleteProject && (
              <button
                onClick={() => onDeleteProject(selectedProject)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Summary Cards (Section 14) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Tier & Bus Factor</div>
            <div className="mt-2 text-xl font-bold font-mono text-slate-900 tabular-nums whitespace-nowrap">
              Tier:{selectedProject.tier}&nbsp;&nbsp;&nbsp;&nbsp;BF:{selectedProject.busFactor}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {selectedProject.busFactor === 1 ? 'Critical single dependency' : 'Distributed redundancy'}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Continuity Risk</div>
            <div className="mt-2 text-2xl font-bold font-mono uppercase tabular-nums">
              <span
                className={
                  selectedProject.risk === 'critical' || selectedProject.risk === 'high'
                    ? 'text-rose-600'
                    : selectedProject.risk === 'medium'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }
              >
                {selectedProject.risk}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono">
              Evaluated by Continuum
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Knowledge Coverage</div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {selectedProject.knowledgeCoverage}%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Documentation & code sync</div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Team Members</div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {selectedProject.members.length}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Active engineers</div>
          </div>
        </div>

        {/* Team & Bus Factor Concentration Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Team & Knowledge Concentration
              </h2>
              <p className="text-[11px] text-slate-500">
                Visualize contribution percentage and bus factor vulnerability
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Bus Factor: {selectedProject.busFactor}
            </span>
          </div>

          {selectedProject.members && selectedProject.members.length > 0 ? (
            <div className="space-y-3">
              {selectedProject.members.map((member) => (
                <div
                  key={member.employeeId}
                  onClick={() => onSelectEmployeeById(member.employeeId)}
                  className="p-3 border border-slate-200 hover:border-indigo-300 rounded cursor-pointer transition-all hover:bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 hover:text-indigo-600">
                        {member.name}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-2">({member.role})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {member.contributionPercent}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        member.contributionPercent >= 60
                          ? 'bg-rose-500'
                          : member.contributionPercent >= 30
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${member.contributionPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-slate-200 rounded text-center text-xs text-slate-400">
              No team members assigned to this project yet.
            </div>
          )}
        </div>

        {/* Risk Reasons & Knowledge Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Reasons */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-800 font-mono flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Continuity Risk Reasons</span>
            </h2>
            {selectedProject.riskReasons && selectedProject.riskReasons.length > 0 ? (
              <div className="space-y-2 text-xs">
                {selectedProject.riskReasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-rose-50/70 border border-rose-200 rounded text-rose-950 flex items-start gap-2"
                  >
                    <span className="font-bold text-rose-600">&bull;</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded text-emerald-800 text-xs">
                No active risk conditions identified for this project.
              </div>
            )}
          </div>

          {/* Connected Knowledge Sources */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Connected Knowledge Sources
            </h2>
            <div className="space-y-2 text-xs">
              {selectedProject.connectedSources?.github && selectedProject.connectedSources.github.length > 0 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-slate-700" />
                    <span className="font-semibold text-slate-800">GitHub:</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {selectedProject.connectedSources.github.join(', ')}
                    </span>
                  </div>
                  <span className="text-emerald-700 font-mono text-[10px] font-semibold">🟢 Connected</span>
                </div>
              ) : null}

              {selectedProject.connectedSources?.googledrive && selectedProject.connectedSources.googledrive.length > 0 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-slate-800">Google Drive:</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {selectedProject.connectedSources.googledrive.join(', ')}
                    </span>
                  </div>
                  <span className="text-emerald-700 font-mono text-[10px] font-semibold">🟢 Connected</span>
                </div>
              ) : null}

              {selectedProject.connectedSources?.notion && selectedProject.connectedSources.notion.length > 0 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span className="font-semibold text-slate-800">Notion:</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {selectedProject.connectedSources.notion.join(', ')}
                    </span>
                  </div>
                  <span className="text-emerald-700 font-mono text-[10px] font-semibold">🟢 Connected</span>
                </div>
              ) : null}

              {selectedProject.connectedSources?.jira ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">Jira:</span>
                    <span className="text-slate-600 font-mono text-[11px]">
                      {selectedProject.connectedSources.jira}
                    </span>
                  </div>
                  <span className="text-emerald-700 font-mono text-[10px] font-semibold">🟢 Connected</span>
                </div>
              ) : null}

              {(!selectedProject.connectedSources ||
                ((!selectedProject.connectedSources.github || selectedProject.connectedSources.github.length === 0) &&
                  (!selectedProject.connectedSources.googledrive || selectedProject.connectedSources.googledrive.length === 0) &&
                  (!selectedProject.connectedSources.notion || selectedProject.connectedSources.notion.length === 0) &&
                  !selectedProject.connectedSources.jira)) && (
                <div className="p-4 border border-dashed border-slate-200 rounded text-center text-xs text-slate-400">
                  No knowledge sources connected to this project yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Recent Synchronization Activity</span>
          </h2>
          {selectedProject.recentActivity && selectedProject.recentActivity.length > 0 ? (
            <div className="space-y-2 text-xs">
              {selectedProject.recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded"
                >
                  <span className="text-slate-800">{act.action}</span>
                  <span className="text-[10px] font-mono text-slate-400">{act.timestamp}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-slate-200 rounded text-center text-xs text-slate-400">
              No recent synchronization events recorded for this project.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Projects Catalog list view (Section 13)
  const filteredProjects = projects.filter((proj) => {
    const matchSearch =
      proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.team.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTeam = teamFilter === 'all' || proj.team === teamFilter;
    const matchRisk = riskFilter === 'all' || proj.risk === riskFilter;
    return matchSearch && matchTeam && matchRisk;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mission-critical projects, knowledge concentration, and bus-factor analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAddProject && (
            <button
              onClick={onOpenAddProject}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Project</span>
            </button>
          )}

          <div className="font-mono text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded">
            <span>Total Projects: </span>
            <strong className="text-slate-900 tabular-nums">{projects.length}</strong>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search project by name or code..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
            <span>Team:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">All Teams</option>
              {uniqueTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 border-l border-slate-200 pl-2">
            <span>Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">All Risks</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {projects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">No Projects Registered</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no projects or services registered in the system yet. Register your services to evaluate bus factors, track continuity risk, and assign contributors.
            </p>
            {onOpenAddProject && (
              <div className="pt-2">
                <button
                  onClick={onOpenAddProject}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register First Project</span>
                </button>
              </div>
            )}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs font-medium text-slate-600">No projects match your active search or filters.</p>
            <p className="text-[11px] text-slate-400">Try adjusting your query or resetting the team and risk filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Project</th>
                  <th className="py-3 px-4 font-semibold">Team</th>
                  <th className="py-3 px-4 font-semibold text-center">Members</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Tier & Bus Factor</th>
                  <th className="py-3 px-4 font-semibold">Risk</th>
                  <th className="py-3 px-4 font-semibold text-right">Knowledge Coverage</th>
                  <th className="py-3 px-4 font-semibold">Last Sync</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((proj) => (
                  <tr
                    key={proj.id}
                    onClick={() => onSelectProject(proj)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {proj.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{proj.code}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-700">{proj.team}</td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700 tabular-nums">
                      {proj.members.length}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{proj.status}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                      <span
                        className={`px-2.5 py-1 rounded border inline-block whitespace-nowrap text-xs ${
                          proj.busFactor === 1
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : proj.busFactor === 2
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
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
                            : proj.risk === 'high'
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : proj.risk === 'medium'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        }`}
                      >
                        {proj.risk}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          proj.knowledgeCoverage < 70
                            ? 'text-rose-600'
                            : proj.knowledgeCoverage < 85
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {proj.knowledgeCoverage}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {proj.lastSync}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onEditProject && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEditProject(proj); }}
                            title="Edit project"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteProject && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteProject(proj); }}
                            title="Delete project"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-xs font-semibold text-indigo-600 group-hover:underline inline-flex items-center gap-1">
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
