import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui-elements';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (isLogin) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            } else {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (signUpError) throw signUpError;
                setSuccess('Conta criada! Verifique seu email para confirmar o registro.');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro durante a autenticação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4 overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)] shadow-xl">
                        <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/20">
                            <LogIn size={24} />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-[var(--foreground)]">Flow</span>
                    </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden p-8 relative">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                            {isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}
                        </h1>
                        <p className="text-[var(--muted-foreground)] text-sm">
                            {isLogin
                                ? 'Insira suas credenciais para gerenciar seu fluxo.'
                                : 'Junte-se ao Flow e organize sua produtividade.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    key="name"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2"
                                >
                                    <label className="text-sm font-medium ml-1">Nome Completo</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)]" size={18} />
                                        <input
                                            required
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Ex: João Silva"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)]" size={18} />
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium">Senha</label>
                                {isLogin && (
                                    <button type="button" className="text-xs text-[var(--primary)] hover:underline">
                                        Esqueceu a senha?
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)]" size={18} />
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm"
                            >
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm"
                            >
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{success}</span>
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            className="w-full py-6 rounded-xl text-lg relative overflow-hidden group"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <div className="flex items-center justify-center gap-2 font-bold">
                                    {isLogin ? 'Entrar' : 'Criar Conta'}
                                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
                        <p className="text-sm text-[var(--muted-foreground)]">
                            {isLogin ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}
                            <button
                                onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
                                className="ml-2 font-bold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                            >
                                {isLogin ? 'Registre-se' : 'Faça Login'}
                            </button>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-[var(--muted-foreground)]">
                    Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
                </p>
            </motion.div>
        </div>
    );
}
