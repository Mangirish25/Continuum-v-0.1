import React, { useState } from 'react';
import { Handover } from '../../types';
import { X, Mail, CheckCircle2, Send, AlertTriangle } from 'lucide-react';

interface SendHandoverEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  handover: Handover;
  onSendSuccess: (recipientEmail: string) => void;
}

export const SendHandoverEmailModal: React.FC<SendHandoverEmailModalProps> = ({
  isOpen,
  onClose,
  handover,
  onSendSuccess,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(
    handover.recommendedSuccessor.email || 'priya.deshmukh@acme.corp'
  );
  const [recipientName, setRecipientName] = useState(
    handover.recommendedSuccessor.name || 'Priya Deshmukh'
  );
  const [ccAdmin, setCcAdmin] = useState(true);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      onSendSuccess(recipientEmail);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Send Knowledge Handover
              </h2>
              <p className="text-[11px] text-slate-500">
                Deliver verified handover package via enterprise email
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

        {/* Body Form */}
        <form onSubmit={handleSend} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Departing Employee:</span>
              <strong className="text-slate-900">{handover.employeeName} ({handover.employeeRole})</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Projects Covered:</span>
              <span className="font-semibold text-indigo-700">{handover.projectNames.join(', ')}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Recipient Successor Name
            </label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Recipient Work Email
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={ccAdmin}
              onChange={(e) => setCcAdmin(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>CC Company Administrator (admin@acme.corp)</span>
          </label>

          {/* Handover contents preview list */}
          <div>
            <span className="block font-semibold text-slate-900 mb-1.5">
              Email Package Contents:
            </span>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded border border-slate-200 text-slate-700">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Project summary</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Major contributions</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Assigned Jira tasks</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Drive & Notion docs</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Key knowledge & secrets</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Identified risk analysis</span>
              </div>
            </div>
          </div>

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
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending Handover Email...' : 'Send Handover Email'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
