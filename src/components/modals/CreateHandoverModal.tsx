import React, { useState } from 'react';
import { Employee, Project, Handover } from '../../types';
import { X, ArrowRightLeft, Sparkles, CheckSquare, Square, ShieldCheck, UserCheck } from 'lucide-react';

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

  const [selectedProjects, setSelectedProjects] = useState<string[]>([
    'Payment Platform',
    'Authentication Service',
  ]);

  const [pkgGithub, setPkgGithub] = useState(true);
  const [pkgDrive, setPkgDrive] = useState(true);
  const [pkgNotion, setPkgNotion] = useState(true);
  const [pkgJira, setPkgJira] = useState(true);
  const [pkgAreas, setPkgAreas] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const currentEmp = employees.find((e) => e.id === selectedEmpId) || employees[0];

  const handleToggleProject = (name: string) => {
    setSelectedProjects((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);

      // Find recommended successor (e.g. Priya if Rahul, or Akash)
      const potentialSuccessor =
        employees.find((e) => e.id !== currentEmp.id && e.id === 'emp-priya') ||
        employees.find((e) => e.id !== currentEmp.id) ||
        employees[0];

      const newHandover: Handover = {
        id: `hnd-${Date.now()}`,
        employeeId: currentEmp.id,
        employeeName: currentEmp.name,
        employeeRole: currentEmp.role,
        employeeTeam: currentEmp.team,
        employeeAvatar: currentEmp.avatar,
        projectNames: selectedProjects.length > 0 ? selectedProjects : ['Payment Platform'],
        risk: currentEmp.risk,
        progress: 45,
        status: 'Generated',
        createdAt: 'Just now',
        targetDate: currentEmp.departureDate || 'Nov 20, 2026',
        summary: `AI-synthesized institutional transfer package for ${currentEmp.name} covering ${selectedProjects.join(', ')}. Aggregated across synchronized GitHub, Drive, Notion, and Jira resources.`,
        majorContributions: [
          `Author of core architecture in ${selectedProjects[0] || 'Payment Platform'}`,
          'Implemented primary data synchronization and webhook pipelines',
          'Managed key production incident runbooks and integration keys',
        ],
        githubWork: [
          'payment-service: 248 commits authored (78% of repository)',
          'authentication-service: 142 commits authored (60% of repository)',
        ],
        jiraTasks: [
          'PAY-101: Webhook idempotency key collision fix',
          'PAY-104: Stripe checkout timeout handling',
          'AUTH-82: Refresh token revocation audit logging',
        ],
        driveNotionKnowledge: [
          'Google Drive: "Payment Project" folder (Architecture specs & reconciliation sheets)',
          'Notion: "Payment Architecture" page (Circuit breakers & retry policy)',
        ],
        importantKnowledge: [
          'Production API keys stored in 1Password vault shared with lead engineers',
          'Database connection pool limits clamped to 25 to prevent starvation',
          'Reconciliation worker triggers nightly at 02:00 UTC',
        ],
        knowledgeGaps: [
          'Undocumented emergency rollback script located in /scripts/emergency-rollback.sh',
          'Banking partner sandbox SFTP credentials require re-delegation',
        ],
        recommendedSuccessor: {
          employeeId: potentialSuccessor.id,
          name: potentialSuccessor.name,
          role: potentialSuccessor.role,
          email: potentialSuccessor.email,
          relevancePercent: 86,
          reasons: [
            'Similar backend and platform engineering background (Go/Python)',
            'Collaborates on payment infrastructure and settlement gateway integrations',
            'Strong knowledge overlap with existing pull requests',
          ],
        },
      };

      onHandoverCreated(newHandover);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create Knowledge Handover
              </h2>
              <p className="text-[11px] text-slate-500">
                Generate structured departure transfer packages from connected sources
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

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Step 1: Select Employee */}
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Step 1 — Departing Employee:
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role} ({emp.team}) {emp.status === 'Departing' ? '⚠️ Departing' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Projects */}
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Step 2 — Projects to Transfer:
            </label>
            <div className="space-y-1.5">
              {projects.map((proj) => {
                const checked = selectedProjects.includes(proj.name);
                return (
                  <label
                    key={proj.id}
                    onClick={() => handleToggleProject(proj.name)}
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${
                      checked
                        ? 'bg-indigo-50/60 border-indigo-300 font-medium text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{proj.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 whitespace-nowrap">
                      Tier:{proj.tier}&nbsp;&nbsp;&nbsp;&nbsp;BF:{proj.busFactor}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Step 3: Knowledge Package Content */}
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Step 3 — Knowledge Package Resources:
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Continuum automatically discovers resources from connected sources. Deselect any irrelevant items:
            </p>

            <div className="space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgGithub}
                  onChange={(e) => setPkgGithub(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-800">
                  <strong>GitHub:</strong> Repository commits, PR reviews, and pull request discussion threads
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgDrive}
                  onChange={(e) => setPkgDrive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-800">
                  <strong>Google Drive:</strong> Synchronized project folder spreadsheets and architecture docs
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgNotion}
                  onChange={(e) => setPkgNotion(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-800">
                  <strong>Notion:</strong> Technical specifications, system runbooks, and API contracts
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgJira}
                  onChange={(e) => setPkgJira(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-800">
                  <strong>Jira:</strong> Unresolved tasks, blockers, and historical bug resolution records
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgAreas}
                  onChange={(e) => setPkgAreas(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-800">
                  <strong>Core Knowledge Areas:</strong> Undocumented gotchas, key ceremonies, and failure boundaries
                </span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">AI Handover Synthesis & Successor Match</div>
              <div className="text-indigo-700 mt-0.5">
                Continuum will automatically synthesize a complete handover document and calculate the best successor engineer based on commit and project overlap.
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Synthesizing Knowledge Handover...' : 'Generate Knowledge Handover'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
