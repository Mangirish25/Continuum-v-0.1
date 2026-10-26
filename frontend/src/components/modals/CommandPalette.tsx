import React, { useState, useEffect } from 'react';
import { ScreenId, Project, Employee, Handover } from '../../types';
import {
  Search,
  LayoutDashboard,
  Users,
  FolderGit2,
  ArrowRightLeft,
  Network,
  ShieldAlert,
  ShieldCheck,
  Settings,
  X,
  ArrowRight,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  projects: Project[];
  employees: Employee[];
  handovers: Handover[];
  onSelectProject: (p: Project) => void;
  onSelectEmployee: (e: Employee) => void;
  onSelectHandover: (h: Handover) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  projects,
  employees,
  handovers,
  onSelectProject,
  onSelectEmployee,
  onSelectHandover,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle or open handled by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const screens: { id: ScreenId; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'knowledge', label: 'Knowledge Search', icon: Search },
    { id: 'risk', label: 'Continuity Risk', icon: ShieldAlert },
    { id: 'handovers', label: 'Knowledge Handovers', icon: ArrowRightLeft },
    { id: 'connections', label: 'Connections & Integrations', icon: Network },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'signin', label: 'Admin Sign In', icon: ShieldCheck },
  ];

  const filteredScreens = screens.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.code.toLowerCase().includes(query.toLowerCase())
  );

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.role.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a screen, service code, engineer name, or command..."
            className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3 text-xs">
          {/* Screens */}
          {filteredScreens.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold">
                Screens & Navigation
              </div>
              {filteredScreens.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      onNavigate(s.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 rounded text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      <span className="font-medium text-slate-800">{s.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold">
                Critical Systems
              </div>
              {filteredProjects.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 rounded text-left transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <span className="text-slate-400 font-mono text-[11px] ml-2">{p.code}</span>
                  </div>
                  <span className="font-mono text-[10px] text-indigo-600">Inspect &rarr;</span>
                </button>
              ))}
            </div>
          )}

          {/* Employees */}
          {filteredEmployees.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold">
                Staff Leads
              </div>
              {filteredEmployees.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    onSelectEmployee(e);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 rounded text-left transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{e.name}</span>
                    <span className="text-slate-400 text-[11px] ml-2">{e.role}</span>
                  </div>
                  <span className="font-mono text-[10px] text-indigo-600">Profile &rarr;</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Navigate with arrows / click</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
