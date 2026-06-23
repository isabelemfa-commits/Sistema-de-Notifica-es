import React from 'react';
import { GlobalSettings } from '../types';
import { 
  LayoutDashboard, 
  Bell, 
  Store, 
  Layers, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Users
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  userEmail?: string;
  settings?: GlobalSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  userEmail,
  settings
}) => {
  const isAdmin = userEmail === 'isabelemfa@gmail.com';

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'notifications', name: 'Notificações', icon: Bell },
    { id: 'stores', name: 'Gestão de lojas', icon: Store },
    { id: 'reports', name: 'Relatórios', icon: BarChart3 },
    ...(isAdmin ? [{ id: 'users', name: 'Usuários', icon: Users }] : []),
    { id: 'settings', name: 'Configurações', icon: Settings }
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#141E2B] border-r border-[#1E293B] text-slate-100 flex flex-col justify-between ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-3 overflow-hidden animate-fade-in">
            <img 
              src={settings?.logoBase64 || "/src/assets/images/logo_rio_poty_1782240302361.jpg"} 
              alt="Logo" 
              className={`${collapsed ? 'w-10 h-10' : 'h-10'} object-contain`}
              referrerPolicy="no-referrer"
            />
          </div>
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg bg-[#0F1923] hover:bg-[#1A2636] text-[#00C4A7] transition-all"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-0 py-4 space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 rounded-none text-sm font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-[#1A2636] border-r-4 border-[#00C4A7] text-[#00C4A7] font-semibold' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#1A2636]'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[#00C4A7]' : 'text-slate-400 group-hover:scale-110'}`} />
                {!collapsed && <span>{item.name}</span>}
                
                {/* Floating Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-16 hidden group-hover:block bg-[#0F1923] text-slate-100 text-xs px-3 py-2 rounded-md shadow-xl border border-slate-705 whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Profile info of Elegant Dark */}
      <div className="p-4 mt-auto">
        {!collapsed ? (
          <div className="p-4 bg-[#1A2636] rounded-xl border border-[#2D3748]">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-2 select-none">Logado como</p>
            <p className="text-xs font-semibold text-slate-100 truncate">{userEmail || 'Visitante'}</p>
            <p className="text-[10px] text-[#00C4A7] uppercase font-bold mt-1 tracking-wider">
              {isAdmin ? 'Proprietária' : 'Gestor de Operações'}
            </p>
          </div>
        ) : (
          <div className="flex justify-center text-[#00C4A7] py-2" title={`Logado como ${userEmail}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
        )}
      </div>
    </aside>
  );
};
