let entrada = null; // Variável para armazenar o horário de entrada
let inicioIntervalo = null; // Variável para armazenar o horário de início do intervalo
let fimIntervalo = null; // Variável para armazenar o horário de fim do intervalo
let saida = null; // Variável para armazenar o horário de saída

let tempoAcumulado = 0; // soma do tempo total trabalhado
let inicioContagem = null; // marca de onde a contagem atual começou (pode ser a entrada ou o fim do intervalo)

let estado = "inicial"; // diz em que fase do processo estamos: "inicial", "trabalhando", "intervalo", "voltando", "finalizado"

function formatarHora(data) {
    return data. toLocaleTimeString("pt-BR"); // Formata a hora no formato HH:MM:SS
}

function formatarTempo(ms) {
    const totalSegundos = Math.floor(ms / 1000);
    const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, '0');
    const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, '0');
    const segundos = String((totalSegundos % 60)).padStart(2, '0');

    return `${horas}:${minutos}:${segundos}`; // Formata o tempo acumulado no formato HH:MM:SS
}

function registrarEntrada() {
    if (estado !== "inicial") return; // Só pode registrar entrada se estiver no estado inicial

    entrada = new Date(); // Registra o horário de entrada
    inicioContagem = entrada; // A contagem do tempo começa na entrada
    estado = "trabalhando"; // Atualiza o estado para "trabalhando"

    const entradaHoraE1 = document.getElementById("entradaHora");
    entradaHoraE1.textContent = formatarHora(entrada); // Exibe o horário de entrada
    entradaHoraE1.classList.remove("vazio"); // Remove a classe de estilo "vazio" para mostrar que a entrada foi registrada

    atualizarStatusCard("entradaStatus", "Entrada registrada", "status-concluido"); // Atualiza o status da entrada
    document.getElementById("resumoEntrada").textContent = formatarHora(entrada); // Atualiza o resumo da entrada

    atualizarBotoes(); // Atualiza os botões disponíveis
    atualizarStatusGeral(); // Atualiza o status geral
}

function registrarIntervalo() {
    if (estado !== "trabalhando") return; // Só pode registrar intervalo se estiver trabalhando

    inicioIntervalo = new Date(); // Registra o horário de início do intervalo
    tempoAcumulado += inicioIntervalo - inicioContagem; // Acumula o tempo trabalhado até o início do intervalo
    estado = "intervalo"; // Atualiza o estado para "intervalo"

    const intervaloHoraE1 = document.getElementById("intervaloHora");
    intervaloHoraE1.textContent = formatarHora(inicioIntervalo); // Exibe o horário de início do intervalo
    intervaloHoraE1.classList.remove("vazio"); // Remove a classe de estilo "vazio" para mostrar que o intervalo foi registrado
    
    atualizarStatusCard("intervaloStatus", "Intervalo em andamento", "status-ativo"); // Atualiza o status do intervalo
    document.getElementById("resumoIntervalo").textContent = formatarHora(inicioIntervalo); // Atualiza o resumo do intervalo

    atualizarBotoes(); // Atualiza os botões disponíveis
    atualizarStatusGeral(); // Atualiza o status geral
}

function encerrarIntervalo() {
    if (estado !== "intervalo") return; // Só pode encerrar intervalo se estiver no intervalo

    fimIntervalo = new Date(); // Registra o horário de fim do intervalo
    inicioContagem = fimIntervalo; // A contagem do tempo volta a partir do fim do intervalo
    estado = "trabalhando"; // Atualiza o estado para "trabalhando"

    atualizarStatusCard("intervaloStatus", "Intervalo encerrado", "status-concluido"); // Atualiza o status do intervalo

    atualizarBotoes(); // Atualiza os botões disponíveis
    atualizarStatusGeral(); // Atualiza o status geral
}

function registrarSaida() {
    if (estado !== "trabalhando") return; // Só pode registrar saída se estiver trabalhando

    saida = new Date(); // Registra o horário de saída
    tempoAcumulado += saida - inicioContagem; // Acumula o tempo trabalhado até a saída
    estado = "encerrado"; // Atualiza o estado para "finalizado"

    const saidaHoraE1 = document.getElementById("saidaHora");
    saidaHoraE1.textContent = formatarHora(saida); // Exibe o horário de saída
    saidaHoraE1.classList.remove("vazio"); // Remove a classe de estilo "vazio" para mostrar que a saída foi registrada

    atualizarStatusCard("saidaStatus", "Saída registrada", "status-concluido"); // Atualiza o status da saída
    document.getElementById("resumoSaida").textContent = formatarHora(saida); // Atualiza o resumo da saída
    document.getElementById("tempoTrabalhado").textContent = formatarTempo(tempoAcumulado); // Exibe o tempo total acumulado

    atualizarBotoes(); // Atualiza os botões disponíveis
    atualizarStatusGeral(); // Atualiza o status geral
}

function atualizarTempoNaTela() {
    let tempoAtual = tempoAcumulado; // Começa com o tempo acumulado até agora

    if (estado === "trabalhando" && inicioContagem) {
        tempoAtual += new Date() - inicioContagem; // Adiciona o tempo desde a última marcação (entrada ou fim do intervalo)
    }

    document.getElementById("tempoTrabalhado").textContent = formatarTempo(tempoAtual); // Atualiza o tempo trabalhado na tela
}

setInterval(atualizarTempoNaTela, 1000); // Atualiza o tempo trabalhado a cada segundo

function atualizarBotoes() {
  const botaoEntrada = document.getElementById("botaoEntrada");
  const botaoIntervalo = document.getElementById("botaoIntervalo");
  const botaoSaida = document.getElementById("botaoSaida");

  if (estado === "inicial") {
    botaoEntrada.disabled = false;
    botaoIntervalo.disabled = true;
    botaoSaida.disabled = true;
  
    botaoIntervalo.textContent = "Registrar intervalo";
    botaoIntervalo.onclick = registrarIntervalo;
  }
  
    else if (estado === "trabalhando") {
    botaoEntrada.disabled = true;
    botaoIntervalo.disabled = false;
    botaoSaida.disabled = false;

    botaoIntervalo.textContent = "Registrar intervalo";
    botaoIntervalo.onclick = registrarIntervalo;
  }

    else if (estado === "intervalo") {
    botaoEntrada.disabled = true;
    botaoIntervalo.disabled = false;
    botaoSaida.disabled = true;

    botaoIntervalo.textContent = "Encerrar intervalo";
    botaoIntervalo.onclick = encerrarIntervalo;
  }

    else if (estado === "encerrado") {
    botaoEntrada.disabled = true;
    botaoIntervalo.disabled = true;
    botaoSaida.disabled = true;
  }
}

function atualizarStatusGeral() {
    const statusGeral = document.getElementById("statusGeral");

    statusGeral.classList.remove(
        "status-inicial",
        "status-trabalhando",
        "status-intervalo",
        "status-encerrado"); // Remove todas as classes de status

    if (estado === "inicial") {
        statusGeral.textContent = "Aguardando Entrada";
        statusGeral.classList.add("status-inicial");
    }
    else if (estado === "trabalhando") {
        statusGeral.textContent = "Trabalhando";
        statusGeral.classList.add("status-trabalhando");
    }
    else if (estado === "intervalo") {
        statusGeral.textContent = "Em Intervalo";
        statusGeral.classList.add("status-intervalo");
    }
    else if (estado === "encerrado") {
        statusGeral.textContent = "Jornada Encerrada";
        statusGeral.classList.add("status-encerrado");
    }
}

function atualizarStatusCard (idElemento, texto, classeEstado) {
    const elemento = document.getElementById(idElemento);

    elemento.textContent = texto; // Atualiza o texto do status
    elemento.classList.remove("status-aguardando", "status-ativo", "status-concluido"); // Remove todas as classes de status
    elemento.classList.add(classeEstado); // Adiciona a classe do estado atual
}

atualizarBotoes(); // Configura os botões corretamente ao carregar a página
atualizarStatusGeral(); // Configura o status geral corretamente ao carregar a página
atualizarTempoNaTela(); // Atualiza o tempo trabalhado na tela ao carregar a página