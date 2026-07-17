import { supabase } from '../shared/supabase.js';
import {
  obterUsuarioAtual,
  obterEmpresaDoUsuario,
  fazerLogout
} from '../shared/auth.js';
import {
  formatarHora,
  formatarDuracaoMs
} from '../shared/utils.js';

let usuarioAtual = null;
let membroAtual = null;
let intervaloAtualizacao = null;
let registrosCache = [];
let paginaAtual = 1;

const REGISTROS_POR_PAGINA = 10;

const totalRegistrosEl = document.getElementById('totalRegistros');
const registrosCompletosEl = document.getElementById('registrosCompletos');
const ultimaJornadaEl = document.getElementById('ultimaJornada');
const tabelaHistoricoEl = document.getElementById('tabelaHistorico');
const tabelaPaginacaoEl = document.getElementById('tabelaPaginacao');
const btnLogout = document.getElementById('btnLogout');

const campoBusca =
  document.getElementById('buscaFuncionario') ||
  document.getElementById('filtroBusca') ||
  document.getElementById('buscarFuncionario') ||
  document.getElementById('searchInput');

const filtroStatus =
  document.getElementById('filtroStatus') ||
  document.getElementById('statusFiltro') ||
  document.getElementById('selectStatus');

const filtroData =
  document.getElementById('filtroData') ||
  document.getElementById('dataFiltro') ||
  document.getElementById('selectData');

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

function formatarDataLocal(dataIso, fallback = '—') {
  if (!dataIso) return fallback;

  return new Date(dataIso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
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
  if (status === 'trabalhando') return 'Trabalhando';
  return 'Sem status';
}

function obterClasseStatus(status) {
  if (status === 'encerrado') return 'encerrado';
  if (status === 'intervalo') return 'intervalo';
  if (status === 'trabalhando') return 'trabalhando';
  return 'vazio';
}

async function listarHistoricoAdmin() {
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
      dataExibicao: formatarDataLocal(
        registro.entrada || registro.created_at || `${dataISO}T00:00:00`,
        registro.data || '—'
      ),
      entradaFormatada: formatarHoraCurta(registro.entrada),
      intervaloFormatado: formatarHoraCurta(registro.inicio_intervalo),
      retornoFormatado: formatarHoraCurta(registro.fim_intervalo),
      saidaFormatada: formatarHoraCurta(registro.saida),
      totalFormatado: formatarDuracaoMs(registro.tempo_trabalhado_ms || 0),
      statusNormalizado,
      statusTexto: textoStatus(statusNormalizado)
    };
  });
}

function atualizarKPIs(registros) {
  if (!totalRegistrosEl || !registrosCompletosEl || !ultimaJornadaEl) return;

  const hoje = obterDataHojeBrasil();
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

  totalRegistrosEl.textContent = String(registrosDeHoje);
  registrosCompletosEl.textContent = String(funcionariosAtivos.size);

  const ultimoRegistroEncerrado = registrosEncerrados[0];
  ultimaJornadaEl.textContent = ultimoRegistroEncerrado
    ? ultimoRegistroEncerrado.dataExibicao
    : 'Não registrada';
}

function renderizarTabela(registros) {
  if (!tabelaHistoricoEl) return;

  if (!registros.length) {
    tabelaHistoricoEl.innerHTML = `
      <tr>
        <td colspan="8" class="tabela-vazia">Nenhum registro encontrado.</td>
      </tr>
    `;
    return;
  }

  tabelaHistoricoEl.innerHTML = registros
    .map(
      (registro) => `
        <tr>
          <td>${registro.funcionario}</td>
          <td>${registro.dataExibicao}</td>
          <td>${registro.entradaFormatada}</td>
          <td>${registro.intervaloFormatado}</td>
          <td>${registro.retornoFormatado}</td>
          <td>${registro.saidaFormatada}</td>
          <td>${registro.totalFormatado}</td>
          <td>
            <span class="status-admin ${obterClasseStatus(registro.statusNormalizado)}">
              ${registro.statusTexto}
            </span>
          </td>
        </tr>
      `
    )
    .join('');
}

function aplicarFiltros(registros) {
  let filtrados = [...registros];

  const termo = campoBusca?.value?.trim().toLowerCase() || '';
  const statusSelecionado = filtroStatus?.value?.trim().toLowerCase() || '';
  const dataSelecionada = filtroData?.value?.trim() || '';

  if (termo) {
    filtrados = filtrados.filter((registro) =>
      [
        registro.funcionario,
        registro.statusTexto,
        registro.dataExibicao,
        registro.user_id
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    );
  }

  if (statusSelecionado && statusSelecionado !== 'todos') {
    filtrados = filtrados.filter(
      (registro) => registro.statusNormalizado === statusSelecionado
    );
  }

  if (dataSelecionada) {
    filtrados = filtrados.filter((registro) => registro.dataISO === dataSelecionada);
  }

  return filtrados;
}

function paginarRegistros(registros) {
  const totalPaginas = Math.max(1, Math.ceil(registros.length / REGISTROS_POR_PAGINA));

  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas;
  }

  if (paginaAtual < 1) {
    paginaAtual = 1;
  }

  const inicio = (paginaAtual - 1) * REGISTROS_POR_PAGINA;
  const fim = inicio + REGISTROS_POR_PAGINA;

  return {
    registrosPagina: registros.slice(inicio, fim),
    totalPaginas,
    totalRegistros: registros.length,
    inicio,
    fim
  };
}

function renderizarPaginacao(totalPaginas, totalRegistros, inicio, fim) {
  if (!tabelaPaginacaoEl) return;

  if (totalRegistros <= REGISTROS_POR_PAGINA) {
    tabelaPaginacaoEl.innerHTML = '';
    return;
  }

  tabelaPaginacaoEl.innerHTML = `
    <div class="paginacao-info">
      Mostrando ${inicio + 1} a ${Math.min(fim, totalRegistros)} de ${totalRegistros} registros
    </div>
    <div class="paginacao-acoes">
      <button
        type="button"
        class="botao-secundario"
        data-pagina="anterior"
        ${paginaAtual === 1 ? 'disabled' : ''}
      >
        Anterior
      </button>
      <span class="paginacao-pagina">Página ${paginaAtual} de ${totalPaginas}</span>
      <button
        type="button"
        class="botao-secundario"
        data-pagina="proxima"
        ${paginaAtual === totalPaginas ? 'disabled' : ''}
      >
        Próxima
      </button>
    </div>
  `;

  const btnAnterior = tabelaPaginacaoEl.querySelector('[data-pagina="anterior"]');
  const btnProxima = tabelaPaginacaoEl.querySelector('[data-pagina="proxima"]');

  btnAnterior?.addEventListener('click', () => {
    paginaAtual -= 1;
    atualizarTabelaFiltrada();
  });

  btnProxima?.addEventListener('click', () => {
    paginaAtual += 1;
    atualizarTabelaFiltrada();
  });
}

function atualizarTabelaFiltrada() {
  const filtrados = aplicarFiltros(registrosCache);
  const { registrosPagina, totalPaginas, totalRegistros, inicio, fim } =
    paginarRegistros(filtrados);

  renderizarTabela(registrosPagina);
  renderizarPaginacao(totalPaginas, totalRegistros, inicio, fim);
}

async function carregarPainel() {
  registrosCache = await listarHistoricoAdmin();
  atualizarKPIs(registrosCache);
  atualizarTabelaFiltrada();
}

function pararAtualizacaoAutomatica() {
  if (intervaloAtualizacao) {
    clearInterval(intervaloAtualizacao);
    intervaloAtualizacao = null;
  }
}

function iniciarAtualizacaoAutomatica() {
  pararAtualizacaoAutomatica();

  intervaloAtualizacao = setInterval(() => {
    carregarPainel();
  }, 30000);
}

async function sairDoAdmin() {
  pararAtualizacaoAutomatica();

  const saiu = await fazerLogout();

  if (!saiu) {
    alert('Erro ao sair.');
    return;
  }

  window.location.href = '../frontend-funcionario/index.html';
}

async function validarSessaoAdmin() {
  usuarioAtual = await obterUsuarioAtual();

  if (!usuarioAtual) {
    window.location.href = '../frontend-funcionario/index.html';
    return false;
  }

  membroAtual = await obterEmpresaDoUsuario(usuarioAtual.id);

  if (!membroAtual) {
    alert('Usuário não está vinculado a nenhuma empresa.');
    await sairDoAdmin();
    return false;
  }

  const papel = String(membroAtual.papel || '').trim().toLowerCase();

  if (papel !== 'admin') {
    window.location.href = '../frontend-funcionario/index.html';
    return false;
  }

  return true;
}

function configurarEventos() {
  btnLogout?.addEventListener('click', sairDoAdmin);

  campoBusca?.addEventListener('input', () => {
    paginaAtual = 1;
    atualizarTabelaFiltrada();
  });

  filtroStatus?.addEventListener('change', () => {
    paginaAtual = 1;
    atualizarTabelaFiltrada();
  });

  filtroData?.addEventListener('change', () => {
    paginaAtual = 1;
    atualizarTabelaFiltrada();
  });
}

async function inicializarAdmin() {
  const acessoOk = await validarSessaoAdmin();
  if (!acessoOk) return;

  configurarEventos();
  await carregarPainel();
  iniciarAtualizacaoAutomatica();
}

document.addEventListener('DOMContentLoaded', inicializarAdmin);