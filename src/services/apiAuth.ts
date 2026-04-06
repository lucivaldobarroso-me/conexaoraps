import { supabase } from './supabase';
import { buildAuthEmail, mapUsuarioToSessionUser } from './apiHelpers';
import { clearUserInfo, readStoredUserInfo, storeUserInfo, withTimeout } from './apiSession';

const fetchUsuarioProfile = async (authUserId: string) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, usuario, nome_completo, matricula, funcao, modulo, auth_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const ensureUsuarioProfile = async (authUser: any, fallback?: Record<string, any>) => {
  let profile = await fetchUsuarioProfile(authUser.id);

  if (!profile && fallback) {
    const payload = {
      auth_user_id: authUser.id,
      email_auth: String(fallback.email_auth ?? authUser.email ?? '').trim().toLowerCase() || null,
      usuario: String(fallback.usuario ?? '').trim().toUpperCase(),
      nome_completo: String(fallback.nome_completo ?? fallback.nomeCompleto ?? '').trim().toUpperCase(),
      cpf: String(fallback.cpf ?? '').trim() || null,
      matricula: String(fallback.matricula ?? '').trim().toUpperCase() || null,
      funcao: String(fallback.funcao ?? '').trim().toUpperCase() || null,
      modulo: String(fallback.modulo ?? 'Inserção e Visualização').trim(),
      origem_dado: 'supabase',
      ativo: true
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

  const mapped = mapUsuarioToSessionUser(profile);
  storeUserInfo(mapped);
  return mapped;
};

export const loginWithSupabase = async (usuario: string, senha: string) => {
  try {
    const email = String(usuario ?? '').includes('@')
      ? String(usuario).trim().toLowerCase()
      : buildAuthEmail(usuario);
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
      nomeCompleto: profile.nomeCompleto,
      modulo: profile.modulo,
      funcao: profile.funcao,
      matricula: profile.matricula,
      message: 'Login realizado com sucesso!'
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro de autenticação no Supabase';
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
      modulo: 'Inserção e Visualização'
    });

    await supabase.auth.signOut();
    clearUserInfo();

    return { result: 'success', message: 'Conta criada com sucesso! Faça login para continuar.' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao realizar cadastro';
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
