import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { supabase } from '@/lib/supabase';

const TaskItemEnter = Extension.create({
    name: 'taskItemEnter',
    priority: 1000,
    addKeyboardShortcuts() {
        return {
            Enter: () => {
                const { state } = this.editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;

                // Verifica se estamos dentro de um taskItem
                let taskItemDepth = -1;
                for (let d = $from.depth; d >= 0; d--) {
                    if ($from.node(d).type.name === 'taskItem') {
                        taskItemDepth = d;
                        break;
                    }
                }

                if (taskItemDepth === -1) return false;

                // Se o parágrafo atual está vazio, insere novo taskItem manualmente
                // (evita o comportamento padrão que "levanta" o item e apaga o checkbox)
                if ($from.parent.content.size === 0) {
                    const posAfter = $from.after(taskItemDepth);
                    return this.editor
                        .chain()
                        .insertContentAt(posAfter, {
                            type: 'taskItem',
                            attrs: { checked: false },
                            content: [{ type: 'paragraph' }],
                        })
                        .setTextSelection(posAfter + 2)
                        .run();
                }

                // Se tem conteúdo, usa o split padrão
                return this.editor.commands.splitListItem('taskItem');
            },
        };
    },
});
import { format, startOfWeek, addWeeks, subWeeks, addDays, getWeekOfMonth, isSameWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, LayoutList, ArrowLeft } from 'lucide-react';
import { Button } from './ui-elements';
import { api } from '@/lib/api';
import { User } from '@/lib/store';

interface WeeklyViewProps {
    currentUser: User;
}

interface WeekItem {
    date: Date;
    label: string;
    dateStr: string;
    weekStartStr: string;
}

const WEEKLY_TEMPLATE = {
    type: 'doc',
    content: [
        {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Jean' }],
        },
        {
            type: 'taskList',
            content: [
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
            ],
        },
        {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Marcy' }],
        },
        {
            type: 'taskList',
            content: [
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
            ],
        },
        {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Pedro' }],
        },
        {
            type: 'taskList',
            content: [
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
                { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
            ],
        },
    ],
};

function generateWeeks(): WeekItem[] {
    const today = new Date();
    const rangeStart = subMonths(today, 3);
    const rangeEnd = addWeeks(today, 4);

    let current = startOfWeek(rangeStart, { weekStartsOn: 1 });
    const weeks: WeekItem[] = [];

    while (current <= rangeEnd) {
        const weekNum = getWeekOfMonth(current, { weekStartsOn: 1 });
        const monthName = format(current, 'MMMM', { locale: ptBR });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        weeks.push({
            date: new Date(current),
            label: `Semana ${weekNum} – ${capitalizedMonth}`,
            dateStr: format(current, 'dd/MM/yyyy'),
            weekStartStr: format(current, 'yyyy-MM-dd'),
        });
        current = addWeeks(current, 1);
    }

    return weeks;
}

export function WeeklyView({ currentUser }: WeeklyViewProps) {
    const [subView, setSubView] = useState<'editor' | 'list'>('editor');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const lastSavedContentRef = useRef<any>(null);
    const isLoadingRef = useRef(true);
    const isSavingRef = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2] },
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TaskItemEnter,
            Placeholder.configure({
                placeholder: 'Escreva suas principais prioridades e demandas da semana...',
            }),
        ],
        content: '',
        editorProps: {
            attributes: { class: 'focus:outline-none min-h-[500px]' },
        },
    });

    // Limpa notas antigas ao montar
    useEffect(() => {
        api.weeklyNotes.deleteOlderThan(weekStartStr).catch(console.error);
    }, []);

    const loadNote = useCallback(async () => {
        if (!editor) return;
        isLoadingRef.current = true;
        setIsLoading(true);
        try {
            const note = await api.weeklyNotes.fetchSharedByWeek(weekStartStr);
            if (note && note.content) {
                const firstNode = note.content?.content?.[0];
                const hasTemplate = firstNode?.type === 'heading';
                if (hasTemplate) {
                    editor.commands.setContent(note.content);
                    lastSavedContentRef.current = note.content;
                } else {
                    await api.weeklyNotes.deleteByWeek(weekStartStr);
                    editor.commands.setContent(WEEKLY_TEMPLATE);
                    lastSavedContentRef.current = WEEKLY_TEMPLATE;
                }
            } else {
                editor.commands.setContent(WEEKLY_TEMPLATE);
                lastSavedContentRef.current = WEEKLY_TEMPLATE;
            }
        } catch (error) {
            console.error('Error loading weekly note:', error);
            editor.commands.setContent(WEEKLY_TEMPLATE);
        } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
        }
    }, [weekStartStr, editor]);

    useEffect(() => {
        if (editor) {
            loadNote();
        }
    }, [loadNote, editor]);

    // Mantém handleSaveRef sempre atualizado para evitar closures stale
    useEffect(() => {
        handleSaveRef.current = handleSave;
    });

    // Auto-save com debounce via evento nativo do editor
    useEffect(() => {
        if (!editor) return;
        const handleUpdate = () => {
            if (isLoadingRef.current) return;
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => handleSaveRef.current(), 1000);
        };
        editor.on('update', handleUpdate);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            editor.off('update', handleUpdate);
        };
    }, [editor]);

    // Realtime: recebe alterações de outros usuários
    useEffect(() => {
        if (!editor) return;

        const channel = supabase
            .channel(`weekly-notes-${weekStartStr}`)
            .on('postgres_changes' as any, {
                event: '*',
                schema: 'public',
                table: 'weekly_notes',
                filter: `week_start_date=eq.${weekStartStr}`,
            }, (payload: any) => {
                const incoming = payload.new?.content;
                if (!incoming) return;
                if (isLoadingRef.current) return;
                // Ignora se for o nosso próprio save
                if (JSON.stringify(incoming) === JSON.stringify(lastSavedContentRef.current)) return;
                editor.commands.setContent(incoming);
                lastSavedContentRef.current = incoming;
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [weekStartStr, editor]);

    const handleSave = async () => {
        if (!editor || isSavingRef.current || isLoadingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const content = editor.getJSON();
            await api.weeklyNotes.upsertShared(weekStartStr, currentUser.id, content);
            lastSavedContentRef.current = content;
        } catch (error) {
            console.error('Error saving weekly note:', error);
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const openWeek = (date: Date) => {
        setCurrentDate(date);
        setSubView('editor');
    };

    const sharedStyles = `
        .tiptap-weekly .tiptap h2 {
          font-size: 1.25rem;
          font-weight: 800;
          margin-top: 2rem;
          margin-bottom: 1.5rem;
          letter-spacing: -0.025em;
          color: var(--foreground);
        }
        .tiptap-weekly .tiptap p {
          font-size: 1.125rem;
          line-height: 1.75;
          margin-bottom: 1rem;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
          margin-top: 0.5rem;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.35rem;
          gap: 0.5rem;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] label {
          margin-top: 0.25rem;
          cursor: pointer;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] li > div {
          flex: 1;
          cursor: text;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] li > div p {
          cursor: text;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] input[type="checkbox"] {
          appearance: none;
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] input[type="checkbox"]:checked {
          background: #165DFC;
          border-color: #165DFC;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] input[type="checkbox"]:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 0.875rem;
          font-weight: bold;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] li[data-checked="true"] > div > p {
          text-decoration: line-through;
          color: var(--muted-foreground);
          opacity: 0.5;
          transition: all 0.2s ease;
        }
        .tiptap-weekly .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--muted-foreground);
          opacity: 0.4;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
    `;

    if (subView === 'list') {
        const weeks = generateWeeks();
        const today = new Date();

        return (
            <div className="flex flex-col h-full bg-[var(--background)] animate-in fade-in duration-300">
                <div className="flex items-center justify-between px-8 py-6 bg-[var(--sidebar)]/30 backdrop-blur-sm border-b border-[var(--border)] sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#165DFC] rounded-xl text-white shadow-lg shadow-[#165DFC]/20">
                            <CalendarIcon size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Weekly</h1>
                            <p className="text-sm text-[var(--muted-foreground)] font-medium">Todas as semanas</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => setSubView('editor')}
                        className="gap-2 text-sm font-medium hover:bg-[var(--accent)]"
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto">
                        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                            <div className="grid grid-cols-[1fr_160px] bg-[var(--accent)]/40 border-b border-[var(--border)]">
                                <div className="px-4 py-3 border-r border-[var(--border)]">
                                    <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Nome</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-3">
                                    <CalendarIcon size={13} className="text-[var(--muted-foreground)]" />
                                    <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Data</span>
                                </div>
                            </div>

                            <div className="divide-y divide-[var(--border)]">
                                {weeks.map((week) => {
                                    const isCurrentWeek = isSameWeek(week.date, today, { weekStartsOn: 1 });
                                    return (
                                        <button
                                            key={week.weekStartStr}
                                            onClick={() => openWeek(week.date)}
                                            className={`w-full grid grid-cols-[1fr_160px] text-left transition-colors ${
                                                isCurrentWeek
                                                    ? 'bg-[#165DFC]/5 hover:bg-[#165DFC]/10'
                                                    : 'hover:bg-[var(--accent)]/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 px-4 py-3 border-r border-[var(--border)]">
                                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)] opacity-50">
                                                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                </svg>
                                                <span className={`text-sm font-medium ${isCurrentWeek ? 'text-[#165DFC]' : 'text-[var(--foreground)]'}`}>
                                                    {week.label}
                                                </span>
                                                {isCurrentWeek && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#165DFC]/10 text-[#165DFC] px-2 py-0.5 rounded-full">
                                                        Atual
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center px-4 py-3">
                                                <span className="text-sm text-[var(--muted-foreground)]">{week.dateStr}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <style>{sharedStyles}</style>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[var(--background)] animate-in fade-in duration-500">
            <div className="flex items-center justify-between px-8 py-6 bg-[var(--sidebar)]/30 backdrop-blur-sm border-b border-[var(--border)] sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#165DFC] rounded-xl text-white shadow-lg shadow-[#165DFC]/20">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Weekly Focus</h1>
                        <p className="text-sm text-[var(--muted-foreground)] font-medium">
                            {format(weekStart, "d 'de' MMMM", { locale: ptBR })} — {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setSubView('list')}
                        className="gap-2 text-sm font-medium hover:bg-[var(--accent)] border border-[var(--border)] h-9 px-3 rounded-lg"
                    >
                        <LayoutList size={15} />
                        Ver semanas
                    </Button>

                    <div className="h-8 w-[1px] bg-[var(--border)]" />

                    <div className="flex items-center bg-[var(--accent)]/50 rounded-xl p-1 border border-[var(--border)]">
                        <Button variant="ghost" size="icon" onClick={prevWeek} className="h-9 w-9 hover:bg-[var(--background)] rounded-lg">
                            <ChevronLeft size={20} />
                        </Button>
                        <Button variant="ghost" className="h-9 px-4 text-xs font-bold uppercase tracking-wider hover:bg-[var(--background)] rounded-lg" onClick={goToToday}>
                            Hoje
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextWeek} className="h-9 w-9 hover:bg-[var(--background)] rounded-lg">
                            <ChevronRight size={20} />
                        </Button>
                    </div>

                    {isSaving && (
                        <Loader2 size={16} className="animate-spin text-[var(--muted-foreground)]" />
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-10 custom-scrollbar">
                <div className="w-full max-w-3xl pl-[80px] pr-12 py-2 min-h-[700px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 gap-6 text-[var(--muted-foreground)]">
                            <div className="relative">
                                <Loader2 size={48} className="animate-spin text-[#165DFC]" />
                                <div className="absolute inset-0 blur-xl bg-[#165DFC]/20 animate-pulse"></div>
                            </div>
                            <p className="font-medium animate-pulse">Organizando sua produtividade...</p>
                        </div>
                    ) : (
                        <div className="prose prose-blue dark:prose-invert max-w-none tiptap-weekly">
                            <EditorContent editor={editor} />
                        </div>
                    )}
                </div>
            </div>

            <style>{sharedStyles}</style>
        </div>
    );
}
