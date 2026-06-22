import React, { useState, useRef, useMemo } from 'react';
import { DatabaseState } from '../types';
import { generateMockData } from '../mockData';
import { 
  Settings, 
  Layers, 
  Tags, 
  BellRing, 
  Trash2, 
  Plus, 
  Upload, 
  Download, 
  RotateCcw, 
  ShieldAlert,
  HelpCircle,
  XCircle,
  FileDown,
  Info,
  Check
} from 'lucide-react';

interface SettingsViewProps {
  dbState: DatabaseState;
  onUpdateFullDatabase: (nextState: DatabaseState) => void;
  onTriggerToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  dbState,
  onUpdateFullDatabase,
  onTriggerToast
}) => {
  // Input fields for adding items
  const [newPisoInput, setNewPisoInput] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [newTipoInput, setNewTipoInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- BULK STORE IMPORT STATE ---
  const [bulkText, setBulkText] = useState('');
  const [bulkSeparator, setBulkSeparator] = useState('auto'); // 'auto' | ';' | ',' | '\t'
  const [autoCreateParams, setAutoCreateParams] = useState(true);
  const [bulkImportMode, setBulkImportMode] = useState('append'); // 'append' | 'overwrite'
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [showBulkOverwriteConfirm, setShowBulkOverwriteConfirm] = useState(false);

  // Parser for raw text from spreadsheets or CSV
  const handleParseBulkText = (text: string, sepType: string) => {
    if (!text.trim()) {
      setBulkPreview([]);
      return;
    }
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedStores: any[] = [];
    
    lines.forEach((line, index) => {
      // Direct detection if auto-detect is enabled
      let separator = ';';
      if (sepType === 'auto') {
        const semicolonCount = (line.match(/;/g) || []).length;
        const commaCount = (line.match(/,/g) || []).length;
        const tabCount = (line.match(/\t/g) || []).length;
        if (tabCount > semicolonCount && tabCount > commaCount) {
          separator = '\t';
        } else if (commaCount > semicolonCount) {
          separator = ',';
        } else {
          separator = ';';
        }
      } else {
        separator = sepType;
      }
      
      const parts = line.split(separator).map(p => p.trim());
      
      // Bypass potential header lines
      const firstPartLower = parts[0]?.toLowerCase() || '';
      if (index === 0 && (
        firstPartLower === 'nome' || 
        firstPartLower === 'empresa' || 
        firstPartLower === 'loja' || 
        firstPartLower.includes('cnpj') ||
        firstPartLower.includes('piso') ||
        firstPartLower.includes('responsável') ||
        firstPartLower.includes('responsavel')
      )) {
        return;
      }
      
      const nome = parts[0] || '';
      const cnpj = parts[1] || '';
      const piso = parts[2] || dbState.pisos[0] || 'Piso Térreo';
      const categoria = parts[3] || dbState.categorias[0] || 'Moda';
      const responsavel = parts[4] || 'Gerente Geral';
      const telefone = parts[5] || '';
      const email = parts[6] || '';
      
      if (nome) {
        parsedStores.push({
          nome,
          cnpj,
          piso,
          categoria,
          responsavel,
          telefone,
          email,
          lineNum: index + 1
        });
      }
    });
    
    setBulkPreview(parsedStores);
  };

  const handleExecuteBulkImport = (bypassConfirm = false) => {
    if (bulkPreview.length === 0) {
      onTriggerToast('warning', 'Nenhum dado importável', 'Insira uma lista de lojas antes de prosseguir.');
      return;
    }

    if (bulkImportMode === 'overwrite' && !bypassConfirm) {
      setShowBulkOverwriteConfirm(true);
      return;
    }

    let nextPisos = [...dbState.pisos];
    let nextCategorias = [...dbState.categorias];

    const finalStores: any[] = bulkPreview.map((item, idx) => {
      if (autoCreateParams) {
        if (item.piso && !nextPisos.includes(item.piso)) {
          nextPisos.push(item.piso);
        }
        if (item.categoria && !nextCategorias.includes(item.categoria)) {
          nextCategorias.push(item.categoria);
        }
      }

      return {
        id: `store-bulk-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        nome: item.nome,
        cnpj: item.cnpj || '',
        piso: item.piso,
        categoria: item.categoria,
        responsavel: item.responsavel,
        telefone: item.telefone || '',
        email: item.email || '',
        ativa: true
      };
    });

    let updatedStores = [];
    let updatedNotifs = [...dbState.notifications];

    if (bulkImportMode === 'overwrite') {
      updatedStores = finalStores;
      updatedNotifs = []; // reset notifications to ensure correct reference rules
      onTriggerToast('success', 'Cadastro Substituído', `${finalStores.length} novas lojas carregadas. Base resetada.`);
    } else {
      updatedStores = [...finalStores, ...dbState.stores];
      onTriggerToast('success', 'Lojas Adicionadas', `Acrescentadas com sucesso ${finalStores.length} lojas com integração direta.`);
    }

    onUpdateFullDatabase({
      ...dbState,
      stores: updatedStores,
      notifications: updatedNotifs,
      pisos: nextPisos,
      categorias: nextCategorias
    });

    setBulkText('');
    setBulkPreview([]);
    setIsImporterOpen(false);
    setShowBulkOverwriteConfirm(false);
  };

  // --- FLOORS MANAGEMENT ---
  const handleAddPiso = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPisoInput.trim();
    if (!clean) return;
    if (dbState.pisos.includes(clean)) {
      onTriggerToast('warning', 'Piso Duplicado', 'O pavimento já existe nas configurações.');
      return;
    }

    onUpdateFullDatabase({
      ...dbState,
      pisos: [...dbState.pisos, clean]
    });
    setNewPisoInput('');
    onTriggerToast('success', 'Pavimento Adicionado', `O piso "${clean}" já está disponível.`);
  };

  const handleRemovePiso = (piso: string) => {
    // Check if stores exist in this floor
    const hasStores = dbState.stores.some(s => s.piso === piso);
    if (hasStores) {
      onTriggerToast('error', 'Ação Bloqueada', `Não é possível remover o piso "${piso}" pois existem lojas vinculadas a ele.`);
      return;
    }

    if (dbState.pisos.length <= 1) {
      onTriggerToast('error', 'Não permitido', 'É necessário manter pelo menos um piso no cadastro.');
      return;
    }

    onUpdateFullDatabase({
      ...dbState,
      pisos: dbState.pisos.filter(p => p !== piso)
    });
    onTriggerToast('warning', 'Piso Removido', `O pavimento "${piso}" foi excluído das configurações.`);
  };

  // --- CATEGORIES MANAGEMENT ---
  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatInput.trim();
    if (!clean) return;
    if (dbState.categorias.includes(clean)) {
      onTriggerToast('warning', 'Setor Duplicado', 'Esta categoria já existe no sistema.');
      return;
    }

    onUpdateFullDatabase({
      ...dbState,
      categorias: [...dbState.categorias, clean]
    });
    setNewCatInput('');
    onTriggerToast('success', 'Categoria Adicionada', `O setor de "${clean}" já está operacional.`);
  };

  const handleRemoveCat = (cat: string) => {
    const hasStores = dbState.stores.some(s => s.categoria === cat);
    if (hasStores) {
      onTriggerToast('error', 'Ação Impedida', `A categoria "${cat}" possui empresas comerciais ativas.`);
      return;
    }

    if (dbState.categorias.length <= 1) {
      onTriggerToast('error', 'Não permitido', 'A base precisa conter ao menos uma categoria genérica.');
      return;
    }

    onUpdateFullDatabase({
      ...dbState,
      categorias: dbState.categorias.filter(c => c !== cat)
    });
    onTriggerToast('warning', 'Categoria Excluída', `O setor "${cat}" foi retirado com êxito.`);
  };

  // --- NOTIFICATION TYPES MANAGEMENT ---
  const handleAddTipo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTipoInput.trim();
    if (!clean) return;
    if (dbState.tiposNotificacao.includes(clean)) {
      onTriggerToast('warning', 'Tipo Duplicado', 'Este tipo de notificação já está inscrito.');
      return;
    }

    onUpdateFullDatabase({
      ...dbState,
      tiposNotificacao: [...dbState.tiposNotificacao, clean]
    });
    setNewTipoInput('');
    onTriggerToast('success', 'Tipo Cadastrado', `Sanções de tipo "${clean}" já podem ser prescritas.`);
  };

  const handleRemoveTipo = (tipo: string) => {
    const hasNotifs = dbState.notifications.some(n => n.tipo === tipo);
    if (hasNotifs) {
      onTriggerToast('error', 'Ação Negada', `Há registros históricos de notificações vinculadas ao tipo "${tipo}".`);
      return;
    }

    if (dbState.tiposNotificacao.length <= 1) {
      onTriggerToast('error', 'Não permitido', 'Mantendo ao menos um tipo de regência jurídica.');
      return;
    }

    onUpdateFullDatabase({
      ...dbState,
      tiposNotificacao: dbState.tiposNotificacao.filter(t => t !== tipo)
    });
    onTriggerToast('warning', 'Tipo de Notificação Excluído', `O tipo de notificação "${tipo}" foi removido.`);
  };

  // --- DATA SYNC: EXPORT JSON BACKUP ---
  const handleExportBackup = () => {
    try {
      const jsonStr = JSON.stringify(dbState, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_shopping_notifications_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onTriggerToast('success', 'Backup Exportado', 'Dossier JSON salvo no seu computador.');
    } catch (err) {
      onTriggerToast('error', 'Falha na Exportação', 'Erro mecânico ao compilar o arquivo de backup.');
    }
  };

  // --- DATA SYNC: IMPORT JSON BACKUP ---
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as DatabaseState;

        // Validation layer
        if (parsed && Array.isArray(parsed.stores) && Array.isArray(parsed.notifications)) {
          onUpdateFullDatabase(parsed);
          onTriggerToast('success', 'Backup Restaurado', 'Todas as ocorrências, regulamentos e logs foram reescritos.');
        } else {
          onTriggerToast('error', 'Formato Inválido', 'O arquivo informado não contém estrutura válida do sistema.');
        }
      } catch (err) {
        onTriggerToast('error', 'Falha ao Ler Backup', 'O JSON fornecido contém erros de digitação ou formatação.');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // --- HARD DATA RESET DEMO SEED ---
  const handleResetToDemo = () => {
    if (confirm("⚠️ ATENÇÃO: Deseja redefinir todo o sistema? Isso apagará todas as notificações e lojas cadastradas manualmente, recarregando os 60 registros originais de demonstração.")) {
      const demoData = generateMockData();
      onUpdateFullDatabase(demoData);
      onTriggerToast('info', 'Banco Redefinido', 'Os dados de simulação originais foram re-importados para o localStorage.');
    }
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Configuration Header info */}
      <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5.5 h-5.5 text-[#00C4A7]" />
            Configurações e Parâmetros de Gestão
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de tabelas básicas, parametrização do mall, backups de contingência e logs de segurança.
          </p>
        </div>
      </div>

      {/* Grid: 3 lists management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* FLOOR CONTROLS */}
        <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-[#253549] pb-3 mb-3">
              <Layers className="w-4 h-4 text-[#00C4A7]" />
              Pavimentos / Pisos ({dbState.pisos.length})
            </h3>

            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {dbState.pisos.map(p => (
                <div key={p} className="flex justify-between items-center p-2 rounded bg-[#0F1923] border border-slate-850 text-xs">
                  <span className="text-slate-350">{p}</span>
                  <button 
                    onClick={() => handleRemovePiso(p)}
                    className="p-1 text-slate-450 hover:text-[#EF4444] rounded hover:bg-slate-800 transition-colors"
                    title={`Remover Pavimento: ${p}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddPiso} className="pt-3 border-t border-[#253549] flex gap-2">
            <input 
              type="text" 
              value={newPisoInput}
              onChange={(e) => setNewPisoInput(e.target.value)}
              placeholder="Ex: Piso L4"
              required
              className="flex-1 bg-[#0F1923] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#00C4A7]"
            />
            <button 
              type="submit"
              className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Inserir
            </button>
          </form>
        </div>

        {/* CATEGORY CONTROLS */}
        <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-[#253549] pb-3 mb-3">
              <Tags className="w-4 h-4 text-[#00C4A7]" />
              Categorias de Lojas ({dbState.categorias.length})
            </h3>

            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {dbState.categorias.map(c => (
                <div key={c} className="flex justify-between items-center p-2 rounded bg-[#0F1923] border border-slate-850 text-xs">
                  <span className="text-slate-350">{c}</span>
                  <button 
                    onClick={() => handleRemoveCat(c)}
                    className="p-1 text-slate-450 hover:text-[#EF4444] rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddCat} className="pt-3 border-t border-[#253549] flex gap-2">
            <input 
              type="text" 
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              placeholder="Ex: Joalheria"
              required
              className="flex-1 bg-[#0F1923] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#00C4A7]"
            />
            <button 
              type="submit"
              className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Inserir
            </button>
          </form>
        </div>

        {/* NOTIFICATION TYPES CONTROLS */}
        <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-[#253549] pb-3 mb-3">
              <BellRing className="w-4 h-4 text-[#00C4A7]" />
              Tipos de Infração ({dbState.tiposNotificacao.length})
            </h3>

            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {dbState.tiposNotificacao.map(t => (
                <div key={t} className="flex justify-between items-center p-2 rounded bg-[#0F1923] border border-slate-850 text-xs">
                  <span className="text-slate-350 truncate pr-2" title={t}>{t}</span>
                  <button 
                    onClick={() => handleRemoveTipo(t)}
                    className="p-1 text-slate-450 hover:text-[#EF4444] rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddTipo} className="pt-3 border-t border-[#253549] flex gap-2">
            <input 
              type="text" 
              value={newTipoInput}
              onChange={(e) => setNewTipoInput(e.target.value)}
              placeholder="Ex: Multa Contratual"
              required
              className="flex-1 bg-[#0F1923] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#00C4A7]"
            />
            <button 
              type="submit"
              className="bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Inserir
            </button>
          </form>
        </div>

      </div>

      {/* BULK STORE IMPORT CARD ENTRY */}
      <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-[#253549] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="p-1 rounded bg-[#00C4A7]/10 text-[#00C4A7]">
                <Plus className="w-5 h-5" />
              </span>
              Importação Rápida de Lojas (Lote / Excel / CSV)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Copie linhas do Excel / Google Sheets ou digite uma lista separada por ponto e vírgula para cadastrar dezenas de lojas instantaneamente.
            </p>
          </div>
          
          <button
            onClick={() => setIsImporterOpen(!isImporterOpen)}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-705 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          >
            {isImporterOpen ? "Esconder Formulário" : "Abrir Importador"}
          </button>
        </div>

        {isImporterOpen && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-250">
            {/* Format Help Instructions */}
            <div className="bg-[#0F1923] p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
              <span className="font-bold text-[#00C4A7] flex items-center gap-1">
                <Info className="w-4 h-4" />
                Como formatar os dados de cada linha:
              </span>
              <p className="leading-relaxed">
                Insira as colunas na ordem abaixo, separadas por <strong className="text-amber-500">ponto e vírgula (;) ou tabulações</strong>:
              </p>
              <div className="bg-slate-900 border border-slate-800 text-xs font-mono p-2.5 rounded text-slate-400 overflow-x-auto select-text">
                Nome_da_Loja; CNPJ; Piso; Categoria; Nome_do_Gerente; Telefone; Email
              </div>
              <p className="text-[11px] text-slate-450">
                💡 <span className="font-semibold text-slate-300">Exemplo real pronto para copiar:</span>
              </p>
              <div className="bg-slate-900 border border-slate-800 text-[11px] font-mono p-2.5 rounded text-[#00C4A7] overflow-x-auto select-all">
                Livraria Leitura; 08.434.922/0001-44; Piso L2; Entretenimento; Marcio Borges; (11) 98888-2222; gerencia.leitura@email.com<br />
                Kopenhagen; 40.922.384/0001-66; Piso L2; Alimentação; Renata Abreu; (11) 95533-8822; kopenhagen.shopping@chocolates.com
              </div>
            </div>

            {/* Config options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Delimitador de Coluna</label>
                <select 
                  value={bulkSeparator}
                  onChange={(e) => {
                    setBulkSeparator(e.target.value);
                    handleParseBulkText(bulkText, e.target.value);
                  }}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#00C4A7]"
                >
                  <option value="auto">Detectar Automaticamente</option>
                  <option value=";">Ponto e vírgula (;)</option>
                  <option value=",">Vírgula (,)</option>
                  <option value="&#9;">Tabulação (Excel / Sheets)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Modo de Importação</label>
                <select 
                  value={bulkImportMode}
                  onChange={(e) => setBulkImportMode(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-205 rounded-lg p-2.5 focus:outline-none focus:border-[#00C4A7]"
                >
                  <option value="append">Adicionar às existentes (Preserva histórico)</option>
                  <option value="overwrite">Substituir base completamente (Zera lojas e notificações)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input 
                  type="checkbox" 
                  id="chk_auto_create"
                  checked={autoCreateParams}
                  onChange={(e) => setAutoCreateParams(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-[#00C4A7] bg-[#0F1923] accent-[#00C4A7]"
                />
                <label htmlFor="chk_auto_create" className="text-xs font-semibold text-slate-300 select-none">
                  Criar pisos/categorias faltantes
                </label>
              </div>
            </div>

            {/* Source Textarea */}
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-semibold uppercase">Dados para Importação (Lojas)</label>
              <textarea 
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  handleParseBulkText(e.target.value, bulkSeparator);
                }}
                placeholder="Cole as colunas de dados aqui... Uma loja por linha."
                rows={6}
                className="w-full bg-[#0F1923] border border-[#253549] text-slate-100 placeholder-slate-650 rounded-xl p-3 focus:outline-none focus:border-[#00C4A7] font-mono text-xs leading-relaxed"
              />
            </div>

            {/* Table Dynamic Preview */}
            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-4.5 h-4.5 text-[#00C4A7]" />
                    Lojas pré-identificadas ({bulkPreview.length})
                  </span>
                  <span className="text-[10px] text-amber-400 italic">Verifique os dados antes de importar</span>
                </div>

                <div className="max-h-[180px] overflow-y-auto border border-[#253549] rounded-lg bg-[#0F1923]">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-[#151F2D] text-[10px] uppercase font-bold text-slate-400 sticky top-0 border-b border-[#253549]">
                      <tr>
                        <th className="p-2.5">Nome</th>
                        <th className="p-2.5">CNPJ</th>
                        <th className="p-2.5">Piso</th>
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5">Responsável</th>
                        <th className="p-2.5">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2B3A]">
                      {bulkPreview.map((pStore, i) => (
                        <tr key={i} className="hover:bg-[#1A2636]">
                          <td className="p-2.5 font-bold text-slate-100">{pStore.nome}</td>
                          <td className="p-2.5 font-mono text-slate-400">{pStore.cnpj || "-"}</td>
                          <td className="p-2.5 text-slate-300">{pStore.piso}</td>
                          <td className="p-2.5 text-slate-300">{pStore.categoria}</td>
                          <td className="p-2.5 text-slate-205">{pStore.responsavel}</td>
                          <td className="p-2.5 font-mono text-slate-400">{pStore.telefone || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Submit Button */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#253549]">
              <button 
                type="button" 
                onClick={() => {
                  setBulkText('');
                  setBulkPreview([]);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2 rounded text-xs font-semibold"
              >
                Limpar Campos
              </button>
              <button 
                type="button" 
                onClick={handleExecuteBulkImport}
                disabled={bulkPreview.length === 0}
                className={`px-5 py-2 rounded text-xs font-bold shadow transition-all ${
                  bulkPreview.length > 0 
                  ? 'bg-[#00C4A7] hover:bg-[#00B096] text-slate-900 cursor-pointer' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Executar Importação de {bulkPreview.length} Lojas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BACKUP AND MAINTENANCE ACTIONS CONTAINER */}
      <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 border-b border-[#253549] pb-3">
            <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
            Manutenção Operacional do Banco de Dados
          </h3>
          <p className="text-xs text-slate-400 mt-1">Procedimentos administrativos críticos de persistência e recuperação.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Action 1: Export JSON */}
          <div className="bg-[#0F1923] border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[#00C4A7] font-semibold text-xs flex items-center gap-1 uppercase">
                <FileDown className="w-4.5 h-4.5" />
                Exportar Contingência
              </span>
              <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
                Gera um arquivo offline estruturado em formato `.json` contendo todas as lojas, notificações e logs cadastrados. Recomendado fazer semanalmente.
              </p>
            </div>
            
            <button 
              onClick={handleExportBackup}
              className="mt-4 bg-[#1A2636] hover:bg-slate-800 text-[#00C4A7] border border-[#00C4A7]/25 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Exportar Dossier JSON
            </button>
          </div>

          {/* Action 2: Import JSON */}
          <div className="bg-[#0F1923] border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[#3B82F6] font-semibold text-xs flex items-center gap-1 uppercase">
                <Upload className="w-4.5 h-4.5" />
                Restaurar Backup
              </span>
              <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
                Substitui o banco de dados local por um arquivo JSON exportado previamente. Cuidado: sobrescreve dados de operação atuais!
              </p>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileImport} 
              accept=".json"
              className="hidden" 
            />

            <button 
              onClick={handleUploadClick}
              className="mt-4 bg-slate-800 hover:bg-slate-700 text-slate-250 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Carregar Arquivo JSON
            </button>
          </div>

          {/* Action 3: Database Reset */}
          <div className="bg-[#0F1923] border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[#EF4444] font-semibold text-xs flex items-center gap-1 uppercase">
                <RotateCcw className="w-4.5 h-4.5" />
                Limpeza Total
              </span>
              <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
                Limpa as alterações manuais efetuadas e repopula o banco local com os 20 lojistas e 60 ocorrências de demonstração do Shopping distribuídos no ano.
              </p>
            </div>

            <button 
              onClick={handleResetToDemo}
              className="mt-4 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 py-2 rounded-xl text-xs font-black transition-all"
            >
              Restaurar Dados Demo
            </button>
          </div>

        </div>
      </div>

      {/* Custom Bulk Overwrite Confirmation Modal */}
      {showBulkOverwriteConfirm && (
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
                  Substituir Base de Lojas?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Você escolheu o modo <strong className="text-red-400">"Substituir base completamente"</strong>.
                </p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-[11px] text-red-250 leading-relaxed space-y-1">
              <p>⚠️ <strong>Aviso Crítico:</strong> Esta ação apagará permanentemente todas as lojas cadastradas atualmente.</p>
              <p>Todas as notificações e infrações também serão excluídas para garantir a consistência das referências.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkOverwriteConfirm(false)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs px-4 py-2 rounded-lg transition-all"
              >
                Voltar e Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExecuteBulkImport(true)}
                className="bg-red-650 hover:bg-red-550 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer"
              >
                Confirmar e Substituir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
