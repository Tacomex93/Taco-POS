'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, ChefHat, ShoppingBag, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/use-notifications';

type Props = {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onClear: () => void;
};

const typeIcon: Record<Notification['type'], React.ReactNode> = {
  ready:      <ChefHat className="w-4 h-4 text-blue-500" />,
  new_order:  <ShoppingBag className="w-4 h-4 text-orange-500" />,
  cancelled:  <XCircle className="w-4 h-4 text-red-500" />,
};

const typeBg: Record<Notification['type'], string> = {
  ready:     'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
  new_order: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
  cancelled: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  return `Hace ${Math.floor(diff / 3600)} h`;
}

export function NotificationBell({ notifications, unreadCount, onMarkAllRead, onMarkRead, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unreadCount > 0) onMarkAllRead();
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={cn(
          'relative w-9 h-9 rounded-xl flex items-center justify-center transition-all',
          open
            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
        )}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-500 rounded-full text-[9px] text-white font-black flex items-center justify-center animate-bounce leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-screen max-w-[320px] sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 z-50 overflow-hidden"
          style={{ right: 'max(-1rem, calc(50vw - 160px - 100%))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-200">
              Notificaciones
            </span>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={onMarkAllRead}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onClear}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Limpiar todo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-30">
                <Bell className="w-8 h-8" />
                <p className="text-[10px] font-black uppercase tracking-widest">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                    !n.read && 'bg-zinc-50/80 dark:bg-zinc-800/30'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border', typeBg[n.type])}>
                    {typeIcon[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-[11px] font-black uppercase tracking-wide truncate', !n.read ? 'text-zinc-900 dark:text-white' : 'text-zinc-500')}>
                        {n.title}
                      </p>
                      <span className="text-[9px] font-bold text-zinc-400 shrink-0">{timeAgo(n.timestamp)}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{n.body}</p>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
