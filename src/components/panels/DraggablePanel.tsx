// DraggablePanel: resizable, draggable, collapsible glassmorphism panel
import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { X, Minus, GripVertical } from 'lucide-react';

interface DraggablePanelProps {
  title: string;
  icon?: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  open: boolean;
  rightAligned?: boolean;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onCollapse: (c: boolean) => void;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  headerExtra?: ReactNode;
  docked?: boolean; // When true, fills parent as a static sidebar panel (no fixed positioning)
}

export function DraggablePanel({
  title, icon, x, y, width, height, collapsed, open, rightAligned,
  onMove, onResize, onCollapse, onClose, children, className,
  minWidth = 200, minHeight = 100, headerExtra, docked,
}: DraggablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const startPos = useRef({ mx: 0, my: 0, px: 0, py: 0, pw: 0, ph: 0 });

  const onMouseDownHeader = useCallback((e: React.MouseEvent) => {
    if (docked || (e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    startPos.current = { mx: e.clientX, my: e.clientY, px: x, py: y, pw: width, ph: height };
    e.preventDefault();
  }, [docked, x, y, width, height]);

  const onMouseDownResize = useCallback((e: React.MouseEvent) => {
    if (docked) return;
    resizing.current = true;
    startPos.current = { mx: e.clientX, my: e.clientY, px: x, py: y, pw: width, ph: height };
    e.stopPropagation();
    e.preventDefault();
  }, [docked, x, y, width, height]);

  useEffect(() => {
    const onMove2 = (e: MouseEvent) => {
      if (dragging.current) {
        const dx = e.clientX - startPos.current.mx;
        const dy = e.clientY - startPos.current.my;
        onMove(startPos.current.px + dx, startPos.current.py + dy);
      }
      if (resizing.current) {
        const dx = e.clientX - startPos.current.mx;
        const dy = e.clientY - startPos.current.my;
        onResize(
          Math.max(minWidth, startPos.current.pw + dx),
          Math.max(minHeight, startPos.current.ph + dy)
        );
      }
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    window.addEventListener('mousemove', onMove2);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove2); window.removeEventListener('mouseup', onUp); };
  }, [onMove, onResize, minWidth, minHeight]);

  if (!open) return null;

  // Compute actual position (handle right-aligned panels)
  const computedX = rightAligned
    ? (window.innerWidth - width - 16)
    : Math.max(0, x);
  const computedY = Math.max(0, y);

  if (docked) {
    // Sidebar mode: fill parent, no fixed positioning, no drag/resize
    return (
      <div
        ref={panelRef}
        className={`group relative z-30 rounded-xl overflow-hidden select-none flex flex-col ${className ?? ''}`}
        style={{
          width: '100%',
          height: collapsed ? 42 : '100%',
          background: 'rgba(10, 10, 20, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'height 0.2s ease',
          minWidth,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)', userSelect: 'none' }}
        >
          <GripVertical size={12} className="text-muted-foreground shrink-0 opacity-20" />
          {icon && <span className="shrink-0 opacity-70">{icon}</span>}
          <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.03em' }}>
            {title}
          </span>
          {headerExtra}
          <button
            onClick={() => onCollapse(!collapsed)}
            className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <Minus size={12} />
          </button>
          {!docked && (
            <button
              onClick={onClose}
              className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              title="Close"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="overflow-y-auto flex-1 min-h-0">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`group fixed z-30 rounded-xl overflow-hidden select-none ${className ?? ''}`}
      style={{
        left: computedX,
        top: computedY,
        width,
        height: collapsed ? 42 : height,
        background: 'rgba(10, 10, 20, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'height 0.2s ease',
        minWidth,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', userSelect: 'none' }}
        onMouseDown={onMouseDownHeader}
      >
        <GripVertical size={12} className="text-muted-foreground shrink-0 opacity-40" />
        {icon && <span className="shrink-0 opacity-70">{icon}</span>}
        <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.03em' }}>
          {title}
        </span>
        {headerExtra}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <Minus size={12} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          title="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="overflow-y-auto" style={{ height: height - 42 }}>
          {children}
        </div>
      )}

      {/* Resize handle */}
      {!collapsed && (
        <div
          className="panel-handle"
          onMouseDown={onMouseDownResize}
        />
      )}
    </div>
  );
}
