import React from 'react';
import { NotificationItem } from '../../types';
import { X, ShieldAlert, CheckCircle2, RefreshCw, Mail, Bell } from 'lucide-react';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-bold text-slate-900">Notifications</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded-full font-semibold">
            {notifications.filter((n) => !n.read).length} New
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllAsRead}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Mark all read
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <Bell className="w-6 h-6 mx-auto text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No Notifications</p>
            <p className="text-[11px] text-slate-400">You are completely up to date.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            return (
              <div
                key={notif.id}
                className={`p-3 transition-colors ${
                  notif.read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/30 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'risk' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
                    {notif.type === 'auth' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {notif.type === 'sync' && <RefreshCw className="w-4 h-4 text-indigo-600" />}
                    {notif.type === 'handover' && <Mail className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 truncate text-[11px]">
                        {notif.title}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {notif.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
