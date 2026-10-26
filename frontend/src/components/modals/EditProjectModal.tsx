import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { updateProject } from '../../lib/api';
import { X, Pencil, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updated: Project) => void;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

function frontendStatusToBackend(status: Project['status']): string {
  if (status === 'Maintenance') return 'COMPLETED';
  if (status === 'Deprecated') return 'ARCHIVED';
  return 'ACTIVE';
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pre-populate whenever project prop changes or modal opens
  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      // `team` in the frontend maps to `description` in the backend
      setDescription(project.team || '');
      setStatus(frontendStatusToBackend(project.status));
      setError('');
      setSuccess(false);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const raw = await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
      });

      // Map backend status back to frontend status
      const mappedStatus: Project['status'] =
        raw.status === 'COMPLETED' ? 'Maintenance'
        : raw.status === 'ARCHIVED' ? 'Deprecated'
        : 'Active';

      // Regenerate code from new name
      const code = (raw.name || name.trim())
        .split(' ')
        .map((w: string) => w[0])
        .slice(0, 4)
        .join('')
        .toUpperCase() || 'PRJ';

      const updated: Project = {
        ...project,
        name: raw.name ?? name.trim(),
        code,
        team: raw.description ?? description.trim(),
        status: mappedStatus,
      };

      setSuccess(true);
      onUpdateProject(updated);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to update project. Please try again.');
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
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Edit Project</h2>
              <p className="text-[11px] text-slate-500">{project.name} · {project.code}</p>
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
              <span>Project updated successfully.</span>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Project Name <span className="text-rose-500">*</span>
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

          {/* Description / Team */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description / Team
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Brief description or owning team name..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white resize-none disabled:opacity-60"
            />
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

          {/* Protected fields notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px] space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected Fields</span>
            </div>
            <p className="text-slate-500">
              Project ID, creation date, team member assignments, and risk scores are managed automatically and are not editable here.
            </p>
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
