import type { LegacyPatientLookupData, PatientLookupResult, User } from '../types';

export const normalizeText = (value: any) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const hardcodedBairros = {
  "ZONA NORTE": ["AEROPORTO", "B. DOS ESTADOS", "CAUAME", "RIVER PARK", "PARAVIANA"],
  "ZONA OESTE": ["ALVORADA", "ASA BRANCA", "BURITIS", "CAIMBE", "CINTURAO VERDE", "DR. SILVIO BOTELHO", "GENIPAPO", "EQUATORIAL", "JARDIM FLORESTA", "JARDIM TROPICAL", "JOQUEI CLUBE", "LIBERDADE", "MARECHAL RONDON", "MECEJANA", "NOVA CIDADE", "OLIMPICO", "OPERARIO", "PINTOLANDIA", "PRICUMA", "PROFESSORA ARACELI SOUTO MAIOR", "RAIAR DO SOL", "SANTA TEREZA", "SAO BENTO", "SENADOR HELIO CAMPOS", "TANCREDO NEVES", "UNION", "LAURA MOREIRA"],
  "ZONA SUL": ["13 DE SETEMBRO", "CALUNGA", "CAMBATA", "CENTRO", "SAO FRANCISCO", "SAO PEDRO", "SAO VICENTE"],
  "ZONA LESTE": ["APARECIDA", "31 DE MARCO", "CANARINHO", "CIDADE SATELITE", "DOS ESTADOS", "JARDIM CARANA", "JARDIM PRIMAVERA", "MURILO TEIXEIRA", "PARQUE CACARI", "PARQUE DAS PEDRAS"],
  "RURAL": ["AREA RURAL"]
};

export const extractCoords = (value: string) => {
  const raw = String(value ?? '').trim();
  if (!raw) return { latitude: null, longitude: null };

  const plainMatch = raw.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (plainMatch) {
    return {
      latitude: Number(plainMatch[1]),
      longitude: Number(plainMatch[2])
    };
  }

  const destinationMatch = raw.match(/destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (destinationMatch) {
    return {
      latitude: Number(destinationMatch[1]),
      longitude: Number(destinationMatch[2])
    };
  }

  return { latitude: null, longitude: null };
};

export const formatLegacyEntry = (createdAt?: string | null, responsavel?: string | null) => {
  if (!createdAt && !responsavel) return '';

  let datePart = '';
  if (createdAt) {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) {
      datePart = date.toLocaleString('pt-BR', {
        timeZone: 'America/Manaus',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }

  if (!datePart) datePart = createdAt ?? '';
  return responsavel ? `${datePart} | Por: ${responsavel}` : datePart;
};

export const mapRecordToLegacyRow = (row: any) => [
  row.id_externo || '',
  row.nome || '',
  row.nascimento || '',
  row.sexo || '',
  row.idade ?? '',
  row.endereco || '',
  row.numero || '',
  row.bairro || '',
  row.zona || '',
  row.localizacao || '',
  row.referencia || '',
  row.diagnosticado || '',
  row.reincidente || '',
  row.medicacao || '',
  row.pq_med || '',
  row.apoio_fam || '',
  row.pq_fam || '',
  row.apoio_raps || '',
  row.info_extra || '',
  row.entrada_legado || formatLegacyEntry(row.criado_em, row.responsavel_nome),
  row.responsavel_nome || 'USUÁRIO',
  '',
  row.raca || '',
  row.nacionalidade || ''
];

export const buildStatsFromRows = (rows: any[]) => {
  const stats = {
    total: rows.length,
    reincidentes: 0,
    clinico: { diag: 0, med: 0, fam: 0, raps: 0 },
    masculino: 0,
    feminino: 0,
    idades: {} as Record<string, number>,
    zonas: {} as Record<string, number>,
    bairros: {} as Record<string, number>,
    dias: {} as Record<string, number>,
    mensal: {} as Record<string, number>,
    dadosBrutos: rows.map(mapRecordToLegacyRow)
  };

  for (const row of rows) {
    const reincidente = normalizeText(row.reincidente);
    const diagnosticado = normalizeText(row.diagnosticado);
    const medicacao = normalizeText(row.medicacao);
    const apoioFam = normalizeText(row.apoio_fam);
    const apoioRaps = normalizeText(row.apoio_raps);
    const sexo = normalizeText(row.sexo);
    const idade = String(row.idade ?? '').trim();
    const bairro = String(row.bairro || 'Não Informado');
    const zona = String(row.zona || 'Indefinido');
    const createdAt = row.criado_em ? new Date(row.criado_em) : null;

    if (reincidente === 'SIM') stats.reincidentes++;
    if (diagnosticado === 'SIM') stats.clinico.diag++;
    if (medicacao === 'SIM') stats.clinico.med++;
    if (apoioFam === 'SIM') stats.clinico.fam++;
    if (apoioRaps === 'SIM') stats.clinico.raps++;

    if (sexo === 'MASCULINO') stats.masculino++;
    if (sexo === 'FEMININO') stats.feminino++;

    if (idade) stats.idades[idade] = (stats.idades[idade] || 0) + 1;
    stats.bairros[bairro] = (stats.bairros[bairro] || 0) + 1;
    stats.zonas[zona] = (stats.zonas[zona] || 0) + 1;

    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      const weekDay = createdAt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Manaus' });
      const monthKey = createdAt.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'America/Manaus' });
      stats.dias[weekDay] = (stats.dias[weekDay] || 0) + 1;
      stats.mensal[monthKey] = (stats.mensal[monthKey] || 0) + 1;
    }
  }

  return stats;
};

export const buildLegacyPatientPayload = (row: any, count: number): PatientLookupResult => ({
  result: 'exists',
  p: {
    id: row.id_externo || '',
    nascimento: row.nascimento || '',
    sexo: row.sexo || '',
    endereco: row.endereco || '',
    num: row.numero || '',
    bairro: row.bairro || '',
    loc: row.localizacao || row.localizacao_raw || '',
    ref: row.referencia || '',
    diag: row.diagnosticado || '',
    reinc: row.reincidente || '',
    med: row.medicacao || '',
    pq_med: row.pq_med || '',
    fam: row.apoio_fam || '',
    pq_fam: row.pq_fam || '',
    raps: row.apoio_raps || '',
    info: row.info_extra || '',
    raca: row.raca || '',
    nacionalidade: row.nacionalidade || '',
    classificacao: {
      motivoInicialSubtipo: row.motivo_inicial_subtipo || '',
      motivoInicialExtras: row.motivo_inicial_extras || {},
      motivoConstatadoSubtipo: row.motivo_constatado_subtipo || '',
      motivoConstatadoExtras: row.motivo_constatado_extras || {},
      detalheLivre: row.detalhe_livre || ''
    }
  } satisfies LegacyPatientLookupData,
  contagem: count
});

export const validateOccurrenceExtras = (fields: any[], extras: Record<string, any>) => {
  for (const field of fields ?? []) {
    if (!field?.obrigatorio) continue;
    const value = extras?.[field.chave];

    if (field.tipo_dado === 'multiselect') {
      if (!Array.isArray(value) || value.length === 0) {
        return `Preencha o campo obrigatório: ${field.rotulo}`;
      }
      continue;
    }

    if (value === undefined || value === null || String(value).trim() === '') {
      return `Preencha o campo obrigatório: ${field.rotulo}`;
    }
  }

  return null;
};

export const toCountMap = (rows: any[], keyField: string, valueField = 'total') => {
  return (rows ?? []).reduce((acc: Record<string, number>, row: any) => {
    const key = String(row?.[keyField] ?? '').trim();
    if (!key) return acc;
    acc[key] = Number(row?.[valueField] ?? 0);
    return acc;
  }, {});
};

const AUTH_EMAIL_DOMAIN = 'auth.conexaoraps.app';

export const toAsciiLower = (value: any) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const buildAuthEmail = (usuario: string) => {
  const normalized = toAsciiLower(usuario).replace(/[^a-z0-9._-]/g, '');
  return normalized + '@' + AUTH_EMAIL_DOMAIN;
};

export const mapUsuarioToSessionUser = (usuario: any): User => ({
  id: usuario?.id,
  usuario: usuario?.usuario ?? '',
  nomeCompleto: usuario?.nome_completo ?? '',
  matricula: usuario?.matricula ?? '',
  funcao: usuario?.funcao ?? '',
  modulo: usuario?.modulo ?? 'INSERCAO_ANALITICO',
  ativo: usuario?.ativo !== false,
  statusAprovacao: usuario?.status_aprovacao ?? 'aprovado'
});

