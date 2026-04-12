export interface User {
  id?: string;
  usuario?: string;
  nomeCompleto: string;
  matricula: string;
  funcao: string;
  modulo: string;
  ativo?: boolean;
  statusAprovacao?: string;
}

export interface PatientRecord {
  id: string;
  nome: string;
  nascimento: string;
  sexo: string;
  idade: string;
  bairro: string;
  zona: string;
  gps: string;
  diagnostico: string;
  reincidente: string;
  medicacao: string;
  motivo_nao_med: string;
  apoio_fam: string;
  motivo_nao_fam: string;
  apoio_raps: string;
  observacoes: string;
  entrada: string;
  raca?: string;
  nacionalidade?: string;
  contagem?: number;
}

export type LegacyDashboardRow = Array<string | number | undefined>;

export interface LegacyDashboardRecord {
  id: string;
  nome: string;
  nascimento: string;
  sexo: string;
  idade: string;
  endereco: string;
  numero: string;
  bairro: string;
  zona: string;
  gps: string;
  referencia: string;
  diagnostico: string;
  reincidente: string;
  medicacao: string;
  motivoNaoMedicacao: string;
  apoioFamiliar: string;
  motivoNaoFamiliar: string;
  apoioRaps: string;
  observacoes: string;
  entrada: string;
  responsavel: string;
  raca: string;
  nacionalidade: string;
  raw: LegacyDashboardRow;
}

export interface DashboardData {
  total: number;
  reincidentes: number;
  clinico: {
    diag: number;
    med: number;
    fam: number;
    raps: number;
  };
  masculino: number;
  feminino: number;
  idades: Record<string, number>;
  zonas: Record<string, number>;
  bairros: Record<string, number>;
  dias: Record<string, number>;
  mensal: Record<string, number>;
  dadosBrutos: LegacyDashboardRow[];
}

export interface OccurrenceDashboardData {
  totalClassificacoes: number;
  totalCriticos: number;
  comDetalheLivre: number;
  motivosIniciais: Record<string, number>;
  motivosConstatados: Record<string, number>;
  metodosTentativa: Record<string, number>;
  transicoes: Record<string, number>;
  zonasMotivoConstatado: Record<string, number>;
}

export interface KPIStats {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendIcon?: string;
  bgGradient: string;
  accentColor: string;
  subTextColor: string;
}

export type OccurrenceExtraValue = string | number | boolean | string[] | null | undefined;

export interface OccurrenceExtraDefinition {
  id: string;
  subtipo_id: string;
  chave: string;
  rotulo: string;
  tipo_dado: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
  obrigatorio: boolean;
  opcoes?: string[];
  ajuda?: string;
  ordem?: number;
}

export interface OccurrenceClassificationSelection {
  tipo_id: string | null;
  subtipo_id: string | null;
  extras: Record<string, OccurrenceExtraValue>;
  campos_definicao: OccurrenceExtraDefinition[];
}

export interface SamuOccurrenceClassificationPayload {
  motivo_inicial: OccurrenceClassificationSelection;
  motivo_constatado: OccurrenceClassificationSelection;
  detalhe_livre: string;
}

export type TipoCatalogoDadosProfissionais =
  | 'encaminhado'
  | 'medicacao_contencao_quimica'
  | 'vtr'
  | 'medico_regulador'
  | 'enfermeiro'
  | 'medico'
  | 'tecnico_enfermagem';

export interface DadosProfissionaisPayload {
  data_atendimento: string;
  numero_faph: string;
  numero_ocorrencia: string;
  encaminhado: string;
  medicacao_uso: string;
  medicacoes_uso: string;
  contencao_quimica: string;
  medicacao_contencao_quimica: string;
  sinais_vitais: string;
  sinais_vitais_descricao: string;
  contencao_fisica: string;
  descricao_contencao_fisica: string;
  medico_regulador: string;
  enfermeiro: string;
  medico: string;
  tecnico_enfermagem: string;
  vtr: string;
  j9_inicio: string;
  j10_inicio: string;
  j9_fim: string;
  j10_fim: string;
}

export interface DadosProfissionaisCatalogo {
  encaminhado: string[];
  medicacao_contencao_quimica: string[];
  vtr: string[];
  medico_regulador: string[];
  enfermeiro: string[];
  medico: string[];
  tecnico_enfermagem: string[];
}

export interface SamuAttendancePayload {
  id_paciente?: string;
  nome: string;
  nascimento: string;
  sexo: string;
  idade: string | number;
  endereco: string;
  numero: string;
  bairro: string;
  zona: string;
  localizacao: string;
  referencia: string;
  diagnosticado: string;
  reincidente: string;
  medicacao: string;
  pq_med: string;
  apoio_fam: string;
  porque_fam: string;
  apoio_raps: string;
  info_extra: string;
  responsavel: string;
  raca: string;
  nacionalidade: string;
  classificacao_ocorrencia?: SamuOccurrenceClassificationPayload | null;
  dados_profissionais?: DadosProfissionaisPayload | null;
}

export interface SaveSamuAttendanceResult {
  result: 'success' | 'error';
  id?: string;
  message?: string;
}

export interface LegacyPatientLookupData {
  id: string;
  nascimento: string;
  sexo: string;
  endereco: string;
  num: string;
  bairro: string;
  loc: string;
  ref: string;
  diag: string;
  reinc: string;
  med: string;
  pq_med: string;
  fam: string;
  pq_fam: string;
  raps: string;
  info: string;
  raca: string;
  nacionalidade: string;
  classificacao?: {
    motivoInicialSubtipo: string;
    motivoInicialExtras: Record<string, OccurrenceExtraValue>;
    motivoConstatadoSubtipo: string;
    motivoConstatadoExtras: Record<string, OccurrenceExtraValue>;
    detalheLivre: string;
  };
}

export type PatientLookupResult =
  | { result: 'exists'; p: LegacyPatientLookupData; contagem: number }
  | { result: 'not_found' }
  | { result: 'error' };

export interface NeighborhoodLoadResult {
  bairros: Record<string, string[]>;
  nomes: string[];
}

export interface OccurrenceTypeOption {
  id: string;
  nome: string;
  ordem?: number;
}

export interface OccurrenceClassificationCatalog {
  tipos: OccurrenceTypeOption[];
  subtipos: Record<string, OccurrenceTypeOption[]>;
  extras: Record<string, OccurrenceExtraDefinition[]>;
}

export interface OccurrenceDetailRecord {
  motivoInicial: string;
  motivoConstatado: string;
  metodo: string;
  detalheLivre: string;
}

export type OccurrenceDetailsMap = Record<string, OccurrenceDetailRecord>;
