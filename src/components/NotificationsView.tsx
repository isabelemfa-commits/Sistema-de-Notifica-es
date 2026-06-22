import React, { useState, useMemo } from 'react';
import { Store, Notification, NotificationHistory } from '../types';
import { 
  getNotificationDisplayStatus, 
  isExpiringSoon, 
  isStoreRecurrent 
} from '../mockData';
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Edit2, 
  MessageSquare, 
  Trash2, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  FilterX,
  History,
  AlertTriangle
} from 'lucide-react';

interface NotificationsViewProps {
  stores: Store[];
  notifications: Notification[];
  pisos: string[];
  categorias: string[];
  tiposNotificacao: string[];
  initialFilters?: { alertOnly?: boolean };
  onAddNotification: (notif: Omit<Notification, 'id' | 'historico'> & { historico?: NotificationHistory[] }) => void;
  onUpdateNotification: (notif: Notification) => void;
  onDeleteNotification: (id: string) => void;
  onTriggerToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, msg: string) => void;
}

type SortField = 'store' | 'piso' | 'tipo' | 'titulo' | 'dataEnvio' | 'dataVencimento' | 'status' | 'prioridade';
type SortDirection = 'asc' | 'desc';

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  stores,
  notifications,
  pisos,
  tiposNotificacao,
  initialFilters,
  onAddNotification,
  onUpdateNotification,
  onDeleteNotification,
  onTriggerToast
}) => {
  const nowStr = useMemo(() => new Date().toISOString(), []);

  // Filter States
  const [filterPiso, setFilterPiso] = useState<string>('');
  const [filterLojaId, setFilterLojaId] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>(initialFilters?.alertOnly ? 'ALERT' : '');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  const [sortField, setSortField] = useState<SortField>('dataEnvio');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal / Drawer states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddObsOpen, setIsAddObsOpen] = useState(false);
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  // Quick Observation state
  const [quickObsText, setQuickObsText] = useState('');
  const [quickObsAuthor, setQuickObsAuthor] = useState('Gestão de Shopping');

  // Create Form States
  const [formLojaId, setFormLojaId] = useState('');
  const [formTipo, setFormTipo] = useState(tiposNotificacao[0] || 'Comunicado');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formDataEnvio, setFormDataEnvio] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDataVencimento, setFormDataVencimento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [formStatus, setFormStatus] = useState<'Pendente' | 'Em Andamento' | 'Resolvida' | 'Vencida' | 'Cancelada'>('Pendente');
  const [formPrioridade, setFormPrioridade] = useState<'Baixa' | 'Média' | 'Alta' | 'Crítica'>('Média');
  const [formEvidencia, setFormEvidencia] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formCriadoPor, setFormCriadoPor] = useState('Mariana Costa (Coordenação Lojistas)');

  // Filter active list
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const store = stores.find(s => s.id === n.lojaId);
      const displayStatus = getNotificationDisplayStatus(n, nowStr);

      // Floor filter
      if (filterPiso && store?.piso !== filterPiso) return false;
      
      // Store ID filter
      if (filterLojaId && n.lojaId !== filterLojaId) return false;

      // Type filter
      if (filterTipo && n.tipo !== filterTipo) return false;

      // Status Filter
      if (filterStatus) {
        if (filterStatus === 'ALERT') {
          // Special alert status: either dynamic Overdue OR Expiring soon in 7 days
          const overdue = displayStatus === 'Vencida';
          const expSoon = isExpiringSoon(n, nowStr);
          if (!overdue && !expSoon) return false;
        } else if (displayStatus !== filterStatus) {
          return false;
        }
      }

      // Priority Filter
      if (filterPrioridade && n.prioridade !== filterPrioridade) return false;

      // Start Date Filter
      if (filterDataInicio && new Date(n.dataEnvio) < new Date(filterDataInicio)) return false;

      // End Date Filter
      if (filterDataFim) {
        // Include full day of the end date
        const dFim = new Date(filterDataFim);
        dFim.setHours(23, 59, 59, 999);
        if (new Date(n.dataEnvio) > dFim) return false;
      }

      // Text query search: title, description, store name, or CNPJ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const hasTitle = n.titulo.toLowerCase().includes(query);
        const hasDesc = n.descricao.toLowerCase().includes(query);
        const hasStoreName = store?.nome.toLowerCase().includes(query) || false;
        const hasCNPJ = store?.cnpj?.toLowerCase().includes(query) || false;
        if (!hasTitle && !hasDesc && !hasStoreName && !hasCNPJ) return false;
      }

      return true;
    });
  }, [notifications, stores, filterPiso, filterLojaId, filterTipo, filterStatus, filterPrioridade, filterDataInicio, filterDataFim, searchQuery, nowStr]);

  // Sorting
  const sortedNotifications = useMemo(() => {
    const list = [...filteredNotifications];
    return list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      const storeA = stores.find(s => s.id === a.lojaId);
      const storeB = stores.find(s => s.id === b.lojaId);

      if (sortField === 'store') {
        valA = storeA?.nome.toLowerCase() || '';
        valB = storeB?.nome.toLowerCase() || '';
      } else if (sortField === 'piso') {
        valA = storeA?.piso?.toLowerCase() || '';
        valB = storeB?.piso?.toLowerCase() || '';
      } else if (sortField === 'tipo') {
        valA = a.tipo.toLowerCase();
        valB = b.tipo.toLowerCase();
      } else if (sortField === 'titulo') {
        valA = a.titulo.toLowerCase();
        valB = b.titulo.toLowerCase();
      } else if (sortField === 'dataEnvio') {
        valA = new Date(a.dataEnvio).getTime();
        valB = new Date(b.dataEnvio).getTime();
      } else if (sortField === 'dataVencimento') {
        valA = new Date(a.dataVencimento).getTime();
        valB = new Date(b.dataVencimento).getTime();
      } else if (sortField === 'status') {
        valA = getNotificationDisplayStatus(a, nowStr);
        valB = getNotificationDisplayStatus(b, nowStr);
      } else if (sortField === 'prioridade') {
        // Map priority to numeric
        const weight = { 'Crítica': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
        valA = weight[a.prioridade] || 0;
        valB = weight[b.prioridade] || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredNotifications, stores, sortField, sortDirection, nowStr]);

  // Paginated list
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedNotifications.slice(start, start + itemsPerPage);
  }, [sortedNotifications, currentPage]);

  const totalPages = Math.ceil(sortedNotifications.length / itemsPerPage) || 1;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterPiso('');
    setFilterLojaId('');
    setFilterTipo('');
    setFilterStatus('');
    setFilterPrioridade('');
    setFilterDataInicio('');
    setFilterDataFim('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Export Filtered Table to CSV manual Blob
  const exportToCSV = () => {
    try {
      let csvContent = '\uFEFF'; // Add UTF-8 BOM for Excel support
      // Headers
      csvContent += "ID;Loja;Piso;Tipo;Titulo;Data Envio;Data Vencimento;Status;Prioridade;Criado Por;Entregue Via\n";
      
      sortedNotifications.forEach(n => {
        const store = stores.find(s => s.id === n.lojaId);
        const displayStatus = getNotificationDisplayStatus(n, nowStr);
        
        const row = [
          n.id,
          store?.nome || 'N/A',
          store?.piso || 'N/A',
          n.tipo,
          `"${n.titulo.replace(/"/g, '""')}"`,
          new Date(n.dataEnvio).toLocaleDateString('pt-BR'),
          new Date(n.dataVencimento).toLocaleDateString('pt-BR'),
          displayStatus,
          n.prioridade,
          `"${n.criadoPor.replace(/"/g, '""')}"`,
          `"${n.evidenciaEntrega.replace(/"/g, '""')}"`
        ].join(';');
        csvContent += row + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `notificoes_filtradas_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onTriggerToast('success', 'Backup CSV exportado', `${sortedNotifications.length} notificações gravadas em arquivo.`);
    } catch (err) {
      onTriggerToast('error', 'Falha ao exportar', 'Ocorreu um erro ao montar a planilha.');
    }
  };

  // Row Quick Status Dropdown Handler
  const handleInlineStatusChange = (n: Notification, nextStatus: any) => {
    try {
      const prevDisplay = getNotificationDisplayStatus(n, nowStr);
      let updatedResolucao = n.dataResolucao;
      
      if (nextStatus === 'Resolvida') {
        updatedResolucao = new Date().toISOString();
      } else if (prevDisplay === 'Resolvida') {
        updatedResolucao = null;
      }

      const updatedHistoryItem: NotificationHistory = {
        data: new Date().toISOString(),
        descricao: `Status alterado inline de "${prevDisplay}" para "${nextStatus}"`,
        autor: "Painel do Gestor"
      };

      const revised: Notification = {
        ...n,
        status: nextStatus,
        dataResolucao: updatedResolucao,
        historico: [...n.historico, updatedHistoryItem]
      };

      onUpdateNotification(revised);
      onTriggerToast('success', 'Status atualizado', `A notificação da loja "${stores.find(s => s.id === n.lojaId)?.nome}" está agora "${nextStatus}".`);
    } catch (e) {
      onTriggerToast('error', 'Ops!', 'Não foi possível alterar o status inline.');
    }
  };

  const handleOpenAddObs = (n: Notification) => {
    setSelectedNotification(n);
    setQuickObsText('');
    setQuickObsAuthor('Gestão de Shopping');
    setIsAddObsOpen(true);
  };

  const submitQuickObs = () => {
    if (!selectedNotification || !quickObsText.trim()) return;

    const currentObsDate = new Date().toISOString();
    const updatedHistory: NotificationHistory = {
      data: currentObsDate,
      descricao: `Observação adicionada: "${quickObsText}"`,
      autor: quickObsAuthor
    };

    const updatedNotif: Notification = {
      ...selectedNotification,
      observacoes: `${selectedNotification.observacoes}\n[${new Date(currentObsDate).toLocaleDateString('pt-BR')}] - ${quickObsText}`.trim(),
      historico: [...selectedNotification.historico, updatedHistory]
    };

    onUpdateNotification(updatedNotif);
    setIsAddObsOpen(false);
    onTriggerToast('success', 'Observação salva', 'A anotação foi gravada no registro do histórico.');
  };

  // Create Modal Submission
  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLojaId || !formTitulo || !formDescricao) {
      onTriggerToast('error', 'Erro de validação', 'Por favor, selecione a loja e insira título e descrição.');
      return;
    }

    const envioDate = new Date(formDataEnvio).toISOString();
    const vencDate = new Date(formDataVencimento).toISOString();

    const createdHistory: NotificationHistory = {
      data: new Date().toISOString(),
      descricao: `Notificação cadastrada com status inicial "${formStatus}"`,
      autor: formCriadoPor
    };

    onAddNotification({
      lojaId: formLojaId,
      tipo: formTipo,
      titulo: formTitulo,
      descricao: formDescricao,
      dataEnvio: envioDate,
      dataVencimento: vencDate,
      dataResolucao: formStatus === 'Resolvida' ? new Date().toISOString() : null,
      status: formStatus,
      prioridade: formPrioridade,
      evidenciaEntrega: formEvidencia || 'Notificação no Sistema',
      observacoes: formObservacoes,
      criadoPor: formCriadoPor,
      historico: [createdHistory]
    });

    setIsCreateOpen(false);
    // Reset Form
    setFormLojaId('');
    setFormTitulo('');
    setFormDescricao('');
    setFormEvidencia('');
    setFormObservacoes('');
    onTriggerToast('success', 'Notificação Registrada', 'Novo comunicado ativo criado no sistema.');
  };

  // Edit Modal Fill-in and Submission
  const handleOpenEdit = (n: Notification) => {
    setSelectedNotification(n);
    setFormLojaId(n.lojaId);
    setFormTipo(n.tipo);
    setFormTitulo(n.titulo);
    setFormDescricao(n.descricao);
    setFormDataEnvio(new Date(n.dataEnvio).toISOString().split('T')[0]);
    setFormDataVencimento(new Date(n.dataVencimento).toISOString().split('T')[0]);
    setFormStatus(n.status);
    setFormPrioridade(n.prioridade);
    setFormEvidencia(n.evidenciaEntrega);
    setFormObservacoes(n.observacoes);
    setFormCriadoPor(n.criadoPor);
    setIsEditOpen(true);
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotification) return;

    const recordChange = (): string => {
      let changes = [];
      if (selectedNotification.titulo !== formTitulo) changes.push(`Título alterado de "${selectedNotification.titulo}" para "${formTitulo}"`);
      if (selectedNotification.status !== formStatus) changes.push(`Status modificado de "${selectedNotification.status}" para "${formStatus}"`);
      if (selectedNotification.prioridade !== formPrioridade) changes.push(`Prioridade alterada para "${formPrioridade}"`);
      return changes.length > 0 ? changes.join(' | ') : 'Registro técnico editado pela administração';
    };

    const editHistoryItem: NotificationHistory = {
      data: new Date().toISOString(),
      descricao: recordChange(),
      autor: formCriadoPor
    };

    const hasResolved = formStatus === 'Resolvida' && selectedNotification.status !== 'Resolvida';
    const updatedResolucao = hasResolved ? new Date().toISOString() : (formStatus !== 'Resolvida' ? null : selectedNotification.dataResolucao);

    const updated: Notification = {
      ...selectedNotification,
      lojaId: formLojaId,
      tipo: formTipo,
      titulo: formTitulo,
      descricao: formDescricao,
      dataEnvio: new Date(formDataEnvio).toISOString(),
      dataVencimento: new Date(formDataVencimento).toISOString(),
      dataResolucao: updatedResolucao,
      status: formStatus,
      prioridade: formPrioridade,
      evidenciaEntrega: formEvidencia,
      observacoes: formObservacoes,
      criadoPor: formCriadoPor,
      historico: [...selectedNotification.historico, editHistoryItem]
    };

    onUpdateNotification(updated);
    setIsEditOpen(false);
    onTriggerToast('success', 'Registro atualizado', 'Todas as alterações foram consolidadas com sucesso.');
  };

  const handleDeleteNotif = (id: string, storeName: string) => {
    if (confirm(`Atenção: Tem certeza de que deseja remover permanentemente a notificação da loja "${storeName}"? Esta ação não pode ser desfeita.`)) {
      onDeleteNotification(id);
      onTriggerToast('warning', 'Registro Excluído', `A notificação ID #${id} foi removida da base de persistência.`);
    }
  };

  const handleOpenDetail = (n: Notification) => {
    setSelectedNotification(n);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Control Tools Frame */}
      <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-slate-400" />
            </span>
            <input 
              type="text" 
              placeholder="Buscar por loja, título, descrição ou CNPJ..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0F1923] border border-[#253549] text-slate-100 placeholder-slate-500 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#00C4A7] focus:ring-1 focus:ring-[#00C4A7] text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button 
              onClick={handleResetFilters}
              className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Limpar todos os filtros ativos"
            >
              <FilterX className="w-4 h-4" />
              Reset Filtros
            </button>
            <button 
              onClick={exportToCSV}
              className="bg-slate-800 hover:bg-slate-700 text-[#00C4A7] border border-[#00C4A7]/20 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Exportar registros filtrados atuais para arquivo Excel CSV"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button 
              onClick={() => {
                // Populate default or first store active
                const activeStores = stores.filter(s => s.ativa);
                if (activeStores.length > 0) {
                  setFormLojaId(activeStores[0].id);
                }
                setFormTipo(tiposNotificacao[0] || 'Comunicado');
                setFormStatus('Pendente');
                setFormPrioridade('Média');
                setFormTitulo('');
                setFormDescricao('');
                setFormEvidencia('');
                setFormObservacoes('');
                setIsCreateOpen(true);
              }}
              className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform duration-200 active:scale-95 shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              Nova Notificação
            </button>
          </div>
        </div>

        {/* Detailed Filters Expand Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2 border-t border-[#253549]">
          
          <div>
            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Piso</label>
            <select 
              value={filterPiso}
              onChange={(e) => { setFilterPiso(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
            >
              <option value="">(Todos)</option>
              {pisos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Loja</label>
            <select 
              value={filterLojaId}
              onChange={(e) => { setFilterLojaId(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
            >
              <option value="">(Todas)</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.nome} {!s.ativa ? '(Inativa)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Tipo</label>
            <select 
              value={filterTipo}
              onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
            >
              <option value="">(Todos)</option>
              {tiposNotificacao.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Status</label>
            <select 
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
            >
              <option value="">(Todos)</option>
              <option value="ALERT">⚠️ Alertas (Vencendo/Vencido)</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Resolvida">Resolvida</option>
              <option value="Vencida">Vencida</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Prioridade</label>
            <select 
              value={filterPrioridade}
              onChange={(e) => { setFilterPrioridade(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
            >
              <option value="">(Todas)</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Início / Fim</label>
            <div className="flex gap-1">
              <input 
                type="date" 
                value={filterDataInicio}
                onChange={(e) => { setFilterDataInicio(e.target.value); setCurrentPage(1); }}
                className="w-1/2 bg-[#0F1923] border border-[#253549] text-[10px] text-slate-200 rounded-lg p-1.5 focus:outline-none"
              />
              <input 
                type="date" 
                value={filterDataFim}
                onChange={(e) => { setFilterDataFim(e.target.value); setCurrentPage(1); }}
                className="w-1/2 bg-[#0F1923] border border-[#253549] text-[10px] text-slate-200 rounded-lg p-1.5 focus:outline-none"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-[#1A2636] border border-[#253549] rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-[#253549] flex justify-between items-center bg-[#151F2D]">
          <h3 className="text-sm font-semibold text-slate-200">
            Listagem de Notificações 
            <span className="ml-2 bg-[#0F1923] text-slate-400 font-mono text-xs px-2 py-0.5 rounded-full border border-slate-800">
              {filteredNotifications.length} encontrados
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Pág {currentPage} de {totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#253549] bg-[#111A24] text-slate-300 text-xs font-semibold select-none">
                <th onClick={() => handleSort('store')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1">
                    Loja
                    {sortField === 'store' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th onClick={() => handleSort('piso')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1">
                    Piso
                    {sortField === 'piso' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th onClick={() => handleSort('tipo')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1 block">
                    Tipo
                    {sortField === 'tipo' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th onClick={() => handleSort('titulo')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1">
                    Título
                    {sortField === 'titulo' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th onClick={() => handleSort('dataEnvio')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1">
                    Postado
                    {sortField === 'dataEnvio' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th onClick={() => handleSort('dataVencimento')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1">
                    Vence Em
                    {sortField === 'dataVencimento' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th onClick={() => handleSort('prioridade')} className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors">
                  <span className="flex items-center gap-1">
                    Relevância
                    {sortField === 'prioridade' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-[#00C4A7]" /> : <ChevronDown className="w-3 h-3 text-[#00C4A7]" />)}
                  </span>
                </th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#253549] text-xs">
              {paginatedNotifications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-sans">
                    Nenhuma notificação encontrada correspondendo aos parâmetros ativos de filtro.
                  </td>
                </tr>
              ) : (
                paginatedNotifications.map((n) => {
                  const store = stores.find(s => s.id === n.lojaId);
                  const displayStatus = getNotificationDisplayStatus(n, nowStr);
                  const soonAlert = isExpiringSoon(n, nowStr);
                  const isRec = store ? isStoreRecurrent(store.id, notifications, nowStr) : false;

                  return (
                    <tr 
                      key={n.id} 
                      className={`hover:bg-[#1E2E41] transition-colors border-l-2 border-l-transparent ${
                        displayStatus === 'Vencida' ? 'bg-[#EF4444]/2' : soonAlert ? 'bg-[#F29E0B]/2' : ''
                      }`}
                    >
                      <td className="p-4 font-semibold text-slate-100">
                        <div className="flex flex-col">
                          <span>{store?.nome || n.lojaId}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{store?.cnpj || 'S/ CNPJ'}</span>
                          {isRec && (
                            <span 
                              className="w-max mt-1 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 font-bold font-sans text-[8px] px-1 rounded"
                              title="Recorrente: 3+ infrações do mesmo tipo nos últimos 12 meses"
                            >
                              💡 RECORRENTE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 whitespace-nowrap">{store?.piso || 'N/A'}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="bg-slate-800 text-[#00C4A7] border border-slate-700 font-medium px-2 py-0.5 rounded text-[10px]">
                          {n.tipo}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="min-w-[120px]">
                          <p className="font-medium text-slate-200 truncate" title={n.titulo}>{n.titulo}</p>
                          <p className="text-slate-400 font-sans text-[11px] mt-0.5 line-clamp-1" title={n.descricao}>{n.descricao}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono whitespace-nowrap text-slate-400">
                        {new Date(n.dataEnvio).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 font-mono whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={displayStatus === 'Vencida' ? 'text-[#EF4444] font-bold' : soonAlert ? 'text-[#F59E0B] font-bold' : 'text-slate-300'}>
                            {new Date(n.dataVencimento).toLocaleDateString('pt-BR')}
                          </span>
                          {soonAlert && (
                            <span className="text-[9px] text-[#F59E0B] font-sans mt-0.5 animate-pulse">Expira em breve</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded ${
                          displayStatus === 'Resolvida' ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20' :
                          displayStatus === 'Cancelada' ? 'bg-slate-850 text-slate-500 border border-slate-800' :
                          displayStatus === 'Vencida' ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30' :
                          displayStatus === 'Em Andamento' ? 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20' :
                          'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            displayStatus === 'Resolvida' ? 'bg-[#22C55E]' :
                            displayStatus === 'Cancelada' ? 'bg-slate-500' :
                            displayStatus === 'Vencida' ? 'bg-[#EF4444]' :
                            displayStatus === 'Em Andamento' ? 'bg-[#3B82F6]' :
                            'bg-[#F59E0B]'
                          }`}></span>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          n.prioridade === 'Crítica' ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30' :
                          n.prioridade === 'Alta' ? 'bg-[#F29E0B]/15 text-[#F29E0B] border border-[#F29E0B]/30' :
                          n.prioridade === 'Média' ? 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {n.prioridade}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Details Eye Button */}
                          <button 
                            onClick={() => handleOpenDetail(n)}
                            className="p-1 text-slate-400 hover:text-[#00C4A7] hover:bg-slate-800 rounded transition-colors"
                            title="Ver detalhes da Notificação e Histórico"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Edit button */}
                          <button 
                            onClick={() => handleOpenEdit(n)}
                            className="p-1 text-slate-400 hover:text-[#3B82F6] hover:bg-slate-800 rounded transition-colors"
                            title="Editar Comunicado"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Fast Observation Note */}
                          <button 
                            onClick={() => handleOpenAddObs(n)}
                            className="p-1 text-slate-400 hover:text-[#F59E0B] hover:bg-slate-800 rounded transition-colors"
                            title="Adicionar Observação Técnica"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Fast Inline Status Selector Dropdown */}
                          <select 
                            value={n.status} 
                            onChange={(e) => handleInlineStatusChange(n, e.target.value)}
                            className="bg-[#0F1923] border border-[#253549] text-[10px] text-slate-300 font-sans rounded py-0.5 px-1 focus:outline-none"
                            title="Mudar status de forma ágil"
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Resolvida">Resolvida</option>
                            <option value="Cancelada">Cancelada</option>
                          </select>

                          {/* Delete Action button */}
                          <button 
                            onClick={() => handleDeleteNotif(n.id, store?.nome || '')}
                            className="p-1 text-slate-400 hover:text-[#EF4444] hover:bg-slate-800 rounded transition-colors"
                            title="Excluir Definitivamente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#253549] bg-[#151F2D] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Registros mostrando de <span className="font-bold text-slate-300">{((currentPage - 1) * itemsPerPage) + 1}</span> a{' '}
              <span className="font-bold text-slate-300">
                {Math.min(currentPage * itemsPerPage, sortedNotifications.length)}
              </span>{' '}
              do total de <span className="font-bold text-slate-300">{sortedNotifications.length}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(c => Math.max(c - 1, 1))}
                className="p-1.5 rounded-lg bg-[#0F1923] border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1 text-xs rounded-lg font-mono transition-colors ${
                    currentPage === p 
                      ? 'bg-[#00C4A7] text-slate-900 font-bold' 
                      : 'bg-[#0F1923] border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(c => Math.min(c + 1, totalPages))}
                className="p-1.5 rounded-lg bg-[#0F1923] border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAILED VIEW DRAWER (SIDE MODAL) */}
      {isDetailOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-[#1A2636] border-l border-[#253549] h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-250">
            <div>
              {/* Header */}
              <div className="p-5 border-b border-[#253549] flex items-center justify-between bg-[#151F2D]">
                <div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700 uppercase">
                    ID: {selectedNotification.id}
                  </span>
                  <h4 className="text-sm font-bold text-slate-100 mt-1">Detalhes do Registro</h4>
                </div>
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scroll Content */}
              <div className="p-5 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto">
                {/* Store Context Box */}
                <div className="bg-[#0F1923] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-[#00C4A7] font-semibold uppercase font-sans">Empresa Notificada</span>
                  <h4 className="text-base font-bold text-slate-100 mt-0.5">
                    {stores.find(s => s.id === selectedNotification.lojaId)?.nome || selectedNotification.lojaId}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-400">
                    <p>Responsável: <span className="text-slate-200 font-medium">{stores.find(s => s.id === selectedNotification.lojaId)?.responsavel}</span></p>
                    <p>Email: <span className="text-slate-300 break-all">{stores.find(s => s.id === selectedNotification.lojaId)?.email}</span></p>
                    <p>Piso: <span className="text-slate-200">{stores.find(s => s.id === selectedNotification.lojaId)?.piso}</span></p>
                    <p>Telefone: <span className="text-slate-200">{stores.find(s => s.id === selectedNotification.lojaId)?.telefone}</span></p>
                  </div>
                </div>

                {/* Notification Core Metadata */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] text-[#00C4A7] font-bold uppercase tracking-wider block">Assunto & Tipo</span>
                    <p className="text-sm font-semibold text-slate-200 mt-0.5">
                      [{selectedNotification.tipo}] — {selectedNotification.titulo}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Descrição da Infração/Comunicado</span>
                    <p className="text-xs text-slate-300 mt-1 bg-slate-900/60 p-3 rounded border border-slate-850 whitespace-pre-line font-sans leading-relaxed">
                      {selectedNotification.descricao}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Data Envio</span>
                      <p className="font-mono text-xs text-slate-300">{new Date(selectedNotification.dataEnvio).toLocaleDateString('pt-BR')} {new Date(selectedNotification.dataEnvio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Data Limite de Resolução</span>
                      <p className="font-mono text-xs text-[#F59E0B] font-semibold">
                        {new Date(selectedNotification.dataVencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-[#0F1923] p-2 rounded text-center border border-slate-850">
                      <span className="text-[8px] text-slate-450 block uppercase">Status</span>
                      <span className="text-xs font-semibold text-slate-200">{getNotificationDisplayStatus(selectedNotification, nowStr)}</span>
                    </div>
                    <div className="bg-[#0F1923] p-2 rounded text-center border border-slate-850">
                      <span className="text-[8px] text-slate-450 block uppercase">Prioridade</span>
                      <span className="text-xs font-semibold text-[#EF4444]">{selectedNotification.prioridade}</span>
                    </div>
                    <div className="bg-[#0F1923] p-2 rounded text-center border border-slate-850">
                      <span className="text-[8px] text-slate-450 block uppercase">Criado Por</span>
                      <span className="text-[10px] font-semibold text-slate-300 truncate block">{selectedNotification.criadoPor.split(' ')[0]}</span>
                    </div>
                  </div>

                  {selectedNotification.dataResolucao && (
                    <div className="bg-[#22C55E]/10 p-2.5 rounded border border-[#22C55E]/20 text-xs text-[#22C55E] flex justify-between">
                      <span>✓ Data Resolução Automática:</span>
                      <span className="font-mono font-bold">{new Date(selectedNotification.dataResolucao).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-[9px] text-slate-450 font-bold uppercase block">Evidência de Protocolamento físico/digital</span>
                    <p className="text-xs text-slate-300 font-mono italic mt-0.5">{selectedNotification.evidenciaEntrega}</p>
                  </div>

                  {selectedNotification.observacoes && (
                    <div>
                      <span className="text-[9px] text-slate-450 font-bold uppercase block">Anotações Internas de Acompanhamento</span>
                      <p className="text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded border border-slate-850 font-sans whitespace-pre-wrap">
                        {selectedNotification.observacoes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Audit History Log */}
                <div className="pt-4 border-t border-[#253549]">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1.5 mb-2.5">
                    <History className="w-4 h-4 text-[#00C4A7]" />
                    Registro de Histórico Imutável (Log)
                  </h5>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {selectedNotification.historico && selectedNotification.historico.length > 0 ? (
                      selectedNotification.historico.map((h, index) => (
                        <div key={index} className="bg-[#0F1923] p-2 rounded border border-slate-850 text-[11px]">
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-1">
                            <span>{new Date(h.data).toLocaleDateString('pt-BR')} {new Date(h.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="text-[#00C4A7]">Autor: {h.autor}</span>
                          </div>
                          <p className="text-slate-300">{h.descricao}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-550 text-center py-2 italic text-[10px]">Sem log histórico construído.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="p-4 bg-[#151F2D] border-t border-[#253549] flex gap-2 shrink-0">
              <button 
                onClick={() => { setIsDetailOpen(false); handleOpenEdit(selectedNotification); }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-[#00C4A7] py-2 rounded-lg text-xs font-semibold"
              >
                Editar Registro
              </button>
              <button 
                onClick={() => handleOpenAddObs(selectedNotification)}
                className="bg-slate-750 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs"
              >
                Observação
              </button>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded-lg text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-[#253549] max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden font-sans animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#253549] flex items-center justify-between bg-[#151F2D]">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-[#00C4A7]" />
                Registrar Nova Notificação
              </h4>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-md hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitCreate} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Loja Alvo *</label>
                  <select 
                    value={formLojaId}
                    onChange={(e) => setFormLojaId(e.target.value)}
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="">-- Selecione a Loja --</option>
                    {stores.filter(s => s.ativa).map(s => (
                      <option key={s.id} value={s.id}>{s.nome} ({s.piso})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Tipo de Pendência *</label>
                  <select 
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    {tiposNotificacao.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Título da Notificação *</label>
                <input 
                  type="text" 
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Obstrução de Rota Técnica Condominial"
                  required
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Descrição Detalhada *</label>
                <textarea 
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Descreva minuciosamente a exigência técnica, comunicados ou observações ocorridas..."
                  required
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Data Emissão</label>
                  <input 
                    type="date"
                    value={formDataEnvio}
                    onChange={(e) => setFormDataEnvio(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Prazo de Resolução *</label>
                  <input 
                    type="date"
                    value={formDataVencimento}
                    required
                    onChange={(e) => setFormDataVencimento(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Nível de Prioridade</label>
                  <select 
                    value={formPrioridade}
                    onChange={(e) => setFormPrioridade(e.target.value as any)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none font-semibold text-[#EF4444]"
                    style={{
                      color: formPrioridade === 'Crítica' ? '#EF4444' : formPrioridade === 'Alta' ? '#F59E0B' : formPrioridade === 'Média' ? '#3B82F6' : '#94A3B8'
                    }}
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Status de Partida</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Resolvida">Resolvida</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-455 uppercase font-bold mb-1">Protocolo ou Canal de Entrega / AR</label>
                <input 
                  type="text" 
                  value={formEvidencia}
                  onChange={(e) => setFormEvidencia(e.target.value)}
                  placeholder="Ex: Protocolo assinado físico nº 042 / WhatsApp Adm"
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7] font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-455 uppercase font-bold mb-1">Assinatura de Quem Notifica</label>
                <input 
                  type="text" 
                  value={formCriadoPor}
                  onChange={(e) => setFormCriadoPor(e.target.value)}
                  required
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
                />
              </div>

              <div className="pt-3 border-t border-[#253549] flex justify-end gap-2 bg-[#1A2636]">
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-6 py-2.5 rounded-xl text-xs font-bold shadow-md"
                >
                  Salvar Notificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-[#253549] max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden font-sans animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#253549] flex items-center justify-between bg-[#151F2D]">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Edit2 className="w-5 h-5 text-[#3B82F6]" />
                Editar Registro Técnico
              </h4>
              <button onClick={() => setIsEditOpen(false)} className="p-1 rounded-md hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Loja Alvo</label>
                  <select 
                    value={formLojaId}
                    onChange={(e) => setFormLojaId(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.nome} ({s.piso}) {!s.ativa ? '-- Inativa' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tipo de Notificação</label>
                  <select 
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    {tiposNotificacao.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Título da Notificação *</label>
                <input 
                  type="text" 
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Descrição</label>
                <textarea 
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Data Registro</label>
                  <input 
                    type="date"
                    value={formDataEnvio}
                    onChange={(e) => setFormDataEnvio(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Vencimento Limite</label>
                  <input 
                    type="date"
                    value={formDataVencimento}
                    onChange={(e) => setFormDataVencimento(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Prioridade</label>
                  <select 
                    value={formPrioridade}
                    onChange={(e) => setFormPrioridade(e.target.value as any)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Status Interno</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Resolvida">Resolvida</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Protocolo / AR de Entrega</label>
                <input 
                  type="text" 
                  value={formEvidencia}
                  onChange={(e) => setFormEvidencia(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Anotações do Fiscal</label>
                <textarea 
                  rows={2}
                  value={formObservacoes}
                  placeholder="Escreva anotações gerais acumuladoras..."
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Responsável Shopping</label>
                <input 
                  type="text" 
                  value={formCriadoPor}
                  onChange={(e) => setFormCriadoPor(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              {/* History below the edit form */}
              <div className="bg-[#0F1923] p-3 rounded-lg border border-slate-800 max-h-[120px] overflow-y-auto">
                <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Espaço Histórico Atual</span>
                {selectedNotification.historico.map((h, i) => (
                  <div key={i} className="text-[10px] text-slate-400 border-b border-slate-800/65 py-1 flex justify-between">
                    <span>{h.descricao}</span>
                    <span className="font-mono text-slate-600 block">{new Date(h.data).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2 bg-[#1A2636]">
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-2 rounded-lg text-xs"
                >
                  Confirmar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK OBSERVATION MODAL */}
      {isAddObsOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-[#253549] max-w-md w-full rounded-xl shadow-2xl overflow-hidden font-sans">
            <div className="p-4 border-b border-[#253549] flex items-center justify-between bg-[#151F2D]">
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4.5 h-4.5 text-[#F59E0B]" />
                Registrar Observação Rápida
              </h4>
              <button onClick={() => setIsAddObsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-400">
                Adicione uma nova nota explicativa que será anexada permanentemente ao histórico de auditoria da notificação de <span className="text-white font-semibold">{stores.find(s => s.id === selectedNotification.lojaId)?.nome}</span>.
              </p>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Autor</label>
                <input 
                  type="text" 
                  value={quickObsAuthor}
                  onChange={(e) => setQuickObsAuthor(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Nota Técnica / Atualização de Status</label>
                <textarea 
                  rows={3}
                  value={quickObsText}
                  onChange={(e) => setQuickObsText(e.target.value)}
                  placeholder="Insira detalhes como: apresentou comprovante, vistoriei pessoalmente, agendado reparo para o dia X..."
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  onClick={() => setIsAddObsOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={submitQuickObs}
                  className="bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-bold px-5 py-2 rounded text-xs"
                >
                  Gravar Histórico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
