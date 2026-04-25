import React, { useEffect, useMemo, useState } from 'react';
import {
  inactivateAdminAttendance,
  listAdminAttendances,
  restoreAdminAttendance,
  updateAdminAttendance,
  type AdminAttendanceRecord
} from '../../services/apiAdmin';

type AttendanceDraft = {
  nome: string;
  nascimento: string;
  sexo: string;
  idade: string;
  bairro: string;
  zona: string;
  diagnosticado: string;
  reincidente: string;
  apoioRaps: string;
  responsavelNome: string;
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

const buildDraft = (record: AdminAttendanceRecord): AttendanceDraft => ({
  nome: record.nome,
  nascimento: record.nascimento,
  sexo: record.sexo,
  idade: record.idade === null ? '' : String(record.idade),
  bairro: record.bairro,
  zona: record.zona,
  diagnosticado: record.diagnosticado,
  reincidente: record.reincidente,
  apoioRaps: record.apoioRaps,
  responsavelNome: record.responsavelNome
});

const AdminAttendancesPanel: React.FC = () => {
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'inactive'>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AttendanceDraft | null>(null);
  const [inactivationReason, setInactivationReason] = useState('');
  const [showInactivation, setShowInactivation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const loadAttendances = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const data = await listAdminAttendances({ inactive: viewMode === 'inactive' });
      setRecords(data);
      setSelectedId(data[0]?.id ?? null);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel carregar os atendimentos.';
      setMessage({
        type: 'error',
        text: `${text} Verifique as policies de leitura da tabela atendimentos_raps.`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAttendances();
  }, [viewMode]);

  const filteredRecords = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return records;

    return records.filter((record) =>
      [
        record.idExterno,
        record.nome,
        record.bairro,
        record.zona,
        record.responsavelNome,
        record.diagnosticado,
        record.reincidente,
        record.apoioRaps
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [filter, records]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ??
    filteredRecords[0] ??
    null;

  useEffect(() => {
    setDraft(selectedRecord ? buildDraft(selectedRecord) : null);
    setShowInactivation(false);
    setInactivationReason('');
  }, [selectedRecord?.id]);

  const hasDraftChanges = Boolean(
    selectedRecord &&
    draft &&
    (
      draft.nome !== selectedRecord.nome ||
      draft.nascimento !== selectedRecord.nascimento ||
      draft.sexo !== selectedRecord.sexo ||
      draft.idade !== (selectedRecord.idade === null ? '' : String(selectedRecord.idade)) ||
      draft.bairro !== selectedRecord.bairro ||
      draft.zona !== selectedRecord.zona ||
      draft.diagnosticado !== selectedRecord.diagnosticado ||
      draft.reincidente !== selectedRecord.reincidente ||
      draft.apoioRaps !== selectedRecord.apoioRaps ||
      draft.responsavelNome !== selectedRecord.responsavelNome
    )
  );

  const saveSelectedAttendance = async () => {
    if (!selectedRecord || !draft) return;

    const idade = draft.idade.trim() ? Number(draft.idade) : null;
    if (idade !== null && (!Number.isInteger(idade) || idade < 0 || idade > 130)) {
      setMessage({ type: 'error', text: 'Informe uma idade valida entre 0 e 130.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await updateAdminAttendance(selectedRecord.id, {
        nome: draft.nome,
        nascimento: draft.nascimento,
        sexo: draft.sexo,
        idade,
        bairro: draft.bairro,
        zona: draft.zona,
        diagnosticado: draft.diagnosticado,
        reincidente: draft.reincidente,
        apoioRaps: draft.apoioRaps,
        responsavelNome: draft.responsavelNome
      });
      await loadAttendances();
      setMessage({ type: 'success', text: 'Atendimento atualizado com sucesso.' });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel atualizar o atendimento.';
      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  const inactivateSelectedAttendance = async () => {
    if (!selectedRecord) return;

    setSaving(true);
    setMessage(null);

    try {
      await inactivateAdminAttendance(selectedRecord.id, inactivationReason);
      setRecords((current) => current.filter((record) => record.id !== selectedRecord.id));
      setSelectedId(null);
      setInactivationReason('');
      setShowInactivation(false);
      await loadAttendances();
      setMessage({ type: 'success', text: 'Atendimento inativado sem exclusao definitiva.' });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel inativar o atendimento.';
      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  const restoreSelectedAttendance = async () => {
    if (!selectedRecord) return;

    setSaving(true);
    setMessage(null);

    try {
      await restoreAdminAttendance(selectedRecord.id);
      setRecords((current) => current.filter((record) => record.id !== selectedRecord.id));
      setSelectedId(null);
      await loadAttendances();
      setMessage({ type: 'success', text: 'Atendimento restaurado com sucesso.' });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Nao foi possivel restaurar o atendimento.';
      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200/70 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase text-[#003f81]">Atendimentos registrados</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
              Consulta, correcao controlada, inativacao e restauracao administrativa. O registro nao e apagado fisicamente.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('active')}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase transition ${
                  viewMode === 'active' ? 'bg-white text-[#003f81] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setViewMode('inactive')}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase transition ${
                  viewMode === 'inactive' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Inativados
              </button>
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#003f81]/15">
              <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Buscar nome, bairro, ID..."
                className="ml-2 w-full min-w-0 bg-transparent text-sm font-semibold text-slate-700 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadAttendances()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Atualizar
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
        <div className="px-5 py-8 text-center text-sm font-bold text-slate-400">Carregando atendimentos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">
              {filteredRecords.length} de {records.length} registros
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#003f81] text-white">
                  <tr>
                    <th className="px-3 py-3 font-black">ID</th>
                    <th className="px-3 py-3 font-black">Nome</th>
                    <th className="px-3 py-3 font-black">Bairro</th>
                    <th className="px-3 py-3 font-black">Zona</th>
                    <th className="px-3 py-3 font-black">Entrada</th>
                    <th className="px-3 py-3 font-black">{viewMode === 'inactive' ? 'Inativado em' : 'Apoio RAPS'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedId(record.id)}
                      className={`cursor-pointer transition hover:bg-blue-50 ${
                        selectedRecord?.id === record.id ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <td className="px-3 py-3 font-bold text-slate-500">{record.idExterno || '-'}</td>
                      <td className="px-3 py-3 font-black text-slate-800">{record.nome || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{record.bairro || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{record.zona || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{record.entradaLegado || formatDate(record.criadoEm)}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                          {viewMode === 'inactive' ? formatDate(record.inativadoEm) : record.apoioRaps || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {selectedRecord && draft ? (
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#003f81]">{selectedRecord.nome || 'Sem nome'}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">ID {selectedRecord.idExterno || selectedRecord.id}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                    viewMode === 'inactive'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                  >
                    {viewMode === 'inactive' ? 'inativado' : 'editavel'}
                  </span>
                </div>

                {viewMode === 'inactive' ? (
                  <div className="space-y-3">
                    <DetailRow label="Nome" value={selectedRecord.nome} />
                    <DetailRow label="Bairro" value={selectedRecord.bairro} />
                    <DetailRow label="Zona" value={selectedRecord.zona} />
                    <DetailRow label="Inativado em" value={formatDate(selectedRecord.inativadoEm)} />
                    <DetailRow label="Motivo da inativacao" value={selectedRecord.motivoInativacao} />
                    <button
                      type="button"
                      onClick={() => void restoreSelectedAttendance()}
                      disabled={saving}
                      className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {saving ? 'Restaurando...' : 'Restaurar atendimento'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <EditField
                        label="Nome"
                        value={draft.nome}
                        onChange={(value) => setDraft((current) => current ? { ...current, nome: value } : current)}
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <EditField
                          label="Nascimento"
                          type="date"
                          value={draft.nascimento}
                          onChange={(value) => setDraft((current) => current ? { ...current, nascimento: value } : current)}
                        />
                        <EditField
                          label="Sexo"
                          value={draft.sexo}
                          onChange={(value) => setDraft((current) => current ? { ...current, sexo: value } : current)}
                        />
                        <EditField
                          label="Idade"
                          type="number"
                          value={draft.idade}
                          onChange={(value) => setDraft((current) => current ? { ...current, idade: value } : current)}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <EditField
                          label="Bairro"
                          value={draft.bairro}
                          onChange={(value) => setDraft((current) => current ? { ...current, bairro: value } : current)}
                        />
                        <EditField
                          label="Zona"
                          value={draft.zona}
                          onChange={(value) => setDraft((current) => current ? { ...current, zona: value } : current)}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <EditField
                          label="Diagnosticado"
                          value={draft.diagnosticado}
                          onChange={(value) => setDraft((current) => current ? { ...current, diagnosticado: value } : current)}
                        />
                        <EditField
                          label="Reincidente"
                          value={draft.reincidente}
                          onChange={(value) => setDraft((current) => current ? { ...current, reincidente: value } : current)}
                        />
                        <EditField
                          label="Apoio RAPS"
                          value={draft.apoioRaps}
                          onChange={(value) => setDraft((current) => current ? { ...current, apoioRaps: value } : current)}
                        />
                      </div>
                      <EditField
                        label="Responsavel"
                        value={draft.responsavelNome}
                        onChange={(value) => setDraft((current) => current ? { ...current, responsavelNome: value } : current)}
                      />
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void saveSelectedAttendance()}
                        disabled={saving || !hasDraftChanges}
                        className="rounded-xl bg-[#003f81] px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-[#002f61] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {saving ? 'Salvando...' : 'Salvar correcao'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft(buildDraft(selectedRecord))}
                        disabled={saving || !hasDraftChanges}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Desfazer
                      </button>
                    </div>
                  </>
                )}

                {viewMode === 'active' && (
                <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black uppercase text-red-800">Inativacao administrativa</h4>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-red-700">
                          Remove o atendimento das consultas principais sem apagar o historico do banco.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInactivation((current) => !current)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1 text-[10px] font-black uppercase text-red-700 transition hover:bg-red-50"
                      >
                        {showInactivation ? 'Cancelar' : 'Inativar'}
                      </button>
                    </div>

                    {showInactivation && (
                      <div className="space-y-2">
                        <label className="block">
                          <span className="text-[10px] font-black uppercase text-red-700">Motivo obrigatorio</span>
                          <textarea
                            value={inactivationReason}
                            onChange={(event) => setInactivationReason(event.target.value)}
                            rows={3}
                            className="mt-1 w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            placeholder="Explique por que este atendimento sera inativado"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void inactivateSelectedAttendance()}
                          disabled={saving || inactivationReason.trim().length < 8}
                          className="w-full rounded-xl bg-red-700 px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Confirmar inativacao
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                )}

                <dl className="mt-5 space-y-3">
                  <DetailRow label="Criado em" value={formatDate(selectedRecord.criadoEm)} />
                  <DetailRow label="Atualizado em" value={formatDate(selectedRecord.atualizadoEm)} />
                </dl>

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900">
                  {viewMode === 'inactive'
                    ? 'Restauracao recoloca o atendimento nas consultas principais e fica registrada na auditoria.'
                    : 'Edite apenas correcoes administrativas simples. Inativacao exige motivo e fica registrada na auditoria.'}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm font-bold text-slate-400">Nenhum atendimento selecionado.</div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-white p-3">
    <dt className="text-[10px] font-black uppercase text-slate-400">{label}</dt>
    <dd className="mt-1 break-words text-sm font-bold text-slate-700">{value || '-'}</dd>
  </div>
);

const EditField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
}> = ({ label, value, onChange, type = 'text' }) => (
  <label className="block rounded-xl bg-white p-3">
    <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
    <input
      type={type}
      value={value}
      min={type === 'number' ? 0 : undefined}
      max={type === 'number' ? 130 : undefined}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-[#003f81] focus:bg-white focus:ring-2 focus:ring-[#003f81]/10"
    />
  </label>
);

export default AdminAttendancesPanel;
