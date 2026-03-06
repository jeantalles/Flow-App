import React, { useState, useEffect } from 'react';
import { Project } from '@/lib/store';
import { Button, Modal } from './ui-elements';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  projectToEdit?: Project | null;
}

const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
];

export function ProjectModal({ isOpen, onClose, onSave, projectToEdit }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[6]); // Default blue
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setColor(projectToEdit.color);
        setDeadline(projectToEdit.deadline || '');
      } else {
        setName('');
        setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
        setDeadline('');
      }
    }
  }, [isOpen, projectToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, color, deadline: deadline || undefined });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={projectToEdit ? 'Editar Projeto' : 'Novo Projeto'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome do Projeto</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Rebranding Cliente X"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Data de Conclusão (Deadline)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Cor</label>
          <div className="grid grid-cols-5 gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-8 h-8 rounded-full transition-all flex items-center justify-center hover:scale-110",
                  color === c ? "ring-2 ring-offset-2 ring-[var(--foreground)] scale-110" : ""
                )}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check size={14} className="text-white drop-shadow-md" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {projectToEdit ? 'Salvar Alterações' : 'Criar Projeto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

