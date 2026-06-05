import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kyrsdgeuefwmzhmqjmhb.supabase.co';
const supabaseKey = 'sb_publishable_XSfOnwIO8Aj0YAf2q92yEQ_KWkTKRW5';
const supabase = createClient(supabaseUrl, supabaseKey);

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

let jornadaAtual = null;
let timerRelogio = null;
let tempoAcumulado = 0;
let inicioContagem = null;
let inicioIntervalo = null;
let fimIntervalo = null;

function formatarHora(data) {
  return new Date(data).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatarDataComDiaSemana(dataIso) {
  if (!dataIso) return 'Sem data';

  const data = new Date(`${dataIso}T00:00:00`);

  const dataFormatada = data.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
}

function formatarDataHoraBanco(dataIso) {
  if (!dataIso) return 'Não registrado';

  return new Date(dataIso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium'
  });
}

function formatarDuracaoMs(ms) {
  const totalSegundos = Math.max(0, Math.floor((ms || 0) / 1000));
  const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, '0');
  const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, '0');
  const segundos = String(totalSegundos % 60).padStart(2, '0');
  return `${horas}:${minutos}:${segundos}`;
}

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

function aplicarClasseVazia(elemento, temValor) {
  if (!elemento) return;
  elemento.classList.toggle('vazio', !temValor);
}

function atualizarResumo() {
  if (resumoEntradaEl) {
    resumoEntradaEl.textContent = jornadaAtual?.entrada
      ? formatarHora(jornadaAtual.entrada)
      : 'Não registrado';
  }

  if (resumoIntervaloEl) {
    if (jornadaAtual?.inicio_intervalo && jornadaAtual?.fim_intervalo) {
      resumoIntervaloEl.textContent = `${formatarHora(jornadaAtual.inicio_intervalo)} → ${formatarHora(jornadaAtual.fim_intervalo)}`;
    } else if (jornadaAtual?.inicio_intervalo) {
      resumoIntervaloEl.textContent = `${formatarHora(jornadaAtual.inicio_intervalo)} → Em andamento`;
    } else {
      resumoIntervaloEl.textContent = 'Não registrado';
    }
  }

  if (resumoSaidaEl) {
    resumoSaidaEl.textContent = jornadaAtual?.saida
      ? formatarHora(jornadaAtual.saida)
      : 'Não registrado';
  }
}

function atualizarStatusVisual() {
  if (!jornadaAtual) {
    if (horaEntradaEl) horaEntradaEl.textContent = 'Aguardando...';
    if (statusEntradaEl) statusEntradaEl.textContent = 'Ainda não registrada';
    if (horaIntervaloEl) horaIntervaloEl.textContent = 'Aguardando...';
    if (statusIntervaloEl) statusIntervaloEl.textContent = 'Ainda não registrado';
    if (horaSaidaEl) horaSaidaEl.textContent = 'Aguardando...';
    if (statusSaidaEl) statusSaidaEl.textContent = 'Ainda não registrada';

    aplicarClasseVazia(horaEntradaEl, false);
    aplicarClasseVazia(horaIntervaloEl, false);
    aplicarClasseVazia(horaSaidaEl, false);

    if (statusGeralEl) {
      statusGeralEl.textContent = 'Aguardando entrada';
      statusGeralEl.className = 'status-geral status-inicial';
    }

    if (btnEntrada) btnEntrada.disabled = false;
    if (btnIntervalo) btnIntervalo.disabled = true;
    if (btnSaida) btnSaida.disabled = true;

    tempoAcumulado = 0;
    inicioContagem = null;
    inicioIntervalo = null;
    fimIntervalo = null;
    pararRelogio();
    atualizarRelogio();
    atualizarResumo();
    return;
  }

  if (horaEntradaEl) horaEntradaEl.textContent = formatarHora(jornadaAtual.entrada);
  if (statusEntradaEl) {
    statusEntradaEl.textContent = 'Entrada registrada';
    statusEntradaEl.className = 'status status-concluido';
  }
  aplicarClasseVazia(horaEntradaEl, true);

  if (jornadaAtual.inicio_intervalo) {
    if (horaIntervaloEl) horaIntervaloEl.textContent = formatarHora(jornadaAtual.inicio_intervalo);
    aplicarClasseVazia(horaIntervaloEl, true);

    if (jornadaAtual.fim_intervalo) {
      if (statusIntervaloEl) {
        statusIntervaloEl.textContent = 'Intervalo encerrado';
        statusIntervaloEl.className = 'status status-concluido';
      }
    } else {
      if (statusIntervaloEl) {
        statusIntervaloEl.textContent = 'Intervalo em andamento';
        statusIntervaloEl.className = 'status status-ativo';
      }
    }
  } else {
    if (horaIntervaloEl) horaIntervaloEl.textContent = 'Aguardando...';
    if (statusIntervaloEl) {
      statusIntervaloEl.textContent = 'Ainda não registrado';
      statusIntervaloEl.className = 'status status-aguardando';
    }
    aplicarClasseVazia(horaIntervaloEl, false);
  }

  if (jornadaAtual.saida) {
    if (horaSaidaEl) horaSaidaEl.textContent = formatarHora(jornadaAtual.saida);
    if (statusSaidaEl) {
      statusSaidaEl.textContent = 'Saída registrada';
      statusSaidaEl.className = 'status status-concluido';
    }
    aplicarClasseVazia(horaSaidaEl, true);
  } else {
    if (horaSaidaEl) horaSaidaEl.textContent = 'Aguardando...';
    if (statusSaidaEl) {
      statusSaidaEl.textContent = 'Ainda não registrada';
      statusSaidaEl.className = 'status status-aguardando';
    }
    aplicarClasseVazia(horaSaidaEl, false);
  }

  if (jornadaAtual.status === 'intervalo') {
    if (statusGeralEl) {
      statusGeralEl.textContent = 'Em intervalo';
      statusGeralEl.className = 'status-geral status-intervalo';
    }
    if (btnEntrada) btnEntrada.disabled = true;
    if (btnIntervalo) btnIntervalo.disabled = false;
    if (btnIntervalo) btnIntervalo.textContent = 'Encerrar intervalo';
    if (btnSaida) btnSaida.disabled = true;
    pararRelogio();
  } else if (jornadaAtual.status === 'trabalhando') {
    if (statusGeralEl) {
      statusGeralEl.textContent = 'Trabalhando';
      statusGeralEl.className = 'status-geral status-trabalhando';
    }
    if (btnEntrada) btnEntrada.disabled = true;
    if (btnIntervalo) btnIntervalo.disabled = false;
    if (btnIntervalo) btnIntervalo.textContent = jornadaAtual.inicio_intervalo && !jornadaAtual.fim_intervalo
      ? 'Encerrar intervalo'
      : 'Registrar intervalo';
    if (btnSaida) btnSaida.disabled = false;
    iniciarRelogio();
  } else if (jornadaAtual.status === 'encerrado') {
    if (statusGeralEl) {
      statusGeralEl.textContent = 'Expediente encerrado';
      statusGeralEl.className = 'status-geral status-encerrado';
    }
    if (btnEntrada) btnEntrada.disabled = false;
    if (btnIntervalo) btnIntervalo.disabled = true;
    if (btnIntervalo) btnIntervalo.textContent = 'Registrar intervalo';
    if (btnSaida) btnSaida.disabled = true;
    pararRelogio();
  }

  atualizarResumo();
  atualizarRelogio();
}

async function fazerLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('Erro no login:', error.message);
    alert('Login inválido: ' + error.message);
    return null;
  }

  return data.user;
}

async function obterUsuarioAtual() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Erro ao obter usuário:', error.message);
    return null;
  }

  return data.user;
}

async function obterEmpresaDoUsuario(userId) {
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
  if (!user) {
    console.error('Nenhum usuário logado.');
    return null;
  }

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

  return data[0] || null;
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

  const { data, error } = await supabase
    .from('jornadas')
    .update({
      fim_intervalo: agora,
      status: 'trabalhando'
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
    pausaMs = new Date(jornada.fim_intervalo).getTime() - new Date(jornada.inicio_intervalo).getTime();
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
  if (!user) {
    console.error('Nenhum usuário logado.');
    return [];
  }

  const { data, error } = await supabase
    .from('jornadas')
    .select(`
      id,
      data,
      entrada,
      inicio_intervalo,
      fim_intervalo,
      saida,
      status,
      tempo_trabalhado_ms,
      duracao_intervalo_ms,
      created_at
    `)
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
    data: jornada.data || 'Sem data',
    dataCompleta: formatarDataComDiaSemana(jornada.data),
    entrada: formatarDataHoraBanco(jornada.entrada),
    inicioIntervalo: formatarDataHoraBanco(jornada.inicio_intervalo),
    fimIntervalo: formatarDataHoraBanco(jornada.fim_intervalo),
    saida: formatarDataHoraBanco(jornada.saida),
    status: jornada.status || 'Sem status',
    tempoTrabalhado: formatarDuracaoMs(jornada.tempo_trabalhado_ms),
    duracaoIntervalo: formatarDuracaoMs(jornada.duracao_intervalo_ms),
    criadoEm: formatarDataHoraBanco(jornada.created_at)
  }));
}

function formatarPeriodo(inicio, fim) {
  if (inicio === 'Não registrado' && fim === 'Não registrado') {
    return 'Não registrado';
  }

  if (inicio !== 'Não registrado' && fim === 'Não registrado') {
    return `${inicio} → Em andamento`;
  }

  return `${inicio} → ${fim}`;
}

function classeStatusHistorico(status) {
  if (status === 'encerrado') return 'status-encerrado';
  if (status === 'intervalo') return 'status-intervalo';
  if (status === 'trabalhando') return 'status-trabalhando';
  return 'status-inicial';
}

async function renderizarHistorico() {
  const container = document.getElementById('historicoContainer');
  if (!container) return;

  const historico = (await obterHistoricoFormatado()).slice(0, 3);

  if (!historico.length) {
    container.innerHTML = `
      <div class="historico-vazio">
        <p>Nenhuma jornada encontrada.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = historico.map((item) => `
    <article class="historico-item">
      <div class="historico-topo">
        <div>
          <p class="historico-data">${item.dataCompleta}</p>
          <span class="historico-status ${classeStatusHistorico(item.status)}">
            ${item.status}
          </span>
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
          <span class="historico-label">Tempo trabalhado</span>
          <strong>${item.tempoTrabalhado}</strong>

        <div class="historico-campo">
          <span class="historico-label">Tempo de intervalo</span>
          <strong>${item.duracaoIntervalo}</strong>
        </div>
        </div>
      </div>
    </article>
  `).join('');
}

async function carregarEstadoAtual() {
  jornadaAtual = await buscarJornadaAbertaDoUsuario();

  if (!jornadaAtual) {
    atualizarStatusVisual();
    await renderizarHistorico();
    return;
  }

  tempoAcumulado = jornadaAtual.tempo_trabalhado_ms || 0;

  if (jornadaAtual.status === 'trabalhando') {
    const referenciaInicio = jornadaAtual.fim_intervalo || jornadaAtual.entrada;
    inicioContagem = new Date(referenciaInicio).getTime();
  } else {
    inicioContagem = null;
  }

  if (jornadaAtual.inicio_intervalo) {
    inicioIntervalo = new Date(jornadaAtual.inicio_intervalo).getTime();
  }

  if (jornadaAtual.fim_intervalo) {
    fimIntervalo = new Date(jornadaAtual.fim_intervalo).getTime();
  }

  atualizarStatusVisual();
  await renderizarHistorico();
}

function definirBotaoCarregando(botao, carregando, textoCarregando, textoOriginal) {
  if (!botao) return;

  if (carregando) {
    botao.dataset.textoOriginal = textoOriginal || botao.textContent;
    botao.textContent = textoCarregando;
    botao.disabled = true;
    return;
  }

  botao.textContent = botao.dataset.textoOriginal || textoOriginal || botao.textContent;
}

btnEntrada?.addEventListener('click', async () => {
  definirBotaoCarregando(btnEntrada, true, 'Registrando...');

  try {
    const data = await salvarEntradaNoSupabase();
    if (!data) return;

    jornadaAtual = data;
    tempoAcumulado = 0;
    inicioContagem = new Date(data.entrada).getTime();
    inicioIntervalo = null;
    fimIntervalo = null;

    atualizarStatusVisual();
    renderizarHistorico();
  } finally {
    definirBotaoCarregando(btnEntrada, false);
    atualizarStatusVisual();
  }
});

btnIntervalo?.addEventListener('click', async () => {
  if (!jornadaAtual) return;

  const texto = jornadaAtual.status === 'intervalo'
    ? 'Encerrando...'
    : 'Registrando...';

  definirBotaoCarregando(btnIntervalo, true, texto);

  try {
    if (jornadaAtual.status === 'intervalo') {
      const data = await encerrarIntervaloNoSupabase();
      if (!data) return;

      jornadaAtual = data;
      fimIntervalo = new Date(data.fim_intervalo).getTime();
      inicioContagem = Date.now();
    } else {
      if (inicioContagem) {
        tempoAcumulado += Date.now() - inicioContagem;
        inicioContagem = null;
      }

      const data = await registrarIntervaloNoSupabase();
      if (!data) return;

      jornadaAtual = data;
      inicioIntervalo = new Date(data.inicio_intervalo).getTime();
      fimIntervalo = null;
    }

    atualizarStatusVisual();
    renderizarHistorico();
  } finally {
    definirBotaoCarregando(btnIntervalo, false);
    atualizarStatusVisual();
  }
});

btnSaida?.addEventListener('click', async () => {
  if (!jornadaAtual) return;

  definirBotaoCarregando(btnSaida, true, 'Registrando...');

  try {
    if (inicioContagem) {
      tempoAcumulado += Date.now() - inicioContagem;
      inicioContagem = null;
    }

    const data = await registrarSaidaNoSupabase();
    if (!data) return;

    jornadaAtual = data;
    tempoAcumulado = data.tempo_trabalhado_ms || tempoAcumulado;

    atualizarStatusVisual();
    renderizarHistorico();
  } finally {
    definirBotaoCarregando(btnSaida, false);
    atualizarStatusVisual();
  }
});

carregarEstadoAtual();