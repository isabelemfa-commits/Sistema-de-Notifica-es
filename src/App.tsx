import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { DatabaseState, Store, Notification, NotificationHistory } from './types';
import { loadDatabase, saveDatabase, getNotificationDisplayStatus } from './mockData';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DashboardView } from './components/DashboardView';
import { NotificationsView } from './components/NotificationsView';
import { StoresView } from './components/StoresView';
import { FloorsView } from './components/FloorsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { UserManagementView } from './components/UserManagementView';
import { LoginView } from './components/Auth/LoginView';

import { 
  Building2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  User, 
  Menu,
  Eye,
  AlertCircle,
  XCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  Loader2
} from 'lucide-react';
import { 
  fetchFullDatabaseFromFirestore, 
  migrateLocalDataToFirestore, 
  saveStoreToFirestore, 
  deleteStoreFromFirestore, 
  saveNotificationToFirestore, 
  deleteNotificationFromFirestore,
  fetchUserProfile
} from './firebase';

export default function App() {
  // 0. Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // 1. Database State & Persistence synchronizer
  const [dbState, setDbState] = useState<DatabaseState>(() => loadDatabase());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCloudActive, setIsCloudActive] = useState<boolean>(false);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsUnauthorized(false);
      
      if (currentUser && currentUser.email) {
        setAuthLoading(true);
        const profile = await fetchUserProfile(currentUser.email);
        
        // Master admin bypass
        const isMaster = currentUser.email === "isabelemfa@gmail.com";
        
        if (profile || isMaster) {
          setUserProfile(profile || { email: currentUser.email, role: 'owner', name: currentUser.displayName });
          // If master, force role to owner in local state even if DB says otherwise
          if (isMaster) {
            setUserProfile((prev: any) => ({ ...prev, role: 'owner' }));
          }
        } else {
          setIsUnauthorized(true);
        }
      } else {
        setUserProfile(null);
      }
      
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initial Sync with Firestore cloud
  useEffect(() => {
    // Only sync if user is authenticated and authorized
    if (!user || (!userProfile && user.email !== "isabelemfa@gmail.com")) {
      setIsCloudActive(false);
      return;
    }

    async function initFirestoreSync() {
      setIsSyncing(true);
      try {
        console.log("Iniciando carregamento do Firestore Cloud...");
        const cloudData = await fetchFullDatabaseFromFirestore();
        
        if (cloudData.stores.length > 0) {
          setDbState(prev => ({
            ...prev,
            stores: cloudData.stores,
            notifications: cloudData.notifications
          }));
          setIsCloudActive(true);
          addToast('success', 'Nuvem Firestore Ativa', `Sincronizado! Carregados ${cloudData.stores.length} lojas e ${cloudData.notifications.length} comunicados operacionais em tempo real.`);
        }
      } catch (error) {
        console.warn("Firestore sync not available, using offline local storage.", error);
        setIsCloudActive(false);
      } finally {
        setIsSyncing(false);
      }
    }
    initFirestoreSync();
  }, [user]);

  // Sync to local fallback mirror
  useEffect(() => {
    saveDatabase(dbState);
  }, [dbState]);

  // 2. Active Tab Router Engine
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // 3. Toasts Stack State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    const newToast: ToastMessage = {
      id: String(Date.now() + Math.random()),
      type,
      title,
      message
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 4. Shared cross-navigation signals
  const [outerNotificationFilters, setOuterNotificationFilters] = useState<{ alertOnly?: boolean } | undefined>(undefined);
  const [targetPisoFilter, setTargetPisoFilter] = useState<string | null>(null);
  const [initialStoreProfileId, setInitialStoreProfileId] = useState<string | null>(null);

  // External notification details drawer helper state
  const [focusedNotification, setFocusedNotification] = useState<Notification | null>(null);
  const [isFocusedNotifOpen, setIsFocusedNotifOpen] = useState<boolean>(false);

  // Current system local date string
  const now = useMemo(() => new Date(), []);
  const nowStr = now.toISOString();

  // 5. Database handlers
  const handleAddStore = (newStore: Omit<Store, 'id'>) => {
    const id = `store-${Date.now()}`;
    const storeRecord: Store = {
      ...newStore,
      id
    };
    setDbState(prev => ({
      ...prev,
      stores: [storeRecord, ...prev.stores]
    }));

    if (isCloudActive) {
      saveStoreToFirestore(storeRecord)
        .then(() => addToast('success', 'Nuvem', `Loja "${storeRecord.nome}" criada na nuvem!`))
        .catch(err => {
          console.error("Erro ao salvar loja no Firestore:", err);
          addToast('error', 'Sincronização', 'Erro ao salvar loja no Firestore.');
        });
    }
  };

  const handleUpdateStore = (updatedStore: Store) => {
    setDbState(prev => ({
      ...prev,
      stores: prev.stores.map(s => s.id === updatedStore.id ? updatedStore : s)
    }));

    if (isCloudActive) {
      saveStoreToFirestore(updatedStore)
        .then(() => addToast('success', 'Nuvem', `Loja "${updatedStore.nome}" atualizada na nuvem!`))
        .catch(err => {
          console.error("Erro ao atualizar loja no Firestore:", err);
          addToast('error', 'Sincronização', 'Erro ao atualizar dados na nuvem.');
        });
    }
  };

  const handleDeleteStore = (storeId: string) => {
    setDbState(prev => ({
      ...prev,
      stores: prev.stores.filter(s => s.id !== storeId),
      notifications: prev.notifications.filter(n => n.lojaId !== storeId)
    }));

    if (isCloudActive) {
      deleteStoreFromFirestore(storeId)
        .then(() => addToast('success', 'Nuvem', 'Loja removida da nuvem.'))
        .catch(err => {
          console.error("Erro ao remover loja do Firestore:", err);
          addToast('error', 'Sincronização', 'Erro ao excluir loja na nuvem.');
        });

      // Remove dependent notifications too
      dbState.notifications.filter(n => n.lojaId === storeId).forEach(n => {
        deleteNotificationFromFirestore(n.id).catch(console.error);
      });
    }
  };

  const handleAddNotification = (newNotif: Omit<Notification, 'id' | 'historico'> & { historico?: NotificationHistory[] }) => {
    const id = `notif-${Date.now()}`;
    const defaultHistory: NotificationHistory = {
      data: new Date().toISOString(),
      descricao: "Notificação criada no Sistema de Notificações de loja",
      autor: newNotif.criadoPor || "Sistema"
    };

    const record: Notification = {
      ...newNotif,
      id,
      historico: newNotif.historico || [defaultHistory]
    };

    setDbState(prev => ({
      ...prev,
      notifications: [record, ...prev.notifications]
    }));

    if (isCloudActive) {
      saveNotificationToFirestore(record)
        .then(() => addToast('success', 'Nuvem', `Notificação enviada e salva em nuvem!`))
        .catch(err => {
          console.error("Erro ao salvar notificação no Firestore:", err);
          addToast('error', 'Sincronização', 'Erro ao salvar notificação na nuvem.');
        });
    }
  };

  const handleUpdateNotification = (updatedNotif: Notification) => {
    setDbState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === updatedNotif.id ? updatedNotif : n)
    }));

    // If we updated the notification currently rendered in focused dossier, sync it
    if (focusedNotification && focusedNotification.id === updatedNotif.id) {
      setFocusedNotification(updatedNotif);
    }

    if (isCloudActive) {
      saveNotificationToFirestore(updatedNotif)
        .then(() => addToast('success', 'Nuvem', 'Mudança salva na nuvem com sucesso.'))
        .catch(err => {
          console.error("Erro ao atualizar notificação no Firestore:", err);
          addToast('error', 'Sincronização', 'Erro ao sincronizar modificação de comunicado.');
        });
    }
  };

  const handleDeleteNotification = (id: string) => {
    setDbState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
    if (focusedNotification && focusedNotification.id === id) {
      setIsFocusedNotifOpen(false);
    }

    if (isCloudActive) {
      deleteNotificationFromFirestore(id)
        .then(() => addToast('success', 'Nuvem', 'Comunicado removido da nuvem.'))
        .catch(err => {
          console.error("Erro ao salvar exclusão no Firestore:", err);
          addToast('error', 'Sincronização', 'Erro ao excluir comunicado da nuvem.');
        });
    }
  };

  const handleUpdateFullDatabase = (nextState: DatabaseState) => {
    setDbState(nextState);

    if (isCloudActive) {
      addToast('info', 'Sincronizando', 'Sincronizando alterações massivas no banco de dados da nuvem...');
      migrateLocalDataToFirestore(nextState)
        .then(() => addToast('success', 'Nuvem', 'Banco de dados inteiro re-sincronizado na nuvem!'))
        .catch(err => {
          console.error("Erro na migração total:", err);
          addToast('error', 'Erro', 'Erro ao re-sincronizar banco de dados inteiro.');
        });
    }
  };

  // Cross-Navigation routing triggers
  const handleNavigateToNotifications = (tabName: string, filters?: any) => {
    setOuterNotificationFilters(filters);
    setActiveTab(tabName);
  };

  const handleNavigateToFloorNotifications = (pisoName: string) => {
    setTargetPisoFilter(pisoName);
    setActiveTab('notifications');
  };

  const handleNavigateToStoreProfile = (storeId: string) => {
    setInitialStoreProfileId(storeId);
    setActiveTab('stores');
  };

  const handleViewGlobalNotificationDetail = (notif: Notification) => {
    setFocusedNotification(notif);
    setIsFocusedNotifOpen(true);
  };

  // Active notifications count
  const activeCountTotal = useMemo(() => {
    return dbState.notifications.filter(n => {
      const status = getNotificationDisplayStatus(n, nowStr);
      return status === 'Pendente' || status === 'Em Andamento' || status === 'Vencida';
    }).length;
  }, [dbState.notifications, nowStr]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setDbState(loadDatabase()); // Reset state on logout
      addToast('info', 'Desconectado', 'Você saiu da sua conta com sucesso.');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1923] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#00C4A7] animate-spin" />
          <p className="text-slate-400 text-sm animate-pulse">Autenticando Rio Poty...</p>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  if (!user || isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#0F1923]">
        <LoginView 
          unauthorizedEmail={isUnauthorized ? user?.email || undefined : undefined} 
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1923] flex font-sans">
      
      {/* Sidebar fixed panel */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Auto clear outer filter signals upon navigation clicks
          if (tab !== 'notifications') {
            setOuterNotificationFilters(undefined);
            setTargetPisoFilter(null);
          }
          if (tab !== 'stores') {
            setInitialStoreProfileId(null);
          }
        }} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed}
        userEmail={user?.email || undefined}
      />

      {/* Main Container Right */}
      <div 
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'pl-20' : 'pl-20 md:pl-64'
        }`}
      >
        {/* Header Top Nav */}
        <header className="h-16 shrink-0 bg-[#0F1923] border-b border-[#1E293B] flex items-center justify-between px-6 z-30 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden p-1.5 rounded bg-[#0F1923] text-slate-300 hover:text-[#00C4A7]"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <img src="/src/assets/images/logo_rio_poty_1782240302361.jpg" alt="Rio Poty Logo" className="h-8 object-contain" />
              <h1 className="text-xs font-normal tracking-wide text-slate-400 hidden sm:block">
                Gestão de Lojistas
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {/* Cloud connection active state indicator */}
            <div className={`flex items-center gap-2 bg-[#1A2636] border px-3 py-1.5 rounded-lg text-slate-300 transition-all duration-300 ${
              isCloudActive ? 'border-[#00C4A7]/30 shadow-[0_0_10px_rgba(0,196,167,0.05)]' : 'border-slate-800'
            }`}>
              {isSyncing ? (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#00C4A7]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-[#00C4A7]" />
                  <span>Sincronizando...</span>
                </div>
              ) : isCloudActive ? (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200">
                  <Cloud className="w-3.5 h-3.5 text-[#00C4A7] shrink-0 fill-[#00C4A7]/10" />
                  <span className="hidden sm:inline">Nuvem Firestore:</span>
                  <span className="text-[#00C4A7] font-bold">Ativa</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C4A7] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C4A7]"></span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-450">
                  <CloudOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Modo Local (Offline)</span>
                </div>
              )}
            </div>

            {/* Active alerts quick indicator pill */}
            {activeCountTotal > 0 && (
              <div 
                onClick={() => handleNavigateToNotifications('notifications', { alertOnly: true })}
                className="bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 cursor-pointer animate-pulse transition-all"
                title={`${activeCountTotal} notificações ativas não resolvidas. Clique para ver.`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{activeCountTotal} Pendências Ativas</span>
              </div>
            )}

            {/* User Profile */}
            <div className="hidden lg:flex items-center gap-3 bg-[#0F1923] border border-slate-800 py-1 pl-3 pr-1 rounded-xl group transition-all hover:border-slate-700">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#00C4A7] uppercase tracking-wider">{userProfile?.name || user?.displayName || 'Gestor'}</span>
                <span className="text-[9px] text-slate-500 font-mono truncate max-w-[120px]">{user?.email}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#00C4A7]/10 flex items-center justify-center text-[#00C4A7] border border-[#00C4A7]/20">
                <User className="w-4 h-4" />
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content canvas viewport wrapper */}
        <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto pb-24">
          
          {/* Active Router Tab Selector */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              stores={dbState.stores}
              notifications={dbState.notifications}
              onNavigateToTab={handleNavigateToNotifications}
              onViewNotificationDetail={handleViewGlobalNotificationDetail}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView 
              stores={dbState.stores}
              notifications={dbState.notifications}
              pisos={dbState.pisos}
              tiposNotificacao={dbState.tiposNotificacao}
              initialFilters={outerNotificationFilters}
              onAddNotification={handleAddNotification}
              onUpdateNotification={handleUpdateNotification}
              onDeleteNotification={handleDeleteNotification}
              onTriggerToast={addToast}
            />
          )}

          {activeTab === 'stores' && (
            <StoresView 
              stores={dbState.stores}
              notifications={dbState.notifications}
              pisos={dbState.pisos}
              initialStoreProfileId={initialStoreProfileId}
              onClearInitialStoreProfileId={() => setInitialStoreProfileId(null)}
              onNavigateToTab={handleNavigateToNotifications}
              onAddStore={handleAddStore}
              onUpdateStore={handleUpdateStore}
              onDeleteStore={handleDeleteStore}
              onViewNotificationDetail={handleViewGlobalNotificationDetail}
              onTriggerToast={addToast}
            />
          )}

          {activeTab === 'floors' && (
            <FloorsView 
              stores={dbState.stores}
              notifications={dbState.notifications}
              pisos={dbState.pisos}
              onNavigateToNotificationsWithFilter={handleNavigateToFloorNotifications}
              onViewStoreProfile={handleNavigateToStoreProfile}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView 
              stores={dbState.stores}
              notifications={dbState.notifications}
              pisos={dbState.pisos}
              onTriggerToast={addToast}
            />
          )}

          {activeTab === 'users' && user?.email === 'isabelemfa@gmail.com' && (
            <UserManagementView adminEmail={user.email} />
          )}

          {activeTab === 'settings' && (
            <SettingsView 
              dbState={dbState}
              onUpdateFullDatabase={handleUpdateFullDatabase}
              onTriggerToast={addToast}
            />
          )}

        </main>
      </div>

      {/* GLOBAL NOTIFICATION DOSSIER DRILLDOWN MODAL */}
      {isFocusedNotifOpen && focusedNotification && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A2636] border border-[#253549] max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-[#151F2D] border-b border-[#253549] flex items-center justify-between">
              <div>
                <span className="bg-[#0F1923] text-slate-400 text-[10px] font-mono border border-slate-800 px-2 py-0.5 rounded">
                  Dossiê ID: {focusedNotification.id}
                </span>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mt-1">Inspeção Detalhada de Ocorrência</h3>
              </div>
              <button 
                onClick={() => setIsFocusedNotifOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-50 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#0F1923] p-3 rounded-lg border border-slate-800">
                <span className="text-[9px] text-[#00C4A7] font-bold block uppercase">Estabelecimento Comercial</span>
                <span className="text-base font-bold text-slate-100 block mt-0.5">
                  {dbState.stores.find(s => s.id === focusedNotification.lojaId)?.nome || focusedNotification.lojaId}
                </span>
                <span className="text-slate-400 block text-[11px] mt-0.5">
                  Localização: {dbState.stores.find(s => s.id === focusedNotification.lojaId)?.piso || 'N/A'}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">Infração / Comunicado</span>
                  <p className="font-bold text-slate-200 text-sm">[{focusedNotification.tipo}] {focusedNotification.titulo}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block">Descrição técnica da queixa</span>
                  <div className="p-3 bg-slate-900 rounded border border-slate-850 text-slate-300 break-words font-sans whitespace-pre-line leading-relaxed">
                    {focusedNotification.descricao}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3">
                <div>
                  <span className="text-[9px] text-slate-450 block uppercase">Postado em</span>
                  <span className="font-mono text-slate-300 font-bold">{new Date(focusedNotification.dataEnvio).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-450 block uppercase">Prazo Final</span>
                  <span className="font-mono text-[#F59E0B] font-bold">{new Date(focusedNotification.dataVencimento).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {focusedNotification.dataResolucao && (
                <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] p-2 rounded flex justify-between font-mono">
                  <span>Resolvida em:</span>
                  <span className="font-bold">{new Date(focusedNotification.dataResolucao).toLocaleDateString('pt-BR')}</span>
                </div>
              )}

              <div className="p-3 bg-[#0F1923] rounded border border-slate-850">
                <span className="text-[9px] text-slate-450 block uppercase mb-1">Evidências e Observações</span>
                <p className="text-slate-300 italic">Protocolo: {focusedNotification.evidenciaEntrega}</p>
                {focusedNotification.observacoes && (
                  <p className="text-slate-400 font-sans mt-2 text-[11px] whitespace-pre-wrap">Anotação: {focusedNotification.observacoes}</p>
                )}
              </div>

              {/* Log History list */}
              <div className="space-y-2 pt-2 border-t border-slate-800/70">
                <span className="text-[9px] text-slate-450 uppercase font-bold block">Histórico de Auditoria Imutável (Procedimentos)</span>
                <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                  {focusedNotification.historico && focusedNotification.historico.map((h, index) => (
                    <div key={index} className="bg-slate-900 p-1.5 rounded text-[10px] text-slate-400">
                      <span className="text-slate-600 font-mono text-[9px] mr-1">[{new Date(h.data).toLocaleDateString('pt-BR')}]:</span>
                      <span>{h.descricao} (Autor: {h.autor})</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="bg-[#151F2D] p-4 border-t border-[#253549] flex justify-end">
              <button 
                onClick={() => setIsFocusedNotifOpen(false)}
                className="bg-slate-805 hover:bg-slate-800 text-slate-300 px-5 py-2 rounded text-xs"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Container overlay absolute */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

    </div>
  );
}
