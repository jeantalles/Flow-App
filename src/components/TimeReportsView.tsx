import React, { useState } from 'react';
import { Project, Task, User, Subtask } from '@/lib/store';
import { formatDuration, cn } from '@/lib/utils';
import { PieChart, Clock, Calendar, BarChart, ArrowUpRight } from 'lucide-react';

interface TimeReportsViewProps {
  projects: Project[];
  tasks: Task[];
  users: User[];
  onUpdateTask: (task: Task) => void;
  onTaskClick?: (task: Task, subtaskId?: string) => void;
  onProjectClick?: (projectId: string) => void;
}

export function TimeReportsView({ projects, tasks, users, onUpdateTask, onTaskClick, onProjectClick }: TimeReportsViewProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');

  // Flatten tasks and subtasks for calculations
  const allTimeEntries = [
    ...tasks.map(t => ({
      id: t.id,
      title: t.title,
      timeSpent: t.timeSpent,
      projectId: t.projectId,
      isSubtask: false,
      parentTask: t,
      subtask: undefined,
      deletedAt: t.deletedAt
    })),
    ...tasks.flatMap(t => t.subtasks.map(st => ({
      id: st.id,
      title: `${t.title} / ${st.title}`,
      timeSpent: st.timeSpent,
      projectId: t.projectId,
      isSubtask: true,
      parentTask: t,
      subtask: st,
      deletedAt: t.deletedAt
    })))
  ].filter(entry => !entry.deletedAt);

  // Calculate hierarchical stats
  const hierarchicalTimeByProject = projects.map(project => {
    const projectTasks = tasks.filter(t => t.projectId === project.id && !t.deletedAt);
    const projectTime = projectTasks.reduce((acc, t) => acc + t.timeSpent + t.subtasks.reduce((sAcc, st) => sAcc + st.timeSpent, 0), 0);

    const taskGroups = projectTasks.map(t => {
      const taskTime = t.timeSpent;
      const subtasksTime = t.subtasks.reduce((acc, st) => acc + st.timeSpent, 0);
      const totalTaskTime = taskTime + subtasksTime;

      return {
        task: t,
        taskTime,
        subtasksTime,
        totalTaskTime,
        subtasks: t.subtasks.filter(st => st.timeSpent >= 0) // Show all subtasks if task has time
      };
    }).filter(g => g.totalTaskTime > 0).sort((a, b) => b.totalTaskTime - a.totalTaskTime);

    return {
      ...project,
      time: projectTime,
      groups: taskGroups
    };
  }).filter(p => p.time > 0);

  // Add "No Project" virtual project if there are tasks without project that have time spent
  const tasksWithoutProject = tasks.filter(t => !t.projectId && !t.deletedAt);
  const noProjectTime = tasksWithoutProject.reduce((acc, t) => acc + t.timeSpent + t.subtasks.reduce((sAcc, st) => sAcc + st.timeSpent, 0), 0);

  if (noProjectTime > 0) {
    const taskGroups = tasksWithoutProject.map(t => {
      const taskTime = t.timeSpent;
      const subtasksTime = t.subtasks.reduce((acc, st) => acc + st.timeSpent, 0);
      const totalTaskTime = taskTime + subtasksTime;

      return {
        task: t,
        taskTime,
        subtasksTime,
        totalTaskTime,
        subtasks: t.subtasks.filter(st => st.timeSpent >= 0)
      };
    }).filter(g => g.totalTaskTime > 0).sort((a, b) => b.totalTaskTime - a.totalTaskTime);

    hierarchicalTimeByProject.push({
      id: 'no-project',
      name: 'Sem Projeto',
      color: '#94a3b8',
      time: noProjectTime,
      groups: taskGroups
    } as any);
  }

  // Final sort by time
  hierarchicalTimeByProject.sort((a, b) => b.time - a.time);

  const startEditing = (id: string, currentTime: number) => {
    setEditingItemId(id);
    const hours = Math.floor(currentTime / 3600);
    const minutes = Math.floor((currentTime % 3600) / 60);
    setEditTimeValue(`${hours}:${minutes.toString().padStart(2, '0')}`);
  };

  const saveTime = (task: Task, subtask?: Subtask) => {
    const [hours, minutes] = editTimeValue.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const totalSeconds = (hours * 3600) + (minutes * 60);

      if (subtask) {
        const updatedSubtasks = task.subtasks.map(st =>
          st.id === subtask.id ? { ...st, timeSpent: totalSeconds } : st
        );
        onUpdateTask({ ...task, subtasks: updatedSubtasks });
      } else {
        onUpdateTask({ ...task, timeSpent: totalSeconds });
      }
    }
    setEditingItemId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] p-8 overflow-hidden">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Clock size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Uso do Tempo</h1>
          <p className="text-[var(--muted-foreground)]">Mapeamento detalhado de horas por projeto, tarefa e subtarefa</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-8">
          {hierarchicalTimeByProject.map(project => (
            <div key={project.id} className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
              <div className="p-5 bg-[var(--muted)]/30 border-b border-[var(--border)] flex justify-between items-center">
                <div
                  className={cn(
                    "flex items-center gap-3",
                    onProjectClick && project.id !== 'no-project' && "cursor-pointer group/project-title"
                  )}
                  onClick={() => onProjectClick && project.id !== 'no-project' && onProjectClick(project.id)}
                >
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: project.color }} />
                  <h3 className={cn(
                    "font-bold text-xl",
                    onProjectClick && project.id !== 'no-project' && "group-hover/project-title:text-[var(--primary)] transition-colors underline-offset-4 group-hover/project-title:underline"
                  )}>
                    {project.name}
                  </h3>
                  {onProjectClick && project.id !== 'no-project' && <ArrowUpRight size={18} className="opacity-0 group-hover/project-title:opacity-100 transition-all text-[var(--primary)]" />}
                </div>
                <div className="font-mono font-bold text-xl text-[var(--primary)]">
                  {formatDuration(project.time)}
                </div>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {project.groups.map(group => (
                  <div key={group.task.id} className="flex flex-col">
                    {/* Task Row */}
                    <div className="p-4 flex items-center justify-between hover:bg-[var(--accent)]/10 transition-colors">
                      <div
                        className={cn(
                          "flex-1 min-w-0 pr-4",
                          onTaskClick && "cursor-pointer group/task-title"
                        )}
                        onClick={() => onTaskClick && onTaskClick(group.task)}
                      >
                        <div className={cn(
                          "font-bold text-base truncate",
                          onTaskClick && "group-hover/task-title:text-[var(--primary)] transition-colors underline-offset-4 group-hover/task-title:underline"
                        )}>
                          {group.task.title}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Tarefa Principal</div>
                      </div>

                      <div className="flex items-center gap-4">
                        {editingItemId === group.task.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editTimeValue}
                              onChange={(e) => setEditTimeValue(e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--background)] font-mono"
                              placeholder="HH:MM"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && saveTime(group.task)}
                              onBlur={() => saveTime(group.task)}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(group.task.id, group.taskTime)}
                            className="font-mono text-sm bg-[var(--muted)] px-3 py-1 rounded hover:bg-[var(--accent)] transition-colors font-bold"
                            title="Editar tempo da tarefa"
                          >
                            {formatDuration(group.taskTime)}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subtasks */}
                    {group.subtasks.length > 0 && (
                      <div className="bg-[var(--muted)]/10 pl-8 divide-y divide-[var(--border)]/50">
                        {group.subtasks.map(subtask => (
                          <div key={subtask.id} className="p-3 flex items-center justify-between hover:bg-[var(--accent)]/10 transition-colors">
                            <div
                              className={cn(
                                "flex-1 min-w-0 pr-4",
                                onTaskClick && "cursor-pointer group/subtask-title"
                              )}
                              onClick={() => onTaskClick && onTaskClick(group.task, subtask.id)}
                            >
                              <div className={cn(
                                "text-sm font-medium truncate",
                                onTaskClick && "group-hover/subtask-title:text-[var(--primary)] transition-colors underline-offset-4 group-hover/subtask-title:underline"
                              )}>
                                {subtask.title}
                              </div>
                              <div className="text-[10px] text-[var(--muted-foreground)] uppercase">Subtarefa</div>
                            </div>

                            <div className="flex items-center gap-4">
                              {editingItemId === subtask.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editTimeValue}
                                    onChange={(e) => setEditTimeValue(e.target.value)}
                                    className="w-16 px-2 py-0.5 text-xs border border-[var(--border)] rounded bg-[var(--background)] font-mono"
                                    placeholder="HH:MM"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && saveTime(group.task, subtask)}
                                    onBlur={() => saveTime(group.task, subtask)}
                                  />
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEditing(subtask.id, subtask.timeSpent)}
                                  className="font-mono text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                                  title="Editar tempo da subtarefa"
                                >
                                  {formatDuration(subtask.timeSpent)}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hierarchicalTimeByProject.length === 0 && (
            <div className="text-center py-20 text-[var(--muted-foreground)] bg-[var(--card)] rounded-xl border border-dashed border-[var(--border)]">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhum tempo registrado ainda.</p>
              <p className="text-sm opacity-60">Inicie o cronômetro em uma tarefa para ver os dados aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
