import React, { useState, useMemo } from 'react';
import { Store, Notification, NotificationHistory } from '../types';
import { 
  getNotificationDisplayStatus, 
  isStoreRecurrent, 
  getStoreRecurrentTypes,
  isExpiringSoon
} from '../mockData';
import { 
  Search, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  ChevronLeft, 
  Plus, 
  Tags, 
  Check, 
  Edit3, 
  History, 
  AlertTriangle, 
  X,
  XCircle,
  Activity,
  LineChart,
  BarChart3,
  Trash2
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

interface StoresViewProps {
  stores: Store[];
  notifications: Notification[];
  pisos: string[];
  categorias: string[];
  onAddStore: (store: Omit<Store, 'id'>) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;
  onViewNotificationDetail: (notif: Notification) => void;
  onTriggerToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, msg: string) => void;
}

export const StoresView: React.FC<StoresViewProps> = ({
  stores,
  notifications,
  pisos,
  categorias,
  onAddStore,
  onUpdateStore,
  onDeleteStore,
  onViewNotificationDetail,
  onTriggerToast
}) => {
  const nowStr = useMemo(() => new Date().toISOString(), []);

  // Filter States
  const [filterPiso, setFilterPiso] = useState<string>('');
  const [filterCategoria, setFilterCategoria] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local state for active sub-view
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  
  // Create Store Modal State
  const [isNewStoreOpen, setIsNewStoreOpen] = useState(false);

  // New Store Form Stating
  const [newNome, setNewNome] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newResponsavel, setNewResponsavel] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPiso, setNewPiso] = useState(pisos[0] || 'Piso Térreo');
  const [newCategoria, setNewCategoria] = useState(categorias[0] || 'Moda');

  // Edit Store Cadastral Form
  const [editMode, setEditMode] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editResponsavel, setEditResponsavel] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPiso, setEditPiso] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editAtiva, setEditAtiva] = useState(true);

  // Custom delete confirmation modal state
  const [deleteConfirmStore, setDeleteConfirmStore] = useState<{ id: string; nome: string } | null>(null);

  // Filter stores list
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (filterPiso && s.piso !== filterPiso) return false;
      if (filterCategoria && s.categoria !== filterCategoria) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.nome.toLowerCase().includes(q);
        const matchesResp = s.responsavel.toLowerCase().includes(q);
        const matchesCnpj = s.cnpj?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesResp && !matchesCnpj) return false;
      }
      return true;
    });
  }, [stores, filterPiso, filterCategoria, searchQuery]);

  // Aggregate stats per store for list visual counters
  const storeCounters = useMemo(() => {
    const map: { [key: string]: { total: number; pendentes: number; resolvidas: number } } = {};
    
    // Initialize
    stores.forEach(s => {
      map[s.id] = { total: 0, pendentes: 0, resolvidas: 0 };
    });

    // Populate
    notifications.forEach(n => {
      if (n.status === 'Cancelada') return;
      if (map[n.lojaId]) {
        map[n.lojaId].total++;
        const status = getNotificationDisplayStatus(n, nowStr);
        if (status === 'Pendente' || status === 'Em Andamento' || status === 'Vencida') {
          map[n.lojaId].pendentes++;
        } else if (status === 'Resolvida') {
          map[n.lojaId].resolvidas++;
        }
      }
    });

    return map;
  }, [stores, notifications, nowStr]);

  // Retrieve current active store details
  const currentStore = useMemo(() => {
    if (!selectedStoreId) return null;
    return stores.find(s => s.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  // Store profile calculations
  const profileData = useMemo(() => {
    if (!selectedStoreId) return null;
    
    // All notifications for this store (excluding canceled maybe, let's include for full context, labeled properly)
    const storeNotifs = notifications
      .filter(n => n.lojaId === selectedStoreId)
      .sort((a,b) => new Date(b.dataEnvio).getTime() - new Date(a.dataEnvio).getTime());

    // Timeline sequence
    const totalCount = storeNotifs.filter(n => n.status !== 'Cancelada').length;
    const completedCount = storeNotifs.filter(n => getNotificationDisplayStatus(n, nowStr) === 'Resolvida').length;
    const resRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    // Recurrent Types
    const recTypes = getStoreRecurrentTypes(selectedStoreId, notifications, nowStr);

    // Monthly chart stats: last 12 months specifically for this store
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
      completedCount
    };
  }, [selectedStoreId, notifications, nowStr]);

  // Handle opening profile of a store
  const handleOpenStoreProfile = (store: Store) => {
    setSelectedStoreId(store.id);
    setEditNome(store.nome);
    setEditCnpj(store.cnpj || '');
    setEditResponsavel(store.responsavel);
    setEditTelefone(store.telefone);
    setEditEmail(store.email);
    setEditPiso(store.piso);
    setEditCategoria(store.categoria);
    setEditAtiva(store.ativa);
    setEditMode(false);
  };

  const handleDeleteStoreClick = (e: React.MouseEvent, storeId: string, storeNome: string) => {
    e.stopPropagation();
    setDeleteConfirmStore({ id: storeId, nome: storeNome });
  };

  const handleExecuteDeleteStore = () => {
    if (!deleteConfirmStore) return;
    onDeleteStore(deleteConfirmStore.id);
    if (selectedStoreId === deleteConfirmStore.id) {
      setSelectedStoreId(null);
    }
    onTriggerToast('success', 'Loja Removida', `A loja "${deleteConfirmStore.nome}" e todo o seu histórico foram excluídos.`);
    setDeleteConfirmStore(null);
  };

  // Submit Edit Store form
  const handleSaveStoreCadastre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId || !editNome.trim()) return;

    onUpdateStore({
      id: selectedStoreId,
      nome: editNome,
      cnpj: editCnpj,
      responsavel: editResponsavel,
      telefone: editTelefone,
      email: editEmail,
      piso: editPiso,
      categoria: editCategoria,
      ativa: editAtiva
    });

    setEditMode(false);
    onTriggerToast('success', 'Cadastro Atualizado', `Os dados operacionais de "${editNome}" foram salvos com sucesso.`);
  };

  const handleAddNewStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim() || !newResponsavel.trim()) {
      onTriggerToast('error', 'Campos faltando', 'Nome da Loja e gerente responsável são obrigatórios.');
      return;
    }

    onAddStore({
      nome: newNome,
      cnpj: newCnpj,
      responsavel: newResponsavel,
      telefone: newTelefone,
      email: newEmail,
      piso: newPiso,
      categoria: newCategoria,
      ativa: true
    });

    setIsNewStoreOpen(false);
    // Reset inputs
    setNewNome('');
    setNewCnpj('');
    setNewResponsavel('');
    setNewTelefone('');
    setNewEmail('');
    onTriggerToast('success', 'Nova Loja Cadastrada', 'Empresa integrada à base e disponível para registro de notificações.');
  };

  return (
    <div className="space-y-6">

      {/* --- SUBVIEW: LIST OF STORES --- */}
      {!selectedStoreId ? (
        <>
          {/* Filters Bar */}
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </span>
                <input 
                  type="text" 
                  placeholder="Buscar pelo nome da loja, gerente, responsável ou CNPJ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-slate-100 placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#00C4A7] focus:ring-1 focus:ring-[#00C4A7] text-sm"
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={() => setIsNewStoreOpen(true)}
                  className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform duration-200 active:scale-95 shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  Cadastrar Loja
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-[#253549]">
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Filtrar por Piso</label>
                <select 
                  value={filterPiso}
                  onChange={(e) => setFilterPiso(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#00C4A7]"
                >
                  <option value="">(Todos os Pisos)</option>
                  {pisos.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Filtrar por Categoria</label>
                <select 
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#00C4A7]"
                >
                  <option value="">(Todas as Categorias)</option>
                  {categorias.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end justify-end text-xs text-slate-400 font-mono pb-2">
                Mostrando <span className="text-[#00C4A7] font-bold mx-1">{filteredStores.length}</span> lojas de <span className="text-slate-300 mx-1 font-bold">{stores.length}</span> mapeadas.
              </div>
            </div>
          </div>

          {/* Stores Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStores.length === 0 ? (
              <div className="col-span-full py-16 bg-[#1A2636] border border-slate-800 rounded-xl text-center text-slate-500 font-sans">
                Nenhuma loja encontrada utilizando os parâmetros estipulados de filtragem.
              </div>
            ) : (
              filteredStores.map(store => {
                const isRec = isStoreRecurrent(store.id, notifications, nowStr);
                const countObj = storeCounters[store.id] || { total: 0, pendentes: 0, resolvidas: 0 };
                
                return (
                  <div 
                    key={store.id}
                    onClick={() => handleOpenStoreProfile(store)}
                    className={`bg-[#1A2636] border rounded-xl p-5 hover:border-[#00C4A7]/50 hover:bg-[#1E2E41] cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                      !store.ativa ? 'border-dashed border-slate-700 opacity-60' : 'border-[#253549]'
                    }`}
                  >
                    <div>
                      {/* Top Header info */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight bg-slate-800 px-2 py-0.5 rounded border border-slate-750 inline-block mb-1">
                            {store.categoria}
                          </p>
                          <h4 className="text-base font-bold text-slate-100 flex items-center gap-1.5 mt-1 truncate">
                            {store.nome}
                            {!store.ativa && <span className="text-[10px] font-sans text-red-500 font-bold border border-red-500/20 px-1 rounded">INATIVA</span>}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Recurrence Indicator Badge */}
                          {isRec && (
                            <span 
                              className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 font-bold text-[9px] px-2 py-0.5 rounded flex items-center gap-1"
                              title="Lojas Recorrentes: 3+ infrações do mesmo tipo nos últimos 12 meses."
                            >
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Recorrente
                            </span>
                          )}

                          {/* Quick delete button */}
                          <button
                            onClick={(e) => handleDeleteStoreClick(e, store.id, store.nome)}
                            className="p-1.5 bg-slate-800 hover:bg-red-500/15 border border-slate-750 hover:border-red-500/30 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                            title="Excluir Loja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info Row indicators */}
                      <div className="mt-4 space-y-2 text-xs text-slate-300 border-b border-[#253549] pb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#00C4A7] shrink-0" />
                          <span>{store.piso}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#00C4A7] shrink-0" />
                          <span>Gerente: <span className="font-semibold text-slate-200">{store.responsavel}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Numeric Counters */}
                    <div className="grid grid-cols-3 gap-1 pt-4 text-center">
                      <div className="bg-[#0F1923] p-1.5 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">Registradas</span>
                        <span className="text-sm font-bold font-mono text-slate-100">{countObj.total}</span>
                      </div>
                      <div className="bg-[#0F1923] p-1.5 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">Em Aberto</span>
                        <span className={`text-sm font-bold font-mono ${countObj.pendentes > 0 ? 'text-[#EF4444]' : 'text-[#00C4A7]'}`}>
                          {countObj.pendentes}
                        </span>
                      </div>
                      <div className="bg-[#0F1923] p-1.5 rounded border border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">Resolvidas</span>
                        <span className="text-sm font-bold font-mono text-[#22C55E]">{countObj.resolvidas}</span>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 h-1 bg-[#00C4A7]/20 w-full" />
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* --- SUBVIEW: STORE PROFILE DETAIL --- */
        currentStore && profileData && (
          <div className="space-y-6">
            
            {/* Back Button and Info Row */}
            <div className="flex items-center justify-between border-b border-[#253549] pb-4">
              <button 
                onClick={() => setSelectedStoreId(null)}
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
                          onClick={(e) => handleDeleteStoreClick(e, currentStore.id, currentStore.nome)}
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
                    /* Read Only cadastral details */
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-450 uppercase block">Nome Comercial</span>
                        <p className="text-base font-bold font-sans text-slate-100 mt-0.5">{currentStore.nome}</p>
                      </div>
                      
                      <div>
                        <span className="text-[10px] text-slate-450 uppercase block">CNPJ Técnico</span>
                        <p className="text-xs font-mono text-slate-300 mt-0.5">{currentStore.cnpj || '(Não registrado / Isento)'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-450 uppercase block">Piso Comercial</span>
                          <p className="text-xs text-slate-200 mt-0.5">{currentStore.piso}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-450 uppercase block">Categoria</span>
                          <p className="text-xs text-slate-205 mt-0.5">{currentStore.categoria}</p>
                        </div>
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
                    /* Edit Form Cadastre */
                    <form onSubmit={handleSaveStoreCadastre} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Nome Fantasia *</label>
                        <input 
                          type="text" 
                          value={editNome} 
                          onChange={(e) => setEditNome(e.target.value)}
                          required
                          className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">CNPJ</label>
                        <input 
                          type="text" 
                          value={editCnpj} 
                          onChange={(e) => setEditCnpj(e.target.value)}
                          placeholder="00.000.000/0000-00"
                          className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none focus:border-[#00C4A7] font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Piso</label>
                          <select 
                            value={editPiso} 
                            onChange={(e) => setEditPiso(e.target.value)}
                            className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none"
                          >
                            {pisos.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Categoria</label>
                          <select 
                            value={editCategoria} 
                            onChange={(e) => setEditCategoria(e.target.value)}
                            className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none"
                          >
                            {categorias.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Nome do Responsável *</label>
                        <input 
                          type="text" 
                          value={editResponsavel} 
                          onChange={(e) => setEditResponsavel(e.target.value)}
                          required
                          className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Contato Telefônico</label>
                        <input 
                          type="text" 
                          value={editTelefone} 
                          onChange={(e) => setEditTelefone(e.target.value)}
                          className="w-full bg-[#0F1923] border border-[#253549] text-slate-200 p-2 rounded focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">E-mail Corporativo</label>
                        <input 
                          type="email" 
                          value={editEmail} 
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-[#0F1923] border border-[#253549] text-slate-300 p-2 rounded focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1.5">
                        <input 
                          type="checkbox" 
                          id="edit_ativa"
                          checked={editAtiva} 
                          onChange={(e) => setEditAtiva(e.target.checked)}
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

            {/* Box 3: Timeline / List of Notifications for this store */}
            <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-[#253549] pb-3">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <History className="w-4.5 h-4.5 text-[#00C4A7]" />
                  Acompanhamento Histórico Cronológico — Ocorrências
                </h4>
                <p className="text-[11px] font-mono text-slate-400">Total: {profileData.storeNotifs.length} registros</p>
              </div>

              <div className="space-y-4">
                {profileData.storeNotifs.length === 0 ? (
                  <div className="text-center py-10 text-slate-555 text-xs">
                     Histórico limpo! Nenhuma ocorrência física ou comunicados cadastrados para esta loja.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-755 ml-3 pl-5 space-y-6">
                    {profileData.storeNotifs.map((n) => {
                      const displayStatus = getNotificationDisplayStatus(n, nowStr);
                      const soonAlert = isExpiringSoon(n, nowStr);

                      return (
                        <div key={n.id} className="relative group">
                          
                          {/* Bullet Icon Anchor */}
                          <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                            displayStatus === 'Resolvida' ? 'bg-[#22C55E] border-slate-900' :
                            displayStatus === 'Vencida' ? 'bg-[#EF4444] border-slate-900' :
                            soonAlert ? 'bg-[#F59E0B] border-slate-900' :
                            'bg-[#3B82F6] border-slate-900'
                          }`} />

                          <div className="bg-[#0F1923] p-4 rounded-xl border border-slate-800 transition-all hover:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="font-mono text-[10px] text-slate-450">
                                  {new Date(n.dataEnvio).toLocaleDateString('pt-BR')}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  displayStatus === 'Resolvida' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                                  displayStatus === 'Vencida' ? 'bg-[#EF4444]/15 text-[#EF4444]' :
                                  'bg-[#F59E0B]/10 text-[#F59E0B]'
                                }`}>
                                  {displayStatus}
                                </span>
                                <span className="bg-slate-800 text-[#00C4A7] text-[9px] px-1.5 py-0.5 rounded font-medium border border-slate-700">
                                  {n.tipo}
                                </span>
                              </div>
                              <h5 className="text-sm font-semibold text-slate-200 mt-2">{n.titulo}</h5>
                              <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-2xl font-sans">{n.descricao}</p>
                            </div>

                            <div className="shrink-0 flex items-center gap-2.5">
                              {/* View detail button trigger */}
                              <button 
                                onClick={() => onViewNotificationDetail(n)}
                                className="bg-[#1A2636] hover:bg-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg border border-slate-750 flex items-center gap-1.5 select-none"
                              >
                                Exibir Dossiê
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )
      )}

      {/* NEW STORE CREATION MODAL */}
      {isNewStoreOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-[#253549] max-w-md w-full rounded-2xl shadow-2xl overflow-hidden font-sans animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#253549] bg-[#151F2D] flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-[#00C4A7]" />
                Adicionar Nova Loja Comercial
              </h4>
              <button onClick={() => setIsNewStoreOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewStore} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Nome Fantasia / Comercial *</label>
                <input 
                  type="text" 
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Ex: Renner Mall"
                  required
                  className="w-full bg-[#0F1923] border border-[#253549] p-2.5 rounded text-slate-200 focus:outline-none focus:border-[#00C4A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">CNPJ</label>
                <input 
                  type="text" 
                  value={newCnpj}
                  onChange={(e) => setNewCnpj(e.target.value)}
                  placeholder="Ex: 92.834.122/0001-08"
                  className="w-full bg-[#0F1923] border border-[#253549] p-2.5 rounded text-slate-200 focus:outline-none focus:border-[#00C4A7] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Piso Comercial</label>
                  <select 
                    value={newPiso}
                    onChange={(e) => setNewPiso(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] p-2.5 rounded text-slate-200 focus:outline-none"
                  >
                    {pisos.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Setor / Categoria</label>
                  <select 
                    value={newCategoria}
                    onChange={(e) => setNewCategoria(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] p-2.5 rounded text-slate-200 focus:outline-none"
                  >
                    {categorias.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Gerente Geral do Estabelecimento *</label>
                <input 
                  type="text" 
                  value={newResponsavel}
                  onChange={(e) => setNewResponsavel(e.target.value)}
                  placeholder="Nome do gerente principal"
                  required
                  className="w-full bg-[#0F1923] border border-[#253549] p-2.5 rounded text-slate-200 focus:outline-none focus:border-[#00C4A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Email de Contato Comercial</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="w-full bg-[#0F1923] border border-[#253549] p-2.5 rounded text-slate-200 focus:outline-none focus:border-[#00C4A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Telefone Principal / SMS / WhatsApp</label>
                <input 
                  type="text" 
                  value={newTelefone}
                  onChange={(e) => setNewTelefone(e.target.value)}
                  placeholder="(11) 99999-8888"
                  className="w-full bg-[#0F1923] border border-[#253549] p-2.5 rounded text-slate-200 focus:outline-none focus:border-[#00C4A7] font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsNewStoreOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2 rounded"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 font-bold px-5 py-2 rounded shadow"
                >
                  Salvar Cadastro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmStore && (
        <div className="fixed inset-0 bg-[#0F1923]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div 
            className="bg-[#1A2636] border border-red-500/20 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 text-red-400 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100">
                  Excluir Loja Permanentemente?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tem certeza de que deseja remover a loja <strong className="text-slate-200 font-bold">"{deleteConfirmStore.nome}"</strong>?
                </p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-[11px] text-red-250 leading-relaxed">
              ⚠️ <strong>Aviso Importante:</strong> Esta ação é definitiva e removerá permanentemente todos os registros, notificações pendentes e históricos de infrações relacionados a este estabelecimento.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmStore(null)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs px-4 py-2 rounded-lg transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteStore}
                className="bg-red-650 hover:bg-red-550 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
              >
                Sim, Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
