import React, { useState } from 'react';
import { Project, Task, User } from '@/lib/store';
import { Button, Badge } from './ui-elements';
import { Archive, RefreshCcw, X, Folder, CheckSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ArchiveViewProps {
  tasks: Task[];
  projects: Project[];
  onRestoreTask: (taskId: string) => void;
  onPermanentDeleteTask: (taskId: string) => void;
  onRestoreProject: (projectId: string) => void;
  onPermanentDeleteProject: (projectId: string) => void;
}

export function ArchiveView({
  tasks,
  projects,
  onRestoreTask,
  onPermanentDeleteTask,
  onRestoreProject,
  onPermanentDeleteProject
}: ArchiveViewProps) {
  const [activeTab, setActiveTab] = useState<'archived' | 'tasks' | 'projects'>('tasks');

  const archivedProjects = projects.filter(p => p.archivedAt && !p.deletedAt);
  const deletedTasks = tasks.filter(t => t.deletedAt);
  const deletedProjects = projects.filter(p => p.deletedAt);

  return (
    <div className="flex flex-col h-full bg-[var(--background)] p-8 overflow-hidden">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Archive size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Arquivo</h1>
          <p className="text-[var(--muted-foreground)]">Gerencie projetos arquivados e itens excluídos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--border)] mb-6">
        <button
          onClick={() => setActiveTab('tasks')}
          className={cn(
            "pb-3 px-1 text-sm font-medium transition-colors relative",
            activeTab === 'tasks'
              ? "text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Tarefas Excluídas ({deletedTasks.length})
          {activeTab === 'tasks' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={cn(
            "pb-3 px-1 text-sm font-medium transition-colors relative",
            activeTab === 'archived'
              ? "text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Projetos Arquivados ({archivedProjects.length})
          {activeTab === 'archived' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={cn(
            "pb-3 px-1 text-sm font-medium transition-colors relative",
            activeTab === 'projects'
              ? "text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Projetos Excluídos ({deletedProjects.length})
          {activeTab === 'projects' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {deletedTasks.length === 0 ? (
              <div className="text-center py-20 text-[var(--muted-foreground)]">
                <CheckSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma tarefa na lixeira.</p>
              </div>
            ) : (
              deletedTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                return (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-[var(--muted-foreground)]">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted-foreground)]">
                        {project && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                            {project.name}
                          </span>
                        )}
                        <span>•</span>
                        <span>Excluído em {task.deletedAt && format(new Date(task.deletedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => onRestoreTask(task.id)} title="Restaurar">
                        <RefreshCcw size={16} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onPermanentDeleteTask(task.id)} title="Excluir Permanentemente">
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'archived' && (
          <div className="space-y-3">
            {archivedProjects.length === 0 ? (
              <div className="text-center py-20 text-[var(--muted-foreground)]">
                <Archive size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhum projeto arquivado.</p>
              </div>
            ) : (
              archivedProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between p-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: project.color }}>
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--foreground)]">{project.name}</h4>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        Arquivado em {project.archivedAt && format(new Date(project.archivedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onRestoreProject(project.id)} title="Desarquivar">
                      <RefreshCcw size={16} />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => onPermanentDeleteProject(project.id)} title="Excluir Permanentemente">
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-3">
            {deletedProjects.length === 0 ? (
              <div className="text-center py-20 text-[var(--muted-foreground)]">
                <Folder size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhum projeto na lixeira.</p>
              </div>
            ) : (
              deletedProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between p-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: project.color }}>
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--muted-foreground)]">{project.name}</h4>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        Excluído em {project.deletedAt && format(new Date(project.deletedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onRestoreProject(project.id)} title="Restaurar">
                      <RefreshCcw size={16} />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => onPermanentDeleteProject(project.id)} title="Excluir Permanentemente">
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
