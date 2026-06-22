import React, { useState, useMemo } from 'react';
import { Store, Notification } from '../types';
import { getNotificationDisplayStatus, isStoreRecurrent } from '../mockData';
import { 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Building, 
  BellRing, 
  AlertTriangle, 
  Eye, 
  ExternalLink,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface FloorsViewProps {
  stores: Store[];
  notifications: Notification[];
  pisos: string[];
  onNavigateToNotificationsWithFilter: (pisoName: string) => void;
  onViewStoreProfile: (storeId: string) => void;
}

export const FloorsView: React.FC<FloorsViewProps> = ({
  stores,
  notifications,
  pisos,
  onNavigateToNotificationsWithFilter,
  onViewStoreProfile
}) => {
  const nowStr = useMemo(() => new Date().toISOString(), []);

  // Multi expanded state (keep a set of expanded floors)
  const [expandedPisos, setExpandedPisos] = useState<Record<string, boolean>>(() => {
    // Expand the first floor by default
    if (pisos.length > 0) return { [pisos[0]]: true };
    return {};
  });

  const toggleFloor = (piso: string) => {
    setExpandedPisos(prev => ({
      ...prev,
      [piso]: !prev[piso]
    }));
  };

  // Compile calculations per floor
  const floorStats = useMemo(() => {
    const map: Record<string, {
      pisoName: string;
      totalStores: number;
      storesInFloor: Store[];
      activeNotifsCount: number;
      overdueNotifsCount: number;
      storeStatsList: Array<{
        store: Store;
        total: number;
        pendentes: number;
        resolvidas: number;
        vencidas: number;
        recorrente: boolean;
      }>;
    }> = {};

    // Initialize map
    pisos.forEach(p => {
      map[p] = {
        pisoName: p,
        totalStores: 0,
        storesInFloor: [],
        activeNotifsCount: 0,
        overdueNotifsCount: 0,
        storeStatsList: []
      };
    });

    // Count stores per Floor
    stores.forEach(s => {
      const p = s.piso;
      if (map[p]) {
        map[p].totalStores++;
        map[p].storesInFloor.push(s);
      }
    });

    // Map stats per store per floor
    stores.forEach(s => {
      const p = s.piso;
      if (!map[p]) return;

      const storeNotifications = notifications.filter(n => n.lojaId === s.id && n.status !== 'Cancelada');
      let total = 0;
      let pendentes = 0;
      let resolvidas = 0;
      let vencidas = 0;

      storeNotifications.forEach(n => {
        total++;
        const displayStatus = getNotificationDisplayStatus(n, nowStr);
        if (displayStatus === 'Pendente' || displayStatus === 'Em Andamento') {
          pendentes++;
          map[p].activeNotifsCount++;
        } else if (displayStatus === 'Vencida') {
          vencidas++;
          map[p].overdueNotifsCount++;
        } else if (displayStatus === 'Resolvida') {
          resolvidas++;
        }
      });

      map[p].storeStatsList.push({
        store: s,
        total,
        pendentes,
        resolvidas,
        vencidas,
        recorrente: isStoreRecurrent(s.id, notifications, nowStr)
      });
    });

    return map;
  }, [stores, notifications, pisos, nowStr]);

  return (
    <div className="space-y-6">
      
      {/* Upper Info Card */}
      <div className="bg-[#1A2636] border border-[#253549] rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5.5 h-5.5 text-[#00C4A7]" />
            Monitoramento Setorial por Piso
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visão de conformidade geográfica. Expanda cada piso para ver suas lojas e filtrar o relatório geral de notificações por setor.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-[#0F1923] p-3 rounded-lg border border-[#253549] font-mono text-xs">
          <div>
            <span className="text-slate-450 block text-[9px] uppercase">Setores Ativos</span>
            <span className="font-bold text-slate-100">{pisos.length} Pavimentos</span>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-450 block text-[9px] uppercase">Lojas Alocadas</span>
            <span className="font-bold text-slate-100">{stores.length} Lojas</span>
          </div>
        </div>
      </div>

      {/* Floors List Segment */}
      <div className="space-y-4">
        {pisos.map((piso) => {
          const stats = floorStats[piso];
          const isExpanded = !!expandedPisos[piso];
          
          if (!stats) return null;

          return (
            <div 
              key={piso} 
              className="bg-[#1A2636] border border-[#253549] rounded-xl shadow-lg overflow-hidden transition-all"
            >
              {/* Collapsible Header row */}
              <div 
                onClick={() => toggleFloor(piso)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#1E2E41] transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 text-[#00C4A7] rounded-lg">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest">{piso}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">
                      Contém <span className="text-slate-200 font-semibold">{stats.totalStores}</span> lojas distribuídas
                    </p>
                  </div>
                </div>

                {/* Micro indicators right */}
                <div className="flex flex-wrap items-center gap-4 md:gap-7">
                  
                  {/* Indicators grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="text-left bg-[#0D161F] border border-slate-850 px-3 py-1 rounded">
                      <span className="text-[9px] text-slate-450 block uppercase">Pendentes</span>
                      <span className="text-sm font-bold text-[#F59E0B] flex items-center gap-1">
                        <BellRing className="w-3.5 h-3.5" />
                        {stats.activeNotifsCount}
                      </span>
                    </div>

                    <div className="text-left bg-[#0D161F] border border-slate-850 px-3 py-1 rounded">
                      <span className="text-[9px] text-slate-450 block uppercase">Vencidas</span>
                      <span className={`text-sm font-bold flex items-center gap-1 ${stats.overdueNotifsCount > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {stats.overdueNotifsCount}
                      </span>
                    </div>
                  </div>

                  {/* Filter trigger button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid expanding
                      onNavigateToNotificationsWithFilter(piso);
                    }}
                    className="bg-slate-800 hover:bg-[#00C4A7] hover:text-slate-900 border border-[#00C4A7]/20 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#00C4A7] flex items-center gap-1 transition-all duration-200"
                    title={`Filtrar listagem de notificações apenas para ${piso}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Filtrar Piso
                  </button>

                  {/* Collapse chevron icon */}
                  <div className="text-slate-400 p-1 rounded-full group-hover:bg-slate-800">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>

                </div>
              </div>

              {/* Collapsed Store Items Panel */}
              {isExpanded && (
                <div className="p-5 border-t border-[#253549] bg-[#121B26]/40">
                  <h4 className="text-[10px] text-slate-450 uppercase font-bold tracking-wider mb-3">Lojas do Pavimento e Estado Oprecacional</h4>
                  
                  {stats.storeStatsList.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      Não há nenhuma loja comercial cadastrada neste pavimento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {stats.storeStatsList.map(({ store, total, pendentes, resolvidas, vencidas, recorrente }) => (
                        <div 
                          key={store.id}
                          className={`bg-[#1A2636] border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                            !store.ativa ? 'border-dashed border-slate-800 opacity-60' : 'border-[#253549]'
                          }`}
                        >
                          {/* Store title */}
                          <div className="flex items-start justify-between">
                            <div className="truncate">
                              <h5 className="font-bold text-slate-100 text-xs truncate" title={store.nome}>
                                {store.nome}
                              </h5>
                              <span className="text-[10px] text-slate-450">{store.categoria}</span>
                            </div>
                            
                            {/* Alert bullet indicator */}
                            {vencidas > 0 ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-ping" title="Possui notificações expiradas!" />
                            ) : pendentes > 0 ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" title="Possui pendências em andamento" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" title="Sem pendências ativas" />
                            )}
                          </div>

                          {/* Stats matrix */}
                          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-850/60 mt-3 text-center text-[10px] font-mono">
                            <div className="p-1 bg-[#101923] rounded">
                              <span className="text-slate-500 block text-[8px] uppercase">Reg.</span>
                              <span className="font-bold text-slate-300">{total}</span>
                            </div>
                            <div className="p-1 bg-[#101923] rounded">
                              <span className="text-slate-500 block text-[8px] uppercase">Venc.</span>
                              <span className={`font-bold ${vencidas > 0 ? 'text-[#EF4444]' : 'text-slate-400'}`}>{vencidas}</span>
                            </div>
                            <div className="p-1 bg-[#101923] rounded">
                              <span className="text-slate-500 block text-[8px] uppercase">Resolv.</span>
                              <span className="font-bold text-[#22C55E]">{resolvidas}</span>
                            </div>
                          </div>

                          {/* Interactive options row */}
                          <div className="flex justify-between items-center mt-3 pt-2 text-[10px]">
                            {recorrente ? (
                              <span className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/35 rounded px-1.5 font-bold font-sans">
                                RECORRENTE
                              </span>
                            ) : (
                              <span className="text-slate-500 font-sans">Regularizado</span>
                            )}

                            <button
                              onClick={() => onViewStoreProfile(store.id)}
                              className="text-[#00C4A7] hover:underline flex items-center gap-0.5 font-semibold font-sans"
                            >
                              Ver Perfil
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
