import type { User } from '../types';

export type ModuloAcessoCodigo = 'ADMINISTRADOR' | 'INSERCAO' | 'ANALITICO' | 'INSERCAO_ANALITICO';
export type AcaoAcesso = 'insercao' | 'analitico' | 'administracao';

export const ADMIN_PRINCIPAL = {
  usuario: 'LUCIVALDOBARROSO',
  cpf: '88436039220',
  email: 'lucivaldobarroso.me@gmail.com'
};

const normalizarTexto = (valor: unknown) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

export const normalizarModuloAcesso = (modulo: unknown): ModuloAcessoCodigo => {
  const valor = normalizarTexto(modulo).replace(/\s+E\s+/g, '_').replace(/\s+/g, '_');

  if (valor === 'ADMINISTRADOR' || valor === 'ADMIN') return 'ADMINISTRADOR';
  if (valor === 'INSERCAO') return 'INSERCAO';
  if (valor === 'ANALITICO' || valor === 'VISUALIZACAO' || valor === 'DASHBOARD') return 'ANALITICO';
  if (
    valor === 'INSERCAO_ANALITICO' ||
    valor === 'ANALITICO_INSERCAO' ||
    valor === 'INSERCAO_VISUALIZACAO' ||
    valor === 'VISUALIZACAO_INSERCAO'
  ) {
    return 'INSERCAO_ANALITICO';
  }

  return 'INSERCAO_ANALITICO';
};

export const isAdminPrincipal = (dados: { usuario?: unknown; cpf?: unknown; email?: unknown; email_auth?: unknown }) => {
  const usuario = normalizarTexto(dados.usuario);
  const cpf = String(dados.cpf ?? '').replace(/\D/g, '');
  const email = String(dados.email ?? dados.email_auth ?? '').trim().toLowerCase();

  return usuario === ADMIN_PRINCIPAL.usuario || cpf === ADMIN_PRINCIPAL.cpf || email === ADMIN_PRINCIPAL.email;
};

export const rotuloModuloAcesso = (modulo: unknown) => {
  const codigo = normalizarModuloAcesso(modulo);
  if (codigo === 'ADMINISTRADOR') return 'Administrador';
  if (codigo === 'INSERCAO') return 'Inserção';
  if (codigo === 'ANALITICO') return 'Módulo Analítico';
  return 'Inserção e Analítico';
};

export const temPermissao = (user: Pick<User, 'modulo'> | null | undefined, acao: AcaoAcesso) => {
  if (!user) return false;

  const modulo = normalizarModuloAcesso(user.modulo);
  if (modulo === 'ADMINISTRADOR') return true;
  if (acao === 'administracao') return false;
  if (acao === 'insercao') return modulo === 'INSERCAO' || modulo === 'INSERCAO_ANALITICO';
  if (acao === 'analitico') return modulo === 'ANALITICO' || modulo === 'INSERCAO_ANALITICO';

  return false;
};

export const rotaInicialPorModulo = (user: Pick<User, 'modulo'> | null | undefined) => {
  if (temPermissao(user, 'analitico')) return '/dashboard';
  if (temPermissao(user, 'insercao')) return '/insertion';
  return '/';
};
