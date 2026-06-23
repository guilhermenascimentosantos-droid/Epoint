import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://kyrsdgeuefwmzhmqjmhb.supabase.co';
const supabaseKey = 'sb_publishable_XSfOnwIO8Aj0YAf2q92yEQ_KWkTKRW5';
const supabase = createClient(supabaseUrl, supabaseKey);

let usuarioAtual = null;
let membroAtual = null;
let intervaloAtualizacao = null;

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

function formatarTempo(ms) {
  const totalSegundos = Math.floor((ms || 0) / 1000);
  const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, '0');
  const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, '0');
  const segundos = String(totalSegundos % 60).padStart(2, '0');
  return `${horas}:${minutos}:${segundos}`;
}

function formatarHoraLocal(dataIso) {
  if (!dataIso) return '—';

  return new Date(dataIso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarDataLocal(dataIso, dataFallback) {
  if (dataIso) {
    return new Date(dataIso).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
  }

  return dataFallback || '—';
}

function normalizarStatus(status) {
  if (!status) return 'vazio';
  if (status === 'encerrado') return 'encerrado';
  if (status === 'intervalo') return 'intervalo';
  if (status === 'trabalhando') return 'trabalhando';
  if (status === 'inicial') return 'vazio';
  return 'vazio';
}

function textoStatus(status) {
  if (status === 'encerrado') return 'Encerrado';
  if (status === 'intervalo') return 'Em intervalo';
  if (status === 'trabalhando') return 'Trabalhando';
  return 'Sem status';
}

async function listarHistoricoAdmin() {
  if (!usuarioAtual || !membroAtual?.empresa_id) {
    return [];
  }

  const { data, error } = await supabase
    .from('jornadas')
    .select('*')
    .eq('empresa_id', membroAtual.empresa_id)
    .order('entrada', { ascending: false });

  if (error) {
    console.error('Erro ao buscar jornadas da empresa:', error.message || error);
    return [];
  }

  return (data || []).map((registro) => {
    const statusNormalizado = normalizarStatus(registro.status);

    return {
      ...registro,
      funcionario: registro.user_id || 'Não informado',
      dataISO: registro.data || (registro.entrada ? new Date(registro.entrada).toISOString().split('T')[0] : ''),
      dataExibicao: formatarDataLocal(registro.entrada, registro.data),
      entradaFormatada: formatarHoraLocal(registro.entrada),
      intervaloFormatado: formatarHoraLocal(registro.inicio_intervalo),
      retornoFormatado: formatarHoraLocal(registro.fim_intervalo),
      saidaFormatada: formatarHoraLocal(registro.saida),
      totalFormatado: formatarTempo(registro.tempo_trabalhado_ms || 0),
      statusNormalizado,
      statusTexto: textoStatus(statusNormalizado)
    };
  });
}

function atualizarKPIs(registros) {
  const totalRegistrosEl = document.getElementById('totalRegistros');
  const registrosCompletosEl = document.getElementById('registrosCompletos');
  const ultimaJornadaEl = document.getElementById('ultimaJornada');

  if (!totalRegistrosEl || !registrosCompletosEl || !ultimaJornadaEl) return;

  const agoraBrasil = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );

  const hoje = [
    agoraBrasil.getFullYear(),
    String(agoraBrasil.getMonth() + 1).padStart(2, '0'),
    String(agoraBrasil.getDate()).padStart(2, '0')
  ].join('-');

  const registrosEncerrados = registros.filter(
    (registro) => registro.statusNormalizado === 'encerrado'
  );

  const registrosDeHoje = registrosEncerrados.filter(
    (registro) => registro.dataISO === hoje
  ).length;

  const statusAtivos = ['trabalhando', 'intervalo'];
  const funcionariosAtivos = new Set();

  registros.forEach((registro) => {
    if (statusAtivos.includes(registro.statusNormalizado)) {
      funcionariosAtivos.add(registro.funcionario || 'Não informado');
    }
  });

  totalRegistrosEl.textContent = registrosDeHoje;
  registrosCompletosEl.textContent = funcionariosAtivos.size;

  const ultimoRegistroEncerrado = registrosEncerrados[0];
  ultimaJornadaEl.textContent = ultimoRegistroEncerrado
    ? ultimoRegistroEncerrado.dataExibicao
    : 'Não registrada';
}

function criarTagStatus(statusNormalizado, statusTexto) {
  return `<span class="status-admin ${statusNormalizado}">${statusTexto}</span>`;
}

function renderizarTabela(registros) {
  const tbody = document.getElementById('tabelaHistorico');
  if (!tbody) return;

  if (!registros.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="tabela-vazia">Nenhum registro encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = registros
    .map((registro) => `
      <tr>
        <td>${registro.funcionario}</td>
        <td>${registro.dataExibicao}</td>
        <td>${registro.entradaFormatada}</td>
        <td>${registro.intervaloFormatado}</td>
        <td>${registro.retornoFormatado}</td>
        <td>${registro.saidaFormatada}</td>
        <td>${registro.totalFormatado}</td>
        <td>${criarTagStatus(registro.statusNormalizado, registro.statusTexto)}</td>
      </tr>
    `)
    .join('');
}

function aplicarFiltros(registros) {
  const filtroBusca = document.getElementById('filtroBusca');
  const filtroData = document.getElementById('filtroData');
  const filtroStatus = document.getElementById('filtroStatus');

  const busca = filtroBusca ? filtroBusca.value.trim().toLowerCase() : '';
  const data = filtroData ? filtroData.value : '';
  const status = filtroStatus ? filtroStatus.value : '';

  return registros.filter((registro) => {
    const bateBusca = !busca || registro.funcionario.toLowerCase().includes(busca);
    const bateData = !data || registro.dataISO === data;
    const bateStatus = !status || registro.statusNormalizado === status;
    return bateBusca && bateData && bateStatus;
  });
}

function atualizarStatusAtual() {
  const statusAtualEl = document.getElementById('statusAtualFuncionario');
  if (!statusAtualEl) return;
  statusAtualEl.textContent = 'Painel administrativo ativo';
}

async function atualizarPainelAdmin() {
  const registros = await listarHistoricoAdmin();
  const registrosFiltrados = aplicarFiltros(registros);

  atualizarKPIs(registros);
  atualizarStatusAtual();
  renderizarTabela(registrosFiltrados);
}

function limparFiltros() {
  const filtroBusca = document.getElementById('filtroBusca');
  const filtroData = document.getElementById('filtroData');
  const filtroStatus = document.getElementById('filtroStatus');

  if (filtroBusca) filtroBusca.value = '';
  if (filtroData) filtroData.value = '';
  if (filtroStatus) filtroStatus.value = '';

  atualizarPainelAdmin();
}

function configurarEventos() {
  const botaoFiltrar = document.getElementById('botaoFiltrar');
  const botaoLimpar = document.getElementById('botaoLimpar');
  const filtroBusca = document.getElementById('filtroBusca');
  const filtroData = document.getElementById('filtroData');
  const filtroStatus = document.getElementById('filtroStatus');
  const btnLogout = document.getElementById('btnLogout');

  if (botaoFiltrar) botaoFiltrar.addEventListener('click', atualizarPainelAdmin);
  if (botaoLimpar) botaoLimpar.addEventListener('click', limparFiltros);
  if (filtroBusca) filtroBusca.addEventListener('input', atualizarPainelAdmin);
  if (filtroData) filtroData.addEventListener('change', atualizarPainelAdmin);
  if (filtroStatus) filtroStatus.addEventListener('change', atualizarPainelAdmin);
  if (btnLogout) btnLogout.addEventListener('click', fazerLogoutAdmin);
}

async function fazerLogoutAdmin() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert('Erro ao sair: ' + error.message);
    return;
  }

  if (intervaloAtualizacao) {
    clearInterval(intervaloAtualizacao);
    intervaloAtualizacao = null;
  }

  window.location.href = '../frontend-funcionario/index.html';
}

async function inicializarAdmin() {
  usuarioAtual = await obterUsuarioAtual();

  if (!usuarioAtual) {
    alert('Nenhum usuário logado no admin.');
    return false;
  }

  membroAtual = await obterEmpresaDoUsuario(usuarioAtual.id);

  if (!membroAtual) {
    alert('Usuário não está vinculado a uma empresa ativa.');
    return false;
  }

  await atualizarPainelAdmin();
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  configurarEventos();

  const iniciou = await inicializarAdmin();
  if (!iniciou) return;

  intervaloAtualizacao = setInterval(atualizarPainelAdmin, 1000);
});