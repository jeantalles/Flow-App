import React, { useState } from 'react';
import { Project, Task } from '@/lib/store';
import { Search, ArrowRight, Calendar } from 'lucide-react';
import { cn, formatRelativeDate } from '@/lib/utils';

interface SearchViewProps {
  projects: Project[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onProjectClick: (projectId: string) => void;
}

export function SearchView({ projects, tasks, onTaskClick, onProjectClick }: SearchViewProps) {
  const [query, setQuery] = useState('');

  const filteredTasks = query.trim()
    ? tasks.filter(t => !t.deletedAt && t.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  const filteredProjects = query.trim()
    ? projects.filter(p => !p.deletedAt && p.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="flex flex-col h-full bg-[var(--background)] p-8">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">Pesquisar</h1>

        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={24} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque por tarefas ou projetos..."
            className="w-full pl-14 pr-6 py-4 text-lg rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 focus:ring-2 focus:ring-[var(--primary)] outline-none shadow-sm"
            autoFocus
          />
        </div>

        {query.trim() && (
          <div className="space-y-8">
            {/* Projects Results */}
            {filteredProjects.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">Projetos</h2>
                <div className="grid gap-3">
                  {filteredProjects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => onProjectClick(project.id)}
                      className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:shadow-md transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: project.color }}>
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg group-hover:text-[var(--primary)] transition-colors">{project.name}</h3>
                        <p className="text-sm text-[var(--muted-foreground)]">Criado em {new Date(project.createdAt).toLocaleDateString()}</p>
                      </div>
                      <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Results */}
            {filteredTasks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">Tarefas</h2>
                <div className="grid gap-3">
                  {filteredTasks.map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    return (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:shadow-md transition-all text-left group"
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2",
                          task.status === 'done' ? "bg-emerald-500 border-emerald-500" :
                            task.status === 'in-progress' ? "border-blue-500" : "border-slate-300"
                        )} />
                        <div className="flex-1">
                          <h3 className={cn("font-medium group-hover:text-[var(--primary)] transition-colors", task.status === 'done' && "text-[var(--muted-foreground)]")}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mt-1">
                            {project && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                                {project.name}
                              </span>
                            )}
                            {task.endDate && (
                              <span className="flex items-center gap-1 ml-2">
                                <Calendar size={12} />
                                {formatRelativeDate(task.endDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredProjects.length === 0 && filteredTasks.length === 0 && (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                <p>Nenhum resultado encontrado para "{query}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
