/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ProjectView } from './components/ProjectView';
import { TaskModal } from './components/TaskModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ArchiveView } from './components/ArchiveView';
import { TimeReportsView } from './components/TimeReportsView';
import { SearchView } from './components/SearchView';
import { MyTasksView } from './components/MyTasksView';
import { WeeklyView } from './components/WeeklyView';
import { ProjectModal } from './components/ProjectModal';
import { GlobalTimer } from './components/GlobalTimer';
import { dataStore, Project, Task, User, ViewMode, ThemeMode, ActiveTimer } from './lib/store';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './lib/supabase';
import { api } from './lib/api';
import { Auth } from './components/Auth';
import { Session } from '@supabase/supabase-js';

type AppView = 'project' | 'trash' | 'time-reports' | 'search' | 'my-tasks' | 'weekly';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('project');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTask, setIsNewTask] = useState(false);
  const [initialSubtaskId, setInitialSubtaskId] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  // Load initial data
  useEffect(() => {
    setActiveTimer(dataStore.getActiveTimer()); // Local timer remains for now

    const savedTheme = dataStore.getTheme();
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    // Auth listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Supabase data when session exists
  useEffect(() => {
    if (!session?.user) return;

    const loadData = async () => {
      try {
        const [fetchedProjects, fetchedTasks, fetchedUsers] = await Promise.all([
          api.projects.fetchAll(),
          api.tasks.fetchAll(),
          api.users.fetchAll(),
        ]);
        setProjects(fetchedProjects);
        setTasks(fetchedTasks);

        let current = fetchedUsers.find(u => u.id === session.user.id);
        if (!current && session.user) {
          try {
            const defaultAvatar = session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email?.split('@')[0] || 'User')}&background=random`;
            const { data, error } = await supabase.from('users').insert({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
              avatar: defaultAvatar,
              role: 'member'
            }).select().single();

            if (!error && data) {
              const mappedUser: any = {
                id: data.id,
                email: data.email,
                name: data.name,
                avatar: data.avatar || undefined,
                role: data.role as 'admin' | 'member'
              };
              fetchedUsers.push(mappedUser);
              current = mappedUser;
            }
          } catch (e) { console.error("Fallback insert error:", e); }
        }

        if (!current) {
          current = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'Usuário',
            role: 'member' as any
          };
          fetchedUsers.push(current);
        }

        setUsers([...fetchedUsers]);
        setCurrentUser(current);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [session]);

  // Save data on changes
  useEffect(() => {
    if (projects.length) dataStore.saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (tasks.length) dataStore.saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (users.length) dataStore.saveUsers(users);
  }, [users]);

  useEffect(() => {
    dataStore.saveActiveTimer(activeTimer);
  }, [activeTimer]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    dataStore.saveTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      if (projectToEdit) {
        // Edit existing
        const updated = await api.projects.update(projectToEdit.id, projectData);
        setProjects(projects.map(p => p.id === updated.id ? updated : p));
      } else {
        // Create new
        const newProject = await api.projects.create(projectData as Omit<Project, 'id' | 'createdAt'>);
        setProjects([...projects, newProject]);
        setActiveProjectId(newProject.id);
        setCurrentView('project');
      }
      setProjectToEdit(null);
    } catch (e) {
      console.error("Failed to save project:", e);
    }
  };

  const handleDuplicateProject = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    try {
      const newProject = await api.projects.create({
        name: `${project.name} (Cópia)`,
        description: project.description,
        color: project.color,
        deadline: project.deadline
      });

      // Duplicate tasks
      // Fetching fresh tasks related to project is safer, but we can optimistically duplicate from local state
      const projectTasks = tasks.filter(t => t.projectId === id && !t.deletedAt);
      const newTasks: Task[] = [];

      for (const t of projectTasks) {
        const newTask = await api.tasks.create({
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          projectId: newProject.id,
          startDate: t.startDate,
          endDate: t.endDate,
          assigneeId: t.assigneeId,
          isToday: t.isToday,
          timeSpent: t.timeSpent
        });

        // Duplicate subtasks if any
        if (t.subtasks && t.subtasks.length > 0) {
          const newSubtasks = await Promise.all(t.subtasks.map(st =>
            api.subtasks.create(newTask.id, {
              title: st.title,
              completed: st.completed,
              startDate: st.startDate,
              endDate: st.endDate,
              assigneeId: st.assigneeId,
              description: st.description,
              isToday: st.isToday,
              timeSpent: 0
            })
          ));
          newTask.subtasks = newSubtasks;
        } else {
          newTask.subtasks = [];
        }
        newTasks.push(newTask);
      }

      setProjects([...projects, newProject]);
      setTasks([...tasks, ...newTasks]);
    } catch (e) {
      console.error("Failed to duplicate project", e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    // Soft delete project
    const deletedAt = new Date().toISOString();

    // Optimistic UI updates
    setProjects(prev => prev.map(p => p.id === id ? { ...p, deletedAt } : p));
    setTasks(prev => prev.map(t => t.projectId === id ? { ...t, deletedAt } : t));
    setActiveProjectId(prev => prev === id ? null : prev);

    try {
      await api.projects.update(id, { deletedAt });
      // In a real app we would update all related tasks too, but for speed we rely on cascading or DB updates if necessary. The tasks also need soft delete:
      const projectTasks = tasks.filter(t => t.projectId === id);
      await Promise.all(projectTasks.map(t => api.tasks.update(t.id, { deletedAt })));
    } catch (e) {
      console.error("Failed to delete project", e);
    }
  };

  const handleArchiveProject = async (id: string) => {
    const archivedAt = new Date().toISOString();
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archivedAt } : p));
    setActiveProjectId(prev => prev === id ? null : prev);
    try {
      await api.projects.update(id, { archivedAt });
    } catch (e) { }
  };

  const handleRestoreProject = async (id: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, deletedAt: undefined, archivedAt: undefined } : p));
    setTasks(tasks.map(t => t.projectId === id && t.deletedAt ? { ...t, deletedAt: undefined } : t));
    try {
      await api.projects.update(id, { deletedAt: undefined, archivedAt: undefined });
      const projectTasks = tasks.filter(t => t.projectId === id && t.deletedAt);
      await Promise.all(projectTasks.map(t => api.tasks.update(t.id, { deletedAt: undefined })));
    } catch (e) { }
  };

  const handlePermanentDeleteProject = async (id: string) => {
    if (!confirm('Esta ação não pode ser desfeita. Confirmar?')) return;
    setProjects(projects.filter(p => p.id !== id));
    setTasks(tasks.filter(t => t.projectId !== id));
    // For now we don't have a real physical delete method in the API helper, but we could add one if needed. Or just leave softly deleted forever.
  };

  const handleCreateTask = (projectId?: string, isToday?: boolean) => {
    // We don't force a project anymore. If projectId is passed (e.g. from a specific project view), we use it.
    // Otherwise, it starts as undefined (No Project).
    const targetProjectId = projectId;

    // Create empty task but don't add to list yet
    const newTask: Task = {
      id: uuidv4(),
      projectId: targetProjectId,
      title: 'Nova Tarefa',
      status: 'todo',
      priority: 'none',
      assigneeId: currentUser?.id, // Default to current user
      isToday: isToday || false,
      subtasks: [],
      timeSpent: 0,
      createdAt: new Date().toISOString()
    };

    setIsNewTask(true);
    setSelectedTask(newTask);
  };

  const handleSaveNewTask = async (task: Task) => {
    try {
      const newTask = await api.tasks.create({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        startDate: task.startDate,
        endDate: task.endDate,
        assigneeId: task.assigneeId,
        isToday: task.isToday,
        timeSpent: task.timeSpent || 0
      });

      // Se houver subtarefas criadas na tela de 'nova tarefa' (salvas na memória)
      if (task.subtasks && task.subtasks.length > 0) {
        const createdSubtasks = await Promise.all(task.subtasks.map(st =>
          api.subtasks.create(newTask.id, {
            title: st.title,
            completed: st.completed,
            startDate: st.startDate,
            endDate: st.endDate,
            assigneeId: st.assigneeId,
            description: st.description,
            isToday: st.isToday,
            timeSpent: st.timeSpent || 0
          })
        ));
        newTask.subtasks = createdSubtasks;
      }

      setTasks(prev => [newTask, ...prev]);
      setIsNewTask(false);
      setSelectedTask(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    if (isNewTask && selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
      return;
    }

    // Find previous task to detect subtask changes
    const prevTask = tasks.find(t => t.id === updatedTask.id);

    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }

    try {
      await api.tasks.update(updatedTask.id, {
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        startDate: updatedTask.startDate,
        endDate: updatedTask.endDate,
        assigneeId: updatedTask.assigneeId,
        projectId: updatedTask.projectId,
        isToday: updatedTask.isToday,
        timeSpent: updatedTask.timeSpent
      });

      // Basic subtask sync: se for update, identificamos novas subtarefas (com id local)
      if (prevTask) {
        // Encontrar subtarefas deletadas
        const deletedSubtasks = prevTask.subtasks.filter(pst => !updatedTask.subtasks.find(ust => ust.id === pst.id));
        await Promise.all(deletedSubtasks.map(st => api.subtasks.delete(st.id)));

        // Encontrar novavs e atualizadas
        await Promise.all(updatedTask.subtasks.map(async st => {
          const isNewLocal = !st.id || !st.id.includes('-'); // Supabase usa UUID, id local estava usando math.random
          if (isNewLocal) {
            await api.subtasks.create(updatedTask.id, {
              title: st.title,
              completed: st.completed,
              startDate: st.startDate,
              endDate: st.endDate,
              assigneeId: st.assigneeId,
              description: st.description,
              isToday: st.isToday,
              timeSpent: st.timeSpent || 0
            });
          } else {
            await api.subtasks.update(st.id, {
              title: st.title,
              completed: st.completed,
              startDate: st.startDate,
              endDate: st.endDate,
              assigneeId: st.assigneeId,
              description: st.description,
              isToday: st.isToday,
              timeSpent: st.timeSpent
            });
          }
        }));
      }

    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTasksOrder = async (orderUpdates: { id: string, type: 'task' | 'subtask', todayOrder: number, parentTaskId?: string }[]) => {
    const newTasks = [...tasks];
    orderUpdates.forEach(update => {
      if (update.type === 'task') {
        const idx = newTasks.findIndex(t => t.id === update.id);
        if (idx !== -1) newTasks[idx] = { ...newTasks[idx], todayOrder: update.todayOrder };
      } else {
        const pIdx = newTasks.findIndex(t => t.id === update.parentTaskId);
        if (pIdx !== -1) {
          const sIdx = newTasks[pIdx].subtasks.findIndex(st => st.id === update.id);
          if (sIdx !== -1) {
            const updatedSubtasks = [...newTasks[pIdx].subtasks];
            updatedSubtasks[sIdx] = { ...updatedSubtasks[sIdx], todayOrder: update.todayOrder };
            newTasks[pIdx] = { ...newTasks[pIdx], subtasks: updatedSubtasks };
          }
        }
      }
    });

    setTasks(newTasks);

    try {
      await Promise.all(orderUpdates.map(u =>
        u.type === 'task'
          ? api.tasks.update(u.id, { todayOrder: u.todayOrder })
          : api.subtasks.update(u.id, { todayOrder: u.todayOrder })
      ));
    } catch (e) {
      console.error("Failed to update tasks order", e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Soft delete
    const deletedAt = new Date().toISOString();
    setTasks(tasks.map(t => t.id === taskId ? { ...t, deletedAt } : t));
    setSelectedTask(null);
    try {
      await api.tasks.update(taskId, { deletedAt });
    } catch (e) { }
  };

  const handleRestoreTask = async (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, deletedAt: undefined } : t));
    try {
      await api.tasks.update(taskId, { deletedAt: undefined });
    } catch (e) { }
  };

  const handlePermanentDeleteTask = async (taskId: string) => {
    if (!confirm('Esta ação não pode ser desfeita. Confirmar?')) return;
    setTasks(tasks.filter(t => t.id !== taskId));
    // Sem endpoint na v1 pra delete hard, vamos deixar soft deleted ou adicionar se precisar.
  };

  const handleAddUser = (user: User) => {
    setUsers([...users, user]);
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    try {
      await api.users.setRole(updatedUser.id, updatedUser.role);
    } catch (e) { }
  };

  // Timer Logic
  const handleStartTimer = (taskId: string, subtaskId?: string) => {
    // Stop current timer if running
    if (activeTimer) {
      handleStopTimer();
    }
    setActiveTimer({
      taskId,
      subtaskId,
      startTime: Date.now(),
      accumulatedTime: 0
    });
  };

  const handlePauseTimer = () => {
    if (!activeTimer || !activeTimer.startTime) return;
    const now = Date.now();
    const sessionElapsed = Math.floor((now - activeTimer.startTime) / 1000);
    const startTimeStr = new Date(activeTimer.startTime).toISOString();
    const endTimeStr = new Date(now).toISOString();

    // Update task/subtask locally and in DB
    const task = tasks.find(t => t.id === activeTimer.taskId);
    if (task) {
      if (activeTimer.subtaskId) {
        const updatedSubtasks = task.subtasks.map(s =>
          s.id === activeTimer.subtaskId
            ? { ...s, timeSpent: (s.timeSpent || 0) + sessionElapsed }
            : s
        );
        handleUpdateTask({ ...task, subtasks: updatedSubtasks });
      } else {
        handleUpdateTask({ ...task, timeSpent: task.timeSpent + sessionElapsed });
      }

      // Log this segment to DB
      if (currentUser?.id) {
        api.timeLogs.create({
          userId: currentUser.id,
          taskId: activeTimer.taskId,
          projectId: task.projectId,
          subtaskId: activeTimer.subtaskId,
          durationSeconds: sessionElapsed,
          startTime: startTimeStr,
          endTime: endTimeStr
        }).catch(console.error);
      }
    }

    setActiveTimer({
      ...activeTimer,
      startTime: null,
      accumulatedTime: 0 // Reset since we already saved this time to the task record
    });
  };

  const handleResumeTimer = () => {
    if (!activeTimer || activeTimer.startTime) return;
    setActiveTimer({
      ...activeTimer,
      startTime: Date.now()
    });
  };

  const handleStopTimer = () => {
    if (!activeTimer) return;

    const now = Date.now();
    const isRunning = !!activeTimer.startTime;

    // If it was running, we log the last segment
    if (isRunning && activeTimer.startTime) {
      const sessionElapsed = Math.floor((now - activeTimer.startTime) / 1000);
      const startTimeStr = new Date(activeTimer.startTime).toISOString();
      const endTimeStr = new Date(now).toISOString();

      const task = tasks.find(t => t.id === activeTimer.taskId);
      if (task) {
        if (activeTimer.subtaskId) {
          const updatedSubtasks = task.subtasks.map(s =>
            s.id === activeTimer.subtaskId
              ? { ...s, timeSpent: (s.timeSpent || 0) + sessionElapsed }
              : s
          );
          handleUpdateTask({ ...task, subtasks: updatedSubtasks });
        } else {
          handleUpdateTask({ ...task, timeSpent: task.timeSpent + sessionElapsed });
        }

        if (currentUser?.id) {
          api.timeLogs.create({
            userId: currentUser.id,
            taskId: activeTimer.taskId,
            projectId: task.projectId,
            subtaskId: activeTimer.subtaskId,
            durationSeconds: sessionElapsed,
            startTime: startTimeStr,
            endTime: endTimeStr
          }).catch(console.error);
        }
      }
    }

    setActiveTimer(null);
  };

  const activeProject = activeProjectId ? projects.find(p => p.id === activeProjectId) : undefined;
  // Filter out deleted and archived projects for sidebar
  const visibleProjects = projects.filter(p => !p.deletedAt && !p.archivedAt);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return <Auth />;

  if (!currentUser) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar
        projects={visibleProjects}
        activeProjectId={activeProjectId}
        currentView={currentView}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          setCurrentView('project');
        }}
        onCreateProject={() => {
          setProjectToEdit(null);
          setIsProjectModalOpen(true);
        }}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onArchiveProject={handleArchiveProject}
        currentUser={currentUser}
        isDarkMode={theme === 'dark'}
        toggleTheme={toggleTheme}
        onOpenSettings={() => setIsUserModalOpen(true)}
        onOpenTimeReports={() => setCurrentView('time-reports')}
        onOpenTrash={() => setCurrentView('trash')}
        onOpenSearch={() => setCurrentView('search')}
        onOpenMyTasks={() => setCurrentView('my-tasks')}
        onOpenWeekly={() => setCurrentView('weekly')}
        onLogout={handleLogout}
        onEditProject={(project) => {
          setProjectToEdit(project);
          setIsProjectModalOpen(true);
        }}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {currentView === 'project' && (
          <ProjectView
            projects={visibleProjects}
            activeProjectId={activeProjectId}
            tasks={tasks}
            users={users}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onUpdateTask={handleUpdateTask}
            onCreateTask={handleCreateTask}
            onSaveNewTask={handleSaveNewTask}
            onTaskClick={(task, subtaskId) => {
              setSelectedTask(task);
              setInitialSubtaskId(subtaskId || null);
            }}
            onDeleteTask={handleDeleteTask}
            onEditProject={(project) => {
              setProjectToEdit(project);
              setIsProjectModalOpen(true);
            }}
          />
        )}

        {currentView === 'trash' && (
          <ArchiveView
            tasks={tasks}
            projects={projects}
            onRestoreTask={handleRestoreTask}
            onPermanentDeleteTask={handlePermanentDeleteTask}
            onRestoreProject={handleRestoreProject}
            onPermanentDeleteProject={handlePermanentDeleteProject}
          />
        )}

        {currentView === 'time-reports' && (
          <TimeReportsView
            projects={visibleProjects}
            tasks={tasks}
            users={users}
            onUpdateTask={handleUpdateTask}
            onTaskClick={(task, subtaskId) => {
              setSelectedTask(task);
              setInitialSubtaskId(subtaskId || null);
            }}
            onProjectClick={(projectId) => {
              setActiveProjectId(projectId);
              setCurrentView('project');
            }}
          />
        )}

        {currentView === 'search' && (
          <SearchView
            projects={visibleProjects}
            tasks={tasks}
            onTaskClick={setSelectedTask}
            onProjectClick={(id) => {
              setActiveProjectId(id);
              setCurrentView('project');
            }}
          />
        )}

        {currentView === 'my-tasks' && (
          <MyTasksView
            tasks={tasks}
            projects={visibleProjects}
            currentUser={currentUser}
            onTaskClick={setSelectedTask}
            onUpdateTask={handleUpdateTask}
            onCreateTask={handleCreateTask}
            onSaveNewTask={handleSaveNewTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTasksOrder={handleUpdateTasksOrder}
          />
        )}
        {currentView === 'weekly' && (
          <WeeklyView
            currentUser={currentUser}
          />
        )}
      </main>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          users={users}
          projects={visibleProjects}
          isOpen={!!selectedTask}
          isNew={isNewTask}
          onClose={() => {
            setSelectedTask(null);
            setInitialSubtaskId(null);
            setIsNewTask(false);
          }}
          onUpdate={handleUpdateTask}
          onSaveNew={handleSaveNewTask}
          onDelete={(id) => {
            if (isNewTask) {
              setSelectedTask(null);
              setIsNewTask(false);
            } else {
              handleDeleteTask(id);
            }
          }}
          activeTimer={activeTimer}
          onStartTimer={handleStartTimer}
          onPauseTimer={handlePauseTimer}
          onResumeTimer={handleResumeTimer}
          onStopTimer={handleStopTimer}
          initialSubtaskId={initialSubtaskId}
        />
      )}

      <UserManagementModal
        users={users}
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        projectToEdit={projectToEdit}
      />

      <GlobalTimer
        activeTimer={activeTimer}
        tasks={tasks}
        projects={projects}
        onStop={handleStopTimer}
        onPause={handlePauseTimer}
        onResume={handleResumeTimer}
        onMaximize={setSelectedTask}
      />
    </div>
  );
}

