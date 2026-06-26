import { supabase } from './supabase.js';

export async function obterUsuarioAtual() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Erro ao obter usuário:', error.message);
    return null;
  }

  return data.user;
}

export async function fazerLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Erro no login:', error.message);
    return null;
  }

  return data.user;
}

export async function fazerLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Erro ao sair:', error.message);
    return false;
  }

  return true;
}

export async function obterEmpresaDoUsuario(userId) {
  const { data, error } = await supabase
    .from('membros_empresa')
    .select('empresa_id, papel, ativo')
    .eq('user_id', userId)
    .eq('ativo', true)
    .single();

  if (error) {
    console.error('Erro ao buscar empresa do usuário:', error.message);
    return null;
  }

  return data;
}