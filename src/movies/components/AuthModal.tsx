import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, Film } from 'lucide-react';
import { useAuth } from '@movies/contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

const AuthModal: React.FC<Props> = ({ open, onClose, initialMode = 'signin' }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setEmail(''); setPassword(''); setName('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, initialMode]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Email and password required'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Name is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    const res = mode === 'signup'
      ? await signUp(email, password, name.trim())
      : await signIn(email, password);
    setSubmitting(false);
    if (res.error) setError(res.error);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-neutral-950 shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white hover:bg-red-600"
          aria-label="Close"
        ><X className="h-4 w-4" /></button>

        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-900 to-black p-6">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Film className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                {mode === 'signup' ? 'Join CineVerse' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-red-100">
                {mode === 'signup' ? 'Create your account to save movies and reviews' : 'Sign in to continue'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Name</label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-none"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-none"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-none"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-red-600 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-700"
          >
            {submitting ? 'Please wait...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>

          <div className="text-center text-sm text-neutral-400">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }}
              className="font-semibold text-red-500 hover:text-red-400"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
