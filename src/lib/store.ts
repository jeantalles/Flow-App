import { v4 as uuidv4 } from 'uuid';

// Types
export type ViewMode = 'list' | 'kanban' | 'gantt';
export type ThemeMode = 'light' | 'dark';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member';
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  startDate?: string;
  endDate?: string;
  assigneeId?: string;
  description?: string;
  timeSpent: number; // seconds
  isToday?: boolean;
  todayOrder?: number;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'none';
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  assigneeId?: string;
  subtasks: Subtask[];
  timeSpent: number; // in seconds
  parentId?: string;
  isToday?: boolean;
  createdAt: string;
  deletedAt?: string; // For soft delete
  todayOrder?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  deletedAt?: string; // Soft delete
  archivedAt?: string; // For archiving projects
  deadline?: string; // ISO date string for project completion deadline
}

export interface ActiveTimer {
  taskId: string;
  subtaskId?: string;
  startTime: number | null; // Timestamp when started/resumed. Null if paused.
  accumulatedTime: number; // Seconds accumulated before current session
}

export interface DataStore {
  getProjects: () => Project[];
  saveProjects: (projects: Project[]) => void;
  getTasks: () => Task[];
  saveTasks: (tasks: Task[]) => void;
  getUsers: () => User[];
  saveUsers: (users: User[]) => void;
  getTheme: () => ThemeMode;
  saveTheme: (theme: ThemeMode) => void;
  getActiveTimer: () => ActiveTimer | null;
  saveActiveTimer: (timer: ActiveTimer | null) => void;
}

// Initial Mock Data
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Ana Silva', email: 'ana@studio.com', role: 'admin', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Carlos Souza', email: 'carlos@studio.com', role: 'member', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Beatriz Lima', email: 'bia@studio.com', role: 'member', avatar: 'https://i.pravatar.cc/150?u=3' },
];

const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: 'Rebranding Cliente X', color: '#3b82f6', createdAt: new Date().toISOString() },
  { id: 'p2', name: 'Site Institucional Y', color: '#10b981', createdAt: new Date().toISOString() },
];

const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Pesquisa de Mercado',
    description: 'Analisar concorrentes diretos e indiretos.',
    status: 'done',
    priority: 'high',
    startDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    endDate: new Date(Date.now() - 86400000).toISOString(),
    assigneeId: '1',
    subtasks: [
      { id: 'st1', title: 'Coletar logos', completed: true, timeSpent: 0 },
      { id: 'st2', title: 'Analisar paletas de cores', completed: true, timeSpent: 0 },
    ],
    timeSpent: 3600,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    projectId: 'p1',
    title: 'Desenvolvimento de Logo',
    description: 'Criar 3 opções de logo baseadas no briefing.',
    status: 'in-progress',
    priority: 'high',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    assigneeId: '2',
    subtasks: [
      { id: 'st3', title: 'Rascunhos iniciais', completed: true, timeSpent: 0 },
      { id: 'st4', title: 'Vetorização', completed: false, timeSpent: 0 },
    ],
    timeSpent: 1800,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't3',
    projectId: 'p2',
    title: 'Wireframes',
    status: 'todo',
    priority: 'medium',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    assigneeId: '3',
    subtasks: [],
    timeSpent: 0,
    createdAt: new Date().toISOString(),
  },
];

// Storage Keys
const STORAGE_KEYS = {
  PROJECTS: 'studioflow_projects',
  TASKS: 'studioflow_tasks',
  USERS: 'studioflow_users',
  THEME: 'studioflow_theme',
  ACTIVE_TIMER: 'studioflow_active_timer',
};

// Data Store Service
export const dataStore: DataStore = {
  getProjects: (): Project[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return stored ? JSON.parse(stored) : INITIAL_PROJECTS;
  },
  saveProjects: (projects: Project[]) => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },
  getTasks: (): Task[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
    return stored ? JSON.parse(stored) : INITIAL_TASKS;
  },
  saveTasks: (tasks: Task[]) => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },
  getUsers: (): User[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    return stored ? JSON.parse(stored) : INITIAL_USERS;
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  getTheme: (): ThemeMode => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode) || 'light';
  },
  saveTheme: (theme: ThemeMode) => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },
  getActiveTimer: (): ActiveTimer | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER);
    return stored ? JSON.parse(stored) : null;
  },
  saveActiveTimer: (timer: ActiveTimer | null) => {
    if (timer) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify(timer));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
    }
  },
};
