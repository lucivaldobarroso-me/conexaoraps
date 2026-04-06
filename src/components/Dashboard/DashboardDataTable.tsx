import React from 'react';
import { LegacyDashboardRow, OccurrenceDetailsMap } from '../../types';
import { toLegacyDashboardRecord } from '../../utils/dashboardRecords';
import { buildDashboardTableRow } from '../../utils/dashboardPresentation';

type DashboardDataTableProps = {
  tableData: LegacyDashboardRow[];
  filter: string;
  onFilterChange: (value: string) => void;
  occurrenceDetails: OccurrenceDetailsMap;
};

const tableHeaders = [
  'ID',
  'NOME',
  'NASC',
  'SEXO',
  'IDADE',
  'RAÇA',
  'NACIONALIDADE',
  'BAIRRO',
  'ZONA',
  'DIAGNOSTICO',
  'REINCIDENTE',
  'MEDICACAO',
  'MOTIVO_NAO_MED',
  'APOIO_FAM',
  'MOTIVO_NAO_FAM',
  'APOIO_RAPS',
  'OBSERVACOES'
];

const DashboardDataTable: React.FC<DashboardDataTableProps> = ({
  tableData,
  filter,
  onFilterChange,
  occurrenceDetails
}) => {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="border-b border-slate-200/70 px-5 py-4 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-[#003366] dark:text-white uppercase text-sm">Espelho Analítico do Atendimento</h3>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-500">Visualização estruturada do banco assistencial, agora com a nova camada psiquiátrica integrada para auditoria clínica e leitura gerencial.</p>
        </div>
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#003366]/15 dark:bg-gray-700 dark:border-gray-600 w-full md:w-80">
          <span className="material-symbols-outlined text-gray-400 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Filtrar por nome, bairro, ID..."
            className="ml-2 w-full border-none bg-transparent text-sm text-gray-700 focus:ring-0 dark:text-gray-200"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-[linear-gradient(90deg,_#0f2f57_0%,_#0f4c81_100%)] shadow-sm">
            <tr>
              {tableHeaders.map((header) => (
                <th key={header} className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">{header}</th>
              ))}
              <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">MOTIVO_INICIAL</th>
              <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">MOTIVO_CONSTATADO</th>
              <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">METODO</th>
              <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">DETALHE_LIVRE</th>
              <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">RESPONSÁVEL</th>
              <th className="px-3 py-3 font-bold text-white border-b border-white/10 uppercase tracking-tighter">ENTRADA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {tableData
              .filter((row) => toLegacyDashboardRecord(row).id)
              .map((row, i) => {
                const record = toLegacyDashboardRecord(row);
                const rowOccurrence = occurrenceDetails[record.id];
                const displayRow = buildDashboardTableRow(record, rowOccurrence);

                return (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white/80 dark:bg-gray-800' : 'bg-slate-50/70 dark:bg-gray-800/70'} hover:bg-blue-50/70 dark:hover:bg-blue-900/10 transition-colors`}>
                    {displayRow.map((cell, j) => (
                      <td key={j} className="border-r border-slate-100 px-3 py-2 text-gray-700 last:border-r-0 dark:text-gray-300 dark:border-gray-700/60">
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DashboardDataTable;