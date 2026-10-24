import React, { useState } from 'react';
import { Handover, Employee, AdminUser } from '../../types';
import {
  ArrowRightLeft,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Sparkles,
  ShieldAlert,
  Send,
  Calendar,
  Layers,
  FolderGit2,
  Folder,
  FileText,
  Undo2,
} from 'lucide-react';
import { SendHandoverEmailModal } from '../modals/SendHandoverEmailModal';

interface HandoversScreenProps {
  handovers: Handover[];
  selectedHandover: Handover | null;
  onSelectHandover: (handover: Handover | null) => void;
  onOpenCreateHandover: () => void;
  onUpdateHandover: (updated: Handover) => void;
  onRevertHandover: (
    handover: Handover,
    reason: string
  ) => Promise<Handover>;
  adminUser: AdminUser;
}

export const HandoversScreen: React.FC<HandoversScreenProps> = ({
  handovers,
  selectedHandover,
  onSelectHandover,
  onOpenCreateHandover,
  onUpdateHandover,
  onRevertHandover,
  adminUser,
}) => {
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailSuccessBanner, setEmailSuccessBanner] = useState<string | null>(null);

  const [handoverToRevert, setHandoverToRevert] =
  useState<Handover | null>(null);

const [revertReason, setRevertReason] = useState('');
const [isReverting, setIsReverting] = useState(false);
const [revertError, setRevertError] = useState<string | null>(null);

  const handleSendEmailSuccess = (recipientEmail: string) => {
    if (!selectedHandover) return;
    const updated: Handover = {
      ...selectedHandover,
      status: 'Email Sent',
      sentAt: 'Just now',
      sentToEmail: recipientEmail,
      progress: 100,
    };
    onUpdateHandover(updated);
    setEmailSuccessBanner(`✓ Knowledge handover sent successfully to ${recipientEmail}`);
    setTimeout(() => setEmailSuccessBanner(null), 5000);
  };

  const handleTakeBackHandover = async () => {
  if (!handoverToRevert || !revertReason.trim()) {
    setRevertError('Please provide a reason for taking back this handover.');
    return;
  }

  setIsReverting(true);
  setRevertError(null);

  try {
    const updatedHandover = await onRevertHandover(
      handoverToRevert,
      revertReason.trim()
    );

    // Update the handover in the parent state.
    onUpdateHandover(updatedHandover);

    // Refresh the currently selected detail view if applicable.
    if (selectedHandover?.id === updatedHandover.id) {
      onSelectHandover(updatedHandover);
    }

    setHandoverToRevert(null);
    setRevertReason('');
  } catch (error) {
    console.error('Failed to take back handover:', error);

    setRevertError(
      error instanceof Error
        ? error.message
        : 'Unable to reverse the handover. Please try again.'
    );
  } finally {
    setIsReverting(false);
  }
};

  // If a handover is selected, show Handover Detail (Section 21 & 22)
  if (selectedHandover) {
    return (
      <div className="space-y-6">
        {/* Back and Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectHandover(null)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Back to Handovers"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {selectedHandover.employeeName} &rarr; {selectedHandover.projectNames.join(', ')}
                </h1>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${
                    selectedHandover.status === 'Email Sent'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedHandover.status === 'Reversed'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {selectedHandover.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Date: {selectedHandover.targetDate} · Created: {selectedHandover.createdAt}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSendEmailModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Handover by Email</span>
          </button>
        </div>

        {/* Email sent banner */}
        {emailSuccessBanner && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{emailSuccessBanner}</span>
          </div>
        )}

        {/* Reversal info banner */}
        {selectedHandover.status === 'Reversed' && selectedHandover.reversalReason && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded text-xs font-semibold text-rose-900 flex items-start gap-2">
            <Undo2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Handover Reversed</span>
              {selectedHandover.reversedAt && (
                <span className="font-normal text-rose-700"> on {selectedHandover.reversedAt}</span>
              )}
              <p className="font-normal mt-0.5">Reason: {selectedHandover.reversalReason}</p>
            </div>
          </div>
        )}

        {/* Top Summary & Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Departing Employee</div>
            <div className="mt-2 font-bold text-slate-900 text-sm">
              {selectedHandover.employeeName}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {selectedHandover.employeeRole} ({selectedHandover.employeeTeam})
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Continuity Risk</div>
            <div className="mt-2 text-sm font-bold font-mono uppercase text-rose-600">
              {selectedHandover.risk}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Requires full successor briefing
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">Transfer Progress</div>
            <div className="mt-2 text-sm font-bold font-mono text-indigo-700 tabular-nums">
              {selectedHandover.progress}% Completed
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${
                  selectedHandover.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${selectedHandover.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section 21: Handover Sections */}
        {/* Employee Summary & Major Contributions */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs text-xs">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-1">
              Employee Summary & Scope
            </h2>
            <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
              {selectedHandover.summary}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono mb-2">
              Major Contributions
            </h2>
            <ul className="space-y-1.5">
              {selectedHandover.majorContributions.map((c, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-700">
                  <span className="text-indigo-600 font-bold">&bull;</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* GitHub Work & Jira Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-slate-700" />
              <span>GitHub Work</span>
            </h2>
            <ul className="space-y-2">
              {selectedHandover.githubWork.map((g, idx) => (
                <li key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                  {g}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Assigned Jira Tasks</span>
            </h2>
            <ul className="space-y-2">
              {selectedHandover.jiraTasks.map((j, idx) => (
                <li key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                  {j}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Drive / Notion Knowledge & Important Knowledge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-600" />
              <span>Drive & Notion Knowledge</span>
            </h2>
            <ul className="space-y-2">
              {selectedHandover.driveNotionKnowledge.map((d, idx) => (
                <li key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Important Knowledge & Credentials
            </h2>
            <ul className="space-y-2">
              {selectedHandover.importantKnowledge.map((k, idx) => (
                <li key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                  {k}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Knowledge Gaps */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs text-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-800 font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Identified Knowledge Gaps</span>
          </h2>
          <div className="space-y-2">
            {selectedHandover.knowledgeGaps.map((gap, idx) => (
              <div key={idx} className="p-2.5 bg-rose-50/70 border border-rose-200 rounded text-rose-950">
                &bull; {gap}
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Successor (Section 21) */}
        <div className="bg-white border border-indigo-200 rounded-lg p-5 space-y-3 shadow-xs text-xs">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                Recommended Successor
              </h2>
            </div>
            <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
              AI Recommendation — Admin Review Required
            </span>
          </div>

          {selectedHandover.recommendedSuccessor && selectedHandover.recommendedSuccessor.name && selectedHandover.recommendedSuccessor.name !== 'Unassigned' ? (
            <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedHandover.recommendedSuccessor.name}
                  </span>
                  {selectedHandover.recommendedSuccessor.role && (
                    <span className="text-slate-500 text-xs ml-2">
                      ({selectedHandover.recommendedSuccessor.role})
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                  Relevance: {selectedHandover.recommendedSuccessor.relevancePercent}%
                </span>
              </div>

              {selectedHandover.recommendedSuccessor.reasons && selectedHandover.recommendedSuccessor.reasons.length > 0 && (
                <div className="pt-1 text-slate-700 space-y-1">
                  <div className="font-semibold text-slate-900 text-[11px]">Why:</div>
                  {selectedHandover.recommendedSuccessor.reasons.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                      <span className="text-indigo-600 font-bold">&bull;</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-indigo-200 rounded text-center text-xs text-slate-500">
              No successor recommended or assigned yet for this handover package.
            </div>
          )}
        </div>

        {/* Bottom Send Handover CTA */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-900">
              Ready to dispatch handover package?
            </div>
            <p className="text-slate-500 text-[11px]">
              Transfers full project documentation and pending tasks directly to {selectedHandover.recommendedSuccessor.name}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
  {selectedHandover.status !== 'Reversed' && (
      <button
        type="button"
        onClick={() => {
          setHandoverToRevert(selectedHandover);
          setRevertReason('');
          setRevertError(null);
        }}
        className="flex items-center gap-1.5 px-3 py-2 text-xs
                   font-semibold text-rose-700 bg-rose-50
                   border border-rose-200 hover:bg-rose-100
                   rounded transition-colors"
      >
        <Undo2 className="w-3.5 h-3.5" />
        <span>Take Back Handover</span>
      </button>
    )}

  <button
    onClick={() => setIsSendEmailModalOpen(true)}
    className="flex items-center gap-1.5 px-4 py-2 text-xs
               font-semibold text-white bg-[#3525cd]
               hover:bg-[#2b1ea8] rounded transition-colors
               shadow-xs shrink-0 cursor-pointer"
  >
    <Send className="w-3.5 h-3.5" />
    <span>Send Handover by Email</span>
  </button>
</div>
        </div>

        {/* Send Email Modal */}
        <SendHandoverEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => setIsSendEmailModalOpen(false)}
          handover={selectedHandover}
          onSendSuccess={handleSendEmailSuccess}
          adminEmail={adminUser.email}
        />

        {/* Take Back Handover Confirmation Dialog */}
        {handoverToRevert && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revert-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => {
                if (!isReverting) {
                  setHandoverToRevert(null);
                  setRevertReason('');
                  setRevertError(null);
                }
              }}
            />

            {/* Dialog panel */}
            <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-lg shrink-0">
                  <Undo2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 id="revert-dialog-title" className="text-sm font-bold text-slate-900">
                    Take Back Handover
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reversing handover for{' '}
                    <span className="font-semibold text-slate-800">
                      {handoverToRevert.employeeName}
                    </span>
                    {' → '}
                    <span className="font-semibold text-slate-800">
                      {handoverToRevert.projectNames.join(', ')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                This will mark the handover as <strong>Reversed</strong> and record the
                action in the audit log. This cannot be undone.
              </div>

              {/* Reason input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="revert-reason"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Reversal Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="revert-reason"
                  rows={3}
                  value={revertReason}
                  onChange={(e) => {
                    setRevertReason(e.target.value);
                    if (revertError) setRevertError(null);
                  }}
                  disabled={isReverting}
                  placeholder="Explain why this handover is being taken back…"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 resize-none disabled:opacity-60 disabled:bg-slate-50"
                />
              </div>

              {/* Error message */}
              {revertError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800 font-medium">
                  {revertError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setHandoverToRevert(null);
                    setRevertReason('');
                    setRevertError(null);
                  }}
                  disabled={isReverting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-revert-btn"
                  onClick={handleTakeBackHandover}
                  disabled={isReverting || !revertReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isReverting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span>Reversing…</span>
                    </>
                  ) : (
                    <>
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Confirm Take Back</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Handovers Table list (Section 19)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Knowledge Handovers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active and completed departure knowledge transfers across company services.
          </p>
        </div>

        <button
          onClick={onOpenCreateHandover}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Handover</span>
        </button>
      </div>

      {/* Table (Section 19: Employee, Project, Risk, Progress, Status, Created, Actions) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {handovers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ArrowRightLeft className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">No Knowledge Handovers Yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No employee handover packages have been synthesized. Create a handover to capture knowledge packages, detect gaps, and recommend successors.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenCreateHandover}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3525cd] hover:bg-[#2b1ea8] rounded transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Handover</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Project</th>
                  <th className="py-3 px-4 font-semibold">Risk</th>
                  <th className="py-3 px-4 font-semibold text-center">Progress</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handovers.map((hnd) => (
                  <tr
                    key={hnd.id}
                    onClick={() => onSelectHandover(hnd)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={hnd.employeeAvatar}
                          alt={hnd.employeeName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {hnd.employeeName}
                          </div>
                          <div className="text-[11px] text-slate-400">{hnd.employeeRole}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {hnd.projectNames.join(', ')}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase tabular-nums ${
                          hnd.risk === 'critical'
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : hnd.risk === 'high'
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        }`}
                      >
                        {hnd.risk}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                      {hnd.progress}%
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded border ${
                          hnd.status === 'Email Sent'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : hnd.status === 'Reversed'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {hnd.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {hnd.createdAt}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-semibold text-indigo-600 group-hover:underline inline-flex items-center gap-1">
                        <span>View Handover</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
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
