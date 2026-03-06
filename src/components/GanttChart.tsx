import React, { useState, useRef, useEffect } from 'react';
import { Task, Project, User } from '@/lib/store';
import { cn, formatRelativeDate } from '@/lib/utils';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, isSameDay, isWeekend, differenceInDays, isSameMonth, startOfMonth, differenceInWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, CornerDownRight, Maximize2, Minimize2 } from 'lucide-react';
import { StatusSelector } from './ui-elements';
import { DateSelector } from './DateSelector';

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task, subtaskId?: string) => void;
  onUpdateTask: (task: Task) => void;
  users: User[];
}

export function GanttChart({ tasks, projects, onTaskClick, onUpdateTask, users }: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'days' | 'weeks'>('days');
  const [draggingItem, setDraggingItem] = useState<{
    id: string,
    parentId?: string,
    type: 'move' | 'resize-left' | 'resize-right',
    initialX: number,
    initialStart: Date,
    initialEnd: Date
  } | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [isFullHeight, setIsFullHeight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startDate = startOfWeek(addDays(currentDate, viewMode === 'days' ? -14 : -30), { weekStartsOn: 1 });
  const endDate = endOfWeek(addDays(currentDate, viewMode === 'days' ? 90 : 365), { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekUnits = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

  const unitWidth = viewMode === 'days' ? 64 : 140;
  const rowHeight = 48;

  const handlePrev = () => setCurrentDate(addDays(currentDate, viewMode === 'days' ? -30 : -90));
  const handleNext = () => setCurrentDate(addDays(currentDate, viewMode === 'days' ? 30 : 90));

  // Group tasks by project
  const tasksByProject = projects.map(project => ({
    project,
    tasks: tasks.filter(t => t.projectId === project.id && !t.deletedAt)
  })).filter(g => g.tasks.length > 0);

  const orphanedTasks = tasks.filter(t => !t.projectId && !t.deletedAt);
  if (orphanedTasks.length > 0) {
    tasksByProject.push({
      project: {
        id: 'no-project',
        name: 'Sem Projeto',
        color: '#64748b'
      } as Project,
      tasks: orphanedTasks
    });
  }

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleProjectExpand = (projectId: string) => {
    setCollapsedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const wasDraggedRef = useRef(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingItem || !containerRef.current) return;

    const deltaX = e.clientX - draggingItem.initialX;
    if (Math.abs(deltaX) > 5) {
      wasDraggedRef.current = true;
    }

    const currentUnitWidth = viewMode === 'days' ? unitWidth : unitWidth / 7;
    const daysDelta = Math.round(deltaX / currentUnitWidth);

    if (daysDelta === 0) return;

    let newStart = new Date(draggingItem.initialStart);
    let newEnd = new Date(draggingItem.initialEnd);

    if (draggingItem.type === 'move') {
      newStart = addDays(newStart, daysDelta);
      newEnd = addDays(newEnd, daysDelta);
    } else if (draggingItem.type === 'resize-left') {
      newStart = addDays(newStart, daysDelta);
      if (newStart > newEnd) newStart = newEnd;
    } else if (draggingItem.type === 'resize-right') {
      newEnd = addDays(newEnd, daysDelta);
      if (newEnd < newStart) newEnd = newStart;
    }

    if (draggingItem.parentId) {
      const parentTask = tasks.find(t => t.id === draggingItem.parentId);
      if (parentTask) {
        const updatedSubtasks = parentTask.subtasks.map(st =>
          st.id === draggingItem.id
            ? { ...st, startDate: newStart.toISOString(), endDate: newEnd.toISOString() }
            : st
        );
        onUpdateTask({ ...parentTask, subtasks: updatedSubtasks });
      }
    } else {
      const task = tasks.find(t => t.id === draggingItem.id);
      if (task) {
        onUpdateTask({ ...task, startDate: newStart.toISOString(), endDate: newEnd.toISOString() });
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
    setTimeout(() => {
      wasDraggedRef.current = false;
    }, 300);
  };

  const handleTaskClickWithCheck = (task: Task, subtaskId?: string) => {
    if (!wasDraggedRef.current) {
      onTaskClick(task, subtaskId);
    }
  };

  useEffect(() => {
    if (draggingItem) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingItem, viewMode, unitWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        container.scrollLeft += e.deltaY || e.deltaX;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const today = new Date();
    const daysFromStart = differenceInDays(today, startDate);
    const scrollPos = (daysFromStart * (viewMode === 'days' ? unitWidth : unitWidth / 7)) - (containerRef.current.clientWidth / 2) + 300;
    containerRef.current.scrollLeft = scrollPos;
  }, [currentDate, viewMode]);

  // Months grouping and unit indexing
  const units = viewMode === 'days' ? days : weekUnits;
  const unitMonthIndices = new Array(units.length);
  const monthGroups: { name: string, count: number }[] = [];
  let currentMonthName = "";
  let monthGroup: { name: string, count: number } | null = null;
  let runningMonthIndex = 0;

  units.forEach((unit, idx) => {
    const referenceDate = viewMode === 'weeks' ? addDays(unit, 3) : unit;
    const mName = format(referenceDate, 'MMMM', { locale: ptBR });

    if (mName !== currentMonthName) {
      currentMonthName = mName;
      runningMonthIndex = 1;
      monthGroup = { name: mName, count: 1 };
      monthGroups.push(monthGroup);
    } else {
      runningMonthIndex++;
      if (monthGroup) monthGroup.count++;
    }
    unitMonthIndices[idx] = runningMonthIndex;
  });

  return (
    <div className={cn(
      "flex flex-col h-full bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden select-none transition-all duration-300",
      isFullHeight && "fixed inset-y-0 right-0 left-64 z-[100] bg-[var(--background)] rounded-none border-none border-l border-[var(--border)]"
    )}>
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--muted)]/20">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Cronograma</h3>
          <div className="flex items-center bg-[var(--background)] rounded-md border border-[var(--border)] p-1 gap-1">
            <button onClick={handlePrev} className="p-1 hover:bg-[var(--accent)] rounded transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /></button>
            <button
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
              }}
              className="px-3 text-xs font-semibold hover:bg-[var(--accent)] rounded h-full py-1.5 transition-colors text-[var(--primary)]"
            >
              Hoje
            </button>
            <span className="px-3 text-xs font-bold uppercase tracking-wider min-w-[140px] text-center border-l border-r border-[var(--border)] mx-1 text-[var(--muted-foreground)]">
              {format(startDate, "d MMM", { locale: ptBR })} - {format(endDate, "d MMM", { locale: ptBR })}
            </span>
            <button onClick={handleNext} className="p-1 hover:bg-[var(--accent)] rounded transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ChevronRight size={16} /></button>
          </div>

          <div className="flex bg-[var(--background)] p-1 rounded-lg border border-[var(--border)] gap-1 shadow-sm ml-4">
            <button
              onClick={() => setViewMode('days')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                viewMode === 'days' ? "bg-blue-600 text-white shadow-md" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
              )}
            >
              Dias
            </button>
            <button
              onClick={() => setViewMode('weeks')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                viewMode === 'weeks' ? "bg-blue-600 text-white shadow-md" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
              )}
            >
              Semanas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullHeight(!isFullHeight)}
            className="p-2 hover:bg-[var(--accent)] rounded-lg transition-all text-[var(--muted-foreground)] hover:text-[var(--foreground)] group"
            title={isFullHeight ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullHeight ? (
              <Minimize2 size={20} className="group-hover:scale-110 transition-transform" />
            ) : (
              <Maximize2 size={20} className="group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 overflow-auto relative scroll-smooth" ref={containerRef}>
        <div style={{ minWidth: (viewMode === 'days' ? days.length : weekUnits.length) * unitWidth + 300 }} className="pb-6">
          {/* Header Rows */}
          <div className="flex sticky top-0 z-30 bg-[var(--background)]">
            {/* Sidebar header - spanning both tiers */}
            <div className="w-80 h-24 flex-shrink-0 p-3 pl-6 font-bold text-[11px] uppercase tracking-[0.2em] border-r border-b border-[var(--border)] bg-[var(--background)] sticky left-0 z-40 shadow-[2px_0_0_0_var(--border)] flex items-end pb-4 text-[var(--muted-foreground)]">
              Tarefa
            </div>

            <div className="flex-1 flex flex-col">
              {/* Months Row */}
              <div className="flex h-12 border-b border-[var(--border)]">
                {monthGroups.map((group, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 border-r-2 border-slate-300 dark:border-slate-600 flex items-center bg-slate-100 dark:bg-slate-900/60"
                    style={{ width: group.count * unitWidth }}
                  >
                    <div className="sticky left-80 px-6 whitespace-nowrap text-[14px] font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-100 uppercase">
                      {group.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Units Row */}
              <div className="flex h-12 border-b border-[var(--border)]">
                {viewMode === 'days' ? (
                  days.map((day, idx) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex-shrink-0 text-center py-1 border-r border-[var(--border)] text-xs flex flex-col justify-center transition-colors h-full relative overflow-hidden",
                        isSameDay(day, new Date()) && "bg-blue-500/10 dark:bg-blue-500/20",
                        isWeekend(day) && "bg-slate-200/50 dark:bg-slate-800"
                      )}
                      style={{ width: unitWidth }}
                    >
                      {isSameDay(day, new Date()) && <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 z-10" />}
                      <div className="text-[12px] uppercase font-bold tracking-tight leading-none mb-1 text-slate-500 dark:text-slate-400">
                        {format(day, 'EEEE', { locale: ptBR }).replace('-feira', '')}
                      </div>
                      <div className={cn(
                        "text-[16px] font-black leading-none",
                        isSameDay(day, new Date()) ? "text-blue-600 scale-110" : "text-slate-900 dark:text-slate-100"
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))
                ) : (
                  weekUnits.map((week, idx) => {
                    const weekIndex = unitMonthIndices[idx];
                    const isCurrentWeek = (isSameDay(week, startOfWeek(new Date(), { weekStartsOn: 1 })) || (new Date() >= week && new Date() <= endOfWeek(week, { weekStartsOn: 1 })));

                    return (
                      <div
                        key={week.toISOString()}
                        className={cn(
                          "flex-shrink-0 text-center border-r border-[var(--border)] text-xs flex flex-col justify-center transition-colors h-full relative",
                          isCurrentWeek && "bg-blue-500/10 dark:bg-blue-500/20"
                        )}
                        style={{ width: unitWidth }}
                      >
                        {isCurrentWeek && <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 z-10" />}
                        <div className="text-[13px] uppercase font-bold tracking-widest leading-none mb-1.5 text-slate-500 dark:text-slate-400">Sem. {weekIndex}</div>
                        <div className={cn(
                          "text-[14px] font-black",
                          isCurrentWeek ? "text-blue-600 scale-105" : "text-slate-900 dark:text-slate-100"
                        )}>
                          {format(week, 'd MMM', { locale: ptBR })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-[var(--border)]">
            {tasksByProject.map(({ project, tasks }) => (
              <React.Fragment key={project.id}>
                {/* Project Header Row */}
                <div className="flex group relative" style={{ height: rowHeight }}>
                  <div
                    className="w-80 h-full flex-shrink-0 p-2 pl-4 text-sm font-black uppercase tracking-[0.1em] flex items-center gap-2 border-r border-[var(--border)] sticky left-0 z-20 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] cursor-pointer hover:brightness-95 transition-all overflow-hidden bg-[var(--background)]"
                    onClick={() => toggleProjectExpand(project.id)}
                  >
                    <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundColor: project.color }} />
                    <button className="p-1 hover:bg-[var(--accent)] rounded text-[var(--muted-foreground)] transition-transform duration-200 relative z-10" style={{ transform: collapsedProjects[project.id] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                      <ChevronDown size={14} />
                    </button>
                    <span className="w-2 h-2 rounded-full ring-2 ring-offset-2 relative z-10" style={{ backgroundColor: project.color, boxShadow: `0 0 0 2px ${project.color}40` }} />
                    <span className="truncate relative z-10 text-[13px]">{project.name}</span>
                  </div>

                  <div className="flex-1 relative h-full">
                    {/* Grid Lines */}
                    {(viewMode === 'days' ? days : weekUnits).map(unit => {
                      const isToday = viewMode === 'days' && isSameDay(unit, new Date());
                      const isThisWeek = viewMode === 'weeks' && (new Date() >= unit && new Date() <= endOfWeek(unit, { weekStartsOn: 1 }));
                      const isWeekendDay = viewMode === 'days' && isWeekend(unit);

                      return (
                        <div
                          key={unit.toISOString()}
                          className={cn(
                            "flex-shrink-0 border-r border-[var(--border)] h-full absolute top-0 bottom-0 transition-colors",
                            (isToday || isThisWeek) && "bg-blue-500/[0.08] dark:bg-blue-500/[0.12] z-0",
                            isWeekendDay && "bg-slate-200/40 dark:bg-slate-800/40"
                          )}
                          style={{
                            left: (viewMode === 'days' ? differenceInDays(unit, startDate) : differenceInDays(unit, startDate) / 7) * unitWidth,
                            width: unitWidth,
                            borderLeft: isToday ? '2px solid rgba(59, 130, 246, 0.3)' : undefined,
                            borderRight: isToday ? '2px solid rgba(59, 130, 246, 0.3)' : undefined
                          }}
                        />
                      );
                    })}

                    {project.deadline && (
                      <div
                        className="absolute h-1 top-1/2 -translate-y-1/2 rounded-full opacity-50"
                        style={{
                          left: 0,
                          width: Math.max(0, (differenceInDays(new Date(project.deadline), startDate) + 1) * (viewMode === 'days' ? unitWidth : unitWidth / 7)),
                          backgroundColor: project.color,
                          minWidth: 4,
                          display: new Date(project.deadline) < startDate ? 'none' : 'block'
                        }}
                        title={`Prazo do Projeto: ${format(new Date(project.deadline), 'dd/MM/yyyy')}`}
                      >
                        <div className="absolute right-0 -top-6 text-[10px] font-bold text-[var(--muted-foreground)] bg-[var(--background)] px-1 rounded border border-[var(--border)] whitespace-nowrap z-10">
                          {formatRelativeDate(project.deadline)}
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-red-500 h-4 -mt-1.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks */}
                {!collapsedProjects[project.id] && tasks.map(task => {
                  const taskStart = task.startDate ? new Date(task.startDate) : new Date();
                  const taskEnd = task.endDate ? new Date(task.endDate) : taskStart;
                  const isExpanded = expandedTasks[task.id];

                  return (
                    <React.Fragment key={task.id}>
                      <div className="flex hover:bg-[var(--accent)]/30 transition-colors group relative" style={{ height: rowHeight }}>
                        <div
                          className="w-80 h-full flex-shrink-0 p-2 pl-4 text-[14px] border-r border-[var(--border)] truncate cursor-pointer hover:bg-[var(--muted)] sticky left-0 bg-[var(--background)] z-20 flex items-center gap-1 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] transition-colors group/sidebar-item"
                        >
                          {task.subtasks.length > 0 ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task.id); }}
                              className="p-1 hover:bg-[var(--accent)] rounded text-[var(--muted-foreground)] h-6 w-6 flex items-center justify-center shrink-0"
                            >
                              <div className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                <ChevronDown size={14} />
                              </div>
                            </button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}

                          <div className="shrink-0 scale-75 origin-left -ml-1">
                            <StatusSelector
                              status={task.status}
                              onSelect={(status) => onUpdateTask({ ...task, status })}
                            />
                          </div>

                          <span
                            className="truncate flex-1 font-medium text-[var(--foreground)] ml-1"
                            onClick={() => handleTaskClickWithCheck(task)}
                          >
                            {task.title}
                          </span>

                          <div className="shrink-0">
                            <DateSelector
                              date={task.endDate}
                              onSelect={(date) => onUpdateTask({ ...task, endDate: date })}
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="flex-1 flex relative h-full">
                          {(viewMode === 'days' ? days : weekUnits).map(unit => {
                            const isTodayCol = viewMode === 'days' && isSameDay(unit, new Date());
                            const isThisWeekCol = viewMode === 'weeks' && (new Date() >= unit && new Date() <= endOfWeek(unit, { weekStartsOn: 1 }));
                            const isWeekendCol = viewMode === 'days' && isWeekend(unit);

                            return (
                              <div
                                key={unit.toISOString()}
                                className={cn(
                                  "flex-shrink-0 border-r border-[var(--border)] h-full absolute top-0 bottom-0",
                                  (isTodayCol || isThisWeekCol) && "bg-blue-500/[0.08] dark:bg-blue-500/[0.12] z-0",
                                  isWeekendCol && "bg-slate-200/40 dark:bg-slate-800/40"
                                )}
                                style={{
                                  left: (viewMode === 'days' ? differenceInDays(unit, startDate) : differenceInDays(unit, startDate) / 7) * unitWidth,
                                  width: unitWidth,
                                  borderLeft: isTodayCol ? '2px solid rgba(59, 130, 246, 0.3)' : undefined,
                                  borderRight: isTodayCol ? '2px solid rgba(59, 130, 246, 0.3)' : undefined
                                }}
                              />
                            );
                          })}

                          <GanttBar
                            title={task.title}
                            start={taskStart}
                            end={taskEnd}
                            color={project.color}
                            visibleStart={startDate}
                            unitWidth={unitWidth}
                            viewMode={viewMode}
                            height={28}
                            isCompleted={task.status === 'done'}
                            onClick={() => handleTaskClickWithCheck(task)}
                            onDragStart={(type, e) => {
                              setDraggingItem({
                                id: task.id,
                                type,
                                initialX: e.clientX,
                                initialStart: taskStart,
                                initialEnd: taskEnd
                              });
                            }}
                          />
                        </div>
                      </div>

                      {/* Subtasks */}
                      {isExpanded && task.subtasks.map(subtask => {
                        const subtaskStart = subtask.startDate ? new Date(subtask.startDate) : taskStart;
                        const subtaskEnd = subtask.endDate ? new Date(subtask.endDate) : (subtask.startDate ? subtaskStart : taskEnd);

                        return (
                          <div key={subtask.id} className="flex hover:bg-[var(--accent)]/30 transition-colors group relative" style={{ height: rowHeight }}>
                            <div className="w-80 h-full flex-shrink-0 p-2 pl-10 text-[13px] border-r border-[var(--border)] sticky left-0 bg-[var(--background)] z-20 flex items-center gap-1 text-[var(--muted-foreground)] shadow-[1px_0_4px_-2px_rgba(0,0,0,0.05)] hover:bg-[var(--muted)] group/sidebar-item transition-all">
                              <CornerDownRight size={14} className="shrink-0 text-[var(--muted-foreground)] opacity-50 mr-1" />
                              <div className="shrink-0 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={subtask.completed}
                                  onChange={() => {
                                    const updatedSubtasks = task.subtasks.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
                                    onUpdateTask({ ...task, subtasks: updatedSubtasks });
                                  }}
                                  className="w-3.5 h-3.5 rounded border-[var(--muted-foreground)] text-[var(--primary)] cursor-pointer"
                                />
                              </div>
                              <span
                                className={cn("truncate flex-1 ml-2 cursor-pointer font-medium", subtask.completed ? "line-through opacity-50 text-[var(--muted-foreground)]" : "text-[var(--foreground)]")}
                                onClick={() => handleTaskClickWithCheck(task, subtask.id)}
                              >
                                {subtask.title}
                              </span>
                              <div className="shrink-0">
                                <DateSelector
                                  date={subtask.endDate}
                                  onSelect={(date) => {
                                    const updatedSubtasks = task.subtasks.map(s => s.id === subtask.id ? { ...s, endDate: date } : s);
                                    onUpdateTask({ ...task, subtasks: updatedSubtasks });
                                  }}
                                  size="sm"
                                />
                              </div>
                            </div>

                            <div className="flex-1 flex relative h-full">
                              {(viewMode === 'days' ? days : weekUnits).map(unit => {
                                const isT = viewMode === 'days' && isSameDay(unit, new Date());
                                const isW = viewMode === 'weeks' && (new Date() >= unit && new Date() <= endOfWeek(unit, { weekStartsOn: 1 }));
                                const isEnd = viewMode === 'days' && isWeekend(unit);

                                return (
                                  <div
                                    key={unit.toISOString()}
                                    className={cn(
                                      "flex-shrink-0 border-r border-[var(--border)] h-full absolute top-0 bottom-0",
                                      (isT || isW) && "bg-blue-500/[0.08] dark:bg-blue-500/[0.12] z-0",
                                      isEnd && "bg-slate-200/40 dark:bg-slate-800/40"
                                    )}
                                    style={{
                                      left: (viewMode === 'days' ? differenceInDays(unit, startDate) : differenceInDays(unit, startDate) / 7) * unitWidth,
                                      width: unitWidth,
                                      borderLeft: isT ? '2px solid rgba(59, 130, 246, 0.3)' : undefined,
                                      borderRight: isT ? '2px solid rgba(59, 130, 246, 0.3)' : undefined
                                    }}
                                  />
                                );
                              })}

                              <GanttBar
                                title={subtask.title}
                                start={subtaskStart}
                                end={subtaskEnd}
                                color={project.color}
                                visibleStart={startDate}
                                unitWidth={unitWidth}
                                viewMode={viewMode}
                                height={24}
                                isCompleted={subtask.completed}
                                isSubtask
                                onClick={() => handleTaskClickWithCheck(task, subtask.id)}
                                onDragStart={(type, e) => {
                                  setDraggingItem({
                                    id: subtask.id,
                                    parentId: task.id,
                                    type,
                                    initialX: e.clientX,
                                    initialStart: subtaskStart,
                                    initialEnd: subtaskEnd
                                  });
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttBar({ title, start, end, color, visibleStart, unitWidth, viewMode, height, isCompleted, isSubtask, onClick, onDragStart }: {
  title: string,
  start: Date,
  end: Date,
  color: string,
  visibleStart: Date,
  unitWidth: number,
  viewMode: 'days' | 'weeks',
  height: number,
  isCompleted: boolean,
  isSubtask?: boolean,
  onClick: () => void,
  onDragStart: (type: 'move' | 'resize-left' | 'resize-right', e: React.MouseEvent) => void
}) {
  const offsetDays = differenceInDays(start, visibleStart);
  const durationDays = differenceInDays(end, start) + 1;

  const currentUnitWidth = viewMode === 'days' ? unitWidth : unitWidth / 7;
  const left = offsetDays * currentUnitWidth;
  const width = durationDays * currentUnitWidth;

  return (
    <div
      className={cn(
        "absolute rounded-md shadow-sm group/bar z-10 top-1/2 -translate-y-1/2",
        isSubtask && "opacity-80"
      )}
      style={{
        left: `${left}px`,
        width: `${Math.max(width, currentUnitWidth)}px`,
        height: `${height}px`,
        backgroundColor: color,
        opacity: isCompleted ? 0.6 : (isSubtask ? 0.8 : 1)
      }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={(e) => { e.stopPropagation(); onDragStart('move', e); }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-6 cursor-w-resize hover:bg-white/20 rounded-l-md"
        onMouseDown={(e) => { e.stopPropagation(); onDragStart('resize-left', e); }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-6 cursor-e-resize hover:bg-white/20 rounded-r-md"
        onMouseDown={(e) => { e.stopPropagation(); onDragStart('resize-right', e); }}
      />
      <div className="px-2 text-[13px] text-white font-bold whitespace-nowrap overflow-hidden flex items-center h-full pointer-events-none drop-shadow-sm sticky left-80 w-fit max-w-full">
        {title}
      </div>
    </div>
  );
}
