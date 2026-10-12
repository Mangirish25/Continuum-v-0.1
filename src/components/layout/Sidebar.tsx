import React from 'react';
import { ScreenId } from '../../types';
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  Search,
  ShieldAlert,
  ArrowRightLeft,
  Network,
  Settings,
  User,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  activeHandoversCount: number;
  criticalProjectsCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  activeHandoversCount,
  criticalProjectsCount,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const mainMenuItems = [
    {
      id: 'dashboard' as ScreenId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'employees' as ScreenId,
      label: 'Employees',
      icon: Users,
      badge: null,
    },
    {
      id: 'projects' as ScreenId,
      label: 'Projects',
      icon: FolderGit2,
      badge: criticalProjectsCount > 0 ? `${criticalProjectsCount} Risk` : null,
      badgeRisk: true,
    },
    {
      id: 'knowledge' as ScreenId,
      label: 'Knowledge',
      icon: Search,
      badge: null,
    },
    {
      id: 'risk' as ScreenId,
      label: 'Risk',
      icon: ShieldAlert,
      badge: 'HIGH',
      badgeRisk: true,
    },
    {
      id: 'handovers' as ScreenId,
      label: 'Handovers',
      icon: ArrowRightLeft,
      badge: activeHandoversCount > 0 ? `${activeHandoversCount}` : null,
      badgeHighlight: true,
    },
    {
      id: 'connections' as ScreenId,
      label: 'Connections',
      icon: Network,
      badge: null,
    },
  ];

  const handleItemClick = (id: ScreenId) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const isCurrentActive = (id: ScreenId) => {
    if (currentScreen === id) return true;
    if (id === 'employees' && currentScreen === 'employee_profile') return true;
    if (id === 'projects' && currentScreen === 'project_detail') return true;
    if (id === 'handovers' && currentScreen === 'handover_detail') return true;
    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white">
      {/* Brand & Main Navigation */}
      <div className="p-4 space-y-6">
        {/* Brand header in sidebar for mobile or compact view */}
        <div className="px-2 pt-1 pb-2 flex items-center justify-between border-b border-slate-100 lg:border-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#3525cd] flex items-center justify-center text-white shadow-xs">
              <span className="font-mono font-bold text-xs">CT</span>
            </div>
            <div>
              <div className="text-xs font-bold tracking-tight text-slate-900 leading-none">
                CONTINUUM
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Acme Technologies
              </div>
            </div>
          </div>
          {isOpenMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  active
                    ? 'bg-slate-100 text-indigo-700 font-semibold border-l-2 border-indigo-600 rounded-l-none'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      item.badgeRisk
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : item.badgeHighlight
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Settings & Admin Profile */}
      <div className="p-4 border-t border-slate-200 space-y-1">
        <button
          onClick={() => handleItemClick('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
            currentScreen === 'settings'
              ? 'bg-slate-100 text-indigo-700 font-semibold border-l-2 border-indigo-600 rounded-l-none'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => handleItemClick('settings')}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>Admin Profile</span>
        </button>

        <div className="pt-2 px-3 text-[10px] text-slate-400 font-mono flex items-center justify-between">
          <span>Continuum v3.4</span>
          <span className="text-emerald-600 font-semibold">Admin Mode</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 shrink-0 hidden lg:flex flex-col justify-between h-[calc(100vh-3.5rem)] sticky top-14">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white border-r border-slate-200 h-full z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
