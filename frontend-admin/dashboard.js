import { supabase } from '../shared/supabase.js';
import { obterUsuarioAtual, obterEmpresaDoUsuario, fazerLogout } from '../shared/auth.js';
import { formatarHora, formatarDuracaoMs } from '../shared/utils.js';

let usuarioAtual = null;
let membroAtual = null;
let intervaloAtualizacao = null;

const kpiFuncionariosEl = document.getElementById('kpiFuncionarios');
const kpiPresentesEl = document.getElementById('kpiPresentes');
const kpiRegistrosDiaEl = document.getElementById('kpiRegistrosDia');
const kpiPendenciasEl = document.getElementById('kpiPendencias');

const tabelaUltimosRegistrosEl = document.getElementById('tabelaUltimosRegistros');
const listaAlertasEl = document.getElementById('listaAlertas');
const btnLogout = document.getElementById('btnLogout');

function obterDataHojeBrasil() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo'
  }).format(new Date());
}

function obterDataISOBr(dataIso) {
  if (!dataIso) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(dataIso));
}

function formatarHoraCurta(dataIso) {
  if (!dataIso) return '—';
  const horaCompleta = formatarHora(dataIso);
  return horaCompleta === 'Aguardando...' ? '—' : horaCompleta.slice(0, 5);
}

function normalizarStatus(status) {
  if (!status) return 'vazio';
  if (status === 'encerrado') return 'encerrado';
  if (status === 'intervalo') return 'intervalo';
  if (status === 'trabalhando') return 'trabalhando';
  return 'vazio';
}

function textoStatus(status) {
  if (status === 'encerrado') return 'Encerrado';
  if (status === 'intervalo') return 'Em intervalo';
  if (status === 'trabalhando') return 'Em andamento';
  return 'Sem status';
}

function obterClasseStatus(status) {
  if (status === 'encerrado') return 'encerrado';
  if (status === 'intervalo') return 'intervalo';
  if (status === 'trabalhando') return 'andamento';
  return 'vazio';
}

async function listarDadosDashboard() {
  if (!usuarioAtual || !membroAtual?.empresa_id) return [];

  const [
    { data: jornadas, error: errorJornadas },
    { data: perfis, error: erroPerfis }
  ] = await Promise.all([
    supabase
      .from('jornadas')
      .select('*')
      .eq('empresa_id', membroAtual.empresa_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('perfis')
      .select('user_id, nome, email')
  ]);

  if (errorJornadas) {
    console.error('Erro ao buscar jornadas da empresa:', errorJornadas.message || errorJornadas);
    return [];
  }

  if (erroPerfis) {
    console.error('Erro ao buscar perfis:', erroPerfis.message || erroPerfis);
  }

  const mapaPerfis = new Map(
    (perfis || []).map((perfil) => [
      String(perfil.user_id || '').trim(),
      {
        nome: perfil.nome || null,
        email: perfil.email || null
      }
    ])
  );

  return (jornadas || []).map((registro) => {
    const statusNormalizado = normalizarStatus(registro.status);
    const dataISO = registro.data || obterDataISOBr(registro.entrada || registro.created_at);
    const chaveUserId = String(registro.user_id || '').trim();
    const perfil = mapaPerfis.get(chaveUserId);

    return {
      ...registro,
      funcionario:
        registro.funcionario_nome ||
        registro.nome_funcionario ||
        perfil?.nome ||
        perfil?.email ||
        registro.user_email ||
        registro.email ||
        'Não informado',
      dataISO,
      entradaFormatada: formatarHoraCurta(registro.entrada),
      saidaFormatada: formatarHoraCurta(registro.saida),
      totalFormatado:
        statusNormalizado === 'encerrado'
          ? formatarDuracaoMs(registro.tempo_trabalhado_ms || 0)
          : 'Em aberto',
      statusNormalizado,
      statusTexto: textoStatus(statusNormalizado),
      statusClasse: obterClasseStatus(statusNormalizado)
    };
  });
}

function atualizarKPIs(registros) {
  const hoje = obterDataHojeBrasil();

  const funcionariosUnicos = new Set();
  const funcionariosPresentes = new Set();

  let registrosHoje = 0;
  let pendencias = 0;

  registros.forEach((registro) => {
    if (registro.funcionario) {
      funcionariosUnicos.add(registro.funcionario);
    }

    if (registro.dataISO === hoje) {
      registrosHoje += 1;
    }

    if (['trabalhando', 'intervalo'].includes(registro.statusNormalizado)) {
      funcionariosPresentes.add(registro.funcionario);
    }

    if (registro.statusNormalizado === 'trabalhando') {
      pendencias += 1;
    }
  });

  if (kpiFuncionariosEl) kpiFuncionariosEl.textContent = String(funcionariosUnicos.size);
  if (kpiPresentesEl) kpiPresentesEl.textContent = String(funcionariosPresentes.size);
  if (kpiRegistrosDiaEl) kpiRegistrosDiaEl.textContent = String(registrosHoje);
  if (kpiPendenciasEl) kpiPendenciasEl.textContent = String(pendencias);
}

function renderizarUltimosRegistros(registros) {
  if (!tabelaUltimosRegistrosEl) return;

  const ultimos = registros.slice(0, 3);

  if (!ultimos.length) {
    tabelaUltimosRegistrosEl.innerHTML = `
      <div class="resumo-linha">
        <strong>Nenhum registro</strong>
        <span>—</span>
        <span>—</span>
        <span>—</span>
        <span class="status-admin vazio">Sem dados</span>
      </div>
    `;
    return;
  }

  tabelaUltimosRegistrosEl.innerHTML = ultimos
    .map(
      (registro) => `
        <div class="resumo-linha">
          <strong>${registro.funcionario}</strong>
          <span>${registro.entradaFormatada}</span>
          <span>${registro.saidaFormatada}</span>
          <span>${registro.totalFormatado}</span>
          <span class="status-admin ${registro.statusClasse}">${registro.statusTexto}</span>
        </div>
      `
    )
    .join('');
}

function renderizarAlertas(registros) {
  if (!listaAlertasEl) return;

  const alertas = registros
    .filter((registro) =>
      ['trabalhando', 'intervalo'].includes(registro.statusNormalizado)
    )
    .slice(0, 3);

  if (!alertas.length) {
    listaAlertasEl.innerHTML = `
      <div class="alerta-vazio">
        <div class="alerta-vazio-icon">!</div>
        <div class="alerta-vazio-texto">
          <strong>Nenhum alerta crítico no momento.</strong>
          <span>Tudo está dentro do esperado agora.</span>
        </div>
      </div>
    `;
    return;
  }

  listaAlertasEl.innerHTML = alertas
    .map(
      (registro) => `
        <div class="alerta-vazio">
          <div class="alerta-vazio-icon">!</div>
          <div class="alerta-vazio-texto">
            <strong>${registro.funcionario}</strong>
            <span>Status atual: ${registro.statusTexto}.</span>
          </div>
        </div>
      `
    )
    .join('');
}

async function carregarDashboard() {
  const registros = await listarDadosDashboard();
  atualizarKPIs(registros);
  renderizarUltimosRegistros(registros);
  renderizarAlertas(registros);
}

async function iniciarDashboard() {
  usuarioAtual = await obterUsuarioAtual();

  if (!usuarioAtual) {
    window.location.href = '../index.html';
    return;
  }

  membroAtual = await obterEmpresaDoUsuario(usuarioAtual.id);

  if (!membroAtual?.empresa_id) {
    console.error('Empresa não encontrada para o usuário atual.');
    return;
  }

  await carregarDashboard();

  clearInterval(intervaloAtualizacao);
  intervaloAtualizacao = setInterval(carregarDashboard, 30000);
}

if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    clearInterval(intervaloAtualizacao);
    await fazerLogout();
  });
}

iniciarDashboard();