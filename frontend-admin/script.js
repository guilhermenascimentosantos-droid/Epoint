function lerHistoricoBruto() {
  const historicoSalvo = localStorage.getItem("historicoJornadas");

  if (!historicoSalvo) return [];

  try {
    const historico = JSON.parse(historicoSalvo);
    return Array.isArray(historico) ? historico : [];
  } catch (erro) {
    console.error("Erro ao ler historicoJornadas:", erro);
    return [];
  }
}

function lerJornadaAtual() {
  const dadosSalvos = localStorage.getItem("dadosJornada");

  if (!dadosSalvos) return null;

  try {
    return JSON.parse(dadosSalvos);
  } catch (erro) {
    console.error("Erro ao ler dadosJornada:", erro);
    return null;
  }
}

function formatarTempo(ms) {
  const totalSegundos = Math.floor(ms / 1000);
  const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, "0");
  const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, "0");
  const segundos = String(totalSegundos % 60).padStart(2, "0");

  return `${horas}:${minutos}:${segundos}`;
}

function formatarHoraLocal(dataIso) {
  if (!dataIso) return "—";

  return new Date(dataIso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function formatarDataLocal(dataIso, dataFallback) {
  if (dataIso) {
    return new Date(dataIso).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });
  }

  return dataFallback || "—";
}

function normalizarStatus(status) {
  if (!status) return "vazio";

  if (status === "encerrado") return "encerrado";
  if (status === "intervalo") return "intervalo";
  if (status === "trabalhando") return "trabalhando";
  if (status === "inicial") return "vazio";

  return "vazio";
}

function textoStatus(status) {
  if (status === "encerrado") return "Encerrado";
  if (status === "intervalo") return "Em intervalo";
  if (status === "trabalhando") return "Trabalhando";

  return "Sem status";
}

function listarHistoricoAdmin() {
  const historico = lerHistoricoBruto();
  const jornadaAtual = lerJornadaAtual();

  const registrosHistoricos = historico
    .slice()
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0))
    .map((registro) => ({
      ...registro,
      funcionario: registro.funcionario || "Não informado",
      dataExibicao: formatarDataLocal(registro.entrada, registro.data),
      entradaFormatada: formatarHoraLocal(registro.entrada),
      intervaloFormatado: formatarHoraLocal(registro.inicioIntervalo),
      retornoFormatado: formatarHoraLocal(registro.fimIntervalo),
      saidaFormatada: formatarHoraLocal(registro.saida),
      totalFormatado: registro.tempoTrabalhadoFormatado || "00:00:00",
      statusNormalizado: normalizarStatus(registro.status),
      statusTexto: textoStatus(normalizarStatus(registro.status))
    }));

  const jornadaAberta =
    jornadaAtual &&
    jornadaAtual.estado &&
    jornadaAtual.estado !== "inicial" &&
    jornadaAtual.estado !== "encerrado";

  if (jornadaAberta) {
    const agora = new Date();
    let tempoAtual = jornadaAtual.tempoAcumulado || 0;

    if (jornadaAtual.estado === "trabalhando" && jornadaAtual.inicioContagem) {
      tempoAtual += agora - new Date(jornadaAtual.inicioContagem);
    }

    registrosHistoricos.unshift({
      id: "jornada-atual",
      funcionario: "Guilherme",
      dataExibicao: formatarDataLocal(jornadaAtual.entrada, null),
      entradaFormatada: formatarHoraLocal(jornadaAtual.entrada),
      intervaloFormatado: formatarHoraLocal(jornadaAtual.inicioIntervalo),
      retornoFormatado: formatarHoraLocal(jornadaAtual.fimIntervalo),
      saidaFormatada: "—",
      totalFormatado: formatarTempo(tempoAtual),
      statusNormalizado: normalizarStatus(jornadaAtual.estado),
      statusTexto: textoStatus(normalizarStatus(jornadaAtual.estado)),
      dataISO: jornadaAtual.entrada
        ? new Date(jornadaAtual.entrada).toISOString().split("T")[0]
        : ""
    });
  }

  return registrosHistoricos;
}

function atualizarKPIs(registros) {
  const totalRegistrosEl = document.getElementById("totalRegistros");
  const registrosCompletosEl = document.getElementById("registrosCompletos");
  const ultimaJornadaEl = document.getElementById("ultimaJornada");

  if (!totalRegistrosEl || !registrosCompletosEl || !ultimaJornadaEl) return;

  const agoraBrasil = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );

  const hoje = [
    agoraBrasil.getFullYear(),
    String(agoraBrasil.getMonth() + 1).padStart(2, "0"),
    String(agoraBrasil.getDate()).padStart(2, "0")
  ].join("-");

  const registrosEncerrados = registros.filter(
    (registro) => registro.statusNormalizado === "encerrado"
  );

  const registrosDeHoje = registrosEncerrados.filter((registro) => {
    return registro.dataISO === hoje;
  }).length;

  const statusAtivos = ["trabalhando", "intervalo"];
  const funcionariosAtivos = new Set();

  registros.forEach((registro) => {
    if (statusAtivos.includes(registro.statusNormalizado)) {
      funcionariosAtivos.add(registro.funcionario || "Não informado");
    }
  });

  totalRegistrosEl.textContent = registrosDeHoje;
  registrosCompletosEl.textContent = funcionariosAtivos.size;

  const ultimoRegistroEncerrado = registrosEncerrados[0];

  ultimaJornadaEl.textContent = ultimoRegistroEncerrado
    ? ultimoRegistroEncerrado.dataExibicao
    : "Não registrada";
}

function criarTagStatus(statusNormalizado, statusTexto) {
  return `<span class="status-admin ${statusNormalizado}">${statusTexto}</span>`;
}

function renderizarTabela(registros) {
  const tbody = document.getElementById("tabelaHistorico");
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
    .map((registro) => {
      return `
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
      `;
    })
    .join("");
}

function aplicarFiltros(registros) {
  const filtroBusca = document.getElementById("filtroBusca");
  const filtroData = document.getElementById("filtroData");
  const filtroStatus = document.getElementById("filtroStatus");

  const busca = filtroBusca ? filtroBusca.value.trim().toLowerCase() : "";
  const data = filtroData ? filtroData.value : "";
  const status = filtroStatus ? filtroStatus.value : "";

  return registros.filter((registro) => {
    const bateBusca =
      !busca ||
      registro.funcionario.toLowerCase().includes(busca);

    const bateData =
      !data ||
      registro.dataISO === data;

    const bateStatus =
      !status ||
      registro.statusNormalizado === status;

    return bateBusca && bateData && bateStatus;
  });
}


function traduzirEstadoAtual(estado) {
  if (estado === "trabalhando") return "Trabalhando";
  if (estado === "intervalo") return "Em intervalo";
  if (estado === "encerrado") return "Jornada encerrada";
  return "Aguardando entrada";
}

function atualizarStatusAtual() {
  const jornadaAtual = lerJornadaAtual();

  const statusAtualEl = document.getElementById("statusAtualFuncionario");

  if (!statusAtualEl) return;

  if (!jornadaAtual || !jornadaAtual.estado) {
    statusAtualEl.textContent = "Aguardando entrada";
    return;
  }

  statusAtualEl.textContent = traduzirEstadoAtual(jornadaAtual.estado);
}

function traduzirEstadoAtual(estado) {
  if (estado === "trabalhando") return "Trabalhando";
  if (estado === "intervalo") return "Em intervalo";
  if (estado === "encerrado") return "Jornada encerrada";
  return "Aguardando entrada";
}

function atualizarPainelAdmin() {
  const registros = listarHistoricoAdmin();
  const registrosFiltrados = aplicarFiltros(registros);

  atualizarKPIs(registros);
    atualizarStatusAtual();
  renderizarTabela(registrosFiltrados);
}

function limparFiltros() {
  const filtroBusca = document.getElementById("filtroBusca");
  const filtroData = document.getElementById("filtroData");
  const filtroStatus = document.getElementById("filtroStatus");

  if (filtroBusca) filtroBusca.value = "";
  if (filtroData) filtroData.value = "";
  if (filtroStatus) filtroStatus.value = "";

  atualizarPainelAdmin();
}

function configurarEventos() {
  const botaoFiltrar = document.getElementById("botaoFiltrar");
  const botaoLimpar = document.getElementById("botaoLimpar");
  const filtroBusca = document.getElementById("filtroBusca");
  const filtroData = document.getElementById("filtroData");
  const filtroStatus = document.getElementById("filtroStatus");

  if (botaoFiltrar) {
    botaoFiltrar.addEventListener("click", atualizarPainelAdmin);
  }

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", limparFiltros);
  }

  if (filtroBusca) {
    filtroBusca.addEventListener("input", atualizarPainelAdmin);
  }

  if (filtroData) {
    filtroData.addEventListener("change", atualizarPainelAdmin);
  }

  if (filtroStatus) {
    filtroStatus.addEventListener("change", atualizarPainelAdmin);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === "historicoJornadas") {
      atualizarPainelAdmin();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  configurarEventos();
  atualizarPainelAdmin();
});

setInterval(() => {
  atualizarPainelAdmin();
}, 1000);