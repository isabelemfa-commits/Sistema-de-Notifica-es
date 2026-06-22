import React, { useState, useMemo } from 'react';
import { Store, Notification } from '../types';
import { getNotificationDisplayStatus, isExpiringSoon, getStoreRecurrentTypes } from '../mockData';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  Tags,
  Crown,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';

interface ReportsViewProps {
  stores: Store[];
  notifications: Notification[];
  pisos: string[];
  onTriggerToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, msg: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  stores,
  notifications,
  pisos,
  onTriggerToast
}) => {
  const nowStr = useMemo(() => new Date().toISOString(), []);

  // Sub-tabs: 'monthly' | 'recurrence' | 'deadlines'
  const [reportSubTab, setReportSubTab] = useState<'monthly' | 'recurrence' | 'deadlines'>('monthly');

  // Month Picker State for Monthly Report (Defaulting to June 2026 based on mock data timeline, or dynamically)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // June is index 5 (0-Indexed)

  const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const YEARS = [2025, 2026];

  // 1. Calculations for Monthly Report
  const monthlyReportData = useMemo(() => {
    // We want lists of stores with count of notifications sent in the selected month/year
    const storeStats: Array<{
      store: Store;
      total: number;
      pendentes: number;
      resolvidas: number;
      vencidas: number;
    }> = [];

    stores.forEach(s => {
      const storeMonthNotifs = notifications.filter(n => {
        if (n.lojaId !== s.id || n.status === 'Cancelada') return false;
        const d = new Date(n.dataEnvio);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      });

      if (storeMonthNotifs.length > 0) {
        let total = 0;
        let pendentes = 0;
        let resolvidas = 0;
        let vencidas = 0;

        storeMonthNotifs.forEach(n => {
          total++;
          const status = getNotificationDisplayStatus(n, nowStr);
          if (status === 'Pendente' || status === 'Em Andamento') {
            pendentes++;
          } else if (status === 'Vencida') {
            vencidas++;
          } else if (status === 'Resolvida') {
            resolvidas++;
          }
        });

        storeStats.push({
          store: s,
          total,
          pendentes,
          resolvidas,
          vencidas
        });
      }
    });

    // Subtotals per Floor
    const subtotalsByPiso: Record<string, { total: number; pendentes: number; resolvidas: number; vencidas: number }> = {};
    pisos.forEach(p => {
      subtotalsByPiso[p] = { total: 0, pendentes: 0, resolvidas: 0, vencidas: 0 };
    });

    storeStats.forEach(item => {
      const p = item.store.piso;
      if (subtotalsByPiso[p]) {
        subtotalsByPiso[p].total += item.total;
        subtotalsByPiso[p].pendentes += item.pendentes;
        subtotalsByPiso[p].resolvidas += item.resolvidas;
        subtotalsByPiso[p].vencidas += item.vencidas;
      }
    });

    return {
      storeStats,
      subtotalsByPiso
    };
  }, [stores, notifications, pisos, selectedYear, selectedMonth, nowStr]);

  // 2. Calculations for Recurrence and Rankings
  const recurrenceReportData = useMemo(() => {
    // List stores that are recurrent
    const recurrentList: Array<{
      store: Store;
      recurrentTypes: string[];
      totalNotifsLast12m: number;
    }> = [];

    stores.forEach(s => {
      const recTypes = getStoreRecurrentTypes(s.id, notifications, nowStr);
      if (recTypes.length > 0) {
        const limit12m = new Date(nowStr);
        limit12m.setFullYear(limit12m.getFullYear() - 1);
        const count = notifications.filter(
          n => n.lojaId === s.id && n.status !== 'Cancelada' && new Date(n.dataEnvio) >= limit12m
        ).length;

        recurrentList.push({
          store: s,
          recurrentTypes: recTypes,
          totalNotifsLast12m: count
        });
      }
    });

    // General Ranking of stores by notification volume (all times, valid non-canceled ones)
    const storeRankings: Array<{
      store: Store;
      count: number;
      vencidas: number;
      pendentes: number;
    }> = stores.map(s => {
      let count = 0;
      let vencidas = 0;
      let pendentes = 0;

      notifications.forEach(n => {
        if (n.lojaId === s.id && n.status !== 'Cancelada') {
          count++;
          const disp = getNotificationDisplayStatus(n, nowStr);
          if (disp === 'Vencida') vencidas++;
          else if (disp === 'Pendente' || disp === 'Em Andamento') pendentes++;
        }
      });

      return { store: s, count, vencidas, pendentes };
    }).sort((a,b) => b.count - a.count);

    return {
      recurrentList,
      storeRankings
    };
  }, [stores, notifications, nowStr]);

  // 3. Calculations for Deadline status sheets
  const deadlineReportData = useMemo(() => {
    const safeTermList: Notification[] = [];
    const warningList: Notification[] = [];
    const overdueList: Notification[] = [];

    notifications.forEach(n => {
      if (n.status === 'Cancelada' || n.status === 'Resolvida') return;

      const displayStatus = getNotificationDisplayStatus(n, nowStr);
      if (displayStatus === 'Vencida') {
        overdueList.push(n);
      } else if (isExpiringSoon(n, nowStr)) {
        warningList.push(n);
      } else {
        safeTermList.push(n);
      }
    });

    return {
      safeTermList,
      warningList,
      overdueList
    };
  }, [notifications, nowStr]);

  // Print Window Trigger
  const triggerPrintWindow = () => {
    window.print();
    onTriggerToast('info', 'Comando de Impressão', 'Abriu visualização assistida de PDF/Impressão.');
  };

  // Export Monthly to CSV Blob
  const exportMonthlyCSV = () => {
    try {
      let csv = '\uFEFF'; // BOM
      csv += `Relatorio Mensal - Competência ${MONTHS[selectedMonth]} de ${selectedYear}\n`;
      csv += "Loja;Piso;Categoria;Notificacoes Registradas;Pendencias Normais;Resolvidas;Expiradas (Vencidas)\n";
      
      monthlyReportData.storeStats.forEach(item => {
        csv += `${item.store.nome};${item.store.piso};${item.store.categoria};${item.total};${item.pendentes};${item.resolvidas};${item.vencidas}\n`;
      });

      csv += "\nSubtotais por Piso\n";
      csv += "Piso;Total Registradas;Pendentes;Resolvidas;Vencidas\n";
      pisos.forEach(p => {
        const sub = monthlyReportData.subtotalsByPiso[p];
        csv += `${p};${sub.total};${sub.pendentes};${sub.resolvidas};${sub.vencidas}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio_operacional_mensal_${selectedYear}_${selectedMonth + 1}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onTriggerToast('success', 'Relatório CSV Exportado', `Os dados operacionais ref. ${MONTHS[selectedMonth]} foram gravados.`);
    } catch (e) {
      onTriggerToast('error', 'Ops!', 'Erro ao fabricar dados do CSV.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Selector Subtabs */}
      <div className="flex border-b border-[#253549] bg-[#1A2636] p-2.5 rounded-xl gap-2 select-none">
        <button 
          onClick={() => setReportSubTab('monthly')}
          className={`flex-1 md:flex-initial text-center px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            reportSubTab === 'monthly' ? 'bg-[#00C4A7] text-slate-900 shadow font-bold' : 'text-slate-450 hover:text-slate-100 hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Relatório Mensal
        </button>

        <button 
          onClick={() => setReportSubTab('recurrence')}
          className={`flex-1 md:flex-initial text-center px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            reportSubTab === 'recurrence' ? 'bg-[#00C4A7] text-slate-900 shadow font-bold' : 'text-slate-450 hover:text-slate-100 hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Ranking & Recorrência
        </button>

        <button 
          onClick={() => setReportSubTab('deadlines')}
          className={`flex-1 md:flex-initial text-center px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            reportSubTab === 'deadlines' ? 'bg-[#00C4A7] text-slate-900 shadow font-bold' : 'text-slate-450 hover:text-slate-100 hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Prazos & Enquadramentos
        </button>
      </div>

      {/* --- SUBVIEW 1: MONTHLY AUDIT REPORT --- */}
      {reportSubTab === 'monthly' && (
        <div className="space-y-6">
          
          {/* Controls selector strip */}
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-slate-850 text-[#00C4A7] rounded-lg">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-250">Fechar Período Fiscal</h3>
                <p className="text-[11px] text-slate-450 mt-0.5 font-sans">Escolha mês e ano para auditar os resultados de notificações.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-[#0F1923] border border-[#253549] text-xs py-2 px-3 rounded text-slate-200 focus:outline-none"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-[#0F1923] border border-[#253549] text-xs py-2 px-3 rounded text-slate-200 focus:outline-none"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

              <button 
                onClick={exportMonthlyCSV}
                className="bg-slate-800 hover:bg-slate-750 border border-[#00C4A7]/20 text-[#00C4A7] px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1"
                title="Descarregar relatório consolidado em CSV"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>

              <button 
                onClick={triggerPrintWindow}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1"
                title="Processar layout para exportação PDF ou Folha Física"
              >
                <Printer className="w-4 h-4" />
                Imprimir PDF
              </button>
            </div>
          </div>

          {/* Monthly Audit Sheets */}
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl shadow-lg overflow-hidden font-sans">
            <div className="p-5 border-b border-[#253549] bg-[#151F2D] text-center">
              <h3 className="text-base font-bold text-slate-100">RELATÓRIO DE NOTIFICAÇÕES E SANÇÕES COMERCIAIS</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase font-mono tracking-wider">
                COMPETÊNCIA: {MONTHS[selectedMonth]} DE {selectedYear} — REGISTRO INTEGRADO MALL NOTIFY
              </p>
            </div>

            {monthlyReportData.storeStats.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-xs">
                Nenhum comunicado nem notificação registrada neste período de competência estipulada.
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-[#253549] text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Loja Notificada</th>
                      <th className="p-4">Piso</th>
                      <th className="p-4">Setor/Categoria</th>
                      <th className="p-4 text-center">Notificações Emitidas</th>
                      <th className="p-4 text-center">Prazo Normal / Em Aberto</th>
                      <th className="p-4 text-center">Resolvidas (Período)</th>
                      <th className="p-4 text-center">Vencidas (Expiradas)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#253549] text-xs">
                    {monthlyReportData.storeStats.map((item) => (
                      <tr key={item.store.id} className="hover:bg-slate-800/20">
                        <td className="p-4 font-semibold text-slate-100">{item.store.nome}</td>
                        <td className="p-4 text-slate-400">{item.store.piso}</td>
                        <td className="p-4 text-slate-400">{item.store.categoria}</td>
                        <td className="p-4 text-center font-bold font-mono text-slate-200">{item.total}</td>
                        <td className="p-4 text-center font-mono text-[#F59E0B]">{item.pendentes}</td>
                        <td className="p-4 text-center font-mono text-[#22C55E]">{item.resolvidas}</td>
                        <td className="p-4 text-center font-mono text-[#EF4444] font-bold">{item.vencidas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subtotals grouped by Floor */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg lg:col-span-3">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-4">Métricas Consolidadas de Rateio por Piso</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {pisos.map(p => {
                  const subState = monthlyReportData.subtotalsByPiso[p] || { total: 0, pendentes: 0, resolvidas: 0, vencidas: 0 };
                  return (
                    <div key={p} className="bg-[#0F1923] p-4 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-450 block truncate font-semibold uppercase">{p}</span>
                      <h3 className="text-xl font-bold font-mono text-slate-200 mt-2">{subState.total} <span className="text-[9px] text-slate-500 font-sans font-normal">Registros</span></h3>
                      <div className="grid grid-cols-2 gap-1.5 pt-2 text-[10px] border-t border-slate-900/40 mt-2 font-mono">
                        <span className="text-[#22C55E] font-sans">✓ OK: {subState.resolvidas}</span>
                        <span className="text-[#EF4444] font-sans font-bold">⚠️ OVER: {subState.vencidas}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- SUBVIEW 2: RECURRENCE AND LOJA RANKING --- */}
      {reportSubTab === 'recurrence' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recurrence report detailed listing */}
          <div className="lg:col-span-2 bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                Lojas Classificadas com Irregularidade Recorrente
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                De acordo com a convenção condominial comercial do shopping, lojas que acumulam 3 ou mais ocorrências do mesmo tipo no intervalo de 12 meses são marcadas com advertência formal qualificada.
              </p>
            </div>

            <div className="space-y-3">
              {recurrenceReportData.recurrentList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 block text-xs bg-[#0F1923]/30 rounded border border-slate-850">
                  Totalmente regularizado! Nenhuma loja comercial do shopping foi enquadrada como infração recorrente nos passados 12 meses.
                </div>
              ) : (
                recurrenceReportData.recurrentList.map(({ store, recurrentTypes, totalNotifsLast12m }) => (
                  <div key={store.id} className="bg-[#0F1923] p-4 rounded-xl border border-[#EF4444]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-[#EF4444] flex items-center gap-1.5">
                        {store.nome}
                        <span className="bg-[#EF4444]/15 border border-[#EF4444]/30 text-[9px] font-bold text-[#EF4444] rounded px-1.5">Multa Recorrente</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Piso: <span className="text-slate-200 font-semibold">{store.piso}</span> | Gerente: <span className="text-slate-300 font-medium">{store.responsavel}</span>
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {recurrentTypes.map(t => (
                          <span key={t} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                            Repetidos: <span className="font-bold text-[#00C4A7]">{t}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#1A2636] p-3 rounded-lg border border-slate-800 text-center shrink-0 min-w-[120px]">
                      <span className="text-[9px] text-slate-450 block uppercase">12 Meses</span>
                      <span className="text-xl font-bold font-mono text-[#EF4444]">{totalNotifsLast12m}</span>
                      <span className="text-[9px] text-slate-500 block">Incidentes totais</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ranking Board Side */}
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-[#F59E0B]" />
                Ranking de Ocorrências (Top Comercial)
              </h3>
              <p className="text-[10px] text-slate-450 mt-1 leading-normal">Ordenamento decrescente de lojas comerciais com maior volume histórico de sanções em geral.</p>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {recurrenceReportData.storeRankings.map(({ store, count, vencidas, pendentes }, index) => {
                const isFirst = index === 0 && count > 0;
                return (
                  <div key={store.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F1923] border border-slate-850 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[11px] ${
                        isFirst ? 'bg-[#F59E0B] text-slate-950 font-sans font-black' : 'bg-slate-800 text-slate-450'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-semibold text-slate-100 truncate">{store.nome}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{store.piso}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 font-mono">
                      <div className="text-center font-mono text-[10px]">
                        <span className="text-slate-450 block text-[8px]">Overdue</span>
                        <span className="text-[#EF4444] font-semibold">{vencidas}</span>
                      </div>
                      
                      <div className="text-center bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono text-xs">
                        <span className="font-bold text-slate-200">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* --- SUBVIEW 3: DEADLINE AND TERM DIVISION --- */}
      {reportSubTab === 'deadlines' && (
        <div className="space-y-6">
          
          <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-[#00C4A7]" />
              Painel de Divisão Analítica de Prazos (Não Resolvidos)
            </h3>
            <p className="text-xs text-slate-450 mt-1 leading-normal">
              Acompanhamento tático das pendências ativas agrupadas pelos respectivos riscos de descumprimento legal contratual.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: VENCIDAS (Critical / Overdue) */}
            <div className="space-y-4">
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#EF4444] uppercase tracking-wider">🚨 Pendências Vencidas</h4>
                  <span className="text-[10px] text-slate-400">Requerem aplicação imediata de multa</span>
                </div>
                <span className="bg-[#EF4444] text-slate-950 px-2.5 py-0.5 rounded font-mono text-xs font-bold">{deadlineReportData.overdueList.length}</span>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {deadlineReportData.overdueList.length === 0 ? (
                  <p className="text-center py-6 text-[11px] text-slate-550 italic">Sem ocorrências vencidas no momento.</p>
                ) : (
                  deadlineReportData.overdueList.map(item => (
                    <div key={item.id} className="bg-[#1A2636] border border-[#EF4444]/20 p-3.5 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-slate-200">{stores.find(s => s.id === item.lojaId)?.nome}</h5>
                        <span className="text-[9px] bg-[#EF4444]/10 text-[#EF4444] font-bold px-1 rounded uppercase">{item.prioridade}</span>
                      </div>
                      <p className="font-semibold text-slate-350 line-clamp-1">{item.titulo}</p>
                      <p className="text-slate-400 text-[11px] line-clamp-2">{item.descricao}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-850/50">
                        <span>Venceu em:</span>
                        <span className="text-[#EF4444] font-bold">{new Date(item.dataVencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: EXPIRING IN 7 DAYS (Warning) */}
            <div className="space-y-4">
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">⏳ Vencendo em até 7 Dias</h4>
                  <span className="text-[10px] text-slate-400">Alerta: Acompanhamento de equipe</span>
                </div>
                <span className="bg-[#F59E0B] text-[#0F1923] px-2.5 py-0.5 rounded font-mono text-xs font-bold">{deadlineReportData.warningList.length}</span>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {deadlineReportData.warningList.length === 0 ? (
                  <p className="text-center py-6 text-[11px] text-slate-550 italic">Sem alertas com prazo esgotando nos próximos 7 dias.</p>
                ) : (
                  deadlineReportData.warningList.map(item => (
                    <div key={item.id} className="bg-[#1A2636] border border-[#F59E0B]/20 p-3.5 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-slate-200">{stores.find(s => s.id === item.lojaId)?.nome}</h5>
                        <span className="text-[9px] bg-[#F59E0B]/10 text-[#F59E0B] font-bold px-1 rounded uppercase">{item.prioridade}</span>
                      </div>
                      <p className="font-semibold text-slate-350 line-clamp-1">{item.titulo}</p>
                      <p className="text-slate-400 text-[11px] line-clamp-2">{item.descricao}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-850/50">
                        <span>Expira em:</span>
                        <span className="text-[#F59E0B] font-bold">{new Date(item.dataVencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: SAFE TERM (Safe / Normal) */}
            <div className="space-y-4">
              <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/25 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider">🗓️ Prazo Regularizado</h4>
                  <span className="text-[10px] text-slate-400 font-sans">Aguardam resolução em curso normal</span>
                </div>
                <span className="bg-[#3B82F6] text-white px-2.5 py-0.5 rounded font-mono text-xs font-bold">{deadlineReportData.safeTermList.length}</span>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {deadlineReportData.safeTermList.length === 0 ? (
                  <p className="text-center py-6 text-[11px] text-slate-550 italic">Sem outras pendências gerais em prazo normal.</p>
                ) : (
                  deadlineReportData.safeTermList.map(item => (
                    <div key={item.id} className="bg-[#1A2636] border border-[#3B82F6]/25 p-3.5 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-slate-200">{stores.find(s => s.id === item.lojaId)?.nome}</h5>
                        <span className="text-[9px] bg-[#3B82F6]/10 text-[#3B82F6] font-bold px-1 rounded uppercase">{item.prioridade}</span>
                      </div>
                      <p className="font-semibold text-slate-350 line-clamp-1">{item.titulo}</p>
                      <p className="text-slate-400 text-[11px] line-clamp-2">{item.descricao}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-850/50">
                        <span>Expiração em:</span>
                        <span className="text-[#3B82F6] font-semibold">{new Date(item.dataVencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
