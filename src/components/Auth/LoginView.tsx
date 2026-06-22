import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../../firebase';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft 
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot-password';

export const LoginView: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('isabelemfa@gmail.com');
  const [password, setPassword] = useState('Notificasrp');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setMessage(null);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    clearMessages();
    try {
      const provider = new GoogleAuthProvider();
      // Ensure specific accounts are prompted if needed
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError('Erro ao entrar com Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else if (mode === 'forgot-password') {
        await sendPasswordResetEmail(auth, email);
        setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setMode('login');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Este e-mail já está em uso.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'E-mail inválido.';
          break;
        case 'auth/weak-password':
          errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'O provedor de E-mail/Senha não está ativado no Console do Firebase. Por favor, ative-o em Authentication > Sign-in method.';
          break;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 selection:bg-[#00C4A7]/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#00C4A7]/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-[#00C4A7]/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1E293B]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 flex items-center justify-center mb-4">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
                <path d="M48 48C48 35 40 25 50 15C60 25 52 35 52 48Z" fill="#00C4A7"/>
                <path d="M52 52C65 52 75 60 85 50C75 40 65 48 52 48Z" fill="#00C4A7"/>
                <path d="M52 52C52 65 60 75 50 85C40 75 48 65 48 52Z" fill="#00C4A7"/>
                <path d="M48 48C35 48 25 40 15 50C25 60 35 52 48 52Z" fill="#00C4A7"/>
                <path d="M50 44C47 44 45 47 45 50C45 53 47 56 50 56C53 56 55 53 55 50C55 47 53 44 50 44Z" fill="white"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Bem-vindo de volta' : mode === 'register' ? 'Criar Conta' : 'Recuperar Senha'}
            </h2>
            <p className="text-slate-400 text-sm mt-2 text-center">
              {mode === 'login' ? 'Acesse o sistema de gestão Rio Poty' : mode === 'register' ? 'Comece a gerenciar notificações hoje mesmo' : 'Enviaremos um link para resetar sua senha'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block pl-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-[#0F172A]/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4A7]/50 focus:border-[#00C4A7] transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block pl-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full bg-[#0F172A]/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4A7]/50 focus:border-[#00C4A7] transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Senha</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-[10px] uppercase font-bold text-[#00C4A7] hover:text-[#00C4A7]/80 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0F172A]/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4A7]/50 focus:border-[#00C4A7] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Notifications */}
            <div className="space-y-2">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-center gap-3 text-red-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {message && (
                <div className="bg-[#00C4A7]/10 border border-[#00C4A7]/50 rounded-xl p-3 flex items-center gap-3 text-[#00C4A7] text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{message}</span>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1E293B] px-2 text-slate-500">Ou continue com</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Entrar com Google</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00C4A7] hover:bg-[#00D9B8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#00C4A7]/20 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar Conta' : 'Enviar Link'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Switching */}
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            {mode === 'forgot-password' ? (
              <button 
                onClick={() => setMode('login')}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar para o login
              </button>
            ) : (
              <p className="text-sm text-slate-400">
                {mode === 'login' ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
                <button 
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    clearMessages();
                  }}
                  className="ml-2 font-bold text-[#00C4A7] hover:text-[#00C4A7]/80 transition-colors"
                >
                  {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
