import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Shield, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface UserManagementViewProps {
  adminEmail: string;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ adminEmail }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?adminEmail=${encodeURIComponent(adminEmail)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Não foi possível carregar os usuários');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
          role: newRole,
          adminEmail
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário');

      setSuccess('Usuário criado e autorizado com sucesso!');
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Shield className="text-[#00C4A7]" />
            Gestão de Usuários
          </h2>
          <p className="text-slate-400 text-sm">Controle de acessos ao aplicativo RioPoty Operational</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create User Form */}
        <div className="lg:col-span-1 bg-[#1A2636] border border-[#2D3748] rounded-2xl p-6 h-fit shrink-0">
          <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#00C4A7]" />
            Criar Novo Acesso
          </h3>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome Completo</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Ex: João Silva"
                className="w-full bg-[#141E2B] border border-[#2D3748] rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00C4A7] transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail de Acesso</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="usuario@loja.com"
                  className="w-full bg-[#141E2B] border border-[#2D3748] rounded-xl pl-11 pr-4 py-3 text-slate-100 focus:outline-none focus:border-[#00C4A7] transition-all"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Senha Provisória</label>
              <input 
                type="text" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Ex: Senha123!"
                className="w-full bg-[#141E2B] border border-[#2D3748] rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00C4A7] transition-all"
              />
              <p className="mt-1 text-[10px] text-slate-500 italic px-1">Defina uma senha para o primeiro acesso do usuário.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Nível de Acesso</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                className="w-full bg-[#141E2B] border border-[#2D3748] rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-[#00C4A7] transition-all"
              >
                <option value="user">Usuário Comum</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-5 rounded-2xl flex flex-col gap-3 animate-shake shadow-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-bold text-sm">Erro de Configuração</p>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="leading-relaxed whitespace-pre-wrap font-medium">{error}</p>
                  {error.includes('http') && (
                    <div className="bg-red-500/20 p-3 rounded-xl border border-red-500/30">
                      <p className="text-[10px] text-red-300 uppercase font-bold mb-2">Ação Necessária:</p>
                      <p className="text-[11px] leading-relaxed">
                        Abra o console do Google Cloud usando o link acima e clique em <b>ATIVAR</b>. 
                        Isso é necessário para que o sistema consiga criar novos usuários.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            )}

            <button 
              type="submit"
              disabled={creating}
              className="w-full bg-[#00C4A7] hover:bg-[#00E5C2] text-[#0F1923] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Autorizar Acesso
            </button>
          </form>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2 bg-[#1A2636] border border-[#2D3748] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-[#2D3748] flex items-center justify-between">
            <h3 className="font-bold text-slate-100">Usuários Ativos</h3>
            <span className="bg-[#141E2B] text-slate-400 text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-[#2D3748]">
              {users.length} usuários
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141E2B]/50 border-b border-[#2D3748]">
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Usuário</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Permissão</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3748]">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#00C4A7]" />
                      <p className="text-slate-500 text-sm mt-4">Carregando usuários...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <p className="text-slate-500 text-sm">Nenhum usuário secundário encontrado.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.uid} className="hover:bg-[#1C293A] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#00C4A7]/10 flex items-center justify-center text-[#00C4A7] font-bold text-sm">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-100 text-sm">{user.name || 'Sem nome'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${
                          user.role === 'admin' 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
