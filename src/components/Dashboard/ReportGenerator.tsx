import React from 'react';
import { LegacyDashboardRow } from '../../types';
import { toLegacyDashboardRecord } from '../../utils/dashboardRecords';

type ReportGeneratorProps = {
  rows: LegacyDashboardRow[];
  reportSearchTerm: string;
  onReportSearchTermChange: (value: string) => void;
  onGenerateReport: (row: LegacyDashboardRow) => void;
  generatedReport: string;
};

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  rows,
  reportSearchTerm,
  onReportSearchTermChange,
  onGenerateReport,
  generatedReport
}) => {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:bg-gray-800 dark:border-gray-700">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-[#003366] dark:text-white uppercase text-sm">
        <span className="material-symbols-outlined">assignment</span>
        Gerador de Relatório Clínico Automático
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border-r border-slate-200 dark:border-gray-700 pr-6">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Buscar Paciente</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Digite o nome..."
              value={reportSearchTerm}
              onChange={(e) => onReportSearchTermChange(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm uppercase shadow-sm focus:ring-2 focus:ring-[#003366]/15"
            />
            {reportSearchTerm.length > 2 && (
              <div className="absolute z-10 max-h-40 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                {rows
                  .map(toLegacyDashboardRecord)
                  .filter((record) => record.nome && record.nome.includes(reportSearchTerm))
                  .slice(0, 5)
                  .map((record, idx: number) => (
                    <div
                      key={idx}
                      className="cursor-pointer border-b border-slate-100 px-4 py-2 text-xs uppercase text-gray-700 hover:bg-slate-50"
                      onClick={() => onGenerateReport(record.raw)}
                    >
                      {record.nome}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            * Digite para buscar no banco de dados carregado.
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Prévia do Relatório</label>
          <div className="h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-relaxed text-gray-700 shadow-inner whitespace-pre-wrap dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300">
            {generatedReport || 'Aguardando seleção de paciente...'}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                if (generatedReport) {
                  navigator.clipboard.writeText(generatedReport);
                  alert('Copiado!');
                }
              }}
              className="flex items-center gap-1 rounded-xl bg-[#003366] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-900"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              COPIAR RELATÓRIO
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReportGenerator;