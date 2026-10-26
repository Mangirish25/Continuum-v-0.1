import React, { useEffect, useState } from 'react';
import { Employee, ConnectedResource } from '../../types';
import { createSource } from '../../lib/api';
import { AlertCircle, FileText, Folder, RefreshCw, X } from 'lucide-react';

interface ConnectResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  projects: unknown[];
  preselectedEmployee?: Employee | null;
  onResourceConnected: (resource: ConnectedResource) => void;
}

export const ConnectResourceModal: React.FC<ConnectResourceModalProps> = ({
  isOpen,
  onClose,
  employees,
  preselectedEmployee,
  onResourceConnected,
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [sourceType, setSourceType] = useState<'drive' | 'notion'>('drive');
  const [name, setName] = useState('Drive folder');
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmployeeId(preselectedEmployee?.id || employees[0]?.id || '');
    setSourceType('drive');
    setName('Drive folder');
    setLocalPath('');
    setError('');
  }, [isOpen, preselectedEmployee, employees]);

  if (!isOpen) return null;

  const employee = employees.find((item) => item.id === employeeId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const result = await createSource({
        source_type: sourceType,
        name: name.trim(),
        local_path: localPath.trim(),
        employee_id: employeeId,
      });
      onResourceConnected({
        id: result.id,
        sourceType: result.source_type as ConnectedResource['sourceType'],
        name: result.name,
        url: result.local_path || result.url,
        employeeId: result.employee_id || employeeId,
        employeeName: result.employee_name || employee?.name || 'Employee',
        projectName: result.project_name || '',
        status: result.status,
        lastSynced: result.last_synced_at ? new Date(result.last_synced_at).toLocaleString() : 'Indexing queued',
        lastSuccessfulSync: result.last_successful_sync_at,
        error: result.last_sync_error,
        details: result.last_sync_error || `Path: ${result.local_path || localPath}`,
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not connect this folder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="connect-folder-title">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2 text-indigo-700">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h2 id="connect-folder-title" className="text-sm font-bold text-slate-900">Add Knowledge Connection</h2>
              <p className="text-[11px] text-slate-500">Connect an employee-owned local folder.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!preselectedEmployee && (
            <label className="block text-xs font-semibold text-slate-700">
              Employee
              <select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1.5 w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal">
                {employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}

          <label className="block text-xs font-semibold text-slate-700">
            Knowledge source
            <select value={sourceType} onChange={(event) => {
              const nextType = event.target.value as 'drive' | 'notion';
              setSourceType(nextType);
              if (name === 'Drive folder' || name === 'Notion folder') setName(nextType === 'drive' ? 'Drive folder' : 'Notion folder');
            }} className="mt-1.5 w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal">
              <option value="drive">Drive</option>
              <option value="notion">Notion</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Connection name
            <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded border border-slate-300 px-3 py-2 font-normal" />
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Local folder path
            <input required value={localPath} onChange={(event) => setLocalPath(event.target.value)} placeholder="data/employee_1/drive" className="mt-1.5 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs font-normal" />
          </label>

          <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-[11px] leading-relaxed text-slate-600">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <span>Enter a path inside the project’s <code>data/</code> folder. Create folders and place files there yourself; this connection will not create or move files. Supported documents: TXT, Markdown, PDF, JSON, and CSV.</span>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving || !employeeId || !name.trim() || !localPath.trim()} className="inline-flex items-center gap-2 rounded bg-[#3525cd] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2b1ea8] disabled:opacity-50">
              {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Connecting…' : 'Connect and index'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
