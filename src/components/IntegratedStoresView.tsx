import React, { useState, useMemo, useEffect } from 'react';
import { Store, Notification } from '../types';
import { 
  getNotificationDisplayStatus, 
  isStoreRecurrent 
} from '../mockData';
import { 
  Search, 
  MapPin, 
  User, 
  Plus, 
  Trash2, 
  Building,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Layers,
  BellRing,
  AlertTriangle,
  Eye,
  Activity,
  X
} from 'lucide-react';
import { StoreProfileView } from './StoreProfileView';

interface IntegratedStoresViewProps {
  stores: Store[];
  notifications: Notification[];
  pisos: string[];
  initialStoreProfileId?: string | null;
  onClearInitialStoreProfileId?: () => void;
  onNavigateToTab?: (tabName: string, filters?: any) => void;
  onAddStore: (store: Omit<Store, 'id'>) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;
  onViewNotificationDetail: (notif: Notification) => void;
  onTriggerToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, msg: string) => void;
}

export const IntegratedStoresView: React.FC<IntegratedStoresViewProps> = ({
  stores,
  notifications,
  pisos,
  initialStoreProfileId,
  onClearInitialStoreProfileId,
  onNavigateToTab,
  onAddStore,
  onUpdateStore,
  onDeleteStore,
  onViewNotificationDetail,
  onTriggerToast
}) => {
  const nowStr = useMemo(() => new Date().toISOString(), []);

  // View States
  const [viewMode, setViewMode] = useState<'GRID' | 'FLOORS'>('GRID');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPiso, setFilterPiso] = useState<string>('');
  const [expandedPisos, setExpandedPisos] = useState<Record<string, boolean>>(() => {
    if (pisos.length > 0) return { [pisos[0]]: true };
    return {};
  });

  // Modal/Form States
  const [isNewStoreOpen, setIsNewStoreOpen] = useState(false);
  const [deleteConfirmStore, setDeleteConfirmStore] = useState<{ id: string; nome: string } | null>(null);
  const [editMode, setEditMode] = useState(false);

  // New Store Form State
  const [newStoreForm, setNewStoreForm] = useState({
    nome: '',
    luc: '',
    responsavel: '',
    telefone: '',
    email: '',
    piso: pisos[0] || 'L1'
  });

  // Edit Store Form State (sync with currentStore when opened)
  const [editStoreForm, setEditStoreForm] = useState({
    nome: '',
    luc: '',
    responsavel: '',
    telefone: '',
    email: '',
    piso: '',
    ativa: true
  });

  // Handle external navigation
  useEffect(() => {
    if (initialStoreProfileId) {
      setSelectedStoreId(initialStoreProfileId);
      const store = stores.find(s => s.id === initialStoreProfileId);
      if (store) {
        setEditStoreForm({
          nome: store.nome,
          luc: store.luc || '',
          responsavel: store.responsavel,
          telefone: store.telefone,
          email: store.email,
          piso: store.piso,
          ativa: store.ativa
        });
      }
      if (onClearInitialStoreProfileId) onClearInitialStoreProfileId();
    }
  }, [initialStoreProfileId, stores, onClearInitialStoreProfileId]);

  // Derived Data
  const currentStore = useMemo(() => stores.find(s => s.id === selectedStoreId) || null, [stores, selectedStoreId]);

  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (filterPiso && s.piso !== filterPiso) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.nome.toLowerCase().includes(q) || 
               s.responsavel.toLowerCase().includes(q) || 
               s.luc?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [stores, filterPiso, searchQuery]);

  const floorStats = useMemo(() => {
    const map: Record<string, any> = {};
    pisos.forEach(p => {
      const storesInFloor = stores.filter(s => s.piso === p);
      let activeNotifsCount = 0;
      let overdueNotifsCount = 0;
      
      const storeStatsList = storesInFloor.map(s => {
        const storeNotifs = notifications.filter(n => n.lojaId === s.id && n.status !== 'Cancelada');
        let total = 0;
        let pendentes = 0;
        let resolvidas = 0;
        let vencidas = 0;

        storeNotifs.forEach(n => {
          total++;
          const dStatus = getNotificationDisplayStatus(n, nowStr);
          if (dStatus === 'Pendente' || dStatus === 'Em Andamento') {
            pendentes++;
            activeNotifsCount++;
          } else if (dStatus === 'Vencida') {
            vencidas++;
            overdueNotifsCount++;
          } else if (dStatus === 'Resolvida') {
            resolvidas++;
          }
        });

        return {
          store: s,
          total,
          pendentes,
          resolvidas,
          vencidas,
          recorrente: isStoreRecurrent(s.id, notifications, nowStr)
        };
      });

      map[p] = {
        pisoName: p,
        totalStores: storesInFloor.length,
        activeNotifsCount,
        overdueNotifsCount,
        storeStatsList
      };
    });
    return map;
  }, [stores, notifications, pisos, nowStr]);

  const storeCounters = useMemo(() => {
    const map: Record<string, any> = {};
    stores.forEach(s => {
      const storeNotifs = notifications.filter(n => n.lojaId === s.id && n.status !== 'Cancelada');
      let total = 0;
      let pendentes = 0;
      let resolvidas = 0;
      storeNotifs.forEach(n => {
        total++;
        const dStatus = getNotificationDisplayStatus(n, nowStr);
        if (dStatus === 'Pendente' || dStatus === 'Em Andamento' || dStatus === 'Vencida') pendentes++;
        else if (dStatus === 'Resolvida') resolvidas++;
      });
      map[s.id] = { total, pendentes, resolvidas };
    });
    return map;
  }, [stores, notifications, nowStr]);

  // Handlers
  const toggleFloor = (piso: string) => {
    setExpandedPisos(prev => ({ ...prev, [piso]: !prev[piso] }));
  };

  const handleOpenProfile = (store: Store) => {
    setSelectedStoreId(store.id);
    setEditStoreForm({
      nome: store.nome,
      luc: store.luc || '',
      responsavel: store.responsavel,
      telefone: store.telefone,
      email: store.email,
      piso: store.piso,
      ativa: store.ativa
    });
    setEditMode(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) return;
    onUpdateStore({ id: selectedStoreId, ...editStoreForm });
    setEditMode(false);
    onTriggerToast('success', 'Cadastro Atualizado', `Os dados de "${editStoreForm.nome}" foram salvos.`);
  };

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreForm.nome.trim()) return;
    onAddStore({ ...newStoreForm, ativa: true });
    setIsNewStoreOpen(false);
    setNewStoreForm({ ...newStoreForm, nome: '', luc: '', responsavel: '', telefone: '', email: '' });
    onTriggerToast('success', 'Loja Cadastrada', 'Nova loja integrada ao sistema.');
  };

  const executeDelete = () => {
    if (!deleteConfirmStore) return;
    onDeleteStore(deleteConfirmStore.id);
    if (selectedStoreId === deleteConfirmStore.id) setSelectedStoreId(null);
    onTriggerToast('success', 'Loja Removida', `"${deleteConfirmStore.nome}" excluída com sucesso.`);
    setDeleteConfirmStore(null);
  };

  const getPhasesInfo = (storeId: string) => {
    const storeNotifs = notifications.filter(n => n.lojaId === storeId);
    const phases: Record<string, Notification | undefined> = {
      '1ª Notificação': undefined,
      '2ª Notificação': undefined,
      '3ª Notificação': undefined,
    };
    storeNotifs.forEach(n => {
      if (n.fase === '1ª Notificação' && (!phases['1ª Notificação'] || new Date(n.dataEnvio) > new Date(phases['1ª Notificação'].dataEnvio))) phases['1ª Notificação'] = n;
      if (n.fase === '2ª Notificação' && (!phases['2ª Notificação'] || new Date(n.dataEnvio) > new Date(phases['2ª Notificação'].dataEnvio))) phases['2ª Notificação'] = n;
      if (n.fase === '3ª Notificação' && (!phases['3ª Notificação'] || new Date(n.dataEnvio) > new Date(phases['3ª Notificação'].dataEnvio))) phases['3ª Notificação'] = n;
    });
    return phases;
  };

  return (
    <div className="space-y-6">
      {!selectedStoreId ? (
        <>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Building className="w-6 h-6 text-[#00C4A7]" />
                Gestão Integrada de Lojas
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Monitore o status operacional, histórico de notificações e cadastro de todos os lojistas do shopping.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#1A2636] p-1 rounded-xl border border-[#253549]">
              <button 
                onClick={() => setViewMode('GRID')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'GRID' ? 'bg-[#00C4A7] text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grade Geral
              </button>
              <button 
                onClick={() => setViewMode('FLOORS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'FLOORS' ? 'bg-[#00C4A7] text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                Por Pavimento
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </span>
                <input 
                  type="text" 
                  placeholder="Buscar pelo nome da loja, gerente ou LUC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-slate-100 placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#00C4A7] text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <select 
                  value={filterPiso}
                  onChange={(e) => setFilterPiso(e.target.value)}
                  className="bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#00C4A7]"
                >
                  <option value="">Todos os Pisos</option>
                  {pisos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                
                <button 
                  onClick={() => setIsNewStoreOpen(true)}
                  className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  Cadastrar Loja
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStores.map(store => {
                const counters = storeCounters[store.id];
                const isRec = isStoreRecurrent(store.id, notifications, nowStr);
                const phases = getPhasesInfo(store.id);
                
                return (
                  <div 
                    key={store.id}
                    onClick={() => handleOpenProfile(store)}
                    className={`bg-[#1A2636] border rounded-xl p-5 hover:border-[#00C4A7]/50 transition-all cursor-pointer group flex flex-col justify-between ${
                      !store.ativa ? 'border-dashed border-slate-700 opacity-60' : 'border-[#253549]'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="truncate">
                          <h4 className="text-base font-bold text-slate-100 truncate flex items-center gap-2">
                            {store.nome}
                            {!store.ativa && <span className="text-[10px] text-red-500 font-bold px-1 border border-red-500/20 rounded">INATIVA</span>}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">{store.luc || 'Sem LUC'}</span>
                        </div>
                        <div className="flex gap-1">
                          {isRec && <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmStore({ id: store.id, nome: store.nome }); }}
                            className="p-1 text-slate-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#00C4A7]" />
                          <span>{store.piso}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#00C4A7]" />
                          <span className="truncate">Gerente: <span className="text-slate-200">{store.responsavel}</span></span>
                        </div>
                      </div>

                      {/* Phase Micro Tracker */}
                      <div className="grid grid-cols-3 gap-1 pt-2">
                        {(['1ª Notificação', '2ª Notificação', '3ª Notificação'] as const).map((pk, idx) => {
                          const n = phases[pk];
                          const status = n ? getNotificationDisplayStatus(n, nowStr) : 'empty';
                          const colors = {
                            empty: 'bg-[#0F1923] border-slate-800 text-slate-600',
                            Resolvida: 'bg-green-500/10 border-green-500/20 text-green-400',
                            Vencida: 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse',
                            default: 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          };
                          const colorClass = (status === 'empty' || status === 'Resolvida' || status === 'Vencida') ? colors[status] : colors.default;
                          
                          return (
                            <div key={pk} className={`text-[8px] font-bold py-1 border rounded text-center truncate px-1 ${colorClass}`}>
                              {idx + 1}ª {n ? (status === 'Pendente' ? 'Ativ' : status.slice(0, 4)) : 'Vaz'}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-5 text-center text-[10px] font-mono">
                      <div className="bg-[#0F1923] p-1 rounded border border-slate-800">
                        <span className="text-slate-500 block">REG</span>
                        <span className="text-slate-100 font-bold">{counters.total}</span>
                      </div>
                      <div className="bg-[#0F1923] p-1 rounded border border-slate-800">
                        <span className="text-slate-500 block">ABER</span>
                        <span className={`font-bold ${counters.pendentes > 0 ? 'text-[#EF4444]' : 'text-[#00C4A7]'}`}>{counters.pendentes}</span>
                      </div>
                      <div className="bg-[#0F1923] p-1 rounded border border-slate-800">
                        <span className="text-slate-500 block">RES</span>
                        <span className="text-green-500 font-bold">{counters.resolvidas}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Floor Based View (from FloorsView) */
            <div className="space-y-4">
              {pisos.map(p => {
                const stats = floorStats[p];
                if (!stats) return null;
                const isExpanded = !!expandedPisos[p];
                return (
                  <div key={p} className="bg-[#1A2636] border border-[#253549] rounded-xl overflow-hidden">
                    <div 
                      onClick={() => toggleFloor(p)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#1E2E41] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-800 text-[#00C4A7] rounded-lg">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100 uppercase">{p}</h3>
                          <p className="text-[10px] text-slate-400">{stats.totalStores} Lojas Cadastradas</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden sm:flex gap-4">
                          <div className="text-center px-3 border-r border-slate-800">
                            <span className="text-[9px] text-slate-500 block uppercase">Pendentes</span>
                            <span className="text-xs font-bold text-[#F59E0B] flex items-center gap-1">
                              <BellRing className="w-3 h-3" /> {stats.activeNotifsCount}
                            </span>
                          </div>
                          <div className="text-center px-3">
                            <span className="text-[9px] text-slate-500 block uppercase">Vencidas</span>
                            <span className={`text-xs font-bold flex items-center gap-1 ${stats.overdueNotifsCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              <AlertTriangle className="w-3 h-3" /> {stats.overdueNotifsCount}
                            </span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 border-t border-[#253549] bg-[#0F1923]/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.storeStatsList.map((sStats: any) => (
                          <div 
                            key={sStats.store.id}
                            onClick={() => handleOpenProfile(sStats.store)}
                            className="bg-[#1A2636] border border-[#253549] rounded-lg p-3 hover:border-[#00C4A7]/40 cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-[11px] font-bold text-slate-100 truncate max-w-[120px]">{sStats.store.nome}</h5>
                              <div className={`w-2 h-2 rounded-full ${sStats.vencidas > 0 ? 'bg-red-500 animate-pulse' : sStats.pendentes > 0 ? 'bg-amber-500' : 'bg-green-500'}`} />
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-center mb-2">
                              <div className="bg-[#0F1923] p-1 rounded">
                                <span className="text-slate-500 block">T</span>
                                <span className="text-slate-300 font-bold">{sStats.total}</span>
                              </div>
                              <div className="bg-[#0F1923] p-1 rounded">
                                <span className="text-slate-500 block">V</span>
                                <span className="text-red-500 font-bold">{sStats.vencidas}</span>
                              </div>
                              <div className="bg-[#0F1923] p-1 rounded">
                                <span className="text-slate-500 block">R</span>
                                <span className="text-green-500 font-bold">{sStats.resolvidas}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                               {sStats.recorrente && <span className="text-[8px] bg-red-500/10 text-red-500 px-1 rounded font-bold uppercase">Recorr.</span>}
                               <button className="text-[10px] text-[#00C4A7] hover:underline font-bold ml-auto flex items-center gap-0.5">
                                 Perfil <Eye className="w-3 h-3" />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Store Profile View */
        <StoreProfileView 
          currentStore={currentStore!}
          notifications={notifications}
          pisos={pisos}
          editMode={editMode}
          setEditMode={setEditMode}
          formState={editStoreForm}
          setFormState={setEditStoreForm}
          onSave={handleSaveEdit}
          onDelete={(id, nome) => setDeleteConfirmStore({ id, nome })}
          onBack={() => setSelectedStoreId(null)}
          onNavigateToTab={onNavigateToTab}
          onViewNotificationDetail={onViewNotificationDetail}
        />
      )}

      {/* Modals */}
      {isNewStoreOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-[#253549] max-w-md w-full rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#253549] flex items-center justify-between bg-[#151F2D]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#00C4A7]" />
                Cadastrar Nova Loja
              </h3>
              <button onClick={() => setIsNewStoreOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateStore} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Nome da Loja *</label>
                  <input required type="text" value={newStoreForm.nome} onChange={e => setNewStoreForm({...newStoreForm, nome: e.target.value})} className="w-full bg-[#0F1923] border border-[#253549] rounded p-2 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">LUC / Sala</label>
                  <input type="text" value={newStoreForm.luc} onChange={e => setNewStoreForm({...newStoreForm, luc: e.target.value})} className="w-full bg-[#0F1923] border border-[#253549] rounded p-2 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Piso</label>
                  <select value={newStoreForm.piso} onChange={e => setNewStoreForm({...newStoreForm, piso: e.target.value})} className="w-full bg-[#0F1923] border border-[#253549] rounded p-2 text-slate-100">
                    {pisos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Gerente Responsável *</label>
                  <input required type="text" value={newStoreForm.responsavel} onChange={e => setNewStoreForm({...newStoreForm, responsavel: e.target.value})} className="w-full bg-[#0F1923] border border-[#253549] rounded p-2 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Telefone</label>
                  <input type="text" value={newStoreForm.telefone} onChange={e => setNewStoreForm({...newStoreForm, telefone: e.target.value})} className="w-full bg-[#0F1923] border border-[#253549] rounded p-2 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">E-mail</label>
                  <input type="email" value={newStoreForm.email} onChange={e => setNewStoreForm({...newStoreForm, email: e.target.value})} className="w-full bg-[#0F1923] border border-[#253549] rounded p-2 text-slate-100" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewStoreOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-200">Cancelar</button>
                <button type="submit" className="bg-[#00C4A7] text-slate-900 font-bold px-6 py-2 rounded-lg shadow-lg">Cadastrar Loja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmStore && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-red-500/20 max-w-sm w-full rounded-2xl p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Excluir Loja?</h3>
            <p className="text-sm text-slate-400">
              Você está prestes a remover <span className="text-white font-bold">"{deleteConfirmStore.nome}"</span> e todo o seu histórico de notificações permanentemente.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirmStore(null)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold">Cancelar</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
