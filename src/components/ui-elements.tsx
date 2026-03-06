import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'motion/react';
import { User as UserIcon, CheckCircle2, X, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { User } from '@/lib/store';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm',
      secondary: 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--accent)]',
      ghost: 'hover:bg-[var(--accent)] text-[var(--foreground)]',
      outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--accent)] text-[var(--foreground)]',
      danger: 'bg-red-500 text-white hover:bg-red-600',
      warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
      success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-6 text-lg',
      icon: 'h-10 w-10 p-2 flex items-center justify-center',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:!outline-none focus:!ring-0 focus-visible:!ring-0 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-sm', className)} {...props}>
    {children}
  </div>
);

export const Badge = ({ className, variant = 'default', children }: { className?: string, variant?: 'default' | 'outline' | 'secondary' | 'success' | 'warning' | 'danger', children: React.ReactNode }) => {
  const variants = {
    default: 'bg-[var(--primary)] text-[var(--primary-foreground)]',
    outline: 'border border-[var(--border)] text-[var(--foreground)]',
    secondary: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-orange-500 text-white shadow-sm border-transparent',
    danger: 'bg-red-500 text-white shadow-sm border-transparent',
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
};

// ── Modal Wrapper ──────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
};

export function Modal({ isOpen, onClose, title, maxWidth = '2xl', children, footer, closeOnBackdrop = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={cn(
        "bg-[var(--background)] w-full rounded-xl shadow-2xl border border-[var(--border)] flex flex-col max-h-[90vh]",
        maxWidthClasses[maxWidth]
      )}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
        {footer && (
          <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 rounded-b-xl bg-[var(--background)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Assignee Selector ──────────────────────────────────────────────────

interface AssigneeSelectorProps {
  assigneeId?: string;
  users: User[];
  onSelect: (userId?: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AssigneeSelector({ assigneeId, users, onSelect, size = 'md', className }: AssigneeSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUp: false });
  const assignee = users.find(u => u.id === assigneeId);

  const sizeClasses = {
    sm: { container: 'w-6 h-6', avatar: 'w-5 h-5', icon: 10, text: 'text-[10px]', menuWidth: 'w-40' },
    md: { container: 'w-8 h-8', avatar: 'w-7 h-7', icon: 12, text: 'text-xs', menuWidth: 'w-48' },
    lg: { container: 'w-10 h-10', avatar: 'w-8 h-8', icon: 14, text: 'text-xs', menuWidth: 'w-48' },
  };

  const s = sizeClasses[size];

  useEffect(() => {
    if (showMenu && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = 240; // max-h-60
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

      setCoords({
        top: openUp ? rect.top : rect.bottom,
        left: rect.left,
        openUp
      });
    }
  }, [showMenu]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className={cn("flex items-center justify-center", s.container)}
      >
        {assignee ? (
          <img
            src={assignee.avatar}
            alt={assignee.name}
            className={cn("rounded-full border-2 border-[var(--border)]", s.avatar)}
            title={assignee.name}
          />
        ) : (
          <div className={cn(
            "rounded-full border-2 border-[var(--border)] border-dashed flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all",
            s.avatar
          )}>
            <UserIcon size={s.icon} />
          </div>
        )}
      </button>

      {showMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div
            className={cn(
              "fixed mt-1 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg z-[9999] py-1 max-h-60 overflow-y-auto",
              s.menuWidth,
              coords.openUp ? "animate-in slide-in-from-bottom-2" : "animate-in slide-in-from-top-2"
            )}
            style={{
              top: coords.openUp ? undefined : coords.top + 4,
              bottom: coords.openUp ? (window.innerHeight - coords.top) + 4 : undefined,
              left: Math.min(coords.left, window.innerWidth - (size === 'sm' ? 160 : 200) - 20)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(undefined); setShowMenu(false); }}
              className={cn("w-full text-left px-3 py-2 hover:bg-[var(--accent)] flex items-center gap-2 text-[var(--muted-foreground)]", s.text)}
            >
              <UserIcon size={14} /> Sem responsável
            </button>
            {users.map(user => (
              <button
                key={user.id}
                onClick={(e) => { e.stopPropagation(); onSelect(user.id); setShowMenu(false); }}
                className={cn("w-full text-left px-3 py-2 hover:bg-[var(--accent)] flex items-center gap-2", s.text)}
              >
                <img src={user.avatar} className="w-5 h-5 rounded-full" />
                {user.name}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── Status Selector ────────────────────────────────────────────────────

interface StatusSelectorProps {
  status: 'todo' | 'in-progress' | 'done';
  onSelect: (status: 'todo' | 'in-progress' | 'done') => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  compact?: boolean;
}

export function StatusSelector({ status, onSelect, size = 'sm', showLabel = false, className, compact }: StatusSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUp: false });

  const dotSize = compact ? 'w-4 h-4' : (size === 'sm' ? 'w-5 h-5' : 'w-4 h-4');
  const innerDotSize = compact ? 'w-1.5 h-1.5' : (size === 'sm' ? 'w-2 h-2' : 'w-1.5 h-1.5');

  const statusConfig = {
    'todo': { label: 'A Fazer', dotClass: 'border-slate-300 text-transparent hover:border-slate-400', innerDot: false },
    'in-progress': { label: 'Em Andamento', dotClass: 'border-blue-500 text-blue-500', innerDot: true },
    'done': { label: 'Concluído', dotClass: 'bg-emerald-500 border-emerald-500 text-white', innerDot: false },
  };

  const current = statusConfig[status];

  useEffect(() => {
    if (showMenu && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = 160;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

      setCoords({
        top: openUp ? rect.top : rect.bottom,
        left: rect.left,
        openUp
      });
    }
  }, [showMenu]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className={cn("flex items-center gap-2", (showLabel || compact) && "cursor-pointer")}
      >
        <div className={cn(
          "rounded-full border-2 flex items-center justify-center transition-colors",
          dotSize,
          current.dotClass
        )}>
          {status === 'done' && <CheckCircle2 size={compact ? 10 : (size === 'sm' ? 12 : 10)} />}
          {status === 'in-progress' && <div className={cn("bg-blue-500 rounded-full", innerDotSize)} />}
        </div>
        {showLabel && (
          <span className={cn(
            "font-medium text-sm",
            status === 'done' ? "text-emerald-600 dark:text-emerald-400" :
              status === 'in-progress' ? "text-blue-600 dark:text-blue-400" :
                "text-[var(--muted-foreground)]"
          )}>
            {current.label}
          </span>
        )}
      </button>

      {showMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div
            className={cn(
              "fixed mt-1 w-40 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg z-[9999] py-1",
              coords.openUp ? "animate-in slide-in-from-bottom-2" : "animate-in slide-in-from-top-2"
            )}
            style={{
              top: coords.openUp ? undefined : coords.top + 4,
              bottom: coords.openUp ? (window.innerHeight - coords.top) + 4 : undefined,
              left: Math.min(coords.left, window.innerWidth - 160 - 20)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onSelect('todo'); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--accent)] flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full border-2 border-slate-300" /> A Fazer
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect('in-progress'); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--accent)] flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full border-2 border-blue-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              </div> Em Andamento
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect('done'); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--accent)] flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 size={10} />
              </div> Concluído
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── Project Selector ──────────────────────────────────────────────────

interface ProjectSelectorProps {
  projectId?: string;
  projects: Project[];
  onSelect: (projectId?: string) => void;
  className?: string;
  showIcon?: boolean;
}

import { Project } from '@/lib/store';
import { Folder, ChevronDown as ChevronDownIcon } from 'lucide-react';

export function ProjectSelector({ projectId, projects, onSelect, className, showIcon = true }: ProjectSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUp: false });
  const project = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (showMenu && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

      setCoords({
        top: openUp ? rect.top : rect.bottom,
        left: rect.left,
        openUp
      });
    }
  }, [showMenu]);

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold uppercase tracking-wide shadow-sm hover:opacity-90",
          project
            ? "border-emerald-500/30 text-emerald-700 bg-emerald-50" // Fallback se não tiver cor
            : "border-[var(--border)] text-[var(--muted-foreground)] bg-[var(--muted)]/20"
        )}
        style={project ? {
          backgroundColor: `${project.color}15`,
          color: project.color,
          borderColor: `${project.color}40`
        } : {}}
      >
        {project ? (
          <>
            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: project.color }} />
            {project.name}
          </>
        ) : (
          <>
            {showIcon && <Folder size={14} />}
            Sem Projeto
          </>
        )}
        <ChevronDownIcon size={12} className={cn("transition-transform duration-200", showMenu && "rotate-180")} />
      </button>

      {showMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div
            className={cn(
              "fixed mt-1 w-56 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl z-[9999] py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200",
              coords.openUp ? "slide-in-from-bottom-2" : "slide-in-from-top-2"
            )}
            style={{
              top: coords.openUp ? undefined : coords.top + 4,
              bottom: coords.openUp ? (window.innerHeight - coords.top) + 4 : undefined,
              left: Math.min(coords.left, window.innerWidth - 224 - 20)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(undefined); setShowMenu(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-[var(--accent)] flex items-center gap-2.5 text-xs font-semibold text-[var(--muted-foreground)] transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300" />
              Sem Projeto
            </button>
            <div className="h-px bg-[var(--border)] my-1 mx-2" />
            {projects.map(p => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); onSelect(p.id); setShowMenu(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--accent)] flex items-center gap-2.5 text-xs font-semibold text-[var(--foreground)] transition-colors"
                style={projectId === p.id ? { color: p.color } : {}}
              >
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
