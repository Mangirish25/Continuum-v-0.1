import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import { updateEmployee } from '../../lib/api';
import { X, Pencil, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onUpdateEmployee: (updated: Employee) => void;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Departing', value: 'LEAVING' },
  { label: 'On Leave', value: 'INACTIVE' },
];

function frontendStatusToBackend(status: Employee['status']): string {
  if (status === 'Departing') return 'LEAVING';
  if (status === 'On Leave') return 'INACTIVE';
  return 'ACTIVE';
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onUpdateEmployee,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [skillsInput, setSkillsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pre-populate whenever the employee prop changes or modal opens
  useEffect(() => {
    if (isOpen && employee) {
      setName(employee.name);
      setEmail(employee.email);
      setRole(employee.role);
      setTeam(employee.team);
      setStatus(frontendStatusToBackend(employee.status));
      setSkillsInput((employee.skills || []).join(', '));
      setError('');
      setSuccess(false);
    }
  }, [isOpen, employee]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Work email is required.'); return; }
    if (!role.trim()) { setError('Role / Title is required.'); return; }
    if (!team.trim()) { setError('Team / Department is required.'); return; }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const raw = await updateEmployee(employee.id, {
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        team: team.trim(),
        status,
        skills,
      });

      const updated: Employee = {
        ...employee,
        name: raw.name ?? name.trim(),
        email: raw.email ?? email.trim(),
        role: raw.role ?? role.trim(),
        team: raw.team ?? team.trim(),
        status:
          raw.status === 'LEAVING' ? 'Departing'
          : raw.status === 'INACTIVE' ? 'On Leave'
          : 'Active',
        skills: raw.skills ?? skills,
      };

      setSuccess(true);
      onUpdateEmployee(updated);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to update employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Edit Employee</h2>
              <p className="text-[11px] text-slate-500">{employee.name} · {employee.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Employee updated successfully.</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white disabled:opacity-60"
            />
          </div>

          {/* Work Email */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Work Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white font-mono text-[11px] disabled:opacity-60"
            />
          </div>

          {/* Role + Team */}
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
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Team / Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white disabled:opacity-60"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Skills */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Skills / Knowledge Areas <span className="text-slate-400 font-normal">(comma separated)</span>
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Python, FastAPI, PostgreSQL"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white disabled:opacity-60"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
