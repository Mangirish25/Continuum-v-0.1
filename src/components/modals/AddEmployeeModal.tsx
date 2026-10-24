import React, { useState } from 'react';
import { Employee } from '../../types';
import { createEmployee } from '../../lib/api';
import { X, UserPlus, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEmployee: (newEmployee: Employee) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onCreateEmployee,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [team, setTeam] = useState('Engineering');
  const [skillsInput, setSkillsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role.trim()) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const backendRes = await createEmployee({
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        team: team.trim() || 'Engineering',
        skills: skills.length > 0 ? skills : ['General'],
      });

      const newEmp: Employee = {
        id: backendRes.id || `emp-${Date.now()}`,
        name: backendRes.name || name.trim(),
        email: backendRes.email || email.trim(),
        role: backendRes.role || role.trim(),
        team: backendRes.team || team.trim() || 'Engineering',
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
        initials: initials || 'EM',
        projectsCount: 0,
        projects: [],
        projectIds: [],
        connectedSourcesCount: 0,
        knowledgeScore: 0,
        risk: 'low',
        status: 'Active',
        skills: skills.length > 0 ? skills : ['General'],
      };

      onCreateEmployee(newEmp);
      setName('');
      setEmail('');
      setRole('');
      setSkillsInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create employee record in database.');
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
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Add Employee Record
              </h2>
              <p className="text-[11px] text-slate-500">
                Employee Knowledge Directory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Work Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul.sharma@company.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white font-mono text-[11px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Role / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Team / Department
              </label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="e.g. Core Engineering"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Skills / Knowledge Areas (comma separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. Python, FastAPI, PostgreSQL, Kubernetes"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px] space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Admin-Managed Record</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Employees do not need to register. You can connect public code repositories, documents, and Jira items directly to their profile.
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Create Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
