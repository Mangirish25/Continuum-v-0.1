import React, { useState } from 'react';
import { Project, Employee } from '../../types';
import { createProject } from '../../lib/api';
import { X, FolderPlus, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onProjectCreated: (newProj: Project) => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  employees,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleToggleMember = (empId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await createProject({
        name: name.trim(),
        description: team.trim() || 'Engineering Team',
        member_ids: selectedMemberIds,
      });

      const code = (name.trim() || 'PRJ')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 4)
        .join('')
        .toUpperCase();

      const createdProject: Project = {
        id: res.id || `proj-${Date.now()}`,
        name: res.name || name.trim(),
        code: code || 'PRJ',
        team: res.description || team.trim() || 'Engineering Team',
        tier: 1,
        status: 'Active',
        busFactor: res.bus_factor || (selectedMemberIds.length === 1 ? 1 : Math.max(1, selectedMemberIds.length)),
        risk: res.risk_level?.toLowerCase() || (selectedMemberIds.length <= 1 ? 'critical' : 'low'),
        knowledgeCoverage: 0,
        lastSync: 'Just now',
        members: selectedMemberIds.map((id) => {
          const emp = employees.find((e) => e.id === id);
          return {
            employeeId: id,
            name: emp?.name || 'Member',
            contributionPercent: Math.round(100 / selectedMemberIds.length),
            role: emp?.role || 'Contributor',
          };
        }),
        riskReasons: res.risk_reasons || [],
        connectedSources: {
          github: [],
          googledrive: [],
          notion: [],
          jira: '',
        },
        recentActivity: [
          {
            id: `act-${Date.now()}`,
            action: `Project '${name.trim()}' initialized`,
            timestamp: 'Just now',
          },
        ],
      };

      onProjectCreated(createdProject);
      setName('');
      setTeam('');
      setSelectedMemberIds([]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Register New Project
              </h2>
              <p className="text-[11px] text-slate-500">
                Add a service or system to track continuity risk and bus factors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Project / Service Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payment Gateway Service, Auth API, Core Platform"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Owning Team / Department
            </label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. Payments, Core Platform, Platform Infrastructure"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assign Team Members ({selectedMemberIds.length} selected)
            </label>
            {employees.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic p-2 bg-slate-50 rounded border border-slate-200">
                No employees registered yet. You can assign members after adding employees.
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded p-2 space-y-1.5 bg-slate-50">
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-100 p-1.5 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(emp.id)}
                      onChange={() => handleToggleMember(emp.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold">{emp.name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">({emp.role})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-2 rounded text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[#3525cd] hover:bg-[#2b1ea8] text-white font-semibold transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
