import { LegacyDashboardRecord, LegacyDashboardRow } from '../types';

const valueOrEmpty = (value: unknown) => String(value ?? '');

export const toLegacyDashboardRecord = (row: LegacyDashboardRow): LegacyDashboardRecord => ({
  id: valueOrEmpty(row[0]),
  nome: valueOrEmpty(row[1]),
  nascimento: valueOrEmpty(row[2]),
  sexo: valueOrEmpty(row[3]),
  idade: valueOrEmpty(row[4]),
  endereco: valueOrEmpty(row[5]),
  numero: valueOrEmpty(row[6]),
  bairro: valueOrEmpty(row[7]),
  zona: valueOrEmpty(row[8]),
  gps: valueOrEmpty(row[9]),
  referencia: valueOrEmpty(row[10]),
  diagnostico: valueOrEmpty(row[11]),
  reincidente: valueOrEmpty(row[12]),
  medicacao: valueOrEmpty(row[13]),
  motivoNaoMedicacao: valueOrEmpty(row[14]),
  apoioFamiliar: valueOrEmpty(row[15]),
  motivoNaoFamiliar: valueOrEmpty(row[16]),
  apoioRaps: valueOrEmpty(row[17]),
  observacoes: valueOrEmpty(row[18]),
  entrada: valueOrEmpty(row[19]),
  responsavel: valueOrEmpty(row[20]),
  raca: valueOrEmpty(row[22]),
  nacionalidade: valueOrEmpty(row[23]),
  raw: row
});

export const includesFilterTerm = (row: LegacyDashboardRow, filter: string) => {
  const normalizedFilter = filter.toLowerCase();
  return row.some((cell) => cell && String(cell).toLowerCase().includes(normalizedFilter));
};
