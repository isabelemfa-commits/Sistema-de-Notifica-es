import React, { useState, useRef, useMemo } from 'react';
import { DatabaseState } from '../types';
import { generateMockData } from '../mockData';
import { read, utils } from 'xlsx';
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
  Check,
  FileSpreadsheet
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
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [importTab, setImportTab] = useState<'excel' | 'text'>('excel');
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setExcelFileName(file.name);
    
    // Clear manual pasted text to avoid confusion
    setBulkText('');
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const workbook = read(new Uint8Array(data as ArrayBuffer), { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          onTriggerToast('error', 'Arquivo Vazio', 'O arquivo Excel importado não possui linhas de dados.');
          return;
        }

        const parsedStores: any[] = [];
        jsonData.forEach((row: any, index: number) => {
          if (!row || row.length === 0) return;
          
          const firstVal = String(row[0] || '').trim().toLowerCase();
          // Skip header row if matches keywords
          if (index === 0 && (
            firstVal === 'nome' || 
            firstVal === 'empresa' || 
            firstVal === 'loja' || 
            firstVal === 'nome da loja' ||
            firstVal.includes('luc') ||
            firstVal.includes('cnpj') ||
            firstVal.includes('piso') ||
            firstVal.includes('responsável')
          )) {
            return;
          }
          
          const nome = row[0] ? String(row[0]).trim() : '';
          const luc = row[1] ? String(row[1]).trim() : '';
          const piso = row[2] ? String(row[2]).trim() : dbState.pisos[0] || 'L1';
          const responsavel = row[3] ? String(row[3]).trim() : 'Gerente Geral';
          const telefone = row[4] ? String(row[4]).trim() : '';
          const email = row[5] ? String(row[5]).trim() : '';
          
          if (nome) {
            parsedStores.push({
              nome,
              luc,
              piso,
              responsavel,
              telefone,
              email,
              lineNum: index + 1
            });
          }
        });
        
        setBulkPreview(parsedStores);
        if (parsedStores.length > 0) {
          onTriggerToast('success', 'Planilha Processada', `Identificamos ${parsedStores.length} lojas prontas para importação.`);
        } else {
          onTriggerToast('warning', 'Nenhuma Loja Identificada', 'Verifique se a primeira coluna da planilha possui os nomes das lojas.');
        }
      } catch (err) {
        console.error(err);
        onTriggerToast('error', 'Falha na Leitura', 'Erro ao processar as colunas do Excel. Verifique a formatação.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
        firstPartLower.includes('luc') ||
        firstPartLower.includes('cnpj') ||
        firstPartLower.includes('piso') ||
        firstPartLower.includes('responsável') ||
        firstPartLower.includes('responsavel')
      )) {
        return;
      }
      
      const nome = parts[0] || '';
      const luc = parts[1] || '';
      const piso = parts[2] || dbState.pisos[0] || 'L1';
      const responsavel = parts[3] || 'Gerente Geral';
      const telefone = parts[4] || '';
      const email = parts[5] || '';
      
      if (nome) {
        parsedStores.push({
          nome,
          luc,
          piso,
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

    const finalStores: any[] = bulkPreview.map((item, idx) => {
      if (autoCreateParams) {
        if (item.piso && !nextPisos.includes(item.piso)) {
          nextPisos.push(item.piso);
        }
      }

      return {
        id: `store-bulk-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        nome: item.nome,
        luc: item.luc || '',
        piso: item.piso,
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
      pisos: nextPisos
    });

    setBulkText('');
    setBulkPreview([]);
    setExcelFileName(null);
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

      {/* Grid: 2 lists management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
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
              placeholder="Ex: L4"
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
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              Importador Automático de Lojas
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre dezenas de estabelecimentos de uma só vez importando arquivos do Excel ou copiando e colando suas tabelas.
            </p>
          </div>
          
          <button
            onClick={() => setIsImporterOpen(!isImporterOpen)}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-705 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          >
            {isImporterOpen ? "Esconder Importador" : "Iniciar Importador"}
          </button>
        </div>

        {isImporterOpen && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-3 duration-250">
            {/* Tab selector */}
            <div className="flex border-b border-[#253549] p-0.5 bg-[#0F1923] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setImportTab('excel');
                  setBulkPreview([]);
                  setExcelFileName(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  importTab === 'excel'
                    ? 'bg-[#1A2636] text-[#00C4A7] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Planilha Excel (.xlsx, .xls, .csv)
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportTab('text');
                  setBulkPreview([]);
                  setExcelFileName(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  importTab === 'text'
                    ? 'bg-[#1A2636] text-[#00C4A7] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                Copiar e Colar Texto
              </button>
            </div>

            {/* General parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0F1923]/40 p-4 rounded-xl border border-[#253549]/30">
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Modo de Alimentação</label>
                <select 
                  value={bulkImportMode}
                  onChange={(e) => setBulkImportMode(e.target.value)}
                  className="w-full bg-[#0F1923] border border-[#253549] text-xs text-slate-205 rounded-lg p-2.5 focus:outline-none focus:border-[#00C4A7]"
                >
                  <option value="append">Adicionar às lojas existentes (Preservar dados existentes)</option>
                  <option value="overwrite">Substituir base completamente (Zerar histórico e lojas atuais)</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-5 sm:pt-4 md:pt-6">
                <input 
                  type="checkbox" 
                  id="chk_auto_create"
                  checked={autoCreateParams}
                  onChange={(e) => setAutoCreateParams(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-[#00C4A7] bg-[#0F1923] accent-[#00C4A7]"
                />
                <label htmlFor="chk_auto_create" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
                  Criar automaticamente Pisos ou Categorias inexistentes do arquivo
                </label>
              </div>
            </div>

            {/* TAB CONTENT: EXCEL FILE UPLOAD */}
            {importTab === 'excel' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <span className="text-xs text-slate-300 font-semibold">
                    Selecione ou arraste sua planilha estruturada
                  </span>
                  
                  {/* Template download link */}
                  <button
                    type="button"
                    onClick={() => {
                      const csvContent = "Nome da Loja;LUC;Piso;Nome do Gerente;Telefone;Email\n" +
                        "Livraria Leitura;LUC L2-19;L2;Marcio Borges;(11) 98888-2222;gerencia.leitura@email.com\n" +
                        "Kopenhagen;LUC L1-03;L1;Renata Abreu;(11) 95533-8822;kopenhagen.shopping@chocolates.com";
                      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute("download", "modelo_importacao_lojas.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      onTriggerToast('info', 'Modelo Baixado', 'Use este modelo no Excel ou Sheets para preencher e importar.');
                    }}
                    className="text-xs text-[#00C4A7] hover:text-[#00B096] font-bold flex items-center gap-1 hover:underline cursor-pointer py-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Modelo Excel (.csv)
                  </button>
                </div>

                {/* Drag zone box */}
                <div 
                  onClick={() => excelInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-[#0F1923]/45 ${
                    excelFileName 
                      ? 'border-[#00C4A7] bg-[#00C4A7]/5' 
                      : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/20'
                  }`}
                >
                  <input 
                    type="file"
                    ref={excelInputRef}
                    onChange={handleExcelFileUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-4 rounded-full ${excelFileName ? 'bg-[#00C4A7]/10 text-[#00C4A7]' : 'bg-slate-800 text-slate-400'}`}>
                      <Upload className="w-6 h-6 animate-pulse" />
                    </div>
                    
                    {excelFileName ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-100">{excelFileName}</p>
                        <p className="text-[10px] text-[#00C4A7] font-semibold">Clique para substituir o arquivo carregado</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-250">
                          Clique ou arraste um arquivo <strong className="text-[#00C4A7]">Excel (.xlsx, .xls)</strong> ou <strong className="text-[#00C4A7]">CSV</strong>
                        </p>
                        <p className="text-[10px] text-slate-450 leading-relaxed">
                          A planilha deve conter as colunas: Nome, LUC, Piso, Responsável, Telefone, Email
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: COPY & PASTE TEXT */}
            {importTab === 'text' && (
              <div className="space-y-3">
                {/* Format Help Instructions */}
                <div className="bg-[#0F1923] p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <span className="font-bold text-[#00C4A7] flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Como formatar as linhas copiadas:
                  </span>
                  <p className="leading-relaxed">
                    Copie as linhas da sua tabela e separe as colunas por <strong className="text-amber-500">ponto e vírgula (;) ou tabulações</strong>:
                  </p>
                  <div className="bg-slate-900 border border-slate-850 text-xs font-mono p-2.5 rounded text-slate-400 overflow-x-auto select-text">
                    Nome_da_Loja; LUC; Piso; Nome_do_Gerente; Telefone; Email
                  </div>
                  <p className="text-[11px] text-slate-450">
                    💡 <span className="font-semibold text-slate-300">Exemplo real pronto:</span>
                  </p>
                  <div className="bg-slate-900 border border-slate-850 text-[11px] font-mono p-2.5 rounded text-[#00C4A7] overflow-x-auto select-all">
                    Livraria Leitura; LUC L2-19; L2; Marcio Borges; (11) 98888-2222; gerencia.leitura@email.com<br />
                    Kopenhagen; LUC L1-03; L1; Renata Abreu; (11) 95533-8822; kopenhagen.shopping@chocolates.com
                  </div>
                </div>

                {/* Delimiter setup */}
                <div className="max-w-[280px]">
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Delimitador de Texto</label>
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

                {/* Source Textarea */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase">Área de Colagem (Linhas copiadas)</label>
                  <textarea 
                    value={bulkText}
                    onChange={(e) => {
                      setBulkText(e.target.value);
                      handleParseBulkText(e.target.value, bulkSeparator);
                    }}
                    placeholder="Cole as linhas selecionadas aqui... Uma loja por linha."
                    rows={6}
                    className="w-full bg-[#0F1923] border border-[#253549] text-slate-100 placeholder-slate-650 rounded-xl p-3 focus:outline-none focus:border-[#00C4A7] font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            )}

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
                        <th className="p-2.5">LUC</th>
                        <th className="p-2.5">Piso</th>
                        <th className="p-2.5">Responsável</th>
                        <th className="p-2.5">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2B3A]">
                      {bulkPreview.map((pStore, i) => (
                        <tr key={i} className="hover:bg-[#1A2636]">
                          <td className="p-2.5 font-bold text-slate-100">{pStore.nome}</td>
                          <td className="p-2.5 font-mono text-slate-400">{pStore.luc || "-"}</td>
                          <td className="p-2.5 text-slate-300">{pStore.piso}</td>
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
                  setExcelFileName(null);
                }}
                className="bg-slate-800 hover:bg-slate-755 text-slate-300 px-4 py-2 rounded text-xs font-semibold cursor-pointer"
              >
                Limpar Campos
              </button>
              <button 
                type="button" 
                onClick={() => handleExecuteBulkImport(false)}
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
