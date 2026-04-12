import { supabase } from './supabase';
import { buildAuthEmail, mapUsuarioToSessionUser } from './apiHelpers';
import { clearUserInfo, readStoredUserInfo, storeUserInfo, withTimeout } from './apiSession';
import { isAdminPrincipal, normalizarModuloAcesso } from '../utils/permissoesAcesso';

const USUARIO_PROFILE_SELECT = 'id, usuario, nome_completo, matricula, funcao, modulo, auth_user_id, ativo, status_aprovacao, email_auth, cpf';

const traduzirErroAuth = (message: string) => {
  const texto = String(message ?? '').trim();
  const normalizado = texto.toLowerCase();

  if (!texto) return 'Erro de autenticação no Supabase.';
  if (normalizado.includes('invalid login credentials')) return 'Usuário, e-mail ou senha inválidos.';
  if (normalizado.includes('email') && normalizado.includes('invalid')) return 'Informe um e-mail ou usuário válido.';
  if (normalizado.includes('email not confirmed')) return 'E-mail ainda não confirmado. Verifique o cadastro ou desative a confirmação de e-mail no Supabase.';
  if (normalizado.includes('user already registered')) return 'Este e-mail já está cadastrado.';
  if (normalizado.includes('password')) return 'A senha informada não atende aos critérios de segurança.';
  if (normalizado.includes('rate limit')) return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';

  return texto;
};

const fetchUsuarioProfile = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select(USUARIO_PROFILE_SELECT)
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const fetchUsuarioProfileByEmail = async (email: string) => {
  const emailNormalizado = String(email ?? '').trim().toLowerCase();
  if (!emailNormalizado) return null;

  const { data, error } = await supabase
    .from('usuarios')
    .select(USUARIO_PROFILE_SELECT)
    .eq('email_auth', emailNormalizado)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const resolveLoginEmail = async (usuario: string) => {
  const entrada = String(usuario ?? '').trim();
  if (entrada.includes('@')) return entrada.toLowerCase();

  const usuarioNormalizado = entrada.toUpperCase();
  const { data, error } = await supabase.rpc('buscar_email_login_usuario', {
    p_usuario: usuarioNormalizado
  });

  const emailAuth = Array.isArray(data) ? data[0]?.email_auth : data?.email_auth;
  if (!error && emailAuth) return String(emailAuth).toLowerCase();

  if (error) {
    console.warn('Não foi possível resolver o e-mail pelo usuário. Usando fallback legado.', error);
  }

  return buildAuthEmail(usuarioNormalizado);
};

const ensureUsuarioProfile = async (authUser: any, fallback?: Record<string, any>, options?: { allowPending?: boolean }) => {
  let profile = await fetchUsuarioProfile(authUser.id);
  const authEmail = String(authUser.email ?? '').trim().toLowerCase();

  if (!profile && authEmail) {
    const existingProfile = await fetchUsuarioProfileByEmail(authEmail);

    if (existingProfile) {
      const adminPrincipal = isAdminPrincipal(existingProfile);
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          auth_user_id: authUser.id,
          modulo: adminPrincipal ? 'ADMINISTRADOR' : normalizarModuloAcesso(existingProfile.modulo),
          ativo: adminPrincipal ? true : existingProfile.ativo,
          status_aprovacao: adminPrincipal ? 'aprovado' : existingProfile.status_aprovacao
        })
        .eq('id', existingProfile.id);

      if (updateError) throw updateError;
      profile = await fetchUsuarioProfile(authUser.id);
    }
  }

  if (!profile && fallback) {
    const isAdmin = isAdminPrincipal({
      usuario: fallback.usuario,
      cpf: fallback.cpf,
      email: fallback.email_auth ?? authUser.email
    });
    const payload = {
      auth_user_id: authUser.id,
      email_auth: String(fallback.email_auth ?? authUser.email ?? '').trim().toLowerCase() || null,
      usuario: String(fallback.usuario ?? '').trim().toUpperCase(),
      nome_completo: String(fallback.nome_completo ?? fallback.nomeCompleto ?? '').trim().toUpperCase(),
      cpf: String(fallback.cpf ?? '').trim() || null,
      matricula: String(fallback.matricula ?? '').trim().toUpperCase() || null,
      funcao: String(fallback.funcao ?? '').trim().toUpperCase() || null,
      modulo: isAdmin ? 'ADMINISTRADOR' : normalizarModuloAcesso(fallback.modulo ?? 'INSERCAO_ANALITICO'),
      origem_dado: 'supabase',
      ativo: isAdmin,
      status_aprovacao: isAdmin ? 'aprovado' : 'pendente'
    };

    const { error: insertError } = await supabase
      .from('usuarios')
      .insert(payload);

    if (insertError) throw insertError;
    profile = await fetchUsuarioProfile(authUser.id);
  }

  if (!profile) {
    throw new Error('Perfil do usuário não encontrado no Supabase.');
  }

  const adminPrincipal = isAdminPrincipal(profile);
  if (adminPrincipal) {
    profile = {
      ...profile,
      modulo: 'ADMINISTRADOR',
      ativo: true,
      status_aprovacao: 'aprovado'
    };
  }
  if (!options?.allowPending && !adminPrincipal && (profile.ativo === false || profile.status_aprovacao !== 'aprovado')) {
    throw new Error('Cadastro em análise. Seu acesso será liberado após aprovação do administrador.');
  }

  const mapped = mapUsuarioToSessionUser(profile);
  storeUserInfo(mapped);
  return mapped;
};

export const loginWithSupabase = async (usuario: string, senha: string) => {
  try {
    const email = await resolveLoginEmail(usuario);
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password: senha
      }),
      12000,
      'Tempo esgotado ao conectar com o Supabase.'
    );

    if (error) throw error;
    if (!data.user) throw new Error('Usuário não autenticado.');

    const profile = await withTimeout(
      ensureUsuarioProfile(data.user),
      12000,
      'Tempo esgotado ao carregar o perfil do usuário.'
    );

    return {
      result: 'success',
      id: profile.id,
      usuario: profile.usuario,
      nomeCompleto: profile.nomeCompleto,
      modulo: profile.modulo,
      funcao: profile.funcao,
      matricula: profile.matricula,
      ativo: profile.ativo,
      statusAprovacao: profile.statusAprovacao,
      message: 'Login realizado com sucesso!'
    };
  } catch (e) {
    const message = traduzirErroAuth(e instanceof Error ? e.message : 'Erro de autenticação no Supabase');
    return { result: 'error', message };
  }
};

export const registerWithSupabase = async (dados: any) => {
  try {
    const usuario = String(dados.usuario ?? '').trim();
    const senha = String(dados.senha ?? '');
    const email = String(dados.email ?? '').trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          usuario: usuario.toUpperCase()
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Não foi possível criar o usuário no Supabase Auth.');

    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (signInResult.error || !signInResult.data.user) {
      throw new Error('Cadastro criado no Auth, mas a sessão não foi aberta. Desative a confirmação de e-mail no Supabase Auth para este fluxo.');
    }

    await ensureUsuarioProfile(signInResult.data.user, {
      usuario,
      email_auth: email,
      nomeCompleto: dados.nomeCompleto,
      cpf: dados.cpf,
      matricula: dados.matricula,
      funcao: dados.funcao,
      modulo: dados.moduloAcesso || 'INSERCAO_ANALITICO'
    }, { allowPending: true });

    await supabase.auth.signOut();
    clearUserInfo();

    return { result: 'success', message: 'Cadastro enviado para análise. Você poderá acessar sua conta após aprovação do administrador.' };
  } catch (e) {
    const message = traduzirErroAuth(e instanceof Error ? e.message : 'Erro ao realizar cadastro');
    return { result: 'error', message };
  }
};

export const restoreSessionUser = async () => {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      8000,
      'Tempo esgotado ao verificar a sessão do Supabase.'
    );
    if (error) throw error;

    if (!data.session?.user) {
      clearUserInfo();
      return null;
    }

    return await withTimeout(
      ensureUsuarioProfile(data.session.user),
      8000,
      'Tempo esgotado ao restaurar o perfil do usuário.'
    );
  } catch (e) {
    console.error('Erro ao restaurar sessão do Supabase:', e);
    const cachedUser = readStoredUserInfo();
    if (cachedUser) return cachedUser;
    clearUserInfo();
    return null;
  }
};

export const logoutFromSupabase = async () => {
  try {
    await supabase.auth.signOut();
  } finally {
    clearUserInfo();
  }
};

