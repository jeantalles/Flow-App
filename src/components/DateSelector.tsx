import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { format, startOfToday, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import DatePicker, { registerLocale } from 'react-datepicker';

// Register locale for react-datepicker
registerLocale('pt-BR', ptBR);

interface DateSelectorProps {
  date?: string;
  onSelect: (date?: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function DateSelector({ date, onSelect, className, size = 'sm' }: DateSelectorProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUp: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const dateObj = date ? new Date(date) : null;
  const isOverdue = dateObj && dateObj < startOfToday() && !isToday(dateObj);

  useEffect(() => {
    if (showCalendar && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 380; // Approximate height of calendar + clear button
      const openUp = spaceBelow < calendarHeight && rect.top > calendarHeight;

      setCoords({
        top: openUp ? rect.top : rect.bottom,
        left: rect.left,
        openUp
      });
    }
  }, [showCalendar]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      date.setHours(12, 0, 0, 0);
      onSelect(date.toISOString());
    } else {
      onSelect(undefined);
    }
    setShowCalendar(false);
  };

  const getLabel = () => {
    if (!dateObj) return "Prazo";
    if (isToday(dateObj)) return "Hoje";
    if (isTomorrow(dateObj)) return "Amanhã";
    return format(dateObj, "dd MMM", { locale: ptBR });
  };

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowCalendar(!showCalendar);
        }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors font-medium border border-transparent hover:border-[var(--border)] hover:bg-[var(--accent)]",
          size === 'sm' ? "text-xs" : "text-sm",
          isOverdue ? "text-red-500" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          showCalendar && "bg-[var(--accent)] border-[var(--border)] text-[var(--foreground)]"
        )}
      >
        <CalendarIcon size={size === 'sm' ? 14 : 16} />
        <span>{getLabel()}</span>
        <ChevronDown size={size === 'sm' ? 12 : 14} className={cn("transition-transform", showCalendar && "rotate-180")} />
      </button>

      {showCalendar && createPortal(
        <div
          className={cn("fixed z-[9999]", coords.openUp ? "animate-in slide-in-from-bottom-2" : "animate-in slide-in-from-top-2")}
          style={{
            top: coords.openUp ? undefined : coords.top + 8,
            bottom: coords.openUp ? (window.innerHeight - coords.top) + 8 : undefined,
            left: Math.max(20, Math.min(coords.left, window.innerWidth - 300)) // Ensure horizontal padding
          }}
        >
          {/* Backdrop with stopPropagation to avoid parent clicks */}
          <div
            className="fixed inset-0 z-[-1]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCalendar(false);
            }}
          />
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
            <DatePicker
              selected={dateObj}
              onChange={handleDateChange}
              inline
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
            />
            <div className="p-2 border-t border-[var(--border)] bg-[var(--muted)]/30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(undefined);
                  setShowCalendar(false);
                }}
                className="w-full py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                <X size={14} />
                Limpar Prazo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
