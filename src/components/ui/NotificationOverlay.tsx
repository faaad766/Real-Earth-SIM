// Notification toast overlay
import { X } from 'lucide-react';
import { useUIStore } from '@/store/UIStore';

const TYPE_COLORS = {
  info: '#00E5C0',
  warning: '#F0A500',
  error: '#FF6B6B',
  success: '#4ECDC4',
};

const TYPE_ICONS = {
  info: 'ℹ', warning: '⚠', error: '✕', success: '✓',
};

export function NotificationOverlay() {
  const { notifications, clearNotification } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-40 right-4 z-50 flex flex-col gap-2 items-end" style={{ maxWidth: 280 }}>
      {notifications.map(n => (
        <div
          key={n.id}
          className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            background: 'rgba(10,10,20,0.92)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${TYPE_COLORS[n.type]}44`,
            boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 8px ${TYPE_COLORS[n.type]}22`,
            animation: 'fade-in 0.3s ease-out',
          }}
        >
          <span style={{ color: TYPE_COLORS[n.type], fontSize: '0.75rem' }}>{TYPE_ICONS[n.type]}</span>
          <span className="flex-1 text-foreground" style={{ fontFamily: 'Inter', fontSize: '0.72rem' }}>{n.message}</span>
          <button
            onClick={() => clearNotification(n.id)}
            className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
