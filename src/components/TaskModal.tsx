import React, { useState, useEffect, useRef } from 'react';
import { Task, User, Subtask, ActiveTimer, Project } from '@/lib/store';
import { Button, StatusSelector, AssigneeSelector } from './ui-elements';
import {
  X,
  Calendar,
  User as UserIcon,
  CheckSquare,
  Plus,
  Trash2,
  Play,
  Pause,
  Save,
  Flag,
  Clock,
  Pencil,
  ArrowLeft,
  Folder,
  Square,
  Zap,
  GripVertical
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { DateSelector } from './DateSelector';
import { motion, AnimatePresence, Reorder } from 'motion/react';

interface TaskModalProps {
  task: Task;
  users: User[];
  projects: Project[];
  isOpen: boolean;
  isNew?: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onSaveNew?: (task: Task) => void;
  onDelete: (taskId: string) => void;
  activeTimer: ActiveTimer | null;
  onStartTimer: (taskId: string, subtaskId?: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
  initialSubtaskId?: string | null;
}

export function TaskModal({
  task,
  users,
  projects,
  isOpen,
  isNew = false,
  onClose,
  onUpdate,
  onSaveNew,
  onDelete,
  activeTimer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  initialSubtaskId
}: TaskModalProps) {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [elapsed, setElapsed] = useState(0);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');
  const [isEditingTime, setIsEditingTime] = useState(false);

  const isTaskTimerRunning = activeTimer?.taskId === task.id && !activeTimer?.subtaskId && !!activeTimer?.startTime;
  const isTaskTimerPaused = activeTimer?.taskId === task.id && !activeTimer?.subtaskId && !activeTimer?.startTime;

  const totalSubtaskTime = editedTask.subtasks.reduce((acc, st) => acc + st.timeSpent, 0);
  const totalTimeSpent = editedTask.timeSpent + totalSubtaskTime;

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  useEffect(() => {
    if (isOpen && initialSubtaskId) {
      const subtask = task.subtasks.find(s => s.id === initialSubtaskId);
      if (subtask) {
        setEditingSubtask(subtask);
      }
    } else if (!isOpen) {
      setEditingSubtask(null);
    }
  }, [isOpen, initialSubtaskId, task]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer && activeTimer.taskId === task.id) {
      const updateElapsed = () => {
        if (!activeTimer.startTime) {
          setElapsed(activeTimer.accumulatedTime);
          return;
        }
        const now = Date.now();
        const sessionElapsed = Math.floor((now - activeTimer.startTime) / 1000);
        setElapsed(activeTimer.accumulatedTime + sessionElapsed);
      };
      updateElapsed();
      if (activeTimer.startTime) {
        interval = setInterval(updateElapsed, 1000);
      }
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer, task.id]);

  const handleSave = () => {
    if (isNew && onSaveNew) {
      onSaveNew(editedTask);
    } else {
      onUpdate(editedTask);
      onClose();
    }
  };

  const handleCloseWithCheck = () => {
    if (editingSubtask) {
      setEditingSubtask(null);
      return;
    }

    const hasChanges = JSON.stringify(task) !== JSON.stringify(editedTask);
    const hasContent = editedTask.title.trim() !== '' || (editedTask.description && editedTask.description.trim() !== '') || editedTask.subtasks.length > 0;

    if (isNew) {
      if (hasContent) {
        handleSave();
      } else {
        onClose();
      }
      return;
    }

    if (hasChanges) {
      onUpdate(editedTask);
      onClose();
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !editingSubtask) {
        handleCloseWithCheck();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, editingSubtask, task, editedTask, isNew]);

  if (!isOpen) return null;

  const toggleTimer = () => {
    if (isTaskTimerRunning) {
      onPauseTimer();
    } else if (isTaskTimerPaused) {
      onResumeTimer();
    } else {
      onStartTimer(task.id);
    }
  };

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle,
      completed: false,
      timeSpent: 0
    };
    setEditedTask({
      ...editedTask,
      subtasks: [...editedTask.subtasks, newSubtask]
    });
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (subtaskId: string) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      )
    });
  };

  const deleteSubtask = (subtaskId: string) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks.filter(st => st.id !== subtaskId)
    });
  };

  const handleUpdateSubtask = (updatedSubtask: Subtask) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks.map(st => st.id === updatedSubtask.id ? updatedSubtask : st)
    });
    setEditingSubtask(updatedSubtask);
  };

  const updateSubtaskField = (subtaskId: string, field: Partial<Subtask>) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks.map(st => st.id === subtaskId ? { ...st, ...field } : st)
    });
  };

  const handleManualTimeChange = (val: string) => {
    setEditTimeValue(val);
    const h = (val.match(/(\d+)h/)?.[1] || 0);
    const m = (val.match(/(\d+)m/)?.[1] || 0);
    const s = (val.match(/(\d+)s/)?.[1] || 0);
    const totalSeconds = (Number(h) * 3600) + (Number(m) * 60) + Number(s);
    setEditedTask({ ...editedTask, timeSpent: totalSeconds });
  };

  const startEditingTime = () => {
    const hours = Math.floor(editedTask.timeSpent / 3600);
    const minutes = Math.floor((editedTask.timeSpent % 3600) / 60);
    const seconds = editedTask.timeSpent % 60;
    setEditTimeValue(`${hours}h ${minutes}m ${seconds}s`);
    setIsEditingTime(true);
  };

  let currentTotalTime = totalTimeSpent;
  if (activeTimer?.taskId === task.id) {
    currentTotalTime += elapsed;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseWithCheck();
        }
      }}
    >
      <div className="bg-[var(--background)] w-full max-w-6xl rounded-xl shadow-2xl border border-[var(--border)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative">
        {editingSubtask ? (
          <SubtaskView
            subtask={editingSubtask}
            parentTaskTitle={editedTask.title}
            users={users}
            onBack={() => setEditingSubtask(null)}
            onUpdate={handleUpdateSubtask}
            activeTimer={activeTimer}
            onStartTimer={(subtaskId) => onStartTimer(task.id, subtaskId)}
            onPauseTimer={onPauseTimer}
            onResumeTimer={onResumeTimer}
            onStopTimer={onStopTimer}
            taskId={task.id}
          />
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)] rounded-t-xl bg-[var(--background)]">
              <div className="flex items-center gap-4">
                <StatusSelector
                  status={editedTask.status}
                  onSelect={(status) => setEditedTask({ ...editedTask, status })}
                  showLabel
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isEditingTime ? (
                    <input
                      type="text"
                      value={editTimeValue}
                      onChange={(e) => handleManualTimeChange(e.target.value)}
                      className="w-32 px-2 py-1 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] font-mono focus:ring-1 focus:ring-[var(--primary)] outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingTime(false)}
                      onBlur={() => setIsEditingTime(false)}
                    />
                  ) : (
                    <button
                      onClick={startEditingTime}
                      className="text-sm text-[var(--muted-foreground)] font-mono hover:text-[var(--foreground)] flex items-center gap-1"
                      title="Clique para editar tempo manual (apenas tarefa principal)"
                    >
                      <Clock size={14} />
                      {formatDuration(currentTotalTime)}
                    </button>
                  )}
                  <Button
                    variant={isTaskTimerRunning ? "warning" : isTaskTimerPaused ? "success" : "primary"}
                    size="sm"
                    onClick={toggleTimer}
                    className={cn("gap-2", !isTaskTimerRunning && !isTaskTimerPaused && "bg-[#165DFC] hover:bg-[#165DFC]/90 border-none")}
                  >
                    {isTaskTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                    {isTaskTimerRunning ? "Pausar" : isTaskTimerPaused ? "Retomar" : "Iniciar Cronômetro"}
                  </Button>
                  {(isTaskTimerRunning || isTaskTimerPaused) && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={onStopTimer}
                      className="gap-2"
                    >
                      <Square size={14} />
                      Finalizar
                    </Button>
                  )}
                </div>
                <button onClick={handleCloseWithCheck} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-2">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editedTask.title}
                        onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                        className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 placeholder-[var(--muted-foreground)] p-0"
                        placeholder="Título da tarefa"
                      />
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <Folder size={16} />
                        <select
                          value={editedTask.projectId || ''}
                          onChange={(e) => setEditedTask({ ...editedTask, projectId: e.target.value || undefined })}
                          className="bg-transparent border-none focus:ring-0 p-0 text-sm font-medium hover:text-[var(--foreground)] cursor-pointer outline-none"
                        >
                          <option value="">Sem Projeto</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Descrição</label>
                      <textarea
                        value={editedTask.description || ''}
                        onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                        className="w-full min-h-[150px] p-4 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none resize-y text-base"
                        placeholder="Adicione uma descrição detalhada..."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                          <Flag size={14} /> Prioridade
                        </label>
                        <select
                          value={editedTask.priority}
                          onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                          className="w-full p-2 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)] outline-none text-sm"
                        >
                          <option value="none">Sem Prioridade</option>
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                          <UserIcon size={14} /> Responsável
                        </label>
                        <select
                          value={editedTask.assigneeId || ''}
                          onChange={(e) => setEditedTask({ ...editedTask, assigneeId: e.target.value || undefined })}
                          className="w-full p-2 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)] outline-none text-sm"
                        >
                          <option value="">Sem responsável</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                          <Calendar size={14} /> Início
                        </label>
                        <DateSelector
                          date={editedTask.startDate}
                          onSelect={(date) => setEditedTask({ ...editedTask, startDate: date })}
                          size="md"
                          className="w-full"
                          isStart
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                          <Calendar size={14} /> Conclusão
                        </label>
                        <DateSelector
                          date={editedTask.endDate}
                          onSelect={(date) => setEditedTask({ ...editedTask, endDate: date })}
                          size="md"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-medium flex items-center gap-2">
                      <CheckSquare size={18} /> Subtarefas
                    </label>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {editedTask.subtasks.filter(s => s.completed).length}/{editedTask.subtasks.length} concluídas
                    </span>
                  </div>

                  <Reorder.Group
                    axis="y"
                    values={editedTask.subtasks}
                    onReorder={(newSubtasks) => setEditedTask({ ...editedTask, subtasks: newSubtasks })}
                    className="space-y-3"
                  >
                    {editedTask.subtasks.map(st => (
                      <Reorder.Item key={st.id} value={st}>
                        <SubtaskItem
                          subtask={st}
                          users={users}
                          onToggle={() => toggleSubtask(st.id)}
                          onUpdate={(field) => updateSubtaskField(st.id, field)}
                          onDelete={() => deleteSubtask(st.id)}
                          onEdit={() => setEditingSubtask(st)}
                        />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                      placeholder="Adicionar nova subtarefa..."
                      className="flex-1 text-sm bg-[var(--muted)]/30 border border-[var(--border)] rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                    <Button size="sm" variant="secondary" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border)] flex justify-between items-center rounded-b-xl bg-[var(--background)] mt-8">
                <button
                  onClick={() => { onDelete(task.id); }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                  title="Excluir Tarefa"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleCloseWithCheck}>Cancelar</Button>
                  <Button onClick={handleSave} className="gap-2 bg-[#165DFC] hover:bg-[#165DFC]/90 border-none">
                    <Save size={16} /> {isNew ? 'Criar Tarefa' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface SubtaskItemProps {
  subtask: Subtask;
  users: User[];
  onToggle: () => void;
  onUpdate: (field: Partial<Subtask>) => void;
  onDelete: () => void;
  onEdit: () => void;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({
  subtask,
  users,
  onToggle,
  onUpdate,
  onDelete,
  onEdit
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (tempTitle.trim() && tempTitle !== subtask.title) {
      onUpdate({ title: tempTitle.trim() });
    } else {
      setTempTitle(subtask.title);
    }
    setIsRenaming(false);
  };

  return (
    <div className="flex items-center gap-3 group p-3 hover:bg-[var(--muted)]/30 rounded-lg transition-colors border border-[var(--border)] bg-[var(--background)]">
      <div className="text-[var(--muted-foreground)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={16} />
      </div>
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-5 h-5 rounded border-[var(--muted-foreground)] text-[var(--primary)] focus:ring-[var(--primary)]"
      />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setTempTitle(subtask.title);
                setIsRenaming(false);
              }
            }}
            className="w-full text-sm bg-transparent border-none focus:ring-0 p-0 font-medium"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span
              className={cn("block text-sm truncate cursor-pointer", subtask.completed && "text-[var(--muted-foreground)]")}
              onClick={onEdit}
            >
              {subtask.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
              className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-opacity p-1"
              title="Renomear"
            >
              <Pencil size={12} />
            </button>
          </>
        )}
      </div>
      <DateSelector
        date={subtask.endDate}
        onSelect={(date) => onUpdate({ endDate: date })}
      />
      <AssigneeSelector
        assigneeId={subtask.assigneeId}
        users={users}
        onSelect={(userId) => onUpdate({ assigneeId: userId })}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity p-1"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

interface SubtaskViewProps {
  subtask: Subtask;
  parentTaskTitle: string;
  users: User[];
  onBack: () => void;
  onUpdate: (subtask: Subtask) => void;
  activeTimer: ActiveTimer | null;
  onStartTimer: (subtaskId: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
  taskId: string;
}

function SubtaskView({
  subtask,
  parentTaskTitle,
  users,
  onBack,
  onUpdate,
  activeTimer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  taskId
}: SubtaskViewProps) {
  const [editedSubtask, setEditedSubtask] = useState<Subtask>(subtask);
  const [elapsed, setElapsed] = useState(0);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState('');

  const isTimerRunning = activeTimer?.taskId === taskId && activeTimer?.subtaskId === subtask.id && !!activeTimer?.startTime;
  const isTimerPaused = activeTimer?.taskId === taskId && activeTimer?.subtaskId === subtask.id && !activeTimer?.startTime;

  useEffect(() => {
    setEditedSubtask(subtask);
  }, [subtask]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && activeTimer) {
      const updateElapsed = () => {
        const now = Date.now();
        const sessionElapsed = Math.floor((now - activeTimer.startTime!) / 1000);
        setElapsed(activeTimer.accumulatedTime + sessionElapsed);
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    } else if (isTimerPaused && activeTimer) {
      setElapsed(activeTimer.accumulatedTime);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isTimerPaused, activeTimer]);

  const handleBack = () => {
    onUpdate(editedSubtask);
    onBack();
  };

  const toggleTimer = () => {
    if (isTimerRunning) {
      onPauseTimer();
    } else if (isTimerPaused) {
      onResumeTimer();
    } else {
      onStartTimer(subtask.id);
    }
  };

  const startEditingTime = () => {
    const hours = Math.floor(editedSubtask.timeSpent / 3600);
    const minutes = Math.floor((editedSubtask.timeSpent % 3600) / 60);
    const seconds = editedSubtask.timeSpent % 60;
    setEditTimeValue(`${hours}h ${minutes}m ${seconds}s`);
    setIsEditingTime(true);
  };

  const handleManualTimeChange = (val: string) => {
    setEditTimeValue(val);
    const h = (val.match(/(\d+)h/)?.[1] || 0);
    const m = (val.match(/(\d+)m/)?.[1] || 0);
    const s = (val.match(/(\d+)s/)?.[1] || 0);
    const totalSeconds = (Number(h) * 3600) + (Number(m) * 60) + Number(s);
    setEditedSubtask({ ...editedSubtask, timeSpent: totalSeconds });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border)] rounded-t-xl bg-[var(--background)]">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-[var(--muted)] rounded-full transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={20} />
          </button>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase",
            editedSubtask.completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
          )}>
            {editedSubtask.completed ? "Concluído" : "A Fazer"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isEditingTime ? (
            <input
              type="text"
              value={editTimeValue}
              onChange={(e) => handleManualTimeChange(e.target.value)}
              className="w-32 px-2 py-1 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] font-mono focus:ring-1 focus:ring-[var(--primary)] outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTime(false)}
              onBlur={() => setIsEditingTime(false)}
            />
          ) : (
            <button
              onClick={startEditingTime}
              className="text-sm text-[var(--muted-foreground)] font-mono hover:text-[var(--foreground)] flex items-center gap-1"
            >
              <Clock size={14} />
              {formatDuration(editedSubtask.timeSpent + elapsed)}
            </button>
          )}
          <Button
            variant={isTimerRunning ? "warning" : isTimerPaused ? "success" : "primary"}
            size="sm"
            onClick={toggleTimer}
            className={cn("gap-2", !isTimerRunning && !isTimerPaused && "bg-[#165DFC] hover:bg-[#165DFC]/90 border-none")}
          >
            {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
            {isTimerRunning ? "Pausar" : isTimerPaused ? "Retomar" : "Iniciar"}
          </Button>
          {(isTimerRunning || isTimerPaused) && (
            <Button variant="danger" size="sm" onClick={onStopTimer} className="gap-2">
              <Square size={14} /> Finalizar
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[var(--muted-foreground)] font-medium">Tarefa: {parentTaskTitle}</span>
                  <input
                    type="text"
                    value={editedSubtask.title}
                    onChange={(e) => setEditedSubtask({ ...editedSubtask, title: e.target.value })}
                    className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 placeholder-[var(--muted-foreground)] p-0"
                    placeholder="Título da subtarefa"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                    <UserIcon size={14} /> Responsável
                  </label>
                  <AssigneeSelector
                    assigneeId={editedSubtask.assigneeId}
                    users={users}
                    onSelect={(userId) => setEditedSubtask({ ...editedSubtask, assigneeId: userId })}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                    <Calendar size={14} /> Início
                  </label>
                  <DateSelector
                    date={editedSubtask.startDate}
                    onSelect={(date) => setEditedSubtask({ ...editedSubtask, startDate: date })}
                    size="md"
                    className="w-full"
                    isStart
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1.5">
                    <Calendar size={14} /> Conclusão
                  </label>
                  <DateSelector
                    date={editedSubtask.endDate}
                    onSelect={(date) => setEditedSubtask({ ...editedSubtask, endDate: date })}
                    size="md"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 rounded-b-xl bg-[var(--background)]">
        <Button variant="secondary" onClick={handleBack}>Cancelar</Button>
        <Button onClick={handleBack} className="gap-2 bg-[#165DFC] hover:bg-[#165DFC]/90 border-none">
          <ArrowLeft size={16} /> Voltar para Tarefa
        </Button>
      </div>
    </div>
  );
}
