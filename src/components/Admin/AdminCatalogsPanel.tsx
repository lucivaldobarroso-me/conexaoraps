import React, { useEffect, useMemo, useState } from 'react';
import {
  listAdminCatalogOverview,
  updateAdminProfessionalCatalogItem,
  type AdminCatalogOverview
} from '../../services/apiAdmin';

const emptyCatalogs: AdminCatalogOverview = {
  tipos: [],
  subtipos: [],
  extras: [],
  profissionais: [],
  zonas: [],
  bairros: []
};

const AdminCatalogsPanel: React.FC = () => {
  const [catalogs, setCatalogs] = useState<AdminCatalogOverview>(emptyCatalogs);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [professionalDrafts, setProfessionalDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const loadCatalogs = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const data = await listAdminCatalogOverview();
      setCatalogs(data);
      setProfessionalDrafts(Object.fromEntries(data.profissionais.map((item) => [item.id, item.valor])));
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel carregar catalogos.';
      setMessage({
        type: 'error',
        text: `${text} Verifique as policies de leitura dos catalogos no Supabase.`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalogs();
  }, []);

  const tiposPorId = useMemo(
    () => Object.fromEntries(catalogs.tipos.map((tipo) => [tipo.id, tipo])),
    [catalogs.tipos]
  );

  const subtiposPorId = useMemo(
    () => Object.fromEntries(catalogs.subtipos.map((subtipo) => [subtipo.id, subtipo])),
    [catalogs.subtipos]
  );

  const profissionaisPorTipo = useMemo(() => {
    return catalogs.profissionais.reduce((acc, item) => {
      if (!acc[item.tipo]) acc[item.tipo] = [];
      acc[item.tipo].push(item);
      return acc;
    }, {} as Record<string, typeof catalogs.profissionais>);
  }, [catalogs.profissionais]);

  const bairrosPorZona = useMemo(() => {
    return catalogs.bairros.reduce((acc, bairro) => {
      if (!acc[bairro.zonaId]) acc[bairro.zonaId] = [];
      acc[bairro.zonaId].push(bairro);
      return acc;
    }, {} as Record<string, typeof catalogs.bairros>);
  }, [catalogs.bairros]);

  const saveProfessionalItem = async (id: string) => {
    const currentItem = catalogs.profissionais.find((item) => item.id === id);
    const draftValue = professionalDrafts[id] ?? '';

    if (!currentItem || draftValue.trim() === currentItem.valor) return;

    setSavingId(id);
    setMessage(null);

    try {
      await updateAdminProfessionalCatalogItem(id, { valor: draftValue });
      await loadCatalogs();
      setMessage({ type: 'success', text: 'Item profissional atualizado com sucesso.' });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel atualizar o item.';
      setMessage({ type: 'error', text });
    } finally {
      setSavingId(null);
    }
  };

  const toggleProfessionalItem = async (id: string, active: boolean) => {
    setSavingId(id);
    setMessage(null);

    try {
      await updateAdminProfessionalCatalogItem(id, { ativo: !active });
      await loadCatalogs();
      setMessage({ type: 'success', text: active ? 'Item inativado com sucesso.' : 'Item ativado com sucesso.' });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel alterar o status do item.';
      setMessage({ type: 'error', text });
    } finally {
      setSavingId(null);
    }
  };

  const inactiveCount =
    catalogs.tipos.filter((item) => !item.ativo).length +
    catalogs.subtipos.filter((item) => !item.ativo).length +
    catalogs.extras.filter((item) => !item.ativo).length +
    catalogs.profissionais.filter((item) => !item.ativo).length +
    catalogs.zonas.filter((item) => !item.ativo).length +
    catalogs.bairros.filter((item) => !item.ativo).length;

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200/70 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase text-[#003f81]">Catalogos do formulario</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              Edicao controlada dos dados profissionais. Classificacao e territorio continuam em consulta para proteger o formulario principal.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600">
              {inactiveCount} inativos
            </span>
            <button
              type="button"
              onClick={() => void loadCatalogs()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Atualizar catalogos
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mx-5 mt-4 rounded-2xl border p-3 text-sm font-semibold ${
          message.type === 'success'
            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
            : 'border-red-100 bg-red-50 text-red-700'
        }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-8 text-center text-sm font-bold text-slate-400">Carregando catalogos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-3">
          <CatalogCard
            icon="psychology"
            title="Classificacao psiquiatrica"
            subtitle={`${catalogs.tipos.length} tipos, ${catalogs.subtipos.length} subtipos, ${catalogs.extras.length} campos extras`}
          >
            <div className="space-y-3">
              {catalogs.subtipos.slice(0, 8).map((subtipo) => {
                const tipo = tiposPorId[subtipo.tipoId];
                const extras = catalogs.extras.filter((extra) => extra.subtipoId === subtipo.id);

                return (
                  <div key={subtipo.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-800">{subtipo.nome}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase text-slate-400">{tipo?.nome || 'Sem tipo'}</div>
                      </div>
                      <StatusPill active={subtipo.ativo} />
                    </div>
                    {extras.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {extras.slice(0, 3).map((extra) => (
                          <span key={extra.id} className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">
                            {extra.rotulo}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CatalogCard>

          <CatalogCard
            icon="badge"
            title="Dados profissionais"
            subtitle={`${catalogs.profissionais.length} itens cadastrados`}
          >
            <div className="space-y-3">
              {Object.entries(profissionaisPorTipo).slice(0, 7).map(([tipo, itens]) => (
                <div key={tipo} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-black uppercase text-slate-800">{tipo.replace(/_/g, ' ')}</div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{itens.length}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {itens.map((item) => {
                      const draftValue = professionalDrafts[item.id] ?? item.valor;
                      const isSaving = savingId === item.id;
                      const hasChanges = draftValue.trim() !== item.valor;

                      return (
                        <div key={item.id} className="rounded-xl border border-white bg-white p-2">
                          <div className="flex items-center justify-between gap-2">
                            <StatusPill active={item.ativo} />
                            <button
                              type="button"
                              onClick={() => void toggleProfessionalItem(item.id, item.ativo)}
                              disabled={isSaving}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black uppercase text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {item.ativo ? 'Inativar' : 'Ativar'}
                            </button>
                          </div>

                          <label className="mt-2 block">
                            <span className="sr-only">Valor do item profissional</span>
                            <input
                              value={draftValue}
                              onChange={(event) =>
                                setProfessionalDrafts((current) => ({
                                  ...current,
                                  [item.id]: event.target.value
                                }))
                              }
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-[#003f81] focus:bg-white focus:ring-2 focus:ring-[#003f81]/10"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => void saveProfessionalItem(item.id)}
                            disabled={isSaving || !hasChanges}
                            className="mt-2 w-full rounded-lg bg-[#003f81] px-3 py-2 text-[10px] font-black uppercase text-white transition hover:bg-[#002f61] disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {isSaving ? 'Salvando...' : 'Salvar item'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CatalogCard>

          <CatalogCard
            icon="location_on"
            title="Territorio"
            subtitle={`${catalogs.zonas.length} zonas, ${catalogs.bairros.length} bairros`}
          >
            <div className="space-y-3">
              {catalogs.zonas.map((zona) => {
                const bairros = bairrosPorZona[zona.id] ?? [];

                return (
                  <div key={zona.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-800">{zona.nome}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase text-slate-400">{bairros.length} bairros</div>
                      </div>
                      <StatusPill active={zona.ativo} />
                    </div>
                    <div className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      {bairros.slice(0, 5).map((bairro) => bairro.nome).join(' | ') || 'Sem bairros vinculados'}
                    </div>
                  </div>
                );
              })}
            </div>
          </CatalogCard>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 xl:col-span-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <span className="material-symbols-outlined text-amber-600">info</span>
              <p className="leading-relaxed">
                Nesta etapa, apenas dados profissionais podem ser editados. Classificacao e territorio continuam protegidos para evitar quebrar registros historicos e regras do formulario.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const CatalogCard: React.FC<{ icon: string; title: string; subtitle: string; children: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  children
}) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#003f81]/10 text-[#003f81]">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <h3 className="font-black text-[#003f81]">{title}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
      </div>
    </div>
    {children}
  </article>
);

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${
    active
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-slate-100 text-slate-500'
  }`}
  >
    {active ? 'ativo' : 'inativo'}
  </span>
);

export default AdminCatalogsPanel;
