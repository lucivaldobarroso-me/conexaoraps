import React from 'react';
import AdminAttendancesPanel from './AdminAttendancesPanel';
import AdminAuditPanel from './AdminAuditPanel';
import Sidebar from '../Dashboard/Sidebar';
import AdminCatalogsPanel from './AdminCatalogsPanel';
import AdminUsersPanel from './AdminUsersPanel';

const adminSections = [
  {
    icon: 'manage_accounts',
    title: 'Usuarios',
    description: 'Aprovar cadastros, bloquear acessos e ajustar permissoes por modulo.',
    status: 'Primeira area a implementar'
  },
  {
    icon: 'dynamic_form',
    title: 'Formulario',
    description: 'Organizar tipos, subtipos, campos extras e regras usadas na insercao.',
    status: 'Planejado'
  },
  {
    icon: 'clinical_notes',
    title: 'Atendimentos',
    description: 'Consultar registros, corrigir informacoes e preparar inativacao controlada.',
    status: 'Consulta criada'
  },
  {
    icon: 'map',
    title: 'Territorio',
    description: 'Manter zonas e bairros usados no mapa, filtros e formulario.',
    status: 'Planejado'
  },
  {
    icon: 'inventory_2',
    title: 'Catalogos',
    description: 'Editar encaminhamentos, VTR, profissionais e listas operacionais.',
    status: 'Planejado'
  },
  {
    icon: 'history',
    title: 'Auditoria',
    description: 'Registrar alteracoes administrativas antes de liberar acoes sensiveis.',
    status: 'Base criada'
  }
];

const AdminDashboard: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef2f7_100%)] font-display">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,_#0f2f57_0%,_#0f4c81_58%,_#0f766e_100%)] px-5 py-6 text-white shadow-[0_22px_50px_-28px_rgba(15,76,129,0.65)] md:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100">
                  Modulo administrador
                </div>
                <h1 className="max-w-3xl text-2xl font-bold leading-tight md:text-4xl">
                  Centro de controle para usuarios, formularios, catalogos e registros.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100/90">
                  Esta primeira versao cria a base segura do modulo. As acoes de editar e excluir entram por partes, com validacao e auditoria para nao afetar o que ja funciona.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Status</div>
                <div className="mt-1 text-2xl font-bold">Base criada</div>
                <div className="text-xs text-blue-100/80">Sem acoes destrutivas nesta etapa</div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {adminSections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003f81]/10 text-[#003f81]">
                    <span className="material-symbols-outlined text-[28px]">{section.icon}</span>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {section.status}
                  </span>
                </div>

                <h2 className="text-lg font-black text-[#003f81]">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{section.description}</p>
              </article>
            ))}
          </section>

          <AdminUsersPanel />

          <AdminCatalogsPanel />

          <AdminAttendancesPanel />

          <AdminAuditPanel />

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <span className="material-symbols-outlined text-amber-600">shield_lock</span>
              <div>
                <h2 className="font-black">Regra de seguranca desta fase</h2>
                <p className="mt-1 text-sm leading-relaxed">
                  O modulo foi ligado somente para usuarios com permissao de administrador. Antes de liberar edicao e exclusao, o proximo passo e criar funcoes e policies no Supabase para garantir que apenas administradores executem essas acoes no banco.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
