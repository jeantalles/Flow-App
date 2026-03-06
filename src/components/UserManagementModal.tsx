import React, { useState } from 'react';
import { User } from '@/lib/store';
import { Button, Badge, Modal } from './ui-elements';
import { Trash2, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface UserManagementModalProps {
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export function UserManagementModal({ users, isOpen, onClose, onAddUser, onDeleteUser, currentUser, onUpdateUser }: UserManagementModalProps) {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [newUserAvatar, setNewUserAvatar] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const newUserFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isNewUser: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isNewUser) {
          setNewUserAvatar(base64String);
        } else if (editingUser) {
          onUpdateUser({ ...editingUser, avatar: base64String });
          setEditingUser(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const handleAdd = () => {
    if (!newUserEmail || !newUserName) return;

    const newUser: User = {
      id: uuidv4(),
      email: newUserEmail,
      name: newUserName,
      role: newUserRole,
      avatar: newUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserName)}&background=random`
    };

    onAddUser(newUser);
    setNewUserEmail('');
    setNewUserName('');
    setNewUserRole('member');
    setNewUserAvatar(null);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Equipe" maxWidth="2xl">

      <div className="p-6 overflow-y-auto flex-1 space-y-8">
        {/* Current User Profile */}
        <div className="bg-[var(--muted)]/30 p-4 rounded-lg border border-[var(--border)]">
          <h3 className="font-semibold mb-4">Seu Perfil</h3>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-16 h-16 rounded-full border-2 border-[var(--border)] object-cover" />
              <button
                onClick={() => {
                  setEditingUser(currentUser);
                  fileInputRef.current?.click();
                }}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase"
              >
                Upload
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </div>
            <div>
              <p className="font-bold text-lg">{currentUser.name}</p>
              <p className="text-[var(--muted-foreground)]">{currentUser.email}</p>
              <Badge className="mt-1">{currentUser.role === 'admin' ? 'Administrador' : 'Membro'}</Badge>
            </div>
          </div>
        </div>

        {/* Add New User */}
        {currentUser.role === 'admin' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Adicionar Membro</h3>
            <div className="flex gap-4 items-start">
              <div
                className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--primary)] transition-colors overflow-hidden shrink-0"
                onClick={() => newUserFileInputRef.current?.click()}
              >
                {newUserAvatar ? (
                  <img src={newUserAvatar} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[10px] text-[var(--muted-foreground)] font-bold text-center px-1">FOTO</div>
                )}
                <input
                  type="file"
                  ref={newUserFileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, true)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                <input
                  type="text"
                  placeholder="Nome"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--background)]"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--background)]"
                />
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'member')}
                  className="px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--background)]"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Administrador</option>
                </select>
                <Button onClick={handleAdd} disabled={!newUserName || !newUserEmail} className="gap-2">
                  <Plus size={16} /> Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Membros da Equipe ({users.length})</h3>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--muted)]/30 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-[var(--border)] object-cover" />
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : 'Membro'}
                  </Badge>
                  {currentUser.role === 'admin' && user.id !== currentUser.id && (
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="text-red-500 hover:text-red-600 p-1"
                      title="Remover usuário"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
