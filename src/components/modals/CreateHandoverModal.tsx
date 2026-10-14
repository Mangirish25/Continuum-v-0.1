import React, { useState } from 'react';
import { Employee, Project, Handover } from '../../types';
import { createHandover } from '../../lib/api';
import { X, ArrowRightLeft, Sparkles, Loader2, ShieldAlert } from 'lucide-react';

interface CreateHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  projects: Project[];
  preselectedEmployee?: Employee | null;
  onHandoverCreated: (handover: Handover) => void;
}

export const CreateHandoverModal: React.FC<CreateHandoverModalProps> = ({
  isOpen,
  onClose,
  employees,
  projects,
  preselectedEmployee,
  onHandoverCreated,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState(
    preselectedEmployee ? preselectedEmployee.id : employees[0]?.id || ''
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  );
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  if (employees.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-md p-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">No Employees Found</h2>
            <p className="text-xs text-slate-500 mt-1">
              You must register at least one employee before synthesizing an institutional handover package.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentEmp = employees.find((e) => e.id === selectedEmpId) || employees[0];
  const targetProject = projects.find((p) => p.id === selectedProjectId);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp) return;

    setIsGenerating(true);
    setError('');

    try {
      const res = await createHandover({
        employee_id: currentEmp.id,
        project_id: selectedProjectId || undefined,
        recipient_email: recipientEmail.trim() || undefined,
      });

      const kp = res.knowledge_package || {};
      const potentialSuccessor =
        employees.find((e) => e.id !== currentEmp.id) || currentEmp;

      const newHandover: Handover = {
        id: res.id || `hnd-${Date.now()}`,
        employeeId: currentEmp.id,
        employeeName: currentEmp.name,
        employeeRole: currentEmp.role,
        employeeTeam: currentEmp.team,
        employeeAvatar: currentEmp.avatar,
        projectNames: targetProject ? [targetProject.name] : currentEmp.projects.length > 0 ? currentEmp.projects : ['General'],
        risk: currentEmp.risk,
        progress: res.status === 'SENT' ? 100 : res.status === 'READY_FOR_REVIEW' ? 80 : 40,
        status: res.status === 'SENT' ? 'Email Sent' : 'Generated',
        createdAt: 'Just now',
        targetDate: currentEmp.departureDate || 'Within 30 Days',
        summary: res.generated_summary || kp.summary || `Synthesized handover package for ${currentEmp.name}.`,
        majorContributions: kp.contributions || [
          `Key ownership across ${targetProject ? targetProject.name : 'assigned services'}`,
          'Primary maintainer of core module documentation',
        ],
        githubWork: kp.github_work || [],
        jiraTasks: kp.jira_responsibilities || [],
        driveNotionKnowledge: [
          ...(kp.drive_knowledge || []),
          ...(kp.notion_knowledge || []),
        ],
        importantKnowledge: kp.critical_knowledge || [],
        knowledgeGaps: kp.knowledge_gaps || [],
        recommendedSuccessor: res.recommended_successor ? {
          employeeId: res.recommended_successor.employee_id || potentialSuccessor.id,
          name: res.recommended_successor.name || potentialSuccessor.name,
          role: potentialSuccessor.role,
          email: res.recommended_successor.email || potentialSuccessor.email,
          relevancePercent: Math.round((res.recommended_successor.confidence_score || 0.8) * 100),
          reasons: res.recommended_successor.reason ? [res.recommended_successor.reason] : ['Direct domain overlap and team pairing.'],
        } : {
          employeeId: potentialSuccessor.id,
          name: potentialSuccessor.name,
          role: potentialSuccessor.role,
          email: potentialSuccessor.email,
          relevancePercent: 75,
          reasons: ['Selected active peer in organization.'],
        },
      };

      onHandoverCreated(newHandover);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize handover.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Create Knowledge Handover
              </h2>
              <p className="text-[11px] text-slate-500">
                Synthesize institutional knowledge package with AI
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

        {/* Modal Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Outgoing / Departing Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role} - {emp.team}) {emp.status === 'Departing' ? '⚠️ Departing' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Target Project (Optional)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            >
              <option value="">All Employee Work / Unrestricted</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.team})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Successor / Recipient Email (Optional)
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. successor@company.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white font-mono text-[11px]"
            />
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded text-[11px] text-indigo-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Continuum AI Synthesis Pipeline</span>
            </div>
            <p className="text-indigo-800/80 leading-relaxed">
              Continuum aggregates commits, documents, and task history across connected resources to synthesize key responsibilities, highlight single points of failure, and score successor recommendations.
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Generate Handover</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
