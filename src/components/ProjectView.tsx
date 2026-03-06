import React, { useState, useRef, useEffect } from 'react';
import { Project, Task, User, ViewMode, Subtask } from '@/lib/store';
import { Button, Badge, AssigneeSelector, StatusSelector } from './ui-elements';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import {
  List,
  Kanban,
  BarChart3,
  Plus,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  LayoutDashboard as LayoutDashboardIcon
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { DateSelector } from './DateSelector';
import { GanttChart } from './GanttChart';

interface ProjectViewProps {
  projects: Project[];
  activeProjectId: string | null;
  tasks: Task[];
  users: User[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onUpdateTask: (task: Task) => void;
  onCreateTask: (projectId?: string, isToday?: boolean) => void;
  onTaskClick: (task: Task, subtaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditProject: (project: Project) => void;
  onSaveNewTask: (task: Task) => Promise<void>;
}

export function ProjectView({
  projects,
  activeProjectId,
  tasks,
  users,
  viewMode,
  setViewMode,
  onUpdateTask,
  onCreateTask,
  onTaskClick,
  onDeleteTask,
  onEditProject,
  onSaveNewTask
}: ProjectViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(true);
  const [inlineCreating, setInlineCreating] = useState<{ projectId?: string, status: Task['status'] } | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;

  // Filter tasks excluding deleted ones
  const visibleTasks = tasks.filter(t => !t.deletedAt);

  const filteredTasks = visibleTasks.filter(t => {
    if (activeProjectId && t.projectId !== activeProjectId) return false;
    return true;
  });

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Kanban Columns
  const columns = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== status) {
      onUpdateTask({ ...task, status });
    }
  };

  const handleInlineSubmit = async (title: string, projectId: string, status: Task['status']) => {
    if (!title.trim()) {
      setInlineCreating(null);
      return;
    }

    const tempTask: Task = {
      id: uuidv4(),
      title: title.trim(),
      projectId: projectId === 'no-project' ? undefined : projectId,
      status: status,
      priority: 'none',
      subtasks: [],
      timeSpent: 0,
      createdAt: new Date().toISOString(),
      isToday: false,
    };

    await onSaveNewTask(tempTask);
    setInlineCreating(null);
    setInlineTitle('');
  };

  return (
    <div className="flex-1 h-screen flex flex-col bg-[var(--background)] overflow-hidden">
      {/* Header */}
      <header className="px-8 py-6 border-b border-[var(--border)] flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              {activeProject ? (
                <>
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: activeProject.color }} />
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {activeProject.name}
                  </h1>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-indigo-600">
                    <LayoutDashboardIcon size={20} />
                  </div>
                  <h1 className="text-2xl font-bold font-heading">Visão Geral</h1>
                </>
              )}
            </div>

            {/* Project Deadline Display */}
            {activeProject && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest mb-1.5 opacity-80">
                  Prazo Final do Projeto
                </span>
                <button
                  onClick={() => onEditProject(activeProject)}
                  className="flex items-center gap-2.5 text-sm font-semibold border border-[var(--border)] rounded-xl px-4 py-2 bg-[var(--background)] shadow-sm hover:shadow-md hover:bg-[var(--accent)] hover:border-[var(--primary)] transition-all"
                >
                  <CalendarIcon size={16} className="text-[var(--primary)]" />
                  <span>
                    {activeProject.deadline
                      ? formatRelativeDate(activeProject.deadline)
                      : "Definir data final"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="px-8 py-4 border-b border-[var(--border)] flex items-center gap-6 overflow-x-auto bg-[#FBFCFD]/50 backdrop-blur-sm">
        <Button
          onClick={() => onCreateTask(activeProjectId || undefined)}
          className="gap-2 h-9 px-5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md hover:shadow-lg transition-all rounded-xl"
        >
          <Plus size={18} /> Nova Tarefa
        </Button>

        <div className="h-6 w-px bg-[var(--border)]" />

        <div className="flex bg-[var(--muted)]/50 p-1.5 rounded-xl border border-[var(--border)]/50 shadow-inner">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 px-3 rounded-lg transition-all flex items-center gap-2",
              viewMode === 'list'
                ? 'bg-[var(--background)] shadow-md text-[var(--foreground)] font-semibold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50'
            )}
            title="Lista"
          >
            <List size={18} />
            {viewMode === 'list' && <span className="text-xs">Lista</span>}
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              "p-2 px-3 rounded-lg transition-all flex items-center gap-2",
              viewMode === 'kanban'
                ? 'bg-[var(--background)] shadow-md text-[var(--foreground)] font-semibold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50'
            )}
            title="Kanban"
          >
            <Kanban size={18} />
            {viewMode === 'kanban' && <span className="text-xs">Kanban</span>}
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={cn(
              "p-2 px-3 rounded-lg transition-all flex items-center gap-2",
              viewMode === 'gantt'
                ? 'bg-[var(--background)] shadow-md text-[var(--foreground)] font-semibold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]/50'
            )}
            title="Gantt"
          >
            <BarChart3 size={18} />
            {viewMode === 'gantt' && <span className="text-xs">Gantt</span>}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={cn(
        "flex-1 overflow-auto bg-[var(--accent)]/30",
        viewMode !== 'gantt' && "px-8 pb-8 pr-[5%]"
      )}>
        {viewMode === 'list' && (
          <div className="space-y-12 pt-10">
            {['in-progress', 'todo', 'done'].map(status => {
              const statusTasks = filteredTasks.filter(t => t.status === status);
              if (statusTasks.length === 0 && !activeProjectId) return null;

              return (
                <div key={status} className="space-y-6">
                  <div className="flex items-center gap-3 mb-3 group/status-header">
                    <h3 className="font-bold text-sm uppercase tracking-[0.1em] flex items-center gap-2 font-heading">
                      {status === 'todo' ? 'A Fazer' : status === 'in-progress' ? 'Em Andamento' : 'Concluído'}
                    </h3>
                    <span className="text-xs font-bold text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-full shadow-sm">
                      {statusTasks.length}
                    </span>
                    <button
                      onClick={() => setInlineCreating({ status: status as Task['status'], projectId: activeProjectId || undefined })}
                      className="p-1.5 hover:bg-[var(--accent)] rounded-full text-[var(--muted-foreground)] hover:text-blue-500 transition-all opacity-0 group-hover/status-header:opacity-100 shadow-sm border border-transparent hover:border-[var(--border)]"
                      title="Nova tarefa nesta etapa"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Inline creation at the TOP of the status group */}
                    {inlineCreating?.status === status && !inlineCreating?.projectId && !activeProjectId && (
                      <div className="mb-4">
                        <InlineTaskInput
                          title={inlineTitle}
                          setTitle={setInlineTitle}
                          onSubmit={(title) => handleInlineSubmit(title, 'no-project', status as Task['status'])}
                          onCancel={() => setInlineCreating(null)}
                        />
                      </div>
                    )}

                    {inlineCreating?.status === status && (activeProjectId || inlineCreating?.projectId === activeProjectId) && (
                      <div className="mb-4">
                        <InlineTaskInput
                          title={inlineTitle}
                          setTitle={setInlineTitle}
                          onSubmit={(title) => handleInlineSubmit(title, activeProjectId || 'no-project', status as Task['status'])}
                          onCancel={() => setInlineCreating(null)}
                        />
                      </div>
                    )}

                    {projects.map(project => {
                      const projectTasks = statusTasks.filter(t => t.projectId === project.id);
                      if (projectTasks.length === 0) return null;

                      return (
                        <div key={project.id} className="space-y-3">
                          {!activeProjectId && (
                            <div className="flex items-center gap-2.5 px-1 py-1">
                              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: project.color }} />
                              <h4 className="font-black text-[15px] text-[var(--muted-foreground)] uppercase tracking-wide">{project.name}</h4>
                            </div>
                          )}
                          <div className="space-y-2">
                            {projectTasks.map(task => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                users={users}
                                onClick={(subtaskId) => onTaskClick(task, subtaskId)}
                                onUpdateTask={onUpdateTask}
                                onDeleteTask={onDeleteTask}
                                isExpanded={expandedTasks[task.id]}
                                toggleExpand={() => toggleTaskExpand(task.id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {!activeProjectId && (() => {
                      const noProjectTasks = statusTasks.filter(t => !t.projectId);
                      if (noProjectTasks.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2.5 px-1 py-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm" />
                            <h4 className="font-black text-[15px] text-[var(--muted-foreground)] uppercase tracking-wide">Sem Projeto</h4>
                          </div>
                          <div className="space-y-2">
                            {noProjectTasks.map(task => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                users={users}
                                onClick={(subtaskId) => onTaskClick(task, subtaskId)}
                                onUpdateTask={onUpdateTask}
                                onDeleteTask={onDeleteTask}
                                isExpanded={expandedTasks[task.id]}
                                toggleExpand={() => toggleTaskExpand(task.id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="text-center py-32 bg-[var(--background)]/50 rounded-3xl border-2 border-dashed border-[var(--border)]">
                <div className="w-16 h-16 bg-[var(--muted)]/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[var(--muted-foreground)]">
                  <List size={32} />
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-1">Nenhuma tarefa aqui</h3>
                <p className="text-[var(--muted-foreground)]">Crie uma nova tarefa para começar a organizar seu trabalho.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'kanban' && (
          <div className="flex gap-8 h-full min-w-max">
            <KanbanColumn
              title="A Fazer"
              status="todo"
              tasks={columns.todo}
              users={users}
              projects={projects}
              onTaskClick={onTaskClick}
              onUpdateTask={onUpdateTask}
              onCreateTask={() => onCreateTask(activeProjectId || undefined)}
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
              activeProjectId={activeProjectId}
            />
            <KanbanColumn
              title="Em Andamento"
              status="in-progress"
              tasks={columns['in-progress']}
              users={users}
              projects={projects}
              onTaskClick={onTaskClick}
              onUpdateTask={onUpdateTask}
              onCreateTask={() => onCreateTask(activeProjectId || undefined)}
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
              activeProjectId={activeProjectId}
            />
            <KanbanColumn
              title="Concluído"
              status="done"
              tasks={columns.done}
              users={users}
              projects={projects}
              onTaskClick={onTaskClick}
              onUpdateTask={onUpdateTask}
              onCreateTask={() => onCreateTask(activeProjectId || undefined)}
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
              activeProjectId={activeProjectId}
            />
          </div>
        )}

        {viewMode === 'gantt' && (
          <GanttChart
            tasks={filteredTasks}
            projects={projects}
            onTaskClick={onTaskClick}
            onUpdateTask={onUpdateTask}
            users={users}
          />
        )}
      </div>
    </div>
  );
}

const TaskRow: React.FC<{
  task: Task,
  users: User[],
  onClick: (subtaskId?: string) => void,
  onUpdateTask: (t: Task) => void,
  onDeleteTask: (id: string) => void,
  isExpanded: boolean,
  toggleExpand: () => void
}> = ({ task, users, onClick, onUpdateTask, onDeleteTask, isExpanded, toggleExpand }) => {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const handleAddSubtask = () => {
    const newSubtask: Subtask = {
      id: uuidv4(),
      title: 'Nova Subtarefa',
      completed: false,
      timeSpent: 0
    };
    onUpdateTask({ ...task, subtasks: [...task.subtasks, newSubtask] });
  };

  const handleUpdateSubtask = (subtask: Subtask) => {
    const updatedSubtasks = task.subtasks.map(s => s.id === subtask.id ? subtask : s);
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.filter(s => s.id !== subtaskId);
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };

  const saveTitle = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdateTask({ ...task, title: editedTitle });
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="group bg-[var(--background)] border border-[var(--border)] rounded-xl hover:shadow-lg hover:border-[var(--primary)]/30 transition-all">
      <div
        onClick={() => onClick()}
        className="flex items-center gap-4 p-3.5 cursor-pointer"
      >
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
          className="p-1.5 hover:bg-[var(--accent)] rounded-lg text-[var(--muted-foreground)] transition-colors"
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <StatusSelector
          status={task.status}
          onSelect={(status) => onUpdateTask({ ...task, status })}
        />

        <div className="flex-1 min-w-0 group/title flex items-center gap-3">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="font-semibold bg-transparent border-b-2 border-[var(--primary)] outline-none w-full py-0.5"
            />
          ) : (
            <div className="flex items-center gap-2.5 w-full">
              <h4 className={cn("font-semibold truncate text-[15px]", task.status === 'done' && "text-[var(--muted-foreground)] line-through opacity-60")}>
                {task.title}
              </h4>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                className="opacity-0 group-hover/title:opacity-100 p-1.5 hover:bg-[var(--accent)] rounded-lg text-[var(--muted-foreground)] transition-all transform hover:scale-110"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          <DateSelector
            date={task.endDate}
            onSelect={(date) => onUpdateTask({ ...task, endDate: date })}
          />

          <AssigneeSelector
            assigneeId={task.assigneeId}
            users={users}
            onSelect={(userId) => onUpdateTask({ ...task, assigneeId: userId })}
          />

          {task.priority !== 'none' && (
            <Badge variant={
              task.priority === 'high' ? 'danger' :
                task.priority === 'medium' ? 'warning' : 'secondary'
            } className="font-bold tracking-wide uppercase text-[10px] px-2.5">
              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          )}

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(!showOptionsMenu); }}
              className="p-1.5 hover:bg-[var(--accent)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
            {showOptionsMenu && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); setShowOptionsMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 size={15} /> Excluir Tarefa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--border)] bg-[var(--muted)]/10 p-4 pl-14 space-y-3 rounded-b-xl">
          {task.subtasks.map(subtask => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              users={users}
              onUpdate={handleUpdateSubtask}
              onDelete={handleDeleteSubtask}
              onClick={() => onClick(subtask.id)}
            />
          ))}

          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleAddSubtask(); }} className="text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-blue-50/50 pl-0 h-9 font-bold text-xs transition-colors mt-1">
            <Plus size={16} className="mr-1.5" /> Adicionar Subtarefa
          </Button>
        </div>
      )}
    </div>
  );
};

const SubtaskRow: React.FC<{
  subtask: Subtask,
  users: User[],
  onUpdate: (s: Subtask) => void,
  onDelete: (id: string) => void,
  onClick: () => void
}> = ({ subtask, users, onUpdate, onDelete, onClick }) => {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(subtask.title);

  const saveTitle = () => {
    if (editedTitle.trim() && editedTitle !== subtask.title) {
      onUpdate({ ...subtask, title: editedTitle });
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center gap-4 text-sm group/subtask hover:bg-[var(--accent)]/50 p-2 rounded-xl transition-all -ml-2">
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={() => onUpdate({ ...subtask, completed: !subtask.completed })}
        className="w-4 h-4 rounded-md border-[var(--muted-foreground)] text-[var(--primary)] cursor-pointer focus:ring-[var(--primary)]"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="flex-1 min-w-0 flex items-center gap-3 group/title">
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="font-medium bg-transparent border-b border-[var(--primary)] outline-none w-full text-sm py-0.5"
          />
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <span
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className={cn("truncate cursor-pointer hover:underline font-medium", subtask.completed && "text-[var(--muted-foreground)] line-through opacity-60")}
            >
              {subtask.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
              className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-[var(--accent)] rounded-lg text-[var(--muted-foreground)] transition-all"
            >
              <Pencil size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 opacity-70 group-hover/subtask:opacity-100 transition-opacity">
        <DateSelector
          date={subtask.endDate}
          onSelect={(date) => onUpdate({ ...subtask, endDate: date })}
        />

        <AssigneeSelector
          assigneeId={subtask.assigneeId}
          users={users}
          onSelect={(userId) => onUpdate({ ...subtask, assigneeId: userId })}
        />

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(!showOptionsMenu); }}
            className="p-1.5 hover:bg-[var(--accent)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] opacity-0 group-hover/subtask:opacity-100 transition-all"
          >
            <MoreHorizontal size={16} />
          </button>
          {showOptionsMenu && (
            <div className="absolute top-full right-0 mt-2 w-36 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(subtask.id); setShowOptionsMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors"
              >
                <Trash2 size={15} /> Excluir
              </button>
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
  tasks: Task[],
  users: User[],
  projects: Project[],
  onTaskClick: (t: Task) => void,
  onUpdateTask: (t: Task) => void,
  onCreateTask: () => void,
  color: string,
  onDragStart: (e: React.DragEvent, id: string) => void,
  onDragOver: (e: React.DragEvent) => void,
  onDrop: (e: React.DragEvent, status: Task['status']) => void,
  expandedTasks: Record<string, boolean>,
  toggleTaskExpand: (id: string) => void,
  showCompletedTasks?: boolean,
  setShowCompletedTasks?: (show: boolean) => void,
  inlineCreating: { projectId?: string, status: Task['status'] } | null,
  setInlineCreating: (val: { projectId?: string, status: Task['status'] } | null) => void,
  inlineTitle: string,
  setInlineTitle: (val: string) => void,
  onInlineSubmit: (title: string, projectId: string, status: Task['status']) => void,
  activeProjectId: string | null
}> = ({ title, status, tasks, users, projects, onTaskClick, onUpdateTask, onCreateTask, color, onDragStart, onDragOver, onDrop, expandedTasks, toggleTaskExpand, showCompletedTasks, setShowCompletedTasks, inlineCreating, setInlineCreating, inlineTitle, setInlineTitle, onInlineSubmit, activeProjectId }) => {

  const filteredTasks = status === 'done' && showCompletedTasks === false ? [] : tasks;

  const tasksByProject = projects.map(p => ({
    project: p,
    tasks: filteredTasks.filter(t => t.projectId === p.id)
  })).filter(g => g.tasks.length > 0);

  const tasksWithoutProject = filteredTasks.filter(t => !t.projectId);
  if (tasksWithoutProject.length > 0) {
    tasksByProject.push({
      project: { id: 'no-project', name: 'Sem Projeto', color: '#94a3b8' } as Project,
      tasks: tasksWithoutProject
    });
  }

  return (
    <div
      className="w-[400px] flex flex-col h-full bg-[var(--background)]/20 p-6 rounded-3xl border border-[var(--border)]/30 shadow-sm transition-all"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="flex items-center justify-between mb-5 px-3 py-1">
        <div className="flex items-center gap-3">
          <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color)} />
          <h3 className="font-bold text-sm uppercase tracking-widest font-heading">{title}</h3>
          <span className="text-[10px] font-black text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full shadow-sm">
            {filteredTasks.length}
          </span>
        </div>

        {status === 'done' && setShowCompletedTasks ? (
          <button
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className="text-[var(--muted-foreground)] hover:text-blue-500 p-1.5 hover:bg-[var(--accent)] rounded-lg transition-all transform hover:scale-110"
            title={showCompletedTasks ? "Ocultar Concluídas" : "Mostrar Concluídas"}
          >
            {showCompletedTasks ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        ) : (
          <button
            onClick={() => {
              setInlineCreating({ status: status as Task['status'], projectId: activeProjectId || projects[0]?.id });
              setInlineTitle('');
            }}
            className="text-[var(--muted-foreground)] hover:text-blue-500 p-1.5 hover:bg-[var(--accent)] rounded-lg transition-all transform hover:scale-110"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pb-6 px-1">
        {tasksByProject.map(({ project, tasks }) => (
          <div key={project.id} className="space-y-3">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: project.color }} />
              <span className="text-[14px] font-black text-[var(--muted-foreground)] uppercase tracking-wide">{project.name}</span>
            </div>

            <div className="space-y-3">
              {tasks.map(task => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  users={users}
                  onTaskClick={onTaskClick}
                  onUpdateTask={onUpdateTask}
                  onDragStart={onDragStart}
                  expandedTasks={expandedTasks}
                  toggleTaskExpand={toggleTaskExpand}
                />
              ))}
            </div>
          </div>
        ))}

        {inlineCreating?.status === status && (
          <div className="mt-2 px-1">
            <InlineTaskInput
              title={inlineTitle}
              setTitle={setInlineTitle}
              onSubmit={(title) => {
                const projId = activeProjectId || inlineCreating.projectId || projects[0]?.id || 'no-project';
                onInlineSubmit(title, projId, status as Task['status']);
              }}
              onCancel={() => setInlineCreating(null)}
              isKanban
            />
          </div>
        )}

        {filteredTasks.length === 0 && !inlineCreating && (
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
  task: Task,
  users: User[],
  onTaskClick: (t: Task) => void,
  onUpdateTask: (t: Task) => void,
  onDragStart: (e: React.DragEvent, id: string) => void,
  expandedTasks: Record<string, boolean>,
  toggleTaskExpand: (id: string) => void
}> = ({ task, users, onTaskClick, onUpdateTask, onDragStart, expandedTasks, toggleTaskExpand }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const saveTitle = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdateTask({ ...task, title: editedTitle });
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onTaskClick(task)}
      className="bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-xl hover:border-[var(--primary)]/30 transition-all cursor-pointer group active:cursor-grabbing active:scale-95"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-1.5">
          <StatusSelector
            status={task.status}
            onSelect={(status) => onUpdateTask({ ...task, status })}
            compact
          />
        </div>
        {task.priority !== 'none' && (
          <Badge variant={
            task.priority === 'high' ? 'danger' :
              task.priority === 'medium' ? 'warning' : 'secondary'
          } className="text-[9px] font-bold px-2 py-0 uppercase">
            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
          </Badge>
        )}
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
            <h4 className={cn("font-bold text-sm line-clamp-2 flex-1 leading-snug", task.status === 'done' && "text-[var(--muted-foreground)] line-through opacity-60")}>{task.title}</h4>
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
            date={task.endDate}
            onSelect={(date) => onUpdateTask({ ...task, endDate: date })}
          />
        </div>

        <div className="flex items-center gap-2">
          {task.subtasks.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--muted-foreground)] mr-1">
              <List size={10} />
              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
            </div>
          )}

          <AssigneeSelector
            assigneeId={task.assigneeId}
            users={users}
            onSelect={(userId) => onUpdateTask({ ...task, assigneeId: userId })}
          />
        </div>
      </div>
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit(title);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (isKanban) {
    return (
      <div className="bg-[var(--background)] p-4 rounded-2xl border-2 border-[var(--primary)] shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onSubmit(title)}
          className="w-full text-sm font-bold bg-transparent outline-none placeholder:text-[var(--muted-foreground)] focus:ring-0"
          placeholder="Nome da nova tarefa..."
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--background)] border-2 border-[var(--primary)] rounded-xl shadow-xl animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="w-5 h-5 rounded-full border-2 border-[var(--primary)] shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSubmit(title)}
        className="flex-1 text-sm font-bold bg-transparent outline-none placeholder:text-[var(--muted-foreground)] focus:ring-0"
        placeholder="Nome da nova tarefa..."
      />
    </div>
  );
};
