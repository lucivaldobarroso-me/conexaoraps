import React, { useEffect, useMemo, useState } from 'react';
import { listAdminUsers, updateAdminUserAccess, type AdminUserRecord } from '../../services/apiAdmin';
import { type ModuloAcessoCodigo, rotuloModuloAcesso } from '../../utils/permissoesAcesso';

const moduloOptions: ModuloAcessoCodigo[] = ['ADMINISTRADOR', 'INSERCAO', 'ANALITICO', 'INSERCAO_ANALITICO'];

const statusStyles: Record<string, string> = {
  aprovado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pendente: 'border-amber-200 bg-amber-50 text-amber-700',
  reprovado: 'border-red-200 bg-red-50 text-red-700'
};

const AdminUsersPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [filter, setFilter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Pick<AdminUserRecord, 'usuario' | 'nomeCompleto' | 'matricula' | 'funcao'>>>({});
  const [currentUserId, setCurrentUserId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const rows = await listAdminUsers();
      setUsers(rows);
      setDrafts((currentDrafts) => {
        const nextDrafts: typeof currentDrafts = {};

        rows.forEach((user) => {
          nextDrafts[user.id] = currentDrafts[user.id] ?? {
            usuario: user.usuario,
            nomeCompleto: user.nomeCompleto,
            matricula: user.matricula,
            funcao: user.funcao
          };
        });

        return nextDrafts;
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel carregar usuarios.';
      setMessage({
        type: 'error',
        text: `${text} Verifique se as policies administrativas foram aplicadas no Supabase.`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user_info') || '{}');
      setCurrentUserId(String(storedUser?.id ?? ''));
    } catch {
      setCurrentUserId('');
    }

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = filter.trim().toUpperCase();
    if (!term) return users;

    return users.filter((user) =>
      [user.nomeCompleto, user.usuario, user.emailAuth, user.matricula, user.funcao, user.modulo, user.statusAprovacao]
        .join(' ')
        .toUpperCase()
        .includes(term)
    );
  }, [filter, users]);

  const updateUser = async (user: AdminUserRecord, changes: Parameters<typeof updateAdminUserAccess>[1], successText: string) => {
    setSavingId(user.id);
    setMessage(null);

    try {
      await updateAdminUserAccess(user.id, changes);
      setMessage({ type: 'success', text: successText });
      await loadUsers();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel atualizar o usuario.';
      setMessage({ type: 'error', text });
    } finally {
      setSavingId('');
    }
  };

  const updateDraft = (userId: string, field: keyof Pick<AdminUserRecord, 'usuario' | 'nomeCompleto' | 'matricula' | 'funcao'>, value: string) => {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        ...currentDrafts[userId],
        [field]: value
      }
    }));
  };

  const saveUserRegistration = async (user: AdminUserRecord) => {
    const draft = drafts[user.id];
    if (!draft) return;

    if (!draft.usuario.trim() || !draft.nomeCompleto.trim()) {
      setMessage({ type: 'error', text: 'Usuario e nome completo sao obrigatorios.' });
      return;
    }

    await updateUser(
      user,
      {
        usuario: draft.usuario,
        nomeCompleto: draft.nomeCompleto,
        matricula: draft.matricula,
        funcao: draft.funcao
      },
      'Dados cadastrais atualizados.'
    );
  };

  const pendingCount = users.filter((user) => user.statusAprovacao !== 'aprovado' || !user.ativo).length;

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200/70 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase text-[#003f81]">Gestao de usuarios</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              Edite dados cadastrais, aprove cadastros, bloqueie acessos e ajuste o modulo de permissao. Exclusao definitiva ainda nao foi habilitada.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
              {pendingCount} pendentes/bloqueados
            </span>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Atualizar lista
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200/70 px-5 py-4">
        <div className="flex max-w-md items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-[#003f81]/15">
          <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
          <input
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Buscar usuario, email, funcao..."
            className="ml-2 w-full border-none bg-transparent text-sm text-slate-700 focus:ring-0"
          />
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Usuario</th>
              <th className="px-5 py-3">Contato</th>
              <th className="px-5 py-3">Funcao</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Modulo</th>
              <th className="px-5 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center font-bold text-slate-400">
                  Carregando usuarios...
                </td>
              </tr>
            )}

            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center font-bold text-slate-400">
                  Nenhum usuario encontrado.
                </td>
              </tr>
            )}

            {!loading && filteredUsers.map((user) => {
              const isSaving = savingId === user.id;
              const isCurrentUser = currentUserId === user.id;
              const statusClass = statusStyles[user.statusAprovacao] ?? statusStyles.pendente;
              const draft = drafts[user.id] ?? {
                usuario: user.usuario,
                nomeCompleto: user.nomeCompleto,
                matricula: user.matricula,
                funcao: user.funcao
              };

              return (
                <tr key={user.id} className="bg-white align-top transition hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={draft.nomeCompleto}
                        disabled={isSaving}
                        onChange={(event) => updateDraft(user.id, 'nomeCompleto', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-800 shadow-sm focus:border-[#003f81] focus:ring-[#003f81]/15"
                        placeholder="Nome completo"
                      />
                      <input
                        type="text"
                        value={draft.usuario}
                        disabled={isSaving}
                        onChange={(event) => updateDraft(user.id, 'usuario', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase text-slate-600 shadow-sm focus:border-[#003f81] focus:ring-[#003f81]/15"
                        placeholder="Usuario"
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-700">{user.emailAuth || '-'}</div>
                    <input
                      type="text"
                      value={draft.matricula}
                      disabled={isSaving}
                      onChange={(event) => updateDraft(user.id, 'matricula', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase text-slate-600 shadow-sm focus:border-[#003f81] focus:ring-[#003f81]/15"
                      placeholder="Matricula"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <input
                      type="text"
                      value={draft.funcao}
                      disabled={isSaving}
                      onChange={(event) => updateDraft(user.id, 'funcao', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase text-slate-600 shadow-sm focus:border-[#003f81] focus:ring-[#003f81]/15"
                      placeholder="Funcao"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusClass}`}>
                      {user.ativo ? user.statusAprovacao : 'bloqueado'}
                    </span>
                    {isCurrentUser && (
                      <div className="mt-2 text-[10px] font-bold uppercase text-slate-400">
                        sua conta
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={user.modulo}
                      disabled={isSaving || isCurrentUser}
                      onChange={(event) =>
                        void updateUser(
                          user,
                          { modulo: event.target.value as ModuloAcessoCodigo },
                          'Modulo de acesso atualizado.'
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm focus:border-[#003f81] focus:ring-[#003f81]/15"
                    >
                      {moduloOptions.map((modulo) => (
                        <option key={modulo} value={modulo}>{rotuloModuloAcesso(modulo)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void saveUserRegistration(user)}
                        className="rounded-xl bg-[#003f81] px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-[#0056ac] disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void updateUser(user, { ativo: true, statusAprovacao: 'aprovado' }, 'Usuario aprovado e liberado.')}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={isSaving || isCurrentUser}
                        onClick={() => void updateUser(user, { ativo: false, statusAprovacao: 'pendente' }, 'Usuario bloqueado.')}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        Bloquear
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminUsersPanel;
