import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { User } from '../../types';
import { rotuloModuloAcesso, temPermissao } from '../../utils/permissoesAcesso';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<(User & { nome?: string }) | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const info = localStorage.getItem('user_info');
    if (info) {
      const parsed = JSON.parse(info);
      setUser({
        ...parsed,
        nome: parsed.nomeCompleto,
        modulo: parsed.modulo,
        funcao: parsed.funcao
      });
    }
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const hasAccess = !!user;

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#003f81] text-white shadow-xl shadow-blue-900/20 md:hidden"
      >
        <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
      </button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed md:relative z-40 flex h-full flex-col overflow-hidden border-r border-slate-200/80 bg-white text-slate-800 shadow-2xl shadow-slate-900/10 transition-all duration-300
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-24' : 'md:w-72'}`}
      >
        <div className="pointer-events-none absolute left-[-7rem] top-[-8rem] h-72 w-72 rounded-full bg-[#9cefde]/45 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-9rem] right-[-8rem] h-80 w-80 rounded-full bg-blue-100 blur-3xl" />

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-3 top-6 z-30 hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#003f81] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:flex"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <span
            className="material-symbols-outlined text-[20px] transition-transform"
            style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            chevron_left
          </span>
        </button>

        <div className="relative z-10 flex h-28 items-center gap-3 px-6">
          <div className="flex h-12 min-w-[48px] items-center justify-center rounded-2xl bg-[#003f81] text-white shadow-xl shadow-blue-900/20">
            <span className="material-symbols-outlined text-[28px]">hub</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black leading-none tracking-tight text-[#003f81]">CONEXÃO RAPS</h1>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Gestão territorial</p>
            </div>
          )}
        </div>

        <nav className="relative z-10 flex-1 space-y-2 px-4">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Menu principal</div>
          )}

          {hasAccess && (
            <>
              {temPermissao(user, 'analitico') && (
                <SidebarButton
                  active={isActive('/dashboard')}
                  collapsed={isCollapsed}
                  icon="dashboard"
                  label="Módulo Analítico"
                  onClick={() => handleNavigate('/dashboard')}
                />
              )}

              {temPermissao(user, 'insercao') && (
                <SidebarButton
                  active={isActive('/insertion')}
                  collapsed={isCollapsed}
                  icon="post_add"
                  label="Nova Inserção"
                  onClick={() => handleNavigate('/insertion')}
                />
              )}
            </>
          )}
        </nav>

        <div className="relative z-10 space-y-4 border-t border-slate-200/80 bg-slate-50/80 p-4">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex h-11 min-w-[44px] items-center justify-center rounded-2xl bg-[#003f81]/10 text-sm font-black text-[#003f81]">
              {user?.nome ? user.nome.charAt(0) : 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-800" title={user?.nome || 'Usuário'}>
                  {user?.nome || 'Usuário Logado'}
                </p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {rotuloModuloAcesso(user?.modulo)} · {user?.funcao || 'Acesso'}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              await api.logout();
              navigate('/');
            }}
            title={isCollapsed ? 'Sair' : ''}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left font-black text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100"
          >
            <span className="material-symbols-outlined min-w-[24px]">logout</span>
            {!isCollapsed && <span className="whitespace-nowrap text-sm">Sair do Sistema</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

type SidebarButtonProps = {
  active: boolean;
  collapsed: boolean;
  icon: string;
  label: string;
  onClick: () => void;
};

const SidebarButton: React.FC<SidebarButtonProps> = ({ active, collapsed, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={collapsed ? label : ''}
    className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
      active
        ? 'bg-[#003f81] text-white shadow-xl shadow-blue-900/20'
        : 'text-slate-500 hover:-translate-y-0.5 hover:bg-[#003f81]/10 hover:text-[#003f81]'
    } ${collapsed ? 'justify-center' : ''}`}
  >
    <span className="material-symbols-outlined min-w-[24px] text-[24px]">{icon}</span>
    {!collapsed && <span className="whitespace-nowrap text-sm font-black">{label}</span>}
  </button>
);

export default Sidebar;
