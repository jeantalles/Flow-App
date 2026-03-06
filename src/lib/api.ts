import { supabase } from './supabase';
import type { Database } from './database.types';
import { Project, Task, Subtask, User, ActiveTimer } from './store'; // Keep types from store for compatibility, but map them

type DbProject = Database['public']['Tables']['projects']['Row'];
type DbTask = Database['public']['Tables']['tasks']['Row'];
type DbSubtask = Database['public']['Tables']['subtasks']['Row'];
type DbUser = Database['public']['Tables']['users']['Row'];

// Mapper functions to keep existing component interfaces compatible
const mapUser = (dbUser: DbUser): User => ({
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    avatar: dbUser.avatar || undefined,
    role: dbUser.role as 'admin' | 'member',
});

const mapProject = (dbProject: DbProject): Project => ({
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description || undefined,
    color: dbProject.color,
    createdAt: dbProject.created_at,
    deletedAt: dbProject.deleted_at || undefined,
    archivedAt: dbProject.archived_at || undefined,
    deadline: dbProject.deadline || undefined,
});

const mapSubtask = (dbSubtask: DbSubtask): Subtask => ({
    id: dbSubtask.id,
    title: dbSubtask.title,
    completed: dbSubtask.completed,
    startDate: dbSubtask.start_date || undefined,
    endDate: dbSubtask.end_date || undefined,
    assigneeId: dbSubtask.assignee_id || undefined,
    description: dbSubtask.description || undefined,
    timeSpent: dbSubtask.time_spent,
    isToday: dbSubtask.is_today || undefined,
    todayOrder: dbSubtask.today_order ?? undefined,
});

export const api = {
    users: {
        async fetchAll() {
            const { data, error } = await supabase.from('users').select('*');
            if (error) throw error;
            return (data || []).map(mapUser);
        },
        async setRole(userId: string, role: 'admin' | 'member') {
            const { error } = await supabase.from('users').update({ role }).eq('id', userId);
            if (error) throw error;
        }
    },

    projects: {
        async fetchAll() {
            const { data, error } = await supabase.from('projects').select('*');
            if (error) throw error;
            return (data || []).map(mapProject);
        },
        async fetchArchivedAndDeleted() {
            const { data, error } = await supabase.from('projects').select('*').not('deleted_at', 'is', null);
            if (error) throw error;
            const { data: archived } = await supabase.from('projects').select('*').not('archived_at', 'is', null).is('deleted_at', null);
            return [...(data || []), ...(archived || [])].map(mapProject);
        },
        async create(project: Omit<Project, 'id' | 'createdAt'>) {
            const { data, error } = await supabase.from('projects').insert({
                name: project.name,
                description: project.description,
                color: project.color,
                deadline: project.deadline
            }).select().single();
            if (error) throw error;
            return mapProject(data);
        },
        async update(id: string, updates: Partial<Project>) {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.color !== undefined) dbUpdates.color = updates.color;
            if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
            if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt;
            if (updates.deletedAt !== undefined) dbUpdates.deleted_at = updates.deletedAt;

            const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', id).select().single();
            if (error) throw error;
            return mapProject(data);
        },
    },

    tasks: {
        // Because Tasks have subtasks, we fetch them joined
        async fetchAll() {
            const { data, error } = await supabase.from('tasks').select(`
        *,
        subtasks (*)
      `);

            if (error) throw error;

            return (data || []).map((dbTask: any) => ({
                id: dbTask.id,
                projectId: dbTask.project_id || undefined,
                title: dbTask.title,
                description: dbTask.description || undefined,
                status: dbTask.status,
                priority: dbTask.priority,
                startDate: dbTask.start_date || undefined,
                endDate: dbTask.end_date || undefined,
                assigneeId: dbTask.assignee_id || undefined,
                timeSpent: dbTask.time_spent,
                parentId: dbTask.parent_id || undefined,
                isToday: dbTask.is_today || undefined,
                todayOrder: dbTask.today_order ?? undefined,
                createdAt: dbTask.created_at,
                deletedAt: dbTask.deleted_at || undefined,
                subtasks: (dbTask.subtasks || []).map(mapSubtask)
            } as Task));
        },

        async create(task: Omit<Task, 'id' | 'createdAt' | 'subtasks'>) {
            const { data, error } = await supabase.from('tasks').insert({
                project_id: task.projectId,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                start_date: task.startDate,
                end_date: task.endDate,
                assignee_id: task.assigneeId,
                parent_id: task.parentId,
                is_today: task.isToday,
                today_order: task.todayOrder
            }).select(`*, subtasks (*)`).single();

            if (error) throw error;
            return {
                id: data.id,
                projectId: data.project_id || undefined,
                title: data.title,
                description: data.description || undefined,
                status: data.status,
                priority: data.priority,
                startDate: data.start_date || undefined,
                endDate: data.end_date || undefined,
                assigneeId: data.assignee_id || undefined,
                timeSpent: data.time_spent,
                parentId: data.parent_id || undefined,
                isToday: data.is_today || undefined,
                todayOrder: data.today_order ?? undefined,
                createdAt: data.created_at,
                deletedAt: data.deleted_at || undefined,
                subtasks: []
            } as Task;
        },

        async update(id: string, updates: Partial<Task>) {
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
            if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
            if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
            if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
            if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
            if (updates.isToday !== undefined) dbUpdates.is_today = updates.isToday;
            if (updates.todayOrder !== undefined) dbUpdates.today_order = updates.todayOrder;
            if (updates.deletedAt !== undefined) dbUpdates.deleted_at = updates.deletedAt;
            if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent;

            const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
            if (error) throw error;
        }
    },

    subtasks: {
        async create(taskId: string, subtask: Omit<Subtask, 'id'>, projectId?: string) {
            const { data, error } = await supabase.from('subtasks').insert({
                task_id: taskId,
                project_id: projectId,
                title: subtask.title,
                completed: subtask.completed,
                start_date: subtask.startDate,
                end_date: subtask.endDate,
                assignee_id: subtask.assigneeId,
                description: subtask.description,
                is_today: subtask.isToday,
                today_order: subtask.todayOrder
            }).select().single();
            if (error) throw error;
            return mapSubtask(data);
        },
        async update(id: string, updates: Partial<Subtask>) {
            const dbUpdates: any = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
            if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
            if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
            if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.isToday !== undefined) dbUpdates.is_today = updates.isToday;
            if (updates.todayOrder !== undefined) dbUpdates.today_order = updates.todayOrder;
            if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent;

            const { error } = await supabase.from('subtasks').update(dbUpdates).eq('id', id);
            if (error) throw error;
        },
        async delete(id: string) {
            const { error } = await supabase.from('subtasks').delete().eq('id', id);
            if (error) throw error;
        }
    },

    timeLogs: {
        async create(log: { userId: string, taskId: string, subtaskId?: string, durationSeconds: number, startTime: string, endTime: string }) {
            const { error } = await supabase.from('time_logs').insert({
                user_id: log.userId,
                task_id: log.taskId,
                subtask_id: log.subtaskId,
                duration_seconds: log.durationSeconds,
                start_time: log.startTime,
                end_time: log.endTime
            });
            if (error) throw error;
        }
    }
};
