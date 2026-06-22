import React, { useMemo } from 'react';
import { Store, Notification } from '../types';
import { 
  getNotificationDisplayStatus, 
  isExpiringSoon, 
  isStoreRecurrent,
  getStoreRecurrentTypes
} from '../mockData';
import { KPICard } from './KPICard';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  Percent, 
  Activity, 
  ArrowUpRight, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardViewProps {
  stores: Store[];
  notifications: Notification[];
  onNavigateToTab: (tab: string, filters?: any) => void;
  onViewNotificationDetail: (notif: Notification) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stores,
  notifications,
  onNavigateToTab,
  onViewNotificationDetail
}) => {
  const now = useMemo(() => new Date(), []);
  const nowStr = now.toISOString();

  // 1. Core KPIs calculations
  const stats = useMemo(() => {
    // Current month/year for filtering (June 2026 based on instructions, or system active date)
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    let activeMonthTotal = 0;
    let activeMonthResolved = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let resolvedCount = 0;

    notifications.forEach(n => {
      const displayStatus = getNotificationDisplayStatus(n, nowStr);
      const sDate = new Date(n.dataEnvio);
      const isThisMonth = sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonth;

      if (isThisMonth) {
        activeMonthTotal++;
        if (displayStatus === 'Resolvida') {
          activeMonthResolved++;
        }
      }

      if (displayStatus === 'Pendente' || displayStatus === 'Em Andamento') {
        pendingCount++;
      } else if (displayStatus === 'Vencida') {
        overdueCount++;
      } else if (displayStatus === 'Resolvida') {
        resolvedCount++;
      }
    });

    // Count recurrent stores
    const recurrentStoresCount = stores.filter(s => isStoreRecurrent(s.id, notifications, nowStr)).length;

    // Total active resolution rate
    const totalCompleted = notifications.filter(n => getNotificationDisplayStatus(n, nowStr) === 'Resolvida').length;
    const totalValid = notifications.filter(n => getNotificationDisplayStatus(n, nowStr) !== 'Cancelada').length;
    const resolutionRate = totalValid > 0 ? Math.round((totalCompleted / totalValid) * 100) : 0;

    return {
      activeMonthTotal,
      activeMonthResolved,
      pendingCount,
      overdueCount,
      resolvedCount,
      recurrentStoresCount,
      resolutionRate
    };
  }, [stores, notifications, now, nowStr]);

  // 2. Gráfico de barras: notificações por mês (últimos 12 meses)
  const chartMonthlyData = useMemo(() => {
    const list: { name: string; total: number; resolvidas: number; vencidas: number; sortKey: string }[] = [];
    
    // Build last 12 months keys
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = d.toLocaleString('pt-BR', { month: 'short' });
      const year = d.getFullYear();
      const sortKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({
        name: `${mName.replace('.', '')}/${String(year).slice(2)}`,
        total: 0,
        resolvidas: 0,
        vencidas: 0,
        sortKey
      });
    }

    notifications.forEach(n => {
      const displayStatus = getNotificationDisplayStatus(n, nowStr);
      const sDate = new Date(n.dataEnvio);
      const key = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
      
      const item = list.find(l => l.sortKey === key);
      if (item) {
        item.total++;
        if (displayStatus === 'Resolvida') {
          item.resolvidas++;
        } else if (displayStatus === 'Vencida') {
          item.vencidas++;
        }
      }
    });

    return list;
  }, [notifications, nowStr]);

  // 3. Gráﬁco de pizza/donut: distribuição por tipo
  const chartTypeData = useMemo(() => {
    const typesMap: { [key: string]: number } = {};
    notifications.forEach(n => {
      if (n.status !== 'Cancelada') {
        typesMap[n.tipo] = (typesMap[n.tipo] || 0) + 1;
      }
    });

    return Object.keys(typesMap).map(type => ({
      name: type,
      value: typesMap[type]
    })).sort((a,b) => b.value - a.value);
  }, [notifications]);

  const COLORS = ['#00C4A7', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981'];

  // 4. Gráfico de barras horizontal: top 10 lojas com mais notificações
  const chartStoreRanking = useMemo(() => {
    const counts: { [key: string]: { id: string; name: string; total: number; pendentes: number } } = {};
    
    // Initialize
    stores.forEach(s => {
      counts[s.id] = { id: s.id, name: s.nome, total: 0, pendentes: 0 };
    });

    // Count
    notifications.forEach(n => {
      if (n.status !== 'Cancelada' && counts[n.lojaId]) {
        counts[n.lojaId].total++;
        const status = getNotificationDisplayStatus(n, nowStr);
        if (status === 'Pendente' || status === 'Em Andamento' || status === 'Vencida') {
          counts[n.lojaId].pendentes++;
        }
      }
    });

    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        name: item.name,
        total: item.total,
        pendentes: item.pendentes,
        storeId: item.id
      }));
  }, [stores, notifications, nowStr]);

  // 5. Active alerts: Urgent/Expiring in 7 days & Overdue unresolved
  const urgentAlerts = useMemo(() => {
    const alerts: Array<{
      notification: Notification;
      lojaName: string;
      piso: string;
      displayStatus: string;
      urgencyScore: number; // For sorting: 4=Crítica/Vencida, 3=Crítica/EmVencimento, 2=Alta, 1=Outros
      reason: 'Vencida' | 'Vence em Breve';
      daysLeft: number;
    }> = [];

    notifications.forEach(n => {
      const displayStatus = getNotificationDisplayStatus(n, nowStr);
      const store = stores.find(s => s.id === n.lojaId);
      if (!store) return;

      if (displayStatus === 'Vencida') {
        const diffTime = now.getTime() - new Date(n.dataVencimento).getTime();
        const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        alerts.push({
          notification: n,
          lojaName: store.nome,
          piso: store.piso,
          displayStatus,
          urgencyScore: n.prioridade === 'Crítica' ? 100 + daysAgo : 50 + daysAgo,
          reason: 'Vencida',
          daysLeft: -daysAgo
        });
      } else if (isExpiringSoon(n, nowStr)) {
        const diffTime = new Date(n.dataVencimento).getTime() - now.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        alerts.push({
          notification: n,
          lojaName: store.nome,
          piso: store.piso,
          displayStatus,
          urgencyScore: n.prioridade === 'Crítica' ? 40 - daysLeft : 20 - daysLeft,
          reason: 'Vence em Breve',
          daysLeft
        });
      }
    });

    // Sort by urgencyScore descending
    return alerts.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 8);
  }, [stores, notifications, now, nowStr]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#1A2636] border border-[#253549] rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00C4A7] animate-pulse" />
            Visão Geral de Operações
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitoramento de conformidades comerciais, alertas e recorrencia em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-[#0F1923] text-[#00C4A7] border border-[#00C4A7]/30 font-mono py-1.5 px-3 rounded-lg">
            Hoje: {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 animate-fade-in">
        <KPICard 
          title="Novas no Mês" 
          value={stats.activeMonthTotal} 
          subtitle={`${stats.activeMonthResolved} resolvidas`}
          icon={ShoppingBag} 
          iconColor="#3B82F6" 
          borderColor="border-[#2D3748]"
        />
        <KPICard 
          title="Pendentes" 
          value={stats.pendingCount} 
          subtitle="Prazo regulamentar"
          icon={Clock} 
          iconColor="#00C4A7" 
          borderColor="border-[#2D3748]"
        />
        <KPICard 
          title="Vencidas" 
          value={stats.overdueCount} 
          subtitle="Ação Corretiva"
          icon={ShieldAlert} 
          iconColor="#EF4444" 
          borderColor="border-[#2D3748]"
        />
        <KPICard 
          title="Resolvidas" 
          value={stats.resolvedCount} 
          subtitle="Acúmulo histórico"
          icon={CheckCircle2} 
          iconColor="#22C55E" 
          borderColor="border-[#2D3748]"
        />
        <KPICard 
          title="Lojas Recorrentes" 
          value={stats.recurrentStoresCount} 
          subtitle="Reincidentes"
          icon={AlertTriangle} 
          iconColor="#F59E0B" 
          borderColor="border-[#2D3748]"
        />
        <KPICard 
          title="Taxa de Resolução" 
          value={`${stats.resolutionRate}%`} 
          subtitle="Eficiência geral"
          icon={Percent} 
          iconColor="#8B5CF6" 
          borderColor="border-[#2D3748]"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histórico 12 Meses */}
        <div className="lg:col-span-2 bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-200">Volume de Notificações por Mês (Últimos 12 Meses)</h4>
            <span className="text-[10px] font-mono text-slate-400 uppercase">Visão Cronológica</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#253549" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#101B2B', borderColor: '#253549', borderRadius: '8px' }}
                  labelStyle={{ color: '#F1F5F9', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                <Bar name="Registradas" dataKey="total" fill="#00C4A7" radius={[4, 4, 0, 0]} />
                <Bar name="Resolvidas" dataKey="resolvidas" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar name="Vencidas" dataKey="vencidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tipos de Notificações Donut */}
        <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-200">Distribuição por Tipo</h4>
            <span className="text-[10px] font-mono text-slate-400">Ativas & Resolvidas</span>
          </div>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#101B2B', borderColor: '#253549', borderRadius: '8px' }}
                  itemStyle={{ color: '#F1F5F9' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-slate-100">{notifications.filter(n => n.status !== 'Cancelada').length}</span>
              <span className="text-[10px] text-slate-400">Total Válidas</span>
            </div>
          </div>
          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 max-h-[100px] overflow-y-auto pr-1">
            {chartTypeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate" title={entry.name}>{entry.name}</span>
                <span className="font-mono text-slate-400 text-[10px] ml-auto">({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 Lojas com mais notificações (Barra Horizontal) */}
        <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-200">Top 10 Lojas com Mais Notificações</h4>
            <button 
              onClick={() => onNavigateToTab('stores')}
              className="text-xs text-[#00C4A7] hover:underline flex items-center gap-0.5"
            >
              Lojas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartStoreRanking}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#253549" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} width={80} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#101B2B', borderColor: '#253549', borderRadius: '8px' }}
                  itemStyle={{ color: '#F1F5F9' }}
                />
                <Bar name="Total Registradas" dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar name="Pendentes/Vencidas" dataKey="pendentes" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quadro de Alertas Ativos */}
        <div className="lg:col-span-2 bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#253549] pb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  Alertas Ativos e Urgentes
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Notificações vencidas ou prestes a expirar nos próximos 7 dias</p>
              </div>
              <button 
                onClick={() => onNavigateToTab('notifications', { alertOnly: true })}
                className="text-xs text-[#00C4A7] hover:underline flex items-center gap-0.5 whitespace-nowrap"
              >
                Ver Todas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {urgentAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-[#00C4A7] mb-2" />
                  <p className="text-sm font-medium">Nenhum alerta crítico ativo!</p>
                  <p className="text-xs text-slate-500 mt-1">Todas as lojas em dia com os prazos operacionais.</p>
                </div>
              ) : (
                urgentAlerts.map(({ notification: n, lojaName, piso, displayStatus, reason, daysLeft }) => {
                  const isVencida = reason === 'Vencida';
                  return (
                    <div 
                      key={n.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border text-xs transition-colors hover:bg-slate-800 cursor-pointer ${
                        isVencida 
                          ? 'bg-[#EF4444]/5 border-[#EF4444]/20 hover:border-[#EF4444]/40' 
                          : 'bg-[#F59E0B]/5 border-[#F59E0B]/20 hover:border-[#F59E0B]/40'
                      }`}
                      onClick={() => onViewNotificationDetail(n)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold hover:underline ${isVencida ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                            {lojaName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">({piso})</span>
                          
                          {/* Recurrent badge inside active alerts if the store is indeed recurrent */}
                          {isStoreRecurrent(n.lojaId, notifications, nowStr) && (
                            <span 
                              className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 px-1 text-[9px] rounded font-bold"
                              title="Loja classificada como Recorrente (3+ incidentes do mesmo tipo no ano)"
                            >
                              Recorrente
                            </span>
                          )}
                        </div>
                        <h5 className="font-medium text-slate-200 truncate">{n.titulo}</h5>
                        <p className="text-slate-400 text-[11px] truncate mt-0.5">{n.descricao}</p>
                      </div>
                      
                      <div className="sm:text-right shrink-0 mt-2 sm:mt-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          n.prioridade === 'Crítica' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                          n.prioridade === 'Alta' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          Prioridade: {n.prioridade}
                        </span>
                        
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          {isVencida ? (
                            <span className="text-[#EF4444] font-bold flex items-center gap-0.5">
                              Vencida há {Math.abs(daysLeft)} {Math.abs(daysLeft) === 1 ? 'dia' : 'dias'}
                            </span>
                          ) : (
                            <span className="text-[#F59E0B] font-bold flex items-center gap-0.5">
                              Sinal: {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-[#253549] flex justify-between items-center text-[11px] text-slate-400">
            <span>Legenda:</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Vencido</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> {_getPortugueseGrammarTerm()} 7 dias</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function _getPortugueseGrammarTerm() {
  return "Expira em até";
}
