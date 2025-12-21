import React, { useEffect } from 'react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

export type NotificationType = 'success' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
}

interface ToastProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  return (
    <div className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl animate-in slide-in-from-right-10 duration-300">
      <div className={clsx(
        "p-1.5 rounded-lg shrink-0",
        notification.type === 'success' ? "bg-emerald-500/20 text-emerald-400" :
        notification.type === 'warning' ? "bg-yellow-500/20 text-yellow-500" :
        "bg-blue-500/20 text-blue-400"
      )}>
        {notification.type === 'success' && <CheckCircle size={16} />}
        {notification.type === 'warning' && <AlertTriangle size={16} />}
        {notification.type === 'info' && <Info size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        {notification.title && (
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                {notification.title}
            </div>
        )}
        <div className="text-sm text-white/90 leading-snug font-medium">{notification.message}</div>
      </div>
      <button onClick={() => onRemove(notification.id)} className="p-1 text-white/20 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onRemove={onRemove} />
      ))}
    </div>
  );
};
