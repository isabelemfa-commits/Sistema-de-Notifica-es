import React, { useMemo } from 'react';
import { Store, Notification } from '../types';
import { 
  User, 
  Phone, 
  Mail, 
  ChevronLeft, 
  Edit3, 
  AlertTriangle, 
  Activity,
  BarChart3,
  Trash2,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  getNotificationDisplayStatus, 
  getStoreRecurrentTypes 
} from '../mockData';

interface StoreProfileViewProps {
  currentStore: Store;
  notifications: Notification[];
  pisos: string[];
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  // Form states and setters passed from parent to keep logic syncable if needed, 
  // or managed locally if we want. Let's pass them to maintain the current pattern in StoresView.
  formState: {
    nome: string;
    luc: string;
    responsavel: string;
    telefone: string;
    email: string;
    piso: string;
    ativa: boolean;
  };
  setFormState: (state: any) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string, nome: string) => void;
  onBack: () => void;
  onNavigateToTab?: (tabName: string, filters?: any) => void;
  onViewNotificationDetail: (notif: Notification) => void;
}

export const StoreProfileView: React.FC<StoreProfileViewProps> = ({
  currentStore,
  notifications,
  pisos,
  editMode,
  setEditMode,
  formState,
  setFormState,
  onSave,
  onDelete,
  onBack,
  onNavigateToTab,
  onViewNotificationDetail
}) => {
  const nowStr = useMemo(() => new Date().toISOString(), []);

  const getPhasesInfo = (storeId: string, storeNotifs: Notification[]) => {
    const phases: { [key in '1ª Notificação' | '2ª Notificação' | '3ª Notificação']: Notification | undefined } = {
      '1ª Notificação': undefined,
      '2ª Notificação': undefined,
      '3ª Notificação': undefined,
    };

    storeNotifs.forEach(n => {
      const isPhase1 = n.fase === '1ª Notificação' || n.titulo.toLowerCase().includes('1ª');
      const isPhase2 = n.fase === '2ª Notificação' || n.titulo.toLowerCase().includes('2ª');
      const isPhase3 = n.fase === '3ª Notificação' || n.titulo.toLowerCase().includes('3ª');

      if (isPhase1) {
        if (!phases['1ª Notificação'] || new Date(n.dataEnvio) > new Date(phases['1ª Notificação'].dataEnvio)) {
          phases['1ª Notificação'] = n;
        }
      } else if (isPhase2) {
        if (!phases['2ª Notificação'] || new Date(n.dataEnvio) > new Date(phases['2ª Notificação'].dataEnvio)) {
          phases['2ª Notificação'] = n;
        }
      } else if (isPhase3) {
        if (!phases['3ª Notificação'] || new Date(n.dataEnvio) > new Date(phases['3ª Notificação'].dataEnvio)) {
          phases['3ª Notificação'] = n;
        }
      }
    });

    return phases;
  };

  const profileData = useMemo(() => {
    const storeNotifs = notifications
      .filter(n => n.lojaId === currentStore.id)
      .sort((a,b) => new Date(b.dataEnvio).getTime() - new Date(a.dataEnvio).getTime());

    const totalCount = storeNotifs.filter(n => n.status !== 'Cancelada').length;
    const completedCount = storeNotifs.filter(n => getNotificationDisplayStatus(n, nowStr) === 'Resolvida').length;
    const resRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    const recTypes = getStoreRecurrentTypes(currentStore.id, notifications, nowStr);

    const storeMonthlyList: { name: string; total: number; sortKey: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = d.toLocaleString('pt-BR', { month: 'short' });
      const year = d.getFullYear();
      const sortKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      storeMonthlyList.push({
        name: `${mName.replace('.', '')}/${String(year).slice(2)}`,
        total: 0,
        sortKey
      });
    }

    storeNotifs.forEach(n => {
      if (n.status === 'Cancelada') return;
      const sDate = new Date(n.dataEnvio);
      const key = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
      const found = storeMonthlyList.find(x => x.sortKey === key);
      if (found) found.total++;
    });

    return {
      storeNotifs,
      resRate,
      recTypes,
      storeMonthlyList,
      totalCount,
      completedCount,
      phases: getPhasesInfo(currentStore.id, storeNotifs)
    };
  }, [currentStore.id, notifications, nowStr]);

  return (
    <div className="space-y-6">
      {/* Back Button and Info Row */}
      <div className="flex items-center justify-between border-b border-[#253549] pb-4">
        <button 
          onClick={onBack}
          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-800 transition-all select-none"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar à Listagem
        </button>
        
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${currentStore.ativa ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-red-500/15 text-red-500'}`}>
            {currentStore.ativa ? '● Loja Ativa' : '● Loja Inativa'}
          </span>
          
          {profileData.recTypes.length > 0 && (
            <span className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 rounded px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Crítico: Loja Recorrente
            </span>
          )}
        </div>
      </div>

      {/* Profile Content Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Box 1: Cadastro / Edit Form */}
        <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#253549] pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-[#00C4A7]" />
                Cadastro da Loja
              </h3>
              
              <div className="flex items-center gap-3">
                {!editMode && (
                  <button 
                    onClick={() => onDelete(currentStore.id, currentStore.nome)}
                    className="text-xs text-red-405 hover:text-red-400 font-semibold hover:underline flex items-center gap-1 select-none cursor-pointer"
                    title="Excluir Loja permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Loja
                  </button>
                )}
                
                <button 
                  onClick={() => setEditMode(!editMode)}
                  className="text-xs text-[#00C4A7] font-semibold hover:underline flex items-center gap-1 select-none cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {editMode ? 'Cancelar' : 'Editar Cadastro'}
                </button>
              </div>
            </div>

            {!editMode ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-450 uppercase block">Nome Comercial</span>
                  <p className="text-base font-bold font-sans text-slate-100 mt-0.5">{currentStore.nome}</p>
                </div>
                
                <div>
                  <span className="text-[10px] text-slate-450 uppercase block">LUC (Ponto Comercial)</span>
                  <p className="text-xs font-mono text-slate-300 mt-0.5">{currentStore.luc || '(Não registrado / Isento)'}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-450 uppercase block">Piso Comercial</span>
                  <p className="text-xs text-slate-200 mt-0.5">{currentStore.piso}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-450 uppercase block">Gerente Responsável</span>
                  <p className="text-xs font-medium text-slate-200 mt-0.5">{currentStore.responsavel}</p>
                </div>

                <div className="space-y-2 border-t border-slate-800/60 pt-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-[#00C4A7] shrink-0" />
                    <span>{currentStore.telefone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-4 h-4 text-[#00C4A7] shrink-0" />
                    <span className="break-all">{currentStore.email}</span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={onSave} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Nome Fantasia *</label>
                  <input 
                    type="text" 
                    value={formState.nome} 
                    onChange={(e) => setFormState({...formState, nome: e.target.value})}
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">LUC (Identificação da Loja)</label>
                  <input 
                    type="text" 
                    value={formState.luc} 
                    onChange={(e) => setFormState({...formState, luc: e.target.value})}
                    placeholder="Ex: LUC L2-34, Sala 102"
                    className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none focus:border-[#00C4A7] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Piso</label>
                  <select 
                    value={formState.piso} 
                    onChange={(e) => setFormState({...formState, piso: e.target.value})}
                    className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none focus:border-[#00C4A7]"
                  >
                    {pisos.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Nome do Responsável *</label>
                  <input 
                    type="text" 
                    value={formState.responsavel} 
                    onChange={(e) => setFormState({...formState, responsavel: e.target.value})}
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">Contato Telefônico</label>
                  <input 
                    type="text" 
                    value={formState.telefone} 
                    onChange={(e) => setFormState({...formState, telefone: e.target.value})}
                    className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    value={formState.email} 
                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                    className="w-full bg-[#0F1923] border border-[#253549] text-slate-300 p-2 rounded focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1.5">
                  <input 
                    type="checkbox" 
                    id="edit_ativa"
                    checked={formState.ativa} 
                    onChange={(e) => setFormState({...formState, ativa: e.target.checked})}
                    className="w-4.5 h-4.5 rounded text-[#00C4A7] bg-[#0F1923] accent-[#00C4A7]"
                  />
                  <label htmlFor="edit_ativa" className="select-none font-semibold text-slate-300">
                    Loja de Operação Ativa
                  </label>
                </div>

                <div className="pt-2.5 flex justify-end gap-2 border-t border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setEditMode(false)}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-3 py-1.5 rounded"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 font-bold px-4 py-1.5 rounded shadow"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="pt-4 border-t border-[#253549] text-[11px] text-slate-500 mt-5 font-mono">
            Identificador Único: <span className="block break-all">{currentStore.id}</span>
          </div>
        </div>

        {/* Box 2: Mini-Dashboard */}
        <div className="lg:col-span-2 space-y-6">

          {/* 3-Step Sequential Phase Tracker */}
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#253549]/60 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#00C4A7]" />
                  Fluxo de Notificações Sequenciais
                </h4>
                <p className="text-[11px] text-slate-450 mt-0.5">Acompanhamento das 3 fases regulamentares de atendimento de exigências por loja</p>
              </div>
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-[#00C4A7] font-bold px-2 py-1 rounded-md uppercase font-mono tracking-wider">
                Prazo: 7 Dias por Fase
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
              {(['1ª Notificação', '2ª Notificação', '3ª Notificação'] as const).map((phaseKey, idx) => {
                const phaseNotif = profileData.phases[phaseKey];
                
                let cardBorder = "border-dashed border-slate-800 bg-[#0F1923]/45";
                let badgeColor = "bg-slate-900 border-slate-800 text-slate-500";
                let headingColor = "text-slate-500";
                let statusText = "Aguardando Ocorrência";
                let descText = "Nenhuma infração registrada nesta categoria.";
                
                if (phaseNotif) {
                  const dStatus = getNotificationDisplayStatus(phaseNotif, nowStr);
                  if (dStatus === 'Resolvida') {
                    cardBorder = "border-green-500/30 bg-green-500/5";
                    badgeColor = "bg-green-500/10 border-green-500/20 text-[#22C55E]";
                    headingColor = "text-[#22C55E] font-bold";
                    statusText = "Concluída / Regularizada";
                    descText = `Resolvida em ${phaseNotif.dataResolucao ? new Date(phaseNotif.dataResolucao).toLocaleDateString('pt-BR') : 'Data n/d'}.`;
                  } else if (dStatus === 'Cancelada') {
                    cardBorder = "border-slate-700/50 bg-slate-800/100";
                    badgeColor = "bg-slate-800 border-slate-700 text-slate-450";
                    headingColor = "text-slate-450";
                    statusText = "Cancelada";
                    descText = "Esta pendência foi oficializada como revogada por engano ou ajuste.";
                  } else if (dStatus === 'Vencida') {
                    cardBorder = "border-red-500/30 bg-red-500/5";
                    badgeColor = "bg-red-500/15 border-red-500/20 text-[#EF4444]";
                    headingColor = "text-[#EF4444] font-bold";
                    statusText = "Vencida! Prazo de 7 Dias Excedido";
                    descText = `Prazo máximo de regularização estipulado até ${new Date(phaseNotif.dataVencimento).toLocaleDateString('pt-BR')}.`;
                  } else {
                    cardBorder = "border-amber-500/30 bg-amber-500/5";
                    badgeColor = "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]";
                    headingColor = "text-[#F59E0B] font-bold";
                    statusText = "Ativa — Regularização Necessária";
                    const daysRemaining = Math.ceil((new Date(phaseNotif.dataVencimento).getTime() - new Date(nowStr).getTime()) / (1000 * 60 * 60 * 24));
                    descText = daysRemaining >= 0 
                      ? `Exigência dentro do prazo! Restam mais ${daysRemaining} dias para sanar (até ${new Date(phaseNotif.dataVencimento).toLocaleDateString('pt-BR')}).`
                      : "Prazo esgotado! Providenciar próxima fase.";
                  }
                }

                return (
                  <div key={phaseKey} className={`border rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all duration-200 relative ${cardBorder}`}>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor}`}>
                          {phaseKey}
                        </span>
                        {phaseNotif && (
                          <span className="font-mono text-[9px] text-slate-500">
                            {new Date(phaseNotif.dataEnvio).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <h5 className={`text-xs font-semibold uppercase tracking-tight pt-1 ${headingColor}`}>
                        {phaseNotif ? phaseNotif.titulo : "Fila de Conformidade"}
                      </h5>
                      <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                        {phaseNotif ? phaseNotif.descricao : descText}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#253549]/40 flex items-center justify-between mt-auto">
                      <span className="text-[9px] font-bold text-slate-450 block truncate" style={{ maxWidth: '140px' }} title={statusText}>
                        {statusText}
                      </span>
                      
                      {phaseNotif ? (
                        <button
                          onClick={() => onViewNotificationDetail(phaseNotif)}
                          className="bg-[#151F2D] hover:bg-slate-800 text-[10px] font-bold text-[#00C4A7] border border-[#253549] px-2 py-1 rounded cursor-pointer transition-all"
                        >
                          Dossiê
                        </button>
                      ) : (
                        onNavigateToTab && (
                          <button
                            onClick={() => {
                              onNavigateToTab('notifications', {
                                prefill: {
                                  lojaId: currentStore.id,
                                  fase: phaseKey
                                }
                              });
                            }}
                            className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                          >
                            Emitir {idx + 1}ª
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gauge stats panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Performance Rate */}
            <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-slate-450 uppercase font-bold text-center">Taxa de Resolução</span>
              <h3 className="text-3xl font-bold font-mono text-[#00C4A7] mt-1.5">{profileData.resRate}%</h3>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3.5 overflow-hidden">
                <div className="bg-[#00C4A7] h-full" style={{ width: `${profileData.resRate}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 mt-2">({profileData.completedCount} de {profileData.totalCount} atendidas)</span>
            </div>

            {/* Recurrence diagnostics */}
            <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-4 flex flex-col justify-between md:col-span-2">
              <div>
                <span className="text-[10px] text-slate-450 uppercase font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                  Histórico de Recorrências por Tipo
                </span>
                
                {profileData.recTypes.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10px] text-[#EF4444] font-medium leading-tight">
                      ⚠️ Classificação de Incidência Recorrente! Tipos com 3+ queixas nos últimos 12 meses:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {profileData.recTypes.map(t => (
                        <span key={t} className="bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 text-[9px] font-bold px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#22C55E] mt-3 bg-[#22C55E]/5 p-2 rounded border border-[#22C55E]/15">
                    <Check className="w-4.5 h-4.5 shrink-0" />
                    <span>Excelente! Sem recorrências graves flagradas neste ano (limites sob controle).</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-450 block italic pt-2 border-t border-slate-850/60 mt-1">Conformidade avaliada a cada fechamento trimestral.</span>
            </div>
          </div>

          {/* Sub-Graph: Notificações por mês (últimos 12 meses) */}
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#00C4A7]" />
                Análise Cronológica do Comportamento Multa/Comunicados
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">12 Meses Passados</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profileData.storeMonthlyList} margin={{ top: 5, right: 5, left: -22, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#253549" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#101B2B', borderColor: '#253549', borderRadius: '6px' }}
                    labelStyle={{ color: '#F1F5F9', fontWeight: 'bold' }}
                  />
                  <Bar name="Notificação" dataKey="total" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
