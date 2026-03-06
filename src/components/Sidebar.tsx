import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Folder,
  Plus,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  MoreVertical,
  Copy,
  Trash2,
  PieChart,
  Search,
  Archive,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui-elements';
import { Project, User } from '@/lib/store';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  currentView: 'project' | 'trash' | 'time-reports' | 'search' | 'my-tasks' | 'weekly';
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onArchiveProject: (id: string) => void;
  currentUser: User;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenTimeReports: () => void;
  onOpenTrash: () => void;
  onEditProject: (project: Project) => void;
  onOpenSearch: () => void;
  onOpenMyTasks: () => void;
  onOpenWeekly: () => void;
  onLogout: () => void;
}

export function Sidebar({
  projects,
  activeProjectId,
  currentView,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
  onArchiveProject,
  currentUser,
  isDarkMode,
  toggleTheme,
  onOpenSettings,
  onOpenTimeReports,
  onOpenTrash,
  onEditProject,
  onOpenSearch,
  onOpenMyTasks,
  onOpenWeekly,
  onLogout
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, projectId: string } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, projectId });
  };

  return (
    <div className="w-64 h-screen bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo.png"
            alt="Flow Logo"
            className="w-9 h-9 rounded-xl object-contain"
            style={{ imageRendering: 'auto' }}
          />
          <span className="font-bold text-xl tracking-tight bg-gradient-to-br from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">Flow</span>
        </div>

        <div className="space-y-1">
          <Button
            className={cn(
              "w-full justify-start gap-2 h-11",
              currentView === 'search' ? "bg-[#E0E7FF] text-[#4F46E5] hover:bg-[#E0E7FF]" : "text-[var(--muted-foreground)]"
            )}
            variant="ghost"
            onClick={onOpenSearch}
          >
            <Search size={18} />
            Pesquisar
          </Button>
          <Button
            className={cn(
              "w-full justify-start gap-2 h-11",
              currentView === 'my-tasks' ? "bg-[#E0E7FF] text-[#4F46E5] hover:bg-[#E0E7FF]" : "text-[var(--muted-foreground)]"
            )}
            variant="ghost"
            onClick={onOpenMyTasks}
          >
            <CheckSquare size={18} />
            Minhas Tarefas
          </Button>
          <Button
            className={cn(
              "w-full justify-start gap-2 h-11",
              currentView === 'project' && activeProjectId === null ? "bg-[#E0E7FF] text-[#4F46E5] hover:bg-[#E0E7FF]" : "text-[var(--muted-foreground)]"
            )}
            variant="ghost"
            onClick={() => onSelectProject(null)}
          >
            <LayoutDashboard size={18} />
            Visão Geral
          </Button>
          <Button
            className={cn(
              "w-full justify-start gap-2 h-11",
              currentView === 'weekly' ? "bg-[#E0E7FF] text-[#4F46E5] hover:bg-[#E0E7FF]" : "text-[var(--muted-foreground)]"
            )}
            variant="ghost"
            onClick={onOpenWeekly}
          >
            <Calendar size={18} />
            Weekly
          </Button>
          <Button
            className={cn(
              "w-full justify-start gap-2 h-11",
              currentView === 'time-reports' ? "bg-[#E0E7FF] text-[#4F46E5] hover:bg-[#E0E7FF]" : "text-[var(--muted-foreground)]"
            )}
            variant="ghost"
            onClick={onOpenTimeReports}
          >
            <PieChart size={18} />
            Uso de Tempo
          </Button>
          <Button
            className={cn(
              "w-full justify-start gap-2 h-11",
              currentView === 'trash' ? "bg-[#E0E7FF] text-[#4F46E5] hover:bg-[#E0E7FF]" : "text-[var(--muted-foreground)]"
            )}
            variant="ghost"
            onClick={onOpenTrash}
          >
            <Archive size={18} />
            Arquivo
          </Button>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Projetos</span>
          <button
            onClick={onCreateProject}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-1">
          {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((project) => (
            <div key={project.id} className="relative group">
              <button
                onClick={() => onSelectProject(project.id)}
                onContextMenu={(e) => handleContextMenu(e, project.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors focus:!outline-none focus:!ring-0",
                  currentView === 'project' && activeProjectId === project.id
                    ? "bg-[#E0E7FF] text-[#4F46E5] font-semibold"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]/50 hover:text-[var(--foreground)]"
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate flex-1 text-left">{project.name}</span>
                {currentView === 'project' && activeProjectId === project.id && <ChevronRight size={14} className="opacity-50" />}
              </button>

              {/* Hover Menu Trigger */}
              <button
                onClick={(e) => handleContextMenu(e, project.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--background)] rounded shadow-sm transition-all"
              >
                <MoreVertical size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg py-1 w-48"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const project = projects.find(p => p.id === contextMenu.projectId);
              if (project) onEditProject(project);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--accent)] flex items-center gap-2"
          >
            <Settings size={14} /> Editar Projeto
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateProject(contextMenu.projectId);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--accent)] flex items-center gap-2"
          >
            <Copy size={14} /> Duplicar Projeto
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchiveProject(contextMenu.projectId);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--accent)] flex items-center gap-2"
          >
            <Archive size={14} /> Arquivar Projeto
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const projectId = contextMenu.projectId;
              setContextMenu(null);
              // Call directly to ensure execution
              onDeleteProject(projectId);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 size={14} /> Excluir Projeto
          </button>
        </div>
      )}

      {/* Footer / Settings */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="flex-1" title="Alternar Tema">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onOpenSettings} className="flex-1" title="Configurações">
            <Settings size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Sair" onClick={onLogout}>
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
