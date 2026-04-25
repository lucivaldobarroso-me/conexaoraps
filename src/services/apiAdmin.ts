import { supabase } from './supabase';
import { normalizarModuloAcesso, type ModuloAcessoCodigo } from '../utils/permissoesAcesso';

export type AdminUserRecord = {
  id: string;
  usuario: string;
  nomeCompleto: string;
  matricula: string;
  funcao: string;
  modulo: ModuloAcessoCodigo;
  ativo: boolean;
  statusAprovacao: string;
  emailAuth: string;
  cpf: string;
};

type AdminUserUpdate = {
  usuario?: string;
  nomeCompleto?: string;
  matricula?: string;
  funcao?: string;
  modulo?: ModuloAcessoCodigo;
  ativo?: boolean;
  statusAprovacao?: 'aprovado' | 'pendente' | 'reprovado';
};

export type AdminOccurrenceTypeRecord = {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

export type AdminOccurrenceSubtypeRecord = {
  id: string;
  tipoId: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

export type AdminOccurrenceExtraRecord = {
  id: string;
  subtipoId: string;
  chave: string;
  rotulo: string;
  tipoDado: string;
  obrigatorio: boolean;
  opcoes: unknown;
  ordem: number;
  ativo: boolean;
};

export type AdminProfessionalCatalogRecord = {
  id: string;
  tipo: string;
  valor: string;
  ativo: boolean;
};

export type AdminZoneRecord = {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

export type AdminNeighborhoodRecord = {
  id: string;
  zonaId: string;
  nome: string;
  ativo: boolean;
};

export type AdminCatalogOverview = {
  tipos: AdminOccurrenceTypeRecord[];
  subtipos: AdminOccurrenceSubtypeRecord[];
  extras: AdminOccurrenceExtraRecord[];
  profissionais: AdminProfessionalCatalogRecord[];
  zonas: AdminZoneRecord[];
  bairros: AdminNeighborhoodRecord[];
};

export type AdminAttendanceRecord = {
  id: string;
  idExterno: string;
  nome: string;
  nascimento: string;
  sexo: string;
  idade: number | null;
  bairro: string;
  zona: string;
  diagnosticado: string;
  reincidente: string;
  apoioRaps: string;
  responsavelNome: string;
  entradaLegado: string;
  inativadoEm: string;
  motivoInativacao: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type AdminAuditRecord = {
  id: string;
  adminAuthUserId: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  resumo: string;
  criadoEm: string;
};

type AdminAttendanceUpdate = {
  nome?: string;
  nascimento?: string;
  sexo?: string;
  idade?: number | null;
  bairro?: string;
  zona?: string;
  diagnosticado?: string;
  reincidente?: string;
  apoioRaps?: string;
  responsavelNome?: string;
};

type AdminAuditPayload = {
  acao: string;
  entidade: string;
  entidadeId: string;
  resumo: string;
  depois?: Record<string, unknown>;
};

const mapAdminUser = (row: any): AdminUserRecord => ({
  id: String(row?.id ?? ''),
  usuario: String(row?.usuario ?? ''),
  nomeCompleto: String(row?.nome_completo ?? ''),
  matricula: String(row?.matricula ?? ''),
  funcao: String(row?.funcao ?? ''),
  modulo: normalizarModuloAcesso(row?.modulo),
  ativo: row?.ativo !== false,
  statusAprovacao: String(row?.status_aprovacao ?? 'pendente'),
  emailAuth: String(row?.email_auth ?? ''),
  cpf: String(row?.cpf ?? '')
});

const logAdminAudit = async (payload: AdminAuditPayload): Promise<void> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const adminAuthUserId = sessionData.session?.user?.id ?? null;

  const { error } = await supabase
    .from('admin_auditoria')
    .insert({
      admin_auth_user_id: adminAuthUserId,
      acao: payload.acao,
      entidade: payload.entidade,
      entidade_id: payload.entidadeId,
      resumo: payload.resumo,
      depois: payload.depois ?? null
    });

  if (error) {
    console.warn('Nao foi possivel registrar auditoria administrativa.', error);
  }
};

export const listAdminUsers = async (): Promise<AdminUserRecord[]> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, usuario, nome_completo, matricula, funcao, modulo, ativo, status_aprovacao, email_auth, cpf')
    .order('status_aprovacao', { ascending: true })
    .order('nome_completo', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapAdminUser);
};

export const updateAdminUserAccess = async (id: string, changes: AdminUserUpdate): Promise<void> => {
  const payload: Record<string, unknown> = {};

  if (typeof changes.usuario === 'string') payload.usuario = changes.usuario.trim().toUpperCase();
  if (typeof changes.nomeCompleto === 'string') payload.nome_completo = changes.nomeCompleto.trim().toUpperCase();
  if (typeof changes.matricula === 'string') payload.matricula = changes.matricula.trim().toUpperCase() || null;
  if (typeof changes.funcao === 'string') payload.funcao = changes.funcao.trim().toUpperCase() || null;
  if (changes.modulo) payload.modulo = normalizarModuloAcesso(changes.modulo);
  if (typeof changes.ativo === 'boolean') payload.ativo = changes.ativo;
  if (changes.statusAprovacao) payload.status_aprovacao = changes.statusAprovacao;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from('usuarios')
    .update(payload)
    .eq('id', id);

  if (error) throw error;

  await logAdminAudit({
    acao: 'update',
    entidade: 'usuarios',
    entidadeId: id,
    resumo: 'Administrador atualizou dados ou acesso de usuario.',
    depois: payload
  });
};

export const listAdminCatalogOverview = async (): Promise<AdminCatalogOverview> => {
  const [
    tiposResult,
    subtiposResult,
    extrasResult,
    profissionaisResult,
    zonasResult,
    bairrosResult
  ] = await Promise.all([
    supabase
      .from('tipos_ocorrencia')
      .select('id, nome, ordem, ativo')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true }),
    supabase
      .from('subtipos_ocorrencia')
      .select('id, tipo_id, nome, ordem, ativo')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true }),
    supabase
      .from('campos_extras_ocorrencia')
      .select('id, subtipo_id, chave, rotulo, tipo_dado, obrigatorio, opcoes, ordem, ativo')
      .order('ordem', { ascending: true })
      .order('rotulo', { ascending: true }),
    supabase
      .from('catalogo_dados_profissionais')
      .select('id, tipo, valor, ativo')
      .order('tipo', { ascending: true })
      .order('valor', { ascending: true }),
    supabase
      .from('zonas')
      .select('id, nome, ordem, ativo')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true }),
    supabase
      .from('bairros')
      .select('id, zona_id, nome, ativo')
      .order('nome', { ascending: true })
  ]);

  const error =
    tiposResult.error ||
    subtiposResult.error ||
    extrasResult.error ||
    profissionaisResult.error ||
    zonasResult.error ||
    bairrosResult.error;

  if (error) throw error;

  return {
    tipos: (tiposResult.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      nome: String(row.nome ?? ''),
      ordem: Number(row.ordem ?? 0),
      ativo: row.ativo !== false
    })),
    subtipos: (subtiposResult.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      tipoId: String(row.tipo_id ?? ''),
      nome: String(row.nome ?? ''),
      ordem: Number(row.ordem ?? 0),
      ativo: row.ativo !== false
    })),
    extras: (extrasResult.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      subtipoId: String(row.subtipo_id ?? ''),
      chave: String(row.chave ?? ''),
      rotulo: String(row.rotulo ?? ''),
      tipoDado: String(row.tipo_dado ?? ''),
      obrigatorio: row.obrigatorio === true,
      opcoes: row.opcoes ?? null,
      ordem: Number(row.ordem ?? 0),
      ativo: row.ativo !== false
    })),
    profissionais: (profissionaisResult.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      tipo: String(row.tipo ?? ''),
      valor: String(row.valor ?? ''),
      ativo: row.ativo !== false
    })),
    zonas: (zonasResult.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      nome: String(row.nome ?? ''),
      ordem: Number(row.ordem ?? 0),
      ativo: row.ativo !== false
    })),
    bairros: (bairrosResult.data ?? []).map((row: any) => ({
      id: String(row.id ?? ''),
      zonaId: String(row.zona_id ?? ''),
      nome: String(row.nome ?? ''),
      ativo: row.ativo !== false
    }))
  };
};

export const updateAdminProfessionalCatalogItem = async (
  id: string,
  changes: { valor?: string; ativo?: boolean }
): Promise<void> => {
  const payload: Record<string, unknown> = {};

  if (typeof changes.valor === 'string') {
    const valor = changes.valor.trim().toUpperCase();
    if (!valor) throw new Error('O valor do catalogo nao pode ficar vazio.');
    payload.valor = valor;
    payload.valor_normalizado = valor;
  }

  if (typeof changes.ativo === 'boolean') payload.ativo = changes.ativo;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from('catalogo_dados_profissionais')
    .update(payload)
    .eq('id', id);

  if (error) throw error;

  await logAdminAudit({
    acao: 'update',
    entidade: 'catalogo_dados_profissionais',
    entidadeId: id,
    resumo: 'Administrador atualizou item do catalogo profissional.',
    depois: payload
  });
};

export const listAdminAttendances = async (options: { inactive?: boolean } = {}): Promise<AdminAttendanceRecord[]> => {
  const query = supabase
    .from('atendimentos_raps')
    .select(`
      id,
      id_externo,
      nome,
      nascimento,
      sexo,
      idade,
      bairro_nome_legado,
      zona_nome_legado,
      diagnosticado,
      reincidente,
      apoio_raps,
      responsavel_nome,
      entrada_legado,
      inativado_em,
      motivo_inativacao,
      criado_em,
      atualizado_em
    `);

  const { data, error } = await (options.inactive
    ? query.not('inativado_em', 'is', null).order('inativado_em', { ascending: false }).limit(100)
    : query.is('inativado_em', null).order('criado_em', { ascending: false }).limit(100));

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: String(row.id ?? ''),
    idExterno: String(row.id_externo ?? ''),
    nome: String(row.nome ?? ''),
    nascimento: String(row.nascimento ?? ''),
    sexo: String(row.sexo ?? ''),
    idade: row.idade === null || row.idade === undefined ? null : Number(row.idade),
    bairro: String(row.bairro_nome_legado ?? ''),
    zona: String(row.zona_nome_legado ?? ''),
    diagnosticado: String(row.diagnosticado ?? ''),
    reincidente: String(row.reincidente ?? ''),
    apoioRaps: String(row.apoio_raps ?? ''),
    responsavelNome: String(row.responsavel_nome ?? ''),
    entradaLegado: String(row.entrada_legado ?? ''),
    inativadoEm: String(row.inativado_em ?? ''),
    motivoInativacao: String(row.motivo_inativacao ?? ''),
    criadoEm: String(row.criado_em ?? ''),
    atualizadoEm: String(row.atualizado_em ?? '')
  }));
};

export const updateAdminAttendance = async (id: string, changes: AdminAttendanceUpdate): Promise<void> => {
  const payload: Record<string, unknown> = {};

  if (typeof changes.nome === 'string') {
    const nome = changes.nome.trim().toUpperCase();
    if (!nome) throw new Error('O nome do atendimento nao pode ficar vazio.');
    payload.nome = nome;
  }

  if (typeof changes.nascimento === 'string') payload.nascimento = changes.nascimento || null;
  if (typeof changes.sexo === 'string') payload.sexo = changes.sexo.trim().toUpperCase() || null;
  if (Object.prototype.hasOwnProperty.call(changes, 'idade')) payload.idade = changes.idade;
  if (typeof changes.bairro === 'string') payload.bairro_nome_legado = changes.bairro.trim().toUpperCase() || null;
  if (typeof changes.zona === 'string') payload.zona_nome_legado = changes.zona.trim().toUpperCase() || null;
  if (typeof changes.diagnosticado === 'string') payload.diagnosticado = changes.diagnosticado.trim().toUpperCase() || null;
  if (typeof changes.reincidente === 'string') payload.reincidente = changes.reincidente.trim().toUpperCase() || null;
  if (typeof changes.apoioRaps === 'string') payload.apoio_raps = changes.apoioRaps.trim().toUpperCase() || null;
  if (typeof changes.responsavelNome === 'string') payload.responsavel_nome = changes.responsavelNome.trim().toUpperCase() || null;

  payload.atualizado_em = new Date().toISOString();

  const { error } = await supabase
    .from('atendimentos_raps')
    .update(payload)
    .eq('id', id);

  if (error) throw error;

  await logAdminAudit({
    acao: 'update',
    entidade: 'atendimentos_raps',
    entidadeId: id,
    resumo: 'Administrador corrigiu campos simples do atendimento.',
    depois: payload
  });
};

export const inactivateAdminAttendance = async (id: string, reason: string): Promise<void> => {
  const motivo = reason.trim();
  if (motivo.length < 8) throw new Error('Informe um motivo com pelo menos 8 caracteres.');

  const { data: sessionData } = await supabase.auth.getSession();
  const adminAuthUserId = sessionData.session?.user?.id ?? null;
  const payload = {
    inativado_em: new Date().toISOString(),
    inativado_por: adminAuthUserId,
    motivo_inativacao: motivo,
    atualizado_em: new Date().toISOString()
  };

  const { error } = await supabase
    .from('atendimentos_raps')
    .update(payload)
    .eq('id', id);

  if (error) throw error;

  await logAdminAudit({
    acao: 'inactivate',
    entidade: 'atendimentos_raps',
    entidadeId: id,
    resumo: 'Administrador inativou atendimento sem exclusao definitiva.',
    depois: payload
  });
};

export const restoreAdminAttendance = async (id: string): Promise<void> => {
  const payload = {
    inativado_em: null,
    inativado_por: null,
    motivo_inativacao: null,
    atualizado_em: new Date().toISOString()
  };

  const { error } = await supabase
    .from('atendimentos_raps')
    .update(payload)
    .eq('id', id);

  if (error) throw error;

  await logAdminAudit({
    acao: 'restore',
    entidade: 'atendimentos_raps',
    entidadeId: id,
    resumo: 'Administrador restaurou atendimento inativado.',
    depois: payload
  });
};

export const listAdminAuditLogs = async (): Promise<AdminAuditRecord[]> => {
  const { data, error } = await supabase
    .from('admin_auditoria')
    .select('id, admin_auth_user_id, acao, entidade, entidade_id, resumo, criado_em')
    .order('criado_em', { ascending: false })
    .limit(80);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: String(row.id ?? ''),
    adminAuthUserId: String(row.admin_auth_user_id ?? ''),
    acao: String(row.acao ?? ''),
    entidade: String(row.entidade ?? ''),
    entidadeId: String(row.entidade_id ?? ''),
    resumo: String(row.resumo ?? ''),
    criadoEm: String(row.criado_em ?? '')
  }));
};
