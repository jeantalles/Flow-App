import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { format, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Save } from 'lucide-react';
import { Button } from './ui-elements';
import { api } from '@/lib/api';
import { User } from '@/lib/store';

interface WeeklyViewProps {
    currentUser: User;
}

export function WeeklyView({ currentUser }: WeeklyViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Get Monday of current week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2],
                },
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Placeholder.configure({
                placeholder: 'Escreva suas principais prioridades e demandas da semana...',
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[500px]',
            },
        },
    });

    const loadNote = useCallback(async () => {
        setIsLoading(true);
        try {
            const note = await api.weeklyNotes.fetchByWeek(weekStartStr, currentUser.id);
            if (note && editor) {
                editor.commands.setContent(note.content);
            } else if (editor) {
                editor.commands.setContent('');
            }
        } catch (error) {
            console.error('Error loading weekly note:', error);
        } finally {
            setIsLoading(false);
        }
    }, [weekStartStr, currentUser.id, editor]);

    useEffect(() => {
        if (editor) {
            loadNote();
        }
    }, [loadNote, editor]);

    // Auto-save when content changes (debounced)
    useEffect(() => {
        if (!editor) return;

        const timer = setTimeout(() => {
            handleSave();
        }, 1000); // 1-second debounce to avoid too many writes

        const handleUpdate = () => {
            // This is just to trigger the effect
        };

        editor.on('update', handleUpdate);
        return () => {
            clearTimeout(timer);
            editor.off('update', handleUpdate);
        };
    }, [editor, editor?.getHTML()]); // Re-run when content actually changes

    const handleSave = async () => {
        if (!editor || isSaving) return;
        setIsSaving(true);
        try {
            const content = editor.getJSON();
            await api.weeklyNotes.upsert(weekStartStr, currentUser.id, content);
            setLastSaved(new Date());
        } catch (error) {
            console.error('Error saving weekly note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    return (
        <div className="flex flex-col h-full bg-[var(--background)] animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-[var(--sidebar)]/30 backdrop-blur-sm border-b border-[var(--border)] sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
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

                    <div className="h-8 w-[1px] bg-[var(--border)]" />

                    <div className="flex items-center gap-4">
                        {lastSaved && (
                            <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-widest bg-[var(--accent)] px-2 py-1 rounded-md">
                                Salvo {format(lastSaved, 'HH:mm')}
                            </span>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-6 h-10 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto px-8 py-12 flex justify-center custom-scrollbar">
                <div className="w-full max-w-3xl bg-[var(--background)] rounded-2xl border border-[var(--border)] shadow-sm p-10 min-h-[700px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 gap-6 text-[var(--muted-foreground)]">
                            <div className="relative">
                                <Loader2 size={48} className="animate-spin text-indigo-500" />
                                <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse"></div>
                            </div>
                            <p className="font-medium animate-pulse">Organizando sua produtividade...</p>
                        </div>
                    ) : (
                        <div className="prose prose-indigo dark:prose-invert max-w-none tiptap-weekly">
                            <EditorContent editor={editor} />
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .tiptap-weekly .tiptap h2 {
          font-size: 2.25rem;
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
          margin-top: 1.5rem;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.75rem;
          gap: 0.5rem;
        }
        .tiptap-weekly .tiptap ul[data-type="taskList"] label {
          margin-top: 0.25rem;
          cursor: pointer;
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
          background: #4f46e5;
          border-color: #4f46e5;
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--muted-foreground);
        }
      `}</style>
        </div>
    );
}
