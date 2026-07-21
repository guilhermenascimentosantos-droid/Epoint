import { supabase } from '../shared/supabase.js';
import {
  fazerLogin,
  fazerLogout,
  obterUsuarioAtual,
  obterEmpresaDoUsuario
} from '../shared/auth.js';
import {
  formatarHora,
  formatarDataHoraBanco,
  formatarDataComDiaSemana,
  formatarDuracaoMs,
  formatarPeriodo,
  aplicarClasseVazia,
  classeStatusHistorico
} from '../shared/utils.js';

const telaLogin = document.getElementById('telaLogin');
const telaApp = document.getElementById('telaApp');
const formLogin = document.getElementById('formLogin');
const emailLogin = document.getElementById('emailLogin');
const senhaLogin = document.getElementById('senhaLogin');
const mensagemLogin = document.getElementById('mensagemLogin');
const nomeUsuario = document.getElementById('nomeUsuario');
const btnLogout = document.getElementById('btnLogout');

const horaEntradaEl = document.getElementById('horaEntrada');
const statusEntradaEl = document.getElementById('statusEntrada');
const btnEntrada = document.getElementById('btnEntrada');
const horaIntervaloEl = document.getElementById('horaIntervalo');
const statusIntervaloEl = document.getElementById('statusIntervalo');
const btnIntervalo = document.getElementById('btnIntervalo');
const horaSaidaEl = document.getElementById('horaSaida');
const statusSaidaEl = document.getElementById('statusSaida');
const btnSaida = document.getElementById('btnSaida');
const statusGeralEl = document.getElementById('statusGeral');
const relogioTotalEl = document.getElementById('relogioTotal');
const resumoEntradaEl = document.getElementById('resumoEntrada');
const resumoIntervaloEl = document.getElementById('resumoIntervalo');
const resumoSaidaEl = document.getElementById('resumoSaida');
const historicoContainer = document.getElementById('historicoContainer');

let jornadaAtual = null;
let timerRelogio = null;
let tempoAcumulado = 0;
let inicioContagem = null;

function atualizarRelogio() {
  if (!relogioTotalEl) return;

  let total = tempoAcumulado;
  if (inicioContagem) {
    total += Date.now() - inicioContagem;
  }

  relogioTotalEl.textContent = formatarDuracaoMs(total);
}

function iniciarRelogio() {
  pararRelogio();
  atualizarRelogio();
  timerRelogio = setInterval(atualizarRelogio, 1000);
}

function pararRelogio() {
  if (timerRelogio) {
    clearInterval(timerRelogio);
    timerRelogio = null;
  }
}

function atualizarResumo() {
  if (resumoEntradaEl) {
    resumoEntradaEl.textContent = jornadaAtual?.entrada
      ? formatarDataHoraBanco(jornadaAtual.entrada)
      : 'Não registrado';
  }

  if (resumoIntervaloEl) {
    resumoIntervaloEl.textContent = jornadaAtual?.inicio_intervalo
      ? formatarPeriodo(
          formatarDataHoraBanco(jornadaAtual.inicio_intervalo),
          formatarDataHoraBanco(jornadaAtual.fim_intervalo)
        )
      : 'Não registrado';
  }

  if (resumoSaidaEl) {
    resumoSaidaEl.textContent = jornadaAtual?.saida
      ? formatarDataHoraBanco(jornadaAtual.saida)
      : 'Não registrado';
  }
}

function calcularEstadoRelogio() {
  tempoAcumulado = 0;
  inicioContagem = null;

  if (!jornadaAtual?.entrada) return;

  const entradaMs = new Date(jornadaAtual.entrada).getTime();
  const agora = Date.now();

  if (jornadaAtual.saida) {
    const saidaMs = new Date(jornadaAtual.saida).getTime();
    let pausaMs = jornadaAtual.duracao_intervalo_ms || 0;

    if (jornadaAtual.inicio_intervalo && jornadaAtual.fim_intervalo) {
      pausaMs =
        new Date(jornadaAtual.fim_intervalo).getTime() -
        new Date(jornadaAtual.inicio_intervalo).getTime();
    }

    tempoAcumulado = Math.max(0, saidaMs - entradaMs - pausaMs);
    return;
  }

  if (jornadaAtual.status === 'intervalo' && jornadaAtual.inicio_intervalo) {
    tempoAcumulado = Math.max(
      0,
      new Date(jornadaAtual.inicio_intervalo).getTime() - entradaMs
    );
    return;
  }

  if (jornadaAtual.inicio_intervalo && jornadaAtual.fim_intervalo) {
    tempoAcumulado = Math.max(
      0,
      new Date(jornadaAtual.fim_intervalo).getTime() - entradaMs
    );
    inicioContagem = jornadaAtual.status === 'trabalhando' ? agora : null;
    return;
  }

  tempoAcumulado = 0;
  inicioContagem = entradaMs;
}

function atualizarStatusVisual() {
  if (!jornadaAtual) {
    if (horaEntradaEl) horaEntradaEl.textContent = 'Aguardando...';
    if (statusEntradaEl) {
      statusEntradaEl.textContent = 'Ainda não registrada';
      statusEntradaEl.className = 'status status-aguardando';
    }

    if (horaIntervaloEl) horaIntervaloEl.textContent = 'Aguardando...';
    if (statusIntervaloEl) {
      statusIntervaloEl.textContent = 'Ainda não registrado';
      statusIntervaloEl.className = 'status status-aguardando';
    }

    if (horaSaidaEl) horaSaidaEl.textContent = 'Aguardando...';
    if (statusSaidaEl) {
      statusSaidaEl.textContent = 'Ainda não registrada';
      statusSaidaEl.className = 'status status-aguardando';
    }

    aplicarClasseVazia(horaEntradaEl, false);
    aplicarClasseVazia(horaIntervaloEl, false);
    aplicarClasseVazia(horaSaidaEl, false);

    if (statusGeralEl) {
      statusGeralEl.textContent = 'Aguardando entrada';
      statusGeralEl.className = 'status-geral status-inicial';
    }

    if (btnEntrada) btnEntrada.disabled = false;
    if (btnIntervalo) {
      btnIntervalo.disabled = true;
      btnIntervalo.textContent = 'Registrar intervalo';
    }
    if (btnSaida) btnSaida.disabled = true;

    tempoAcumulado = 0;
    inicioContagem = null;
    pararRelogio();
    atualizarRelogio();
    atualizarResumo();
    return;
  }

  if (horaEntradaEl) horaEntradaEl.textContent = formatarHora(jornadaAtual.entrada);
  aplicarClasseVazia(horaEntradaEl, true);

  if (statusEntradaEl) {
    statusEntradaEl.textContent = 'Entrada registrada';
    statusEntradaEl.className = 'status status-concluido';
  }

  if (jornadaAtual.inicio_intervalo) {
    if (horaIntervaloEl) {
      horaIntervaloEl.textContent = formatarHora(jornadaAtual.inicio_intervalo);
    }
    aplicarClasseVazia(horaIntervaloEl, true);

    if (statusIntervaloEl) {
      if (jornadaAtual.fim_intervalo) {
        statusIntervaloEl.textContent = 'Intervalo encerrado';
        statusIntervaloEl.className = 'status status-concluido';
      } else {
        statusIntervaloEl.textContent = 'Intervalo em andamento';
        statusIntervaloEl.className = 'status status-ativo';
      }
    }
  } else {
    if (horaIntervaloEl) horaIntervaloEl.textContent = 'Aguardando...';
    aplicarClasseVazia(horaIntervaloEl, false);

    if (statusIntervaloEl) {
      statusIntervaloEl.textContent = 'Ainda não registrado';
      statusIntervaloEl.className = 'status status-aguardando';
    }
  }

  if (jornadaAtual.saida) {
    if (horaSaidaEl) horaSaidaEl.textContent = formatarHora(jornadaAtual.saida);
    aplicarClasseVazia(horaSaidaEl, true);

    if (statusSaidaEl) {
      statusSaidaEl.textContent = 'Saída registrada';
      statusSaidaEl.className = 'status status-concluido';
    }
  } else {
    if (horaSaidaEl) horaSaidaEl.textContent = 'Aguardando...';
    aplicarClasseVazia(horaSaidaEl, false);

    if (statusSaidaEl) {
      statusSaidaEl.textContent = 'Ainda não registrada';
      statusSaidaEl.className = 'status status-aguardando';
    }
  }

  calcularEstadoRelogio();

  if (jornadaAtual.status === 'intervalo') {
    if (statusGeralEl) {
      statusGeralEl.textContent = 'Em intervalo';
      statusGeralEl.className = 'status-geral status-intervalo';
    }

    if (btnEntrada) btnEntrada.disabled = true;
    if (btnIntervalo) {
      btnIntervalo.disabled = false;
      btnIntervalo.textContent = 'Encerrar intervalo';
    }
    if (btnSaida) btnSaida.disabled = true;

    pararRelogio();
  } else if (jornadaAtual.status === 'trabalhando') {
    if (statusGeralEl) {
      statusGeralEl.textContent = 'Trabalhando';
      statusGeralEl.className = 'status-geral status-trabalhando';
    }

    if (btnEntrada) btnEntrada.disabled = true;
    if (btnIntervalo) {
      btnIntervalo.disabled = false;
      btnIntervalo.textContent =
        jornadaAtual.inicio_intervalo && !jornadaAtual.fim_intervalo
          ? 'Encerrar intervalo'
          : 'Registrar intervalo';
    }
    if (btnSaida) btnSaida.disabled = false;

    iniciarRelogio();
  } else if (jornadaAtual.status === 'encerrado') {
    if (statusGeralEl) {
      statusGeralEl.textContent = 'Expediente encerrado';
      statusGeralEl.className = 'status-geral status-encerrado';
    }

    if (btnEntrada) btnEntrada.disabled = false;
    if (btnIntervalo) {
      btnIntervalo.disabled = true;
      btnIntervalo.textContent = 'Registrar intervalo';
    }
    if (btnSaida) btnSaida.disabled = true;

    pararRelogio();
  }

  atualizarResumo();
  atualizarRelogio();
}

function mostrarLogin() {
  if (telaLogin) telaLogin.classList.remove('escondido');
  if (telaApp) telaApp.classList.add('escondido');
}

function mostrarApp() {
  if (telaLogin) telaLogin.classList.add('escondido');
  if (telaApp) telaApp.classList.remove('escondido');
}

async function sairDaTelaFuncionario() {
  const saiu = await fazerLogout();

  if (!saiu) {
    alert('Erro ao sair.');
    return;
  }

  jornadaAtual = null;
  tempoAcumulado = 0;
  inicioContagem = null;
  pararRelogio();
  atualizarStatusVisual();
  mostrarLogin();

  if (mensagemLogin) mensagemLogin.textContent = '';
  if (formLogin) formLogin.reset();
  if (nomeUsuario) nomeUsuario.textContent = 'Carregando...';
  if (historicoContainer) {
    historicoContainer.innerHTML = '<p class="historico-vazio">Carregando histórico...</p>';
  }
}

async function redirecionarPorPerfil(user) {
  if (!user) {
    mostrarLogin();
    return;
  }

  const membro = await obterEmpresaDoUsuario(user.id);

  if (!membro) {
    if (mensagemLogin) {
      mensagemLogin.textContent = 'Usuário sem vínculo ativo com empresa.';
    }
    await sairDaTelaFuncionario();
    return;
  }

  const papel = (membro.papel || '').toString().trim().toLowerCase();

  if (papel === 'admin') {
    window.location.href = '../frontend-admin/registros.html';
    return;
  }

  if (nomeUsuario) nomeUsuario.textContent = user.email || 'Usuário logado';

  mostrarApp();
  await carregarEstadoAtual();
  await renderizarHistorico();
}

async function salvarEntradaNoSupabase() {
  const user = await obterUsuarioAtual();
  if (!user) {
    alert('Nenhum usuário logado.');
    return null;
  }

  const membro = await obterEmpresaDoUsuario(user.id);
  if (!membro) {
    alert('Usuário não está vinculado a nenhuma empresa.');
    return null;
  }

  const agora = new Date();

  const { data, error } = await supabase
    .from('jornadas')
    .insert({
      empresa_id: membro.empresa_id,
      user_id: user.id,
      data: agora.toISOString().split('T')[0],
      status: 'trabalhando',
      entrada: agora.toISOString(),
      inicio_intervalo: null,
      fim_intervalo: null,
      saida: null,
      tempo_trabalhado_ms: 0,
      duracao_intervalo_ms: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar entrada:', error.message);
    alert('Erro ao salvar entrada: ' + error.message);
    return null;
  }

  return data;
}

async function buscarJornadaAbertaDoUsuario() {
  const user = await obterUsuarioAtual();
  if (!user) return null;

  const { data, error } = await supabase
    .from('jornadas')
    .select('*')
    .eq('user_id', user.id)
    .is('saida', null)
    .order('entrada', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar jornada aberta:', error.message);
    return null;
  }

  return data?.[0] || null;
}

async function registrarIntervaloNoSupabase() {
  const jornada = await buscarJornadaAbertaDoUsuario();
  if (!jornada) {
    alert('Nenhuma jornada aberta encontrada.');
    return null;
  }

  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from('jornadas')
    .update({
      inicio_intervalo: agora,
      status: 'intervalo'
    })
    .eq('id', jornada.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar intervalo:', error.message);
    alert('Erro ao registrar intervalo: ' + error.message);
    return null;
  }

  return data;
}

async function encerrarIntervaloNoSupabase() {
  const jornada = await buscarJornadaAbertaDoUsuario();
  if (!jornada) {
    alert('Nenhuma jornada aberta encontrada.');
    return null;
  }

  const agora = new Date().toISOString();
  const pausaMs = jornada.inicio_intervalo
    ? Math.max(0, new Date(agora).getTime() - new Date(jornada.inicio_intervalo).getTime())
    : jornada.duracao_intervalo_ms || 0;

  const { data, error } = await supabase
    .from('jornadas')
    .update({
      fim_intervalo: agora,
      status: 'trabalhando',
      duracao_intervalo_ms: pausaMs
    })
    .eq('id', jornada.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao encerrar intervalo:', error.message);
    alert('Erro ao encerrar intervalo: ' + error.message);
    return null;
  }

  return data;
}

async function registrarSaidaNoSupabase() {
  const jornada = await buscarJornadaAbertaDoUsuario();
  if (!jornada) {
    alert('Nenhuma jornada aberta encontrada.');
    return null;
  }

  const agora = new Date();
  const entradaMs = new Date(jornada.entrada).getTime();

  let pausaMs = jornada.duracao_intervalo_ms || 0;
  if (jornada.inicio_intervalo && jornada.fim_intervalo) {
    pausaMs = Math.max(
      0,
      new Date(jornada.fim_intervalo).getTime() -
        new Date(jornada.inicio_intervalo).getTime()
    );
  }

  const tempoTrabalhadoMs = Math.max(0, agora.getTime() - entradaMs - pausaMs);

  const { data, error } = await supabase
    .from('jornadas')
    .update({
      saida: agora.toISOString(),
      status: 'encerrado',
      tempo_trabalhado_ms: tempoTrabalhadoMs,
      duracao_intervalo_ms: pausaMs
    })
    .eq('id', jornada.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar saída:', error.message);
    alert('Erro ao registrar saída: ' + error.message);
    return null;
  }

  return data;
}

async function listarJornadasDoUsuario() {
  const user = await obterUsuarioAtual();
  if (!user) return [];

  const { data, error } = await supabase
    .from('jornadas')
    .select(
      'id, data, entrada, inicio_intervalo, fim_intervalo, saida, status, tempo_trabalhado_ms, duracao_intervalo_ms, created_at'
    )
    .eq('user_id', user.id)
    .order('entrada', { ascending: false });

  if (error) {
    console.error('Erro ao listar jornadas:', error.message);
    return [];
  }

  return data || [];
}

async function obterHistoricoFormatado() {
  const jornadas = await listarJornadasDoUsuario();

  return jornadas.map((jornada) => ({
    id: jornada.id,
    dataCompleta: formatarDataComDiaSemana(jornada.data),
    entrada: formatarDataHoraBanco(jornada.entrada),
    inicioIntervalo: formatarDataHoraBanco(jornada.inicio_intervalo),
    fimIntervalo: formatarDataHoraBanco(jornada.fim_intervalo),
    saida: formatarDataHoraBanco(jornada.saida),
    status: jornada.status || 'Sem status',
    tempoTrabalhado: formatarDuracaoMs(jornada.tempo_trabalhado_ms),
    duracaoIntervalo: formatarDuracaoMs(jornada.duracao_intervalo_ms)
  }));
}

async function renderizarHistorico() {
  if (!historicoContainer) return;

  const historico = (await obterHistoricoFormatado()).slice(0, 3);

  if (!historico.length) {
    historicoContainer.innerHTML = '<p class="historico-vazio">Nenhuma jornada encontrada.</p>';
    return;
  }

  historicoContainer.innerHTML = historico
    .map(
      (item) => `
      <article class="historico-item">
        <div class="historico-topo">
          <div>
            <p class="historico-data">${item.dataCompleta}</p>
            <span class="historico-status ${classeStatusHistorico(item.status)}">${item.status}</span>
          </div>
        </div>

        <div class="historico-grid">
          <div class="historico-campo">
            <span class="historico-label">Entrada</span>
            <strong>${item.entrada}</strong>
          </div>

          <div class="historico-campo">
            <span class="historico-label">Intervalo</span>
            <strong>${formatarPeriodo(item.inicioIntervalo, item.fimIntervalo)}</strong>
          </div>

          <div class="historico-campo">
            <span class="historico-label">Saída</span>
            <strong>${item.saida}</strong>
          </div>

          <div class="historico-campo">
            <span class="historico-label">Total</span>
            <strong>${item.tempoTrabalhado}</strong>
          </div>
        </div>
      </article>
    `
    )
    .join('');
}

async function carregarEstadoAtual() {
  jornadaAtual = await buscarJornadaAbertaDoUsuario();
  atualizarStatusVisual();
}

async function inicializarSessao() {
  const user = await obterUsuarioAtual();

  if (!user) {
    mostrarLogin();
    atualizarStatusVisual();
    return;
  }

  await redirecionarPorPerfil(user);
}

function configurarEventos() {
  if (formLogin) {
    formLogin.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = emailLogin?.value?.trim();
      const senha = senhaLogin?.value ?? '';

      if (mensagemLogin) mensagemLogin.textContent = '';

      const user = await fazerLogin(email, senha);
      if (!user) {
        if (mensagemLogin) mensagemLogin.textContent = 'Email ou senha inválidos.';
        return;
      }

      formLogin.reset();
      await redirecionarPorPerfil(user);
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', sairDaTelaFuncionario);
  }

  if (btnEntrada) {
    btnEntrada.addEventListener('click', async () => {
      const novaJornada = await salvarEntradaNoSupabase();
      if (!novaJornada) return;

      jornadaAtual = novaJornada;
      atualizarStatusVisual();
      await renderizarHistorico();
    });
  }

  if (btnIntervalo) {
    btnIntervalo.addEventListener('click', async () => {
      let jornadaAtualizada = null;

      if (jornadaAtual?.status === 'intervalo') {
        jornadaAtualizada = await encerrarIntervaloNoSupabase();
      } else {
        jornadaAtualizada = await registrarIntervaloNoSupabase();
      }

      if (!jornadaAtualizada) return;

      jornadaAtual = jornadaAtualizada;
      atualizarStatusVisual();
      await renderizarHistorico();
    });
  }

  if (btnSaida) {
    btnSaida.addEventListener('click', async () => {
      const jornadaAtualizada = await registrarSaidaNoSupabase();
      if (!jornadaAtualizada) return;

      jornadaAtual = jornadaAtualizada;
      atualizarStatusVisual();
      await renderizarHistorico();
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  configurarEventos();
  await inicializarSessao();
});