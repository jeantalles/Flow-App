import React, { useState, useEffect } from 'react';
import { Play, Pause, X, Maximize2, Hourglass, Square, Minimize2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { Task, Subtask, ActiveTimer, Project } from '@/lib/store';
import { cn } from '@/lib/utils';

interface GlobalTimerProps {
  activeTimer: ActiveTimer | null;
  tasks: Task[];
  projects: Project[];
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onMaximize: (task: Task) => void;
}

export function GlobalTimer({ activeTimer, tasks, projects, onStop, onPause, onResume, onMaximize }: GlobalTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!activeTimer) {
      setIsFullScreen(false);
      return;
    }

    if (!activeTimer.startTime) {
      setElapsed(activeTimer.accumulatedTime);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const sessionElapsed = Math.floor((now - activeTimer.startTime!) / 1000);
      setElapsed(activeTimer.accumulatedTime + sessionElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!activeTimer) return null;

  const task = tasks.find(t => t.id === activeTimer.taskId);
  if (!task) return null;

  const project = projects.find(p => p.id === task.projectId);
  const subtask = activeTimer.subtaskId ? task.subtasks.find(s => s.id === activeTimer.subtaskId) : null;
  const isPaused = !activeTimer.startTime;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[200] bg-[var(--background)] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <button
          onClick={() => setIsFullScreen(false)}
          className="absolute top-8 right-8 p-3 hover:bg-[var(--accent)] rounded-full transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Minimize2 size={32} />
        </button>

        <div className="max-w-4xl w-full text-center space-y-12">
          <div className="space-y-4">
            {project && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="text-xl font-medium text-[var(--muted-foreground)] uppercase tracking-widest">{project.name}</span>
              </div>
            )}
            <h1 className="text-6xl md:text-8xl font-black text-[var(--foreground)] tracking-tight leading-tight">
              {task.title}
            </h1>
            {subtask && (
              <h2 className="text-3xl text-[var(--muted-foreground)] font-medium">
                ↳ {subtask.title}
              </h2>
            )}
          </div>

          <div className={cn(
            "text-[12rem] md:text-[16rem] font-mono font-black tabular-nums leading-none tracking-tighter",
            isPaused ? "text-amber-500" : "text-indigo-600"
          )}>
            {formatDuration(elapsed)}
          </div>

          <div className="flex items-center justify-center gap-8">
            {isPaused ? (
              <button
                onClick={onResume}
                className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all shadow-xl hover:scale-110 active:scale-95"
              >
                <Play size={40} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="w-24 h-24 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition-all shadow-xl hover:scale-110 active:scale-95"
              >
                <Pause size={40} fill="currentColor" />
              </button>
            )}
            <button
              onClick={() => {
                onStop();
                setIsFullScreen(false);
              }}
              className="w-24 h-24 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-xl hover:scale-110 active:scale-95"
            >
              <Square size={40} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-[var(--background)] border border-[var(--border)] shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300 w-80">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        isPaused ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600 animate-pulse"
      )}>
        <Hourglass size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
          {isPaused ? 'Pausado' : 'Em andamento'}
        </div>
        <div className="font-bold truncate text-sm text-[var(--foreground)]" title={task.title}>
          {task.title}
        </div>
        {subtask && (
          <div className="text-xs text-[var(--muted-foreground)] truncate">
            ↳ {subtask.title}
          </div>
        )}
        <div className={cn(
          "font-mono text-xl font-bold mt-1",
          isPaused ? "text-amber-600" : "text-indigo-600"
        )}>
          {formatDuration(elapsed)}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {isPaused ? (
            <button
              onClick={onResume}
              className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
              title="Retomar"
            >
              <Play size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onPause}
              className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors"
              title="Pausar"
            >
              <Pause size={16} fill="currentColor" />
            </button>
          )}
          <button
            onClick={onStop}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
            title="Finalizar"
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>
        <button
          onClick={() => setIsFullScreen(true)}
          className="p-2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-lg hover:bg-[var(--accent)] transition-colors flex items-center justify-center"
          title="Tela Cheia"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}
