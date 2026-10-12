import React, { useState } from 'react';
import { ScreenId, NotificationItem } from '../../types';
import { ADMIN_USER } from '../../data/mockData';
import { Search, Bell, LogOut, Menu, User } from 'lucide-react';
import { NotificationsDropdown } from '../modals/NotificationsDropdown';

interface AppHeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  breadcrumbSubtitle?: string;
  onSignOut: () => void;
  onQuickSearch: () => void;
  onToggleMobileMenu?: () => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentScreen,
  onNavigate,
  breadcrumbSubtitle,
  onSignOut,
  onQuickSearch,
  onToggleMobileMenu,
  notifications,
  onMarkAllNotificationsRead,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const getBreadcrumbTitle = () => {
    switch (currentScreen) {
      case 'dashboard':
        return 'Dashboard';
      case 'employees':
        return 'Employees';
      case 'employee_profile':
        return breadcrumbSubtitle ? `Employees / ${breadcrumbSubtitle}` : 'Employee Profile';
      case 'projects':
        return 'Projects';
      case 'project_detail':
        return breadcrumbSubtitle ? `Projects / ${breadcrumbSubtitle}` : 'Project Detail';
      case 'knowledge':
        return 'Knowledge Search';
      case 'risk':
        return 'Continuity Risk';
      case 'handovers':
        return 'Knowledge Handovers';
      case 'handover_detail':
        return breadcrumbSubtitle ? `Handovers / ${breadcrumbSubtitle}` : 'Handover Detail';
      case 'connections':
        return 'Connections';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand & Breadcrumb */}
        <div className="flex items-center gap-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-slate-500 hover:text-slate-900 font-semibold text-xs transition-colors"
            >
              Continuum
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-bold text-xs truncate max-w-[200px] sm:max-w-xs">
              {getBreadcrumbTitle()}
            </span>
          </div>
        </div>

        {/* Middle: Global Knowledge Search */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <div
            onClick={onQuickSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-md cursor-pointer transition-colors text-xs text-slate-500"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search company knowledge (e.g. payment gateway)...</span>
            <kbd className="hidden md:inline-block ml-auto px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Notifications & Admin Profile */}
        <div className="flex items-center gap-3 shrink-0 relative">
          {/* Mobile search trigger */}
          <button
            onClick={onQuickSearch}
            className="sm:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications icon */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            <NotificationsDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              notifications={notifications}
              onMarkAllAsRead={onMarkAllNotificationsRead}
            />
          </div>

          {/* Admin Profile */}
          <div className="flex items-center pl-2 border-l border-slate-200 gap-2">
            <div
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-semibold text-indigo-700 overflow-hidden shrink-0">
                <img
                  src={ADMIN_USER.avatar}
                  alt={ADMIN_USER.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Admin
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {ADMIN_USER.organization}
                </div>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
