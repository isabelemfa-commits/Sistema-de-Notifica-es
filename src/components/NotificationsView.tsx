import React, { useState, useMemo, useEffect } from 'react';
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
  AlertTriangle,
  Printer,
  FileText
} from 'lucide-react';

const compressAndSetImage = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compressed JPEG base64 string
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const formatDateBR = (isoStr: string | undefined): string => {
  if (!isoStr) return '';
  const dateObj = new Date(isoStr);
  if (isNaN(dateObj.getTime())) return isoStr;
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const year = dateObj.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const generatePrintableHTML = (notif: Notification, store?: Store): string => {
  const faseTitle = notif.fase ? notif.fase.toUpperCase() : 'NOTIFICAÇÃO';
  const lucStr = store?.piso ? `${store.piso} - LUC ${store.id || 'S/N'}` : `LUC ${store?.id || 'S/N'}`;
  const storeNameText = store?.nome ? store.nome.toUpperCase() : notif.lojaId.toUpperCase();
  const dateStr = formatDateBR(notif.dataEnvio);
  const photoDateStr = formatDateBR(notif.dataFoto || notif.dataEnvio);
  const motivoText = notif.motivo ? notif.motivo.toUpperCase() : notif.titulo.toUpperCase();

  return `
    <!-- Page 1 -->
    <div class="page-break w-[210mm] min-h-[297mm] mx-auto p-[18mm] bg-white text-[#1a1a1a] text-[13px] relative flex flex-col justify-between" style="box-sizing: border-box; page-break-after: always; break-after: page;">
      <div>
        <!-- Brand Header Section -->
        <div class="flex items-center justify-between border-b pb-4 mb-6 border-slate-200">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 flex items-center justify-center">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10">
                <!-- Petals Rio Poty Official Logo -->
                <path d="M48 48C48 35 40 25 50 15C60 25 52 35 52 48Z" fill="#003026"/>
                <path d="M52 52C65 52 75 60 85 50C75 40 65 48 52 48Z" fill="#003026"/>
                <path d="M52 52C52 65 60 75 50 85C40 75 48 65 48 52Z" fill="#003026"/>
                <path d="M48 48C35 48 25 40 15 50C25 60 35 52 48 52Z" fill="#003026"/>
                <path d="M50 44C47 44 45 47 45 50C45 53 47 56 50 56C53 56 55 53 55 50C55 47 53 44 50 44Z" fill="white"/>
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="text-2xl font-extrabold tracking-tighter text-[#003026] leading-none">RioPoty</span>
              <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Sá Cavalcante</span>
            </div>
          </div>
          
          <!-- Outer aligned badge with black outline -->
          <div class="border border-black px-4 py-2 text-center bg-white min-w-[200px]">
            <span class="text-xs font-extrabold block tracking-wider uppercase text-black font-sans">${faseTitle}</span>
            <span class="text-[11px] text-slate-700 block mt-0.5">Teresina, ${dateStr}</span>
          </div>
        </div>

        <!-- Reference Title line -->
        <div class="mb-5 bg-slate-50 p-2.5 border border-slate-100 rounded">
          <p class="font-extrabold text-[12px] text-slate-900 tracking-tight">
            Ref: <span class="text-[#003026] font-mono">${faseTitle}</span> — <span class="uppercase">${lucStr}</span> — <span>${storeNameText}</span>
          </p>
        </div>

        <!-- Formal Salutation -->
        <p class="font-bold text-slate-800 mb-3">Prezado Sr. Lojista e/ou Responsável,</p>

        <!-- Dynamic Body Text -->
        <p class="text-justify mb-4 text-slate-700 leading-relaxed font-sans">
          A Administração, em sua busca contínua pela melhoria das instalações e funcionamento do <strong>Shopping Rio Poty</strong>, incumbe-se do dever de alertar V.S.ª e solicitar que sejam tomadas imediatamente as medidas necessárias para correção dos apontamentos técnicos de desconformidade registrados na vistoria, conforme descrição em tela e anexo fotográfico anexo.
        </p>

        <p class="text-sm font-bold text-slate-800 mb-2">Em observância ao disposto nas normas contratuais (Cláusulas 8.15 e 8.15.1 da Escritura de Normas Gerais):</p>

        <!-- Transcription text boxes -->
        <div class="space-y-3 mb-4">
          <div class="bg-gray-50 border-l-4 border-slate-400 p-2.5 text-[11px] text-slate-600 text-justify leading-relaxed rounded-r italic">
            <strong>8.15.</strong> — A LOCATÁRIA deverá manter, ininterruptamente, o seu SALÃO DE USO COMERCIAL em perfeito estado de conservação, segurança, higiene e asseio, inclusive no tocante às entradas, vidros, esquadrias, vitrinas, letreiros, fachadas, pisos, acabamentos, divisões, portas, acessórios, equipamentos, benfeitorias, iluminação, aparelhos elétricos, instalações sanitárias e hidráulicas, ar condicionado, ventilação, fazendo executar pinturas e reparos, se for o caso, bem como imunização contra insetos e roedores, periódicos, de modo a mantê-lo em perfeito estado e devolvê-lo, ao término da locação, em condições de ser imediatamente ocupado... A LOCADORA se reserva o direito de fiscalizar o cumprimento das obrigações estabelecidas neste item.
          </div>
          <div class="bg-gray-50 border-l-4 border-slate-400 p-2.5 text-[11px] text-slate-600 text-justify leading-relaxed rounded-r italic">
            <strong>8.15.1.</strong> — Caso a LOCADORA venha a solicitar, por escrito, à LOCATÁRIA, o conserto, reparo, ou execução de serviço, de algum dos pontos mencionados no item 8.15, e estes não sejam executados em até 5 (cinco) dias após o recebimento da solicitação, a LOCATÁRIA incorrerá em multa diária calculada sobre o aluguel mensal mínimo vigente à data da infração... A multa aqui prevista será devida até que os serviços sejam satisfatoriamente concluídos.
          </div>
        </div>

        <!-- MOTIVO DA NOTIFICAÇÃO in red uppercase -->
        <div class="border-y-2 border-slate-100 py-3 mb-4 bg-red-50/50 px-3 rounded-lg">
          <p class="text-xs font-bold text-red-500 uppercase tracking-wider">MOTIVO DA NOTIFICAÇÃO:</p>
          <p class="text-[13px] font-extrabold text-red-700 mt-1 uppercase font-sans">${motivoText}</p>
        </div>

        <!-- Deadline message -->
        <p class="text-justify mb-4 text-slate-700 leading-relaxed">
          Solicitamos que a correção da irregularidade apontada seja realizada no <strong>prazo máximo de 05 (cinco) dias úteis</strong>, contados a partir do recebimento formal desta correspondência, sob pena de aplicação de multa contratual diária e sanções cumulativas aplicáveis após o envio de avisos repetidos subsequentes, nos termos do Regulamento Interno em vigor.
        </p>

        <p class="text-xs text-slate-500 font-medium mb-5">Contato Operacional: <span class="font-mono text-slate-700">operacoes.srp@sacavalcante.com.br</span></p>
      </div>

      <!-- Footer & Signature Areas -->
      <div>
        <div class="flex items-end justify-between border-t pt-5 border-slate-100 mb-3">
          <div class="text-slate-600 text-xs text-left">
            <p>Certos de suas providências, agradecemos.</p>
            <p class="font-semibold text-slate-800 mt-1">Cordialmente,</p>
            <p class="font-bold text-[#003026] mt-5">Gestão de Operações — Shopping Rio Poty</p>
          </div>
          
          <!-- Receipt box on the right -->
          <div class="border border-slate-350 p-4 rounded bg-slate-50 text-slate-800 min-w-[260px] text-xs">
            <p class="font-extrabold text-slate-900 tracking-wider mb-2 text-center text-[10px] uppercase">Favor Acusar Recebimento</p>
            <p class="mt-2.5">RECEBIDO POR:  _________________________________</p>
            <p class="mt-3">RECEBIDO EM:  ______ / ______ / 2026</p>
          </div>
        </div>

        <!-- Standardised Bottom Footer with full width address -->
        <div class="border border-slate-300 p-2 text-center text-[10px] text-slate-500 rounded bg-white">
          <p class="font-bold text-slate-700">Sr. Gerente, favor encaminhar esta correspondência ao proprietário.</p>
          <p class="mt-0.5 font-mono">Av. Marechal Castelo Branco, 911, Porenquanto, Teresina - PI  |  www.shoppingriopoty.com.br</p>
        </div>
      </div>
    </div>

    <!-- Page 2 - ANEXOS -->
    <div class="w-[210mm] min-h-[297mm] mx-auto p-[18mm] bg-white text-[#1a1a1a] text-[13px] relative flex flex-col justify-between" style="box-sizing: border-box;">
      <div>
        <!-- Page 2 Brand Header -->
        <div class="flex items-center justify-between border-b pb-4 mb-6 border-slate-200">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 flex items-center justify-center">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10">
                <path d="M48 48C48 35 40 25 50 15C60 25 52 35 52 48Z" fill="#003026"/>
                <path d="M52 52C65 52 75 60 85 50C75 40 65 48 52 48Z" fill="#003026"/>
                <path d="M52 52C52 65 60 75 50 85C40 75 48 65 48 52Z" fill="#003026"/>
                <path d="M48 48C35 48 25 40 15 50C25 60 35 52 48 52Z" fill="#003026"/>
                <path d="M50 44C47 44 45 47 45 50C45 53 47 56 50 56C53 56 55 53 55 50C55 47 53 44 50 44Z" fill="white"/>
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="text-2xl font-extrabold tracking-tighter text-[#003026] leading-none">RioPoty</span>
              <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Sá Cavalcante</span>
            </div>
          </div>
          
          <div class="border border-slate-300 px-4 py-2 text-center bg-slate-50 min-w-[200px] rounded">
            <span class="text-xs font-extrabold block text-slate-700 tracking-wider">REGISTRO DE VISTORIA</span>
            <span class="text-[10px] text-slate-500 block">Fotografia Comprobatória</span>
          </div>
        </div>

        <!-- Centered Section Title and description -->
        <div class="text-center mb-6">
          <h2 class="text-lg font-extrabold text-slate-900 tracking-widest uppercase">ANEXOS FOTOGRÁFICOS</h2>
          <p class="text-xs text-slate-500 mt-1">Evidências da infração apontada registrada pelo fiscal de operações</p>
        </div>

        <!-- Responsive Centered containment check for photo -->
        <div class="flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-slate-50 p-4 my-4 group min-h-[360px]">
          ${notif.imagemNotificacao ? `
            <img src="${notif.imagemNotificacao}" class="max-h-[170mm] max-w-full object-contain rounded-lg border border-slate-350 shadow-md bg-white p-1" style="max-height: 480px;" alt="Evidência fotográfica" />
            <div class="mt-4 bg-white border border-slate-200 rounded px-4 py-1.5 shadow-sm text-center">
              <p class="text-xs font-bold text-slate-700">Data de Registro Comprobatório: <span class="font-mono text-red-600">${photoDateStr}</span></p>
            </div>
          ` : `
            <div class="text-center p-8">
              <div class="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full mx-auto text-red-600 mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-8 h-8">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <p class="text-sm font-extrabold text-slate-800">Nenhuma Fotografia de Evidência Anexada</p>
              <p class="text-xs text-slate-500 max-w-xs mt-1.5 mx-auto">Esta notificação requer a presença de evidência visual para download formal do documento de intimação.</p>
            </div>
          `}
        </div>
      </div>

      <!-- Footer at the final printout of sheet 2 -->
      <div class="mt-auto">
        <div class="border border-slate-300 p-2 text-center text-[10px] text-slate-500 rounded bg-white mt-8">
          <p class="font-bold text-slate-700">Sr. Gerente, favor encaminhar esta correspondência ao proprietário.</p>
          <p class="mt-0.5 font-mono">Av. Marechal Castelo Branco, 911, Porenquanto, Teresina - PI  |  www.shoppingriopoty.com.br</p>
        </div>
      </div>
    </div>
  `;
};

interface NotificationsViewProps {
  stores: Store[];
  notifications: Notification[];
  pisos: string[];
  tiposNotificacao: string[];
  initialFilters?: any;
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
  const [formFase, setFormFase] = useState<string>('Geral');
  
  // Custom generated PDF parameters: photo, photo date, and specific warning motif
  const [formImagemNotificacao, setFormImagemNotificacao] = useState<string>('');
  const [formDataFoto, setFormDataFoto] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formMotivo, setFormMotivo] = useState<string>('');

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewNotification, setPreviewNotification] = useState<Notification | null>(null);

  // Automatically enforce 7-day deadline for phase notifications (1ª, 2ª, 3ª, 4ª)
  useEffect(() => {
    if (formFase.includes('Notificação')) {
      const d = new Date(formDataEnvio);
      d.setDate(d.getDate() + 7);
      setFormDataVencimento(d.toISOString().split('T')[0]);
    }
  }, [formFase, formDataEnvio]);

  // Automatically generate title based on Phase and Store
  useEffect(() => {
    // Only auto-generate if we are creating or if the title is still following the auto-pattern
    if (isCreateOpen && formLojaId && formFase && formFase !== 'Geral') {
      const store = stores.find(s => s.id === formLojaId);
      if (store) {
        const title = `${formFase.toUpperCase()} - LUC ${store.id} - ${store.nome.toUpperCase()}`;
        setFormTitulo(title);
        // Also set the motif for the PDF
        setFormMotivo(title);
      }
    }
  }, [formLojaId, formFase, isCreateOpen, stores]);

  // Unpack prefill directives from other views (e.g., Phase Tracker)
  useEffect(() => {
    if (initialFilters?.prefill) {
      const { lojaId, fase } = initialFilters.prefill;
      setFormLojaId(lojaId);
      setFormFase(fase);
      setFormTipo("Exigência Operacional");
      setFormTitulo(`${fase} - Infração Operacional`);
      setFormDescricao(`Processo de acompanhamento regulamentar - ${fase} formalizada para regularização das desconformidades identificadas em vistoria no prazo de 7 dias.`);
      setFormPrioridade(fase === '3ª Notificação' ? 'Crítica' : fase === '2ª Notificação' ? 'Alta' : 'Média');
      
      const today = new Date();
      setFormDataEnvio(today.toISOString().split('T')[0]);
      const targetVenc = new Date();
      targetVenc.setDate(targetVenc.getDate() + 7);
      setFormDataVencimento(targetVenc.toISOString().split('T')[0]);
      
      setIsCreateOpen(true);
    }
  }, [initialFilters]);

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

      // Text query search: title, description, store name, or LUC
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const hasTitle = n.titulo.toLowerCase().includes(query);
        const hasDesc = n.descricao.toLowerCase().includes(query);
        const hasStoreName = store?.nome.toLowerCase().includes(query) || false;
        const hasLUC = store?.luc?.toLowerCase().includes(query) || false;
        if (!hasTitle && !hasDesc && !hasStoreName && !hasLUC) return false;
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

  const handlePrintDocument = (notif: Notification) => {
    const store = stores.find(s => s.id === notif.lojaId);
    const htmlBody = generatePrintableHTML(notif, store);
    
    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notif.fase || 'Notificação'} - ${store?.nome || notif.lojaId}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 0;
            }
            @media print {
              body {
                background-color: #ffffff;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
            }
          </style>
        </head>
        <body class="bg-gray-100 p-4">
          <div class="no-print max-w-[210mm] mx-auto mb-4 bg-yellow-50 border border-yellow-250 p-3 rounded-lg text-yellow-800 text-xs text-center flex items-center justify-center gap-2">
            <span>✨ Se a visualização estiver cortada, verifique se a folha está em tamanho <strong>A4 (Retrato)</strong> e habilite <strong>Gráficos de Fundo</strong>.</span>
          </div>
          <div id="document-root">
            ${htmlBody}
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 2000);
    };
  };

  const handleDownloadStandaloneHTML = (notif: Notification) => {
    const store = stores.find(s => s.id === notif.lojaId);
    const htmlBody = generatePrintableHTML(notif, store);
    const fileName = `Notificacao_${notif.fase ? notif.fase.replace(/\s+/g, '_') : 'Geral'}_LUC_${store?.id || notif.lojaId}.html`;
    
    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notif.fase || 'Notificação'} - ${store?.nome || notif.lojaId}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;505;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 40px 0;
            }
            @media print {
              body {
                background-color: #ffffff;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
            }
          </style>
        </head>
        <body class="bg-gray-100">
          <div class="no-print max-w-[210mm] mx-auto mb-4 bg-white border border-gray-200 p-4 rounded-xl shadow-md text-slate-800 text-xs flex items-center justify-between font-sans">
            <div>
              <h3 class="font-bold text-slate-900 text-sm">Documento de Notificação — Rio Poty</h3>
              <p class="text-slate-500 mt-1">Este arquivo autônomo de alta fidelidade contém toda a estrutura e imagens em base64 para arquivamento ou impressão offline.</p>
            </div>
            <button onclick="window.print()" class="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 font-bold px-4 py-2 rounded-lg transition-colors">
              Imprimir / Salvar PDF
            </button>
          </div>
          <div id="document-root">
            ${htmlBody}
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTriggerToast('success', 'Documento Emitido para Download', 'Arquivo HTML autônomo gerado com sucesso!');
  };

  const handleOpenDocumentPreview = (notif: Notification) => {
    setPreviewNotification(notif);
    setIsPreviewModalOpen(true);
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
      fase: formFase,
      evidenciaEntrega: formEvidencia || 'Notificação no Sistema',
      observacoes: formObservacoes,
      criadoPor: formCriadoPor,
      historico: [createdHistory],
      imagemNotificacao: formImagemNotificacao || '',
      dataFoto: formDataFoto || '',
      motivo: formMotivo || formTitulo
    });

    setIsCreateOpen(false);
    // Reset Form
    setFormLojaId('');
    setFormTitulo('');
    setFormDescricao('');
    setFormEvidencia('');
    setFormObservacoes('');
    setFormFase('Geral');
    setFormImagemNotificacao('');
    setFormDataFoto(new Date().toISOString().split('T')[0]);
    setFormMotivo('');
    onTriggerToast('success', 'Notificação Registrada', 'Novo comunicado ativo criado no sistema.');
  };

  // Edit Modal Fill-in and Submission
  const handleOpenEdit = (n: Notification) => {
    setSelectedNotification(n);
    setFormLojaId(n.lojaId);
    setFormTipo(n.tipo);
    setFormTitulo(n.titulo);
    setFormFase(n.fase || 'Geral');
    setFormDescricao(n.descricao);
    setFormDataEnvio(new Date(n.dataEnvio).toISOString().split('T')[0]);
    setFormDataVencimento(new Date(n.dataVencimento).toISOString().split('T')[0]);
    setFormStatus(n.status);
    setFormPrioridade(n.prioridade);
    setFormEvidencia(n.evidenciaEntrega);
    setFormObservacoes(n.observacoes);
    setFormCriadoPor(n.criadoPor);
    setFormImagemNotificacao(n.imagemNotificacao || '');
    setFormDataFoto(n.dataFoto || (n.dataEnvio ? new Date(n.dataEnvio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]));
    setFormMotivo(n.motivo || '');
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
      fase: formFase,
      evidenciaEntrega: formEvidencia,
      observacoes: formObservacoes,
      criadoPor: formCriadoPor,
      historico: [...selectedNotification.historico, editHistoryItem],
      imagemNotificacao: formImagemNotificacao,
      dataFoto: formDataFoto,
      motivo: formMotivo || formTitulo
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
              placeholder="Buscar por loja, título, descrição ou LUC..."
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
                          <span className="text-[10px] text-slate-550 font-mono mt-0.5">{store?.luc || 'Sem LUC'}</span>
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
                        <div className="flex flex-col gap-1 items-start">
                          <span className="bg-slate-800 text-[#00C4A7] border border-slate-700 font-medium px-2 py-0.5 rounded text-[10px]">
                            {n.tipo}
                          </span>
                          {n.fase && n.fase !== 'Geral' && (
                            <span className="bg-[#00C4A7]/10 text-[#00C4A7] border border-[#00C4A7]/20 font-bold px-1.5 py-0.3 rounded text-[9px] uppercase select-none">
                              {n.fase}
                            </span>
                          )}
                        </div>
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

                          {/* Interactive PDF Document Preview and Print */}
                          <button 
                            onClick={() => handleOpenDocumentPreview(n)}
                            className="p-1 text-[#00C4A7] hover:text-[#00B096] hover:bg-slate-800 rounded transition-colors"
                            title="Gerar e Enviar Documento de Notificação"
                          >
                            <Printer className="w-4 h-4" />
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
                onClick={() => handleOpenDocumentPreview(selectedNotification)}
                className="flex-1 bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir / PDF
              </button>
              <button 
                onClick={() => { setIsDetailOpen(false); handleOpenEdit(selectedNotification); }}
                className="bg-slate-800 hover:bg-slate-700 text-[#00C4A7] px-3 py-2 rounded-lg text-xs font-semibold"
              >
                Editar
              </button>
              <button 
                onClick={() => handleOpenAddObs(selectedNotification)}
                className="bg-slate-750 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs"
              >
                Obs
              </button>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-400 px-3 py-2 rounded-lg text-xs"
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Loja Alvo *</label>
                  <select 
                    value={formLojaId}
                    onChange={(e) => setFormLojaId(e.target.value)}
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="">-- Selecione --</option>
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

                <div>
                  <label className="block text-[10px] text-[#00C4A7] uppercase font-bold mb-1">Acompanhamento / Fase *</label>
                  <select 
                    value={formFase}
                    onChange={(e) => setFormFase(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#00C4A7]/30 text-xs text-[#00C4A7] font-semibold rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Geral">Comunicado Geral</option>
                    <option value="1ª Notificação">1ª Notificação (Prazo 7d)</option>
                    <option value="2ª Notificação">2ª Notificação (Prazo 7d)</option>
                    <option value="3ª Notificação">3ª Notificação (Prazo 7d)</option>
                    <option value="4ª Notificação">4ª Notificação (Prazo 7d)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Título da Notificação *</label>
                  <input 
                    type="text" 
                    value={formTitulo}
                    onChange={(e) => {
                      setFormTitulo(e.target.value);
                      if (!formMotivo) {
                        setFormMotivo(e.target.value.toUpperCase());
                      }
                    }}
                    placeholder="Ex: Obstrução de Rota Técnica"
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Motivo da Notificação (Doc) *</label>
                  <input 
                    type="text" 
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value.toUpperCase())}
                    placeholder="Ex: REGULARIZAÇÃO DO COMODATO"
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Descrição Detalhada *</label>
                <textarea 
                  rows={2}
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

              {/* PDF Photo Upload Box & Photo Date */}
              <div className="grid grid-cols-2 gap-3 border border-dashed border-[#253549] p-3 rounded-xl bg-black/10">
                <div>
                  <label className="block text-[10px] text-[#00C4A7] uppercase font-bold mb-1">Data da Foto *</label>
                  <input 
                    type="date"
                    value={formDataFoto}
                    onChange={(e) => setFormDataFoto(e.target.value)}
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#00C4A7] uppercase font-bold mb-1">Anexar Foto (Evidência) *</label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) compressAndSetImage(file, setFormImagemNotificacao);
                    }}
                    className="relative flex flex-col items-center justify-center border border-dashed border-slate-700 hover:border-[#00C4A7] rounded-lg p-2 cursor-pointer bg-[#0F1923] transition-colors"
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      id="create-modal-file-photo"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) compressAndSetImage(file, setFormImagemNotificacao);
                      }}
                    />
                    <label htmlFor="create-modal-file-photo" className="cursor-pointer text-[11px] text-slate-300 text-center font-medium py-1 w-full">
                      {formImagemNotificacao ? '✓ Foto Anexada' : 'Clique ou Solte Imagem'}
                    </label>
                  </div>
                </div>
              </div>

              {formImagemNotificacao && (
                <div className="relative border border-[#253549] rounded-lg overflow-hidden bg-[#0F1923] p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={formImagemNotificacao} alt="Preview" className="h-10 w-14 object-cover rounded border border-[#253549]" />
                    <span className="text-[10px] text-slate-400">Evidência registrada para o documento</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFormImagemNotificacao('')}
                    className="text-[10px] text-red-400 hover:text-red-300 p-1 font-semibold"
                  >
                    Remover
                  </button>
                </div>
              )}

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
              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="block text-[10px] text-[#00C4A7] uppercase font-bold mb-1">Acompanhamento / Fase</label>
                  <select 
                    value={formFase}
                    onChange={(e) => setFormFase(e.target.value)}
                    className="w-full bg-[#0F1923] border border-[#00C4A7]/30 text-[#00C4A7] text-xs font-semibold rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Geral">Comunicado Geral</option>
                    <option value="1ª Notificação">1ª Notificação (Prazo 7d)</option>
                    <option value="2ª Notificação">2ª Notificação (Prazo 7d)</option>
                    <option value="3ª Notificação">3ª Notificação (Prazo 7d)</option>
                    <option value="4ª Notificação">4ª Notificação (Prazo 7d)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Título da Notificação *</label>
                  <input 
                    type="text" 
                    value={formTitulo}
                    onChange={(e) => {
                      setFormTitulo(e.target.value);
                      if (!formMotivo) {
                        setFormMotivo(e.target.value.toUpperCase());
                      }
                    }}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Motivo da Notificação (Doc) *</label>
                  <input 
                    type="text" 
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value.toUpperCase())}
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#00C4A7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Descrição</label>
                <textarea 
                  rows={2}
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

              {/* PDF Photo Upload Box & Photo Date */}
              <div className="grid grid-cols-2 gap-3 border border-dashed border-[#253549] p-3 rounded-xl bg-black/10">
                <div>
                  <label className="block text-[10px] text-[#00C4A7] uppercase font-bold mb-1">Data da Foto *</label>
                  <input 
                    type="date"
                    value={formDataFoto}
                    onChange={(e) => setFormDataFoto(e.target.value)}
                    required
                    className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#00C4A7] uppercase font-bold mb-1">Alterar Foto (Evidência)</label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) compressAndSetImage(file, setFormImagemNotificacao);
                    }}
                    className="relative flex flex-col items-center justify-center border border-dashed border-slate-700 hover:border-[#00C4A7] rounded-lg p-2 cursor-pointer bg-[#0F1923] transition-colors"
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      id="edit-modal-file-photo"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) compressAndSetImage(file, setFormImagemNotificacao);
                      }}
                    />
                    <label htmlFor="edit-modal-file-photo" className="cursor-pointer text-[11px] text-slate-300 text-center font-medium py-1 w-full font-sans">
                      {formImagemNotificacao ? '✓ Foto Anexada' : 'Clique ou Solte Imagem'}
                    </label>
                  </div>
                </div>
              </div>

              {formImagemNotificacao && (
                <div className="relative border border-[#253549] rounded-lg overflow-hidden bg-[#0F1923] p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={formImagemNotificacao} alt="Preview" className="h-10 w-14 object-cover rounded border border-[#253549]" />
                    <span className="text-[10px] text-slate-400">Evidência anexada para o documento</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFormImagemNotificacao('')}
                    className="text-[10px] text-red-400 hover:text-red-300 p-1 font-semibold"
                  >
                    Remover
                  </button>
                </div>
              )}

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

      {/* INTERACTIVE DOCUMENT PREVIEW MODAL (OFFICIAL RIO POTY NOTIFICATION SHEETS) */}
      {isPreviewModalOpen && previewNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-[#253549] max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden font-sans flex flex-col h-[90vh]">
            {/* Top Action Bar */}
            <div className="p-4 border-b border-[#253549] flex items-center justify-between bg-[#151F2D] shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00C4A7]" />
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Visualização de Emissão de Notificação</h4>
                  <p className="text-[10px] text-slate-400">Verifique a diagramação do documento de 2 páginas antes de baixar ou imprimir</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDownloadStandaloneHTML(previewNotification)}
                  className="bg-slate-800 hover:bg-slate-700 text-[#00C4A7] border border-[#00C4A7]/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Baixar Arquivo Completo (.html)
                </button>
                <button 
                  onClick={() => handlePrintDocument(previewNotification)}
                  className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Salvar PDF
                </button>
                <button 
                  onClick={() => setIsPreviewModalOpen(false)} 
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Page Render Sheets Viewport */}
            <div className="p-6 bg-slate-900 overflow-y-auto flex-1 flex flex-col items-center gap-8 shadow-inner">
              <div className="text-center text-xs text-[#00C4A7]/80 bg-[#00C4A7]/10 border border-[#00C4A7]/20 px-4 py-2 rounded-lg max-w-lg mb-2 w-full">
                <strong>💡 DICA DE IMPRESSÃO:</strong> Na caixa de diálogo de impressão que abrir, selecione a orientação <strong>Retrato (Portrait)</strong>, tamanho do papel <strong>A4</strong> e ative a opção <strong>Gráficos de Fundo</strong>.
              </div>

              {/* On-screen A4 Page Mock Frame */}
              <div className="shadow-2xl border border-slate-700 bg-white scale-[0.95] origin-top rounded-lg overflow-hidden shrink-0">
                <div 
                  className="p-0 m-0 print:bg-white bg-white"
                  dangerouslySetInnerHTML={{ 
                    __html: generatePrintableHTML(
                      previewNotification, 
                      stores.find(s => s.id === previewNotification.lojaId)
                    ) 
                  }} 
                />
              </div>
            </div>

            {/* Bottom Footer Action Guidance */}
            <div className="p-3 bg-[#151F2D] border-t border-[#253549] text-center text-[11px] text-slate-400 shrink-0">
              Emitido via Sistema Integrado de Operações e Gestão de Lojistas — Shopping Rio Poty
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
