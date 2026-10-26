import React, { useState, useMemo } from 'react';
import { Employee, RiskLevel } from '../../types';
import { Users, Search, Plus, Filter, ArrowRight, ShieldAlert, Pencil, Trash2 } from 'lucide-react';

interface EmployeesScreenProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onOpenAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (emp: Employee) => void;
}

export const EmployeesScreen: React.FC<EmployeesScreenProps> = ({
  employees,
  onSelectEmployee,
  onOpenAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Extract unique teams from actual employee data
  const uniqueTeams = useMemo(() => {
    const teams = new Set(employees.map((e) => e.team).filter(Boolean));
    return Array.from(teams).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchTeam = teamFilter === 'all' || emp.team === teamFilter;
      const matchRisk = riskFilter === 'all' || emp.risk === riskFilter;
      const matchStatus = statusFilter === 'all' || emp.status === statusFilter;

      return matchSearch && matchTeam && matchRisk && matchStatus;
    });
  }, [employees, searchQuery, teamFilter, riskFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Employees
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage employees and the knowledge sources associated with them.
          </p>
        </div>

        <button
          onClick={onOpenAddEmployee}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name, role, or email..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
          />
        </div>

        {/* Filter dropdowns */}
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

          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 border-l border-slate-200 pl-2">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Departing">Departing</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {employees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">No Employees Registered</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no employees registered in the system yet. Add team members to map ownership, track continuity risk, and connect knowledge sources.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenAddEmployee}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Employee</span>
              </button>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs font-medium text-slate-600">No employees match your active filter criteria.</p>
            <p className="text-[11px] text-slate-400">Try clearing the search query or resetting team/risk filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Team</th>
                  <th className="py-3 px-4 font-semibold text-center">Projects</th>
                  <th className="py-3 px-4 font-semibold text-center">Connected Sources</th>
                  <th className="py-3 px-4 font-semibold text-right">Knowledge Score</th>
                  <th className="py-3 px-4 font-semibold">Risk</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Employee Name & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4 font-medium text-slate-800">{emp.role}</td>

                    {/* Team */}
                    <td className="py-3 px-4 text-slate-600">{emp.team}</td>

                    {/* Projects */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                      {emp.projectsCount} Projects
                    </td>

                    {/* Connected Sources */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                      {emp.connectedSourcesCount} Sources
                    </td>

                    {/* Knowledge Score */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-800">
                      {emp.knowledgeScore}%
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase tabular-nums ${
                          emp.risk === 'critical'
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : emp.risk === 'high'
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : emp.risk === 'medium'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        }`}
                      >
                        {emp.risk}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          emp.status === 'Departing'
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-600'
                        }`}
                      >
                        {emp.status === 'Departing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        <span>{emp.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEditEmployee(emp); }}
                          title="Edit employee"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteEmployee(emp); }}
                          title="Delete employee"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
