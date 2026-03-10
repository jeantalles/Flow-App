import React, { useState, useEffect } from 'react';
import { Project, Task, User, Subtask, ActiveTimer } from '@/lib/store';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  Activity,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List as ListIcon,
  Zap,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  MoreVertical,
  GripVertical,
  Kanban,
  Eye,
  EyeOff,
  Play,
  Pause
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { StatusSelector, Badge } from './ui-elements';
import { DateSelector } from './DateSelector';
import { v4 as uuidv4 } from 'uuid';

interface MyTasksViewProps {
  tasks: Task[];
  projects: Project[];
  currentUser: User;
  onTaskClick: (task: Task, subtaskId?: string) => void;
  onUpdateTask: (task: Task) => void;
  onCreateTask: (projectId?: string, isToday?: boolean) => void;
  onSaveNewTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  onUpdateTasksOrder: (updates: { id: string, type: 'task' | 'subtask', todayOrder: number, parentTaskId?: string }[]) => void;
  activeTimer: ActiveTimer | null;
  onStartTimer: (taskId: string, subtaskId?: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
}

export function MyTasksView({
  tasks,
  projects,
  currentUser,
  onTaskClick,
  onUpdateTask,
  onCreateTask,
  onSaveNewTask,
  onDeleteTask,
  onUpdateTasksOrder,
  activeTimer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer
}: MyTasksViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [inlineCreating, setInlineCreating] = useState<Task['status'] | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [localTodayTasks, setLocalTodayTasks] = useState<any[]>([]);
  const [tasksViewMode, setTasksViewMode] = useState<'list' | 'kanban'>('list');
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(true);
  const [showOtherTasks, setShowOtherTasks] = useState(() => {
    const saved = localStorage.getItem('studioflow_show_other_tasks');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [groupByProject, setGroupByProject] = useState(() => {
    const saved = localStorage.getItem('studioflow_group_by_project');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('studioflow_show_other_tasks', JSON.stringify(showOtherTasks));
  }, [showOtherTasks]);

  useEffect(() => {
    localStorage.setItem('studioflow_group_by_project', JSON.stringify(groupByProject));
  }, [groupByProject]);

  // Today's tasks calculation
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const rawTasks = [
      ...tasks.filter(t =>
        !t.deletedAt &&
        t.status !== 'done' &&
        t.assigneeId === currentUser.id &&
        (t.isToday || (t.endDate && (t.endDate.startsWith(today) || t.endDate <= today)))
      ).map(t => ({ ...t, type: 'task' as const })),
      ...tasks.flatMap(t =>
        t.subtasks
          .filter(st => !t.deletedAt && st.assigneeId === currentUser.id && st.isToday && !st.completed)
          .map(st => ({ ...st, parentTask: t, type: 'subtask' as const }))
      )
    ].sort((a, b) => (a.todayOrder ?? 1000) - (b.todayOrder ?? 1000));

    setLocalTodayTasks(rawTasks);
  }, [tasks, today, currentUser.id]);

  const handleReorderToday = (newItems: any[]) => {
    setLocalTodayTasks(newItems);

    const updates = newItems.map((item, index) => ({
      id: item.id,
      type: item.type,
      todayOrder: index,
      parentTaskId: item.parentTask?.id
    }));

    onUpdateTasksOrder(updates);
  };

  // Filter tasks and subtasks assigned to current user for other sections
  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id && !t.deletedAt);

  const mySubtasks = tasks.flatMap(t =>
    t.subtasks
      .filter(st => st.assigneeId === currentUser.id && !t.deletedAt)
      .map(st => ({ ...st, parentTask: t }))
  );

  const toggleTaskExpand = (id: string) => {
    setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleToday = (item: any) => {
    if (item.parentTask) {
      // Subtask
      const parent = tasks.find(t => t.id === item.parentTask.id);
      if (parent) {
        const updatedSubtasks = parent.subtasks.map(st =>
          st.id === item.id ? { ...st, isToday: !st.isToday } : st
        );
        onUpdateTask({ ...parent, subtasks: updatedSubtasks });
      }
    } else {
      onUpdateTask({ ...item, isToday: !item.isToday });
    }
  };

  const handleInlineSubmit = async (title: string, status: Task['status']) => {
    if (!title.trim()) {
      setInlineCreating(null);
      return;
    }

    const tempTask: Task = {
      id: uuidv4(),
      title: title.trim(),
      status: status,
      priority: 'none',
      assigneeId: currentUser.id,
      subtasks: [],
      timeSpent: 0,
      createdAt: new Date().toISOString(),
      isToday: false,
    };

    await onSaveNewTask(tempTask);
    setInlineCreating(null);
    setInlineTitle('');
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'task' | 'subtask') => {
    e.dataTransfer.setData('itemId', id);
    e.dataTransfer.setData('itemType', type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    const itemId = e.dataTransfer.getData('itemId');
    const itemType = e.dataTransfer.getData('itemType');

    if (itemType === 'task') {
      const task = tasks.find(t => t.id === itemId);
      if (task && task.status !== status) {
        onUpdateTask({ ...task, status });
      }
    } else if (itemType === 'subtask') {
      const parentTask = tasks.find(t => t.subtasks.some(st => st.id === itemId));
      if (parentTask) {
        const subtask = parentTask.subtasks.find(st => st.id === itemId);
        if (subtask) {
          if (status === 'done' && !subtask.completed) {
            const updatedSubtasks = parentTask.subtasks.map(s => s.id === itemId ? { ...s, completed: true } : s);
            onUpdateTask({ ...parentTask, subtasks: updatedSubtasks });
          } else if (status !== 'done' && subtask.completed) {
            const updatedSubtasks = parentTask.subtasks.map(s => s.id === itemId ? { ...s, completed: false } : s);
            onUpdateTask({ ...parentTask, subtasks: updatedSubtasks });
          } else if (status !== 'done' && parentTask.status !== status) {
            // For subtasks, dropping into a different incomplete status (todo/in-progress) 
            // updates the PARENT task's status, since subtasks only have a completed boolean.
            // This mimics how subtasks are grouped under the parent's status in the list view.
            onUpdateTask({ ...parentTask, status });
          }
        }
      }
    }
  };

  // Kanban Columns Data
  const kanbanColumns = {
    todo: [
      ...myTasks.filter(t => t.status === 'todo').map(t => ({ ...t, itemType: 'task' as const, pId: t.projectId || 'no-project' })),
      ...mySubtasks.filter(st => !st.completed && st.parentTask.status === 'todo' && !myTasks.some(t => t.id === st.parentTask.id && t.status === 'todo')).map(st => ({ ...st, itemType: 'subtask' as const, pId: st.parentTask.projectId || 'no-project' }))
    ],
    'in-progress': [
      ...myTasks.filter(t => t.status === 'in-progress').map(t => ({ ...t, itemType: 'task' as const, pId: t.projectId || 'no-project' })),
      ...mySubtasks.filter(st => !st.completed && st.parentTask.status === 'in-progress' && !myTasks.some(t => t.id === st.parentTask.id && t.status === 'in-progress')).map(st => ({ ...st, itemType: 'subtask' as const, pId: st.parentTask.projectId || 'no-project' }))
    ],
    done: [
      ...myTasks.filter(t => t.status === 'done').map(t => ({ ...t, itemType: 'task' as const, pId: t.projectId || 'no-project' })),
      ...mySubtasks.filter(st => st.completed && !myTasks.some(t => t.id === st.parentTask.id && t.status === 'done')).map(st => ({ ...st, itemType: 'subtask' as const, pId: st.parentTask.projectId || 'no-project' }))
    ]
  };

  return (
    <div className="flex flex-col h-full bg-[#FBFCFD] overflow-hidden">
      {/* Header */}
      <div className="p-8 pb-4 flex items-center justify-between max-w-7xl w-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <CheckSquare size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">Minhas Tarefas</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle removed per user request */}
          <button
            onClick={() => onCreateTask(undefined, false)}
            className="flex items-center gap-2 bg-[#165DFC] text-white px-4 py-2 rounded-xl hover:bg-[#165DFC]/90 transition-all font-medium shadow-sm"
          >
            <Plus size={18} />
            Nova Tarefa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-12 max-w-7xl w-full pr-[5%]">
        {/* Today's Section - Large Visual Block */}
        <section className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-amber-500 fill-amber-500" />
              <h2 className="text-2xl font-bold">Focar Hoje</h2>
            </div>
            <span className="text-sm text-[var(--muted-foreground)]">{localTodayTasks.length} tarefas para hoje</span>
          </div>

          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}>
            <Reorder.Group axis="y" values={localTodayTasks} onReorder={handleReorderToday} className="col-span-full grid gap-6">
              <AnimatePresence mode="popLayout">
                {localTodayTasks.map(item => (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <TodayTaskCard
                      item={item}
                      project={projects.find(p => p.id === (item.type === 'subtask' ? item.parentTask.projectId : item.projectId))}
                      onClick={() => item.type === 'subtask' ? onTaskClick(item.parentTask, item.id) : onTaskClick(item)}
                      onRemove={() => toggleToday(item)}
                      onUpdate={(updatedItem) => {
                        if (item.type === 'subtask') {
                          const parentTask = item.parentTask as Task;
                          const updatedSubtasks = parentTask.subtasks.map(st =>
                            st.id === item.id ? { ...st, ...updatedItem } : st
                          );
                          onUpdateTask({ ...parentTask, subtasks: updatedSubtasks });
                        } else {
                          onUpdateTask({ ...item, ...updatedItem });
                        }
                      }}
                      viewMode={viewMode}
                      activeTimer={activeTimer}
                      onStartTimer={onStartTimer}
                      onPauseTimer={onPauseTimer}
                      onResumeTimer={onResumeTimer}
                    />
                  </Reorder.Item>
                ))}

                {/* Empty State / Add to Today Placeholder */}
                {localTodayTasks.length === 0 && (
                  <div className="col-span-full border-2 border-dashed border-[var(--border)] rounded-2xl p-12 flex flex-col items-center justify-center text-[var(--muted-foreground)] bg-[var(--muted)]/10 transition-colors hover:bg-[var(--muted)]/20">
                    <Zap size={48} className="mb-4 opacity-20 text-amber-500" />
                    <p className="text-lg font-medium">Nenhuma tarefa marcada para hoje</p>
                    <p className="text-sm">Arraste tarefas para cá ou use o raio para focar nelas.</p>
                  </div>
                )}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        </section>

        {/* List Control Navbar / Separator */}
        <div className="flex items-center justify-between py-5 border-y border-[var(--border)]/60 bg-[var(--muted)]/5 px-2 -mx-2 rounded-lg">
          <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
            <div className="flex bg-[var(--muted)]/50 p-1 rounded-lg border border-[var(--border)]/50 shadow-inner">
              <button
                onClick={() => setTasksViewMode('list')}
                className={cn(
                  "p-1.5 px-3 rounded-md transition-all flex items-center gap-2",
                  tasksViewMode === 'list'
                    ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)] font-semibold border border-[var(--border)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50 border border-transparent'
                )}
                title="Lista"
              >
                <ListIcon size={16} className={tasksViewMode === 'list' ? 'text-[var(--primary)]' : ''} />
                <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline-block">Lista</span>
              </button>
              <button
                onClick={() => setTasksViewMode('kanban')}
                className={cn(
                  "p-1.5 px-3 rounded-md transition-all flex items-center gap-2",
                  tasksViewMode === 'kanban'
                    ? 'bg-[var(--background)] shadow-sm text-[var(--foreground)] font-semibold border border-[var(--border)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50 border border-transparent'
                )}
                title="Kanban"
              >
                <Kanban size={16} className={tasksViewMode === 'kanban' ? 'text-[var(--primary)]' : ''} />
                <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline-block">Kanban</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowOtherTasks(!showOtherTasks)}
            className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 px-4 py-2 rounded-xl border border-transparent hover:border-[var(--primary)]/20 transition-all shadow-sm bg-[var(--background)]"
          >
            {showOtherTasks ? 'Recolher' : 'Expandir'} Lista
            <motion.div
              animate={{ rotate: showOtherTasks ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} />
            </motion.div>
          </button>

          <div className="flex items-center gap-3 px-4 border-l border-[var(--border)]/60">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agrupar Projetos</span>
            <button
              onClick={() => setGroupByProject(!groupByProject)}
              className={cn(
                "relative w-[42px] h-[24px] rounded-full transition-colors duration-300 ease-in-out outline-none shrink-0",
                groupByProject ? "bg-[#165DFC]" : "bg-slate-200"
              )}
            >
              <motion.div
                animate={{ x: groupByProject ? 20 : 2 }}
                className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-md shadow-slate-400"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Other Tasks Sections */}
        {showOtherTasks && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {tasksViewMode === 'kanban' ? (
              <div className="flex gap-8 h-[600px] min-w-max pb-8 overflow-x-auto">
                <KanbanColumn
                  title="A Fazer"
                  status="todo"
                  items={kanbanColumns.todo}
                  projects={projects}
                  onTaskClick={onTaskClick}
                  onUpdateTask={onUpdateTask}
                  color="bg-slate-400"
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  expandedTasks={expandedTasks}
                  toggleTaskExpand={toggleTaskExpand}
                  inlineCreating={inlineCreating}
                  setInlineCreating={setInlineCreating}
                  inlineTitle={inlineTitle}
                  setInlineTitle={setInlineTitle}
                  onInlineSubmit={handleInlineSubmit}
                  groupByProject={groupByProject}
                  toggleToday={toggleToday}
                />
                <KanbanColumn
                  title="Em Andamento"
                  status="in-progress"
                  items={kanbanColumns['in-progress']}
                  projects={projects}
                  onTaskClick={onTaskClick}
                  onUpdateTask={onUpdateTask}
                  color="bg-blue-500"
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  expandedTasks={expandedTasks}
                  toggleTaskExpand={toggleTaskExpand}
                  inlineCreating={inlineCreating}
                  setInlineCreating={setInlineCreating}
                  inlineTitle={inlineTitle}
                  setInlineTitle={setInlineTitle}
                  onInlineSubmit={handleInlineSubmit}
                  groupByProject={groupByProject}
                  toggleToday={toggleToday}
                />
                <KanbanColumn
                  title="Concluído"
                  status="done"
                  items={kanbanColumns.done}
                  projects={projects}
                  onTaskClick={onTaskClick}
                  onUpdateTask={onUpdateTask}
                  color="bg-emerald-500"
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  expandedTasks={expandedTasks}
                  toggleTaskExpand={toggleTaskExpand}
                  showCompletedTasks={showCompletedTasks}
                  setShowCompletedTasks={setShowCompletedTasks}
                  inlineCreating={inlineCreating}
                  setInlineCreating={setInlineCreating}
                  inlineTitle={inlineTitle}
                  setInlineTitle={setInlineTitle}
                  onInlineSubmit={handleInlineSubmit}
                  groupByProject={groupByProject}
                  toggleToday={toggleToday}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-16">
                {/* Group by Status */}
                {['in-progress', 'todo', 'done'].map(status => {
                  const statusTasks = myTasks.filter(t => t.status === status);
                  const statusSubtasks = mySubtasks.filter(st =>
                    !st.completed &&
                    st.parentTask.status === status &&
                    !statusTasks.some(t => t.id === st.parentTask.id)
                  );

                  if (statusTasks.length === 0 && statusSubtasks.length === 0 && inlineCreating !== status) {
                    if (status !== 'todo' && status !== 'in-progress') return null;
                  }

                  // Combine and sort by date
                  const allItems = [
                    ...statusTasks.map(t => ({ ...t, itemType: 'task' as const, pId: t.projectId || 'no-project' })),
                    ...statusSubtasks.map(st => ({ ...st, itemType: 'subtask' as const, pId: st.parentTask.projectId || 'no-project' }))
                  ].sort((a, b) => {
                    const dateA = a.endDate;
                    const dateB = b.endDate;
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return dateA.localeCompare(dateB);
                  });

                  // Group by project if enabled
                  const projectIds = groupByProject ? Array.from(new Set(allItems.map(item => item.pId))) : ['all'];
                  const projectGroups = projectIds.map(pId => {
                    if (pId === 'all') return { project: null, items: allItems };
                    return {
                      project: pId === 'no-project' ? { id: 'no-project', name: 'Sem Projeto', color: '#94a3b8' } : projects.find(p => p.id === pId),
                      items: allItems.filter(item => item.pId === pId)
                    };
                  });

                  return (
                    <section key={status}>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="font-bold text-sm uppercase tracking-[0.1em] flex items-center gap-3">
                          {status === 'todo' ? 'A Fazer' : status === 'in-progress' ? 'Em Andamento' : 'Concluídas'}
                          <span className="text-sm font-bold text-[var(--muted-foreground)] bg-[var(--muted)]/50 px-3 py-1 rounded-full border border-[var(--border)]/50">
                            {allItems.length}
                          </span>
                        </h2>
                      </div>

                      <div className="space-y-8">
                        {inlineCreating === status && (
                          <InlineTaskInput
                            title={inlineTitle}
                            setTitle={setInlineTitle}
                            onSubmit={(title) => handleInlineSubmit(title, status as Task['status'])}
                            onCancel={() => setInlineCreating(null)}
                          />
                        )}

                        {projectGroups.map((group, groupIdx) => (
                          <div key={group.project?.id || groupIdx} className="space-y-4">
                            {groupByProject && group.project && (
                              <div className="flex items-center gap-2.5 px-1 py-1">
                                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: group.project?.color || '#94a3b8' }} />
                                <h4 className="font-black text-[15px] text-[var(--muted-foreground)] uppercase tracking-wide">
                                  {group.project?.name || 'Sem Projeto'}
                                </h4>
                              </div>
                            )}
                            <div className="space-y-3">
                              {group.items.map(item => (
                                <MyTaskListItem
                                  key={item.id}
                                  task={item.itemType === 'subtask' ? (item as any).parentTask : (item as any)}
                                  subtaskOnly={item.itemType === 'subtask' ? item : undefined}
                                  project={projects.find(p => p.id === (item.itemType === 'subtask' ? (item as any).parentTask.projectId : (item as any).projectId))}
                                  onClick={(subtaskId) => {
                                    const taskToClick = item.itemType === 'subtask' ? (item as any).parentTask : item;
                                    onTaskClick(taskToClick, subtaskId);
                                  }}
                                  onUpdateTask={onUpdateTask}
                                  onDeleteTask={onDeleteTask}
                                  onMarkToday={() => toggleToday(item)}
                                  isExpanded={expandedTasks[item.itemType === 'subtask' ? (item as any).parentTask.id : item.id]}
                                  toggleExpand={() => toggleTaskExpand(item.itemType === 'subtask' ? (item as any).parentTask.id : item.id)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}

                        {allItems.length === 0 && !inlineCreating && (
                          <div className="py-12 text-center bg-[var(--muted)]/5 rounded-2xl border border-dashed border-[var(--border)] text-[var(--muted-foreground)] text-sm">
                            Nenhuma tarefa nesta etapa
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MyTaskListItem({ task, project, onClick, onUpdateTask, onDeleteTask, onMarkToday, isExpanded, toggleExpand, subtaskOnly }: {
  task: Task,
  subtaskOnly?: any,
  project?: Project,
  onClick: (subtaskId?: string) => void,
  onUpdateTask: (t: Task) => void,
  onDeleteTask: (taskId: string) => void,
  onMarkToday: () => void,
  isExpanded?: boolean,
  toggleExpand: () => void
}) {
  const status = subtaskOnly ? (subtaskOnly.completed ? 'done' : task.status) : task.status;
  const title = subtaskOnly ? subtaskOnly.title : task.title;

  return (
    <div className="group/task-container bg-[#FFFFFF] border border-[var(--border)] rounded-xl hover:shadow-sm transition-all relative">
      <div
        className="flex items-center gap-4 p-3 cursor-pointer group hover:bg-[var(--muted)]/30"
        onClick={() => onClick(subtaskOnly?.id)}
      >
        {/* Toggle Button (Always visible if has subtasks) */}
        {!subtaskOnly && task.subtasks.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
            className="p-1 hover:bg-[var(--accent)] rounded text-[var(--muted-foreground)] transition-all"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <ChevronRight size={16} />
            </motion.div>
          </button>
        ) : !subtaskOnly && <div className="w-8" />}

        {/* Status Selector / Checkbox */}
        {subtaskOnly ? (
          <input
            type="checkbox"
            checked={subtaskOnly.completed}
            onChange={(e) => {
              e.stopPropagation();
              const updatedSubtasks = task.subtasks.map(s => s.id === subtaskOnly.id ? { ...s, completed: !s.completed } : s);
              onUpdateTask({ ...task, subtasks: updatedSubtasks });
            }}
            className="w-5 h-5 rounded border-[var(--muted-foreground)] text-[var(--primary)] cursor-pointer shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <StatusSelector
            status={task.status}
            onSelect={(status) => onUpdateTask({ ...task, status })}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn("font-medium truncate", status === 'done' && "text-[var(--muted-foreground)]")}>
              {subtaskOnly && <span className="text-[10px] text-[var(--muted-foreground)] mr-1 uppercase font-bold">[SUB]</span>}
              {title}
            </h4>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {project && (
              <span
                className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border flex items-center gap-1.5"
                style={{
                  backgroundColor: `${project?.color}15`,
                  color: project?.color,
                  borderColor: `${project?.color}30`
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project?.color }} />
                {project?.name}
              </span>
            )}
            {!subtaskOnly && task.subtasks.length > 0 && (
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold flex items-center gap-1">
                • <CheckSquare size={10} /> {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div onClick={(e) => e.stopPropagation()}>
            <DateSelector
              date={subtaskOnly ? subtaskOnly.endDate : task.endDate}
              onSelect={(date) => {
                if (subtaskOnly) {
                  const updatedSubtasks = task.subtasks.map(s => s.id === subtaskOnly.id ? { ...s, endDate: date } : s);
                  onUpdateTask({ ...task, subtasks: updatedSubtasks });
                } else {
                  onUpdateTask({ ...task, endDate: date });
                }
              }}
            />
          </div>
          {status !== 'done' && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onMarkToday(); }}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  (subtaskOnly ? subtaskOnly.isToday : task.isToday)
                    ? "bg-amber-100 text-amber-500"
                    : "bg-amber-50/50 text-amber-400 hover:bg-amber-100 hover:text-amber-500 shadow-sm"
                )}
                title="Focar hoje"
              >
                <Zap size={18} fill={(subtaskOnly ? subtaskOnly.isToday : task.isToday) ? "currentColor" : "none"} />
              </button>

              {!subtaskOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta tarefa?')) onDeleteTask(task.id); }}
                  className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/task-container:opacity-100"
                  title="Excluir tarefa"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtasks Expanded */}
      <AnimatePresence>
        {isExpanded && task.subtasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden bg-[var(--muted)]/20 p-3 pl-12 space-y-2 border-t border-[var(--border)] rounded-b-xl"
          >
            {task.subtasks.map(st => (
              <div
                key={st.id}
                className="flex items-center gap-4 p-2 hover:bg-[var(--muted)]/50 rounded-lg group/subtask cursor-pointer transition-colors"
                onClick={(e) => { e.stopPropagation(); onClick(st.id); }}
              >
                <div className="w-5" /> {/* Align with properties logo */}
                <input
                  type="checkbox"
                  checked={st.completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    const updatedSubtasks = task.subtasks.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s);
                    onUpdateTask({ ...task, subtasks: updatedSubtasks });
                  }}
                  className="w-4 h-4 rounded border-[var(--muted-foreground)] text-[var(--primary)] cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={cn("text-sm flex-1 truncate", st.completed && "text-[var(--muted-foreground)]")}>
                  {st.title}
                </span>

                <div onClick={(e) => e.stopPropagation()}>
                  <DateSelector
                    date={st.endDate}
                    onSelect={(date) => {
                      const updatedSubtasks = task.subtasks.map(s => s.id === st.id ? { ...s, endDate: date } : s);
                      onUpdateTask({ ...task, subtasks: updatedSubtasks });
                    }}
                  />
                </div>

                {!st.completed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updatedSubtasks = task.subtasks.map(s => s.id === st.id ? { ...s, isToday: !s.isToday } : s);
                      onUpdateTask({ ...task, subtasks: updatedSubtasks });
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      st.isToday ? "bg-amber-100 text-amber-500" : "opacity-0 group-hover/subtask:opacity-100 text-amber-400 hover:bg-amber-100 hover:text-amber-500"
                    )}
                    title="Focar hoje"
                  >
                    <Zap size={14} fill={st.isToday ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const InlineTaskInput: React.FC<{
  title: string;
  setTitle: (t: string) => void;
  onSubmit: (title: string) => void;
  onCancel: () => void;
  isKanban?: boolean;
}> = ({ title, setTitle, onSubmit, onCancel, isKanban }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit(title);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-[#FFFFFF] border-2 border-[var(--primary)] rounded-xl shadow-md animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSubmit(title)}
        className="flex-1 text-sm font-medium bg-transparent outline-none placeholder:text-[var(--muted-foreground)] focus:ring-0"
        placeholder="Nome da nova tarefa..."
      />
    </div>
  );
};

function TodayTaskCard({ item, project, onClick, onRemove, onUpdate, viewMode, activeTimer, onStartTimer, onPauseTimer, onResumeTimer }: {
  item: any,
  project?: Project,
  onClick: () => void,
  onRemove: () => void,
  onUpdate: (item: any) => void,
  viewMode: 'grid' | 'list',
  activeTimer: ActiveTimer | null,
  onStartTimer: (taskId: string, subtaskId?: string) => void,
  onPauseTimer: () => void,
  onResumeTimer: () => void
}) {
  const isDragging = React.useRef(false);
  const isSubtask = item.type === 'subtask';
  const status = isSubtask ? (item.completed ? 'done' : 'todo') : item.status;
  const title = item.title;
  const endDate = item.endDate;

  const currentTaskId = isSubtask ? item.parentTask.id : item.id;
  const currentSubtaskId = isSubtask ? item.id : undefined;

  const isRunning = activeTimer?.taskId === currentTaskId &&
    activeTimer?.subtaskId === currentSubtaskId &&
    !!activeTimer?.startTime;

  const isPaused = activeTimer?.taskId === currentTaskId &&
    activeTimer?.subtaskId === currentSubtaskId &&
    !activeTimer?.startTime;

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      onPauseTimer();
    } else if (isPaused) {
      onResumeTimer();
    } else {
      onStartTimer(currentTaskId, currentSubtaskId);
    }
  };

  return (
    <div
      className={cn(
        "bg-[#FFFFFF] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden",
        viewMode === 'list' && "flex items-center gap-6 py-4"
      )}
      onPointerDown={() => { isDragging.current = false; }}
      onPointerMove={() => { isDragging.current = true; }}
      onClick={() => { if (!isDragging.current) onClick(); }}
    >
      {/* Project Color Strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: project?.color || '#ccc' }}
      />

      <div className="flex-1 min-w-0 ml-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border shadow-sm flex items-center gap-2"
              style={{
                backgroundColor: `${project?.color}20`,
                color: project?.color,
                borderColor: `${project?.color}40`
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project?.color }} />
              {project?.name || 'Sem Projeto'}
            </span>
            {isSubtask && (
              <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase bg-[var(--muted)]/50 px-2 py-1 rounded">
                Subtarefa
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleTimer}
              className={cn(
                "p-2 rounded-full transition-all",
                (isRunning || isPaused) ? "bg-blue-100 text-blue-600" : "hover:bg-blue-50 text-blue-500"
              )}
              title={isRunning ? "Pausar" : "Iniciar cronômetro"}
            >
              {isRunning ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-2 rounded-full hover:bg-amber-100 text-amber-500 transition-colors"
              title="Remover de hoje"
            >
              <Zap size={22} fill="currentColor" />
            </button>
          </div>
        </div>
        <div className="flex items-start gap-4 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isSubtask) {
                onUpdate({ ...item, completed: true, isToday: false });
              } else {
                onUpdate({ ...item, status: 'done', isToday: false });
              }
            }}
            className="mt-1.5 w-6 h-6 rounded-full border-2 border-[var(--border)] hover:border-emerald-500 hover:bg-emerald-50 transition-all shrink-0 flex items-center justify-center group/check"
            title="Concluir tarefa"
          >
            <CheckCircle2 size={14} className="text-emerald-500 opacity-0 group-hover/check:opacity-100 transition-opacity" />
          </button>
          <h3 className={cn(
            "text-3xl font-bold group-hover:text-[var(--primary)] transition-colors truncate pt-0.5",
            status === 'done' && "text-[var(--muted-foreground)]"
          )}>
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
          {item.timeSpent > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{formatDuration(item.timeSpent)}</span>
            </div>
          )}
          {!isSubtask && item.subtasks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckSquare size={14} />
              <span>{item.subtasks.filter((s: any) => s.completed).length}/{item.subtasks.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const KanbanColumn: React.FC<{
  title: string,
  status: Task['status'],
  items: any[],
  projects: Project[],
  onTaskClick: (t: Task, subtaskId?: string) => void,
  onUpdateTask: (t: Task) => void,
  color: string,
  onDragStart: (e: React.DragEvent, id: string, type: 'task' | 'subtask') => void,
  onDragOver: (e: React.DragEvent) => void,
  onDrop: (e: React.DragEvent, status: Task['status']) => void,
  expandedTasks: Record<string, boolean>,
  toggleTaskExpand: (id: string) => void,
  showCompletedTasks?: boolean,
  setShowCompletedTasks?: (show: boolean) => void,
  inlineCreating: Task['status'] | null,
  setInlineCreating: (val: Task['status'] | null) => void,
  inlineTitle: string,
  setInlineTitle: (val: string) => void,
  onInlineSubmit: (title: string, status: Task['status']) => void,
  groupByProject: boolean,
  toggleToday: (item: any) => void
}> = ({ title, status, items, projects, onTaskClick, onUpdateTask, color, onDragStart, onDragOver, onDrop, expandedTasks, toggleTaskExpand, showCompletedTasks, setShowCompletedTasks, inlineCreating, setInlineCreating, inlineTitle, setInlineTitle, onInlineSubmit, groupByProject, toggleToday }) => {

  const filteredItems = status === 'done' && showCompletedTasks === false ? [] : items;

  filteredItems.sort((a, b) => {
    const dateA = a.endDate;
    const dateB = b.endDate;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.localeCompare(dateB);
  });

  const projectIds = groupByProject ? Array.from(new Set(filteredItems.map(item => item.pId))) : ['all'];
  const projectGroups = projectIds.map(pId => {
    if (pId === 'all') return { project: null, items: filteredItems };
    return {
      project: pId === 'no-project' ? { id: 'no-project', name: 'Sem Projeto', color: '#94a3b8' } : projects.find(p => p.id === pId),
      items: filteredItems.filter(item => item.pId === pId)
    };
  }).filter(group => group.items.length > 0);

  return (
    <div
      className="w-[400px] flex flex-col h-full bg-[#FFFFFF]/60 p-6 rounded-3xl border border-[var(--border)] shadow-sm transition-all"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="flex items-center justify-between mb-5 px-3 py-1">
        <div className="flex items-center gap-3">
          <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color)} />
          <h3 className="font-bold text-sm uppercase tracking-widest font-heading">{title}</h3>
          <span className="text-[10px] font-black text-[var(--muted-foreground)] bg-[var(--muted)]/80 px-2 py-0.5 rounded-full shadow-sm">
            {filteredItems.length}
          </span>
        </div>

        {status === 'done' && setShowCompletedTasks ? (
          <button
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className="text-[var(--muted-foreground)] hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-lg transition-all transform hover:scale-110"
            title={showCompletedTasks ? "Ocultar Concluídas" : "Mostrar Concluídas"}
          >
            {showCompletedTasks ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        ) : (
          <button
            onClick={() => {
              setInlineCreating(status);
              setInlineTitle('');
            }}
            className="text-[var(--muted-foreground)] hover:text-[var(--primary)] p-1.5 hover:bg-[var(--primary)]/10 rounded-lg transition-all transform hover:scale-110"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pb-6 px-1 custom-scrollbar">
        {projectGroups.map(({ project, items }) => (
          <div key={project?.id || 'all'} className="space-y-3">
            {groupByProject && project && (
              <div className="flex items-center gap-2.5 px-2 py-1">
                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: project.color || '#94a3b8' }} />
                <span className="text-[14px] font-black text-[var(--muted-foreground)] uppercase tracking-wide">{project.name || 'Sem Projeto'}</span>
              </div>
            )}

            <div className="space-y-3">
              {items.map(item => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  project={project || projects.find(p => p.id === item.pId)}
                  onTaskClick={(subtaskId) => {
                    const taskToClick = item.itemType === 'subtask' ? item.parentTask : item;
                    onTaskClick(taskToClick, subtaskId);
                  }}
                  onUpdateTask={onUpdateTask}
                  onDragStart={onDragStart}
                  expandedTasks={expandedTasks}
                  toggleTaskExpand={toggleTaskExpand}
                  toggleToday={() => toggleToday(item)}
                  groupByProject={groupByProject}
                />
              ))}
            </div>
          </div>
        ))}

        {inlineCreating === status && (
          <div className="mt-2 px-1">
            <InlineTaskInput
              title={inlineTitle}
              setTitle={setInlineTitle}
              onSubmit={(title) => onInlineSubmit(title, status)}
              onCancel={() => setInlineCreating(null)}
              isKanban
            />
          </div>
        )}

        {filteredItems.length === 0 && !inlineCreating && (
          <div className="text-center py-12 text-[var(--muted-foreground)] text-[10px] font-bold uppercase tracking-widest opacity-40 border-2 border-dashed border-[var(--border)] rounded-2xl mx-2">
            {status === 'done' && showCompletedTasks === false
              ? "Tarefas ocultas"
              : "Vazio"}
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanCard: React.FC<{
  item: any,
  project?: any,
  onTaskClick: (subtaskId?: string) => void,
  onUpdateTask: (t: Task) => void,
  onDragStart: (e: React.DragEvent, id: string, type: 'task' | 'subtask') => void,
  expandedTasks: Record<string, boolean>,
  toggleTaskExpand: (id: string) => void,
  toggleToday: () => void,
  groupByProject: boolean
}> = ({ item, project, onTaskClick, onUpdateTask, onDragStart, expandedTasks, toggleTaskExpand, toggleToday, groupByProject }) => {
  const isSubtask = item.itemType === 'subtask';
  const task = isSubtask ? item.parentTask : item;
  const status = isSubtask ? (item.completed ? 'done' : 'todo') : item.status;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);

  const saveTitle = () => {
    if (editedTitle.trim() && editedTitle !== item.title) {
      if (isSubtask) {
        const updatedSubtasks = task.subtasks.map((s: any) => s.id === item.id ? { ...s, title: editedTitle } : s);
        onUpdateTask({ ...task, subtasks: updatedSubtasks });
      } else {
        onUpdateTask({ ...task, title: editedTitle });
      }
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id, item.itemType)}
      onClick={() => onTaskClick(isSubtask ? item.id : undefined)}
      className="bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-xl hover:border-[var(--primary)]/30 transition-all cursor-pointer group active:cursor-grabbing active:scale-95"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-1.5">
          {isSubtask ? (
            <input
              type="checkbox"
              checked={item.completed}
              onChange={(e) => {
                e.stopPropagation();
                const updatedSubtasks = task.subtasks.map((s: any) => s.id === item.id ? { ...s, completed: !s.completed } : s);
                onUpdateTask({ ...task, subtasks: updatedSubtasks });
              }}
              className="w-4 h-4 rounded border-[var(--muted-foreground)] text-[var(--primary)] cursor-pointer focus:ring-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <StatusSelector
              status={task.status}
              onSelect={(status) => onUpdateTask({ ...task, status })}
              compact
            />
          )}

          {!groupByProject && project && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border flex items-center gap-1.5 ml-1"
              style={{
                backgroundColor: `${project?.color}15`,
                color: project?.color,
                borderColor: `${project?.color}30`
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project?.color }} />
              <span className="truncate max-w-[80px]">{project?.name}</span>
            </span>
          )}

          {isSubtask && (
            <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase bg-[var(--muted)]/50 px-1.5 py-0.5 rounded ml-1">
              Sub
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {item.priority && item.priority !== 'none' && !isSubtask && (
            <Badge variant={
              item.priority === 'high' ? 'danger' :
                item.priority === 'medium' ? 'warning' : 'secondary'
            } className="text-[9px] font-bold px-2 py-0 uppercase">
              {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          )}
          {status !== 'done' && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleToday(); }}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                item.isToday ? "bg-amber-100 text-amber-500" : "opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:bg-amber-100/50 hover:text-amber-500"
              )}
              title="Focar hoje"
            >
              <Zap size={14} fill={item.isToday ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>

      <div className="group/title flex items-start gap-2 mb-4">
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-sm bg-transparent border-b-2 border-[var(--primary)] outline-none w-full"
          />
        ) : (
          <div className="flex items-start gap-2 w-full">
            <h4 className={cn("font-bold text-sm line-clamp-2 flex-1 leading-snug", status === 'done' && "text-[var(--muted-foreground)] line-through opacity-60")}>{item.title}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
              className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-[var(--accent)] rounded-lg text-[var(--muted-foreground)] transition-all"
            >
              <Pencil size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--muted-foreground)]">
          <DateSelector
            date={item.endDate}
            onSelect={(date) => {
              if (isSubtask) {
                const updatedSubtasks = task.subtasks.map((s: any) => s.id === item.id ? { ...s, endDate: date } : s);
                onUpdateTask({ ...task, subtasks: updatedSubtasks });
              } else {
                onUpdateTask({ ...task, endDate: date });
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {!isSubtask && item.subtasks && item.subtasks.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--muted-foreground)] mr-1">
              <CheckSquare size={10} />
              {item.subtasks.filter((s: any) => s.completed).length}/{item.subtasks.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
