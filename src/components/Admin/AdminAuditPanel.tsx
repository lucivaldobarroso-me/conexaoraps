import React, { useEffect, useState } from 'react';
import { listAdminAuditLogs, type AdminAuditRecord } from '../../services/apiAdmin';

const formatDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
};

const AdminAuditPanel: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const data = await listAdminAuditLogs();
      setLogs(data);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel carregar auditoria.';
      setMessage(`${text} Aplique a secao admin_auditoria do SQL para ativar este historico.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAuditLogs();
  }, []);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200/70 px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase text-[#003f81]">Auditoria administrativa</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              Historico das alteracoes feitas no modulo administrador. Esta base deve existir antes de liberar exclusao.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAuditLogs()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Atualizar auditoria
          </button>
        </div>
      </div>

      {message && (
        <div className="mx-5 mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {message}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-8 text-center text-sm font-bold text-slate-400">Carregando auditoria...</div>
      ) : (
        <div className="p-5">
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
              Nenhuma alteracao administrativa registrada ainda.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-[#003f81] text-white">
                    <tr>
                      <th className="px-3 py-3 font-black">Data</th>
                      <th className="px-3 py-3 font-black">Acao</th>
                      <th className="px-3 py-3 font-black">Entidade</th>
                      <th className="px-3 py-3 font-black">Registro</th>
                      <th className="px-3 py-3 font-black">Resumo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="bg-white transition hover:bg-blue-50">
                        <td className="px-3 py-3 font-bold text-slate-500">{formatDateTime(log.criadoEm)}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                            {log.acao || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-700">{log.entidade || '-'}</td>
                        <td className="max-w-[180px] truncate px-3 py-3 text-slate-500">{log.entidadeId || '-'}</td>
                        <td className="px-3 py-3 text-slate-700">{log.resumo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminAuditPanel;
