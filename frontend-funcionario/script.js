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
    const horas = Math.floor(totalSegundos / 3600) .padStart(2, '0');
    const minutos = Math.floor((totalSegundos % 3600) / 60) .padStart(2, '0');
    const segundos = (totalSegundos % 60) .padStart(2, '0');

    return `${horas}:${minutos}:${segundos}`; // Formata o tempo acumulado no formato HH:MM:SS
}

function registrarEntrada() {
    if (estado !== "inicial") return; // Só pode registrar entrada se estiver no estado inicial

    entrada = new Date(); // Registra o horário de entrada
    inicioContagem = entrada; // A contagem do tempo começa na entrada
    estado = "trabalhando"; // Atualiza o estado para "trabalhando"

    document.getElementById("entrada").textContent = formatarHora(entrada); // Exibe o horário de entrada
    document.getElementById("entradaStatus").textContent = "Entrada registrada"; // Atualiza o status da entrada
    document.getElementById("resumoEntrada").textContent = formatarHora(entrada); // Atualiza o resumo da entrada

    atualizarBotoes(); // Atualiza os botões disponíveis
}

function registrarIntervalo() {
    if (estado !== "trabalhando") return; // Só pode registrar intervalo se estiver trabalhando

    inicioIntervalo = new Date(); // Registra o horário de início do intervalo
    tempoAcumulado += inicioIntervalo - inicioContagem; // Acumula o tempo trabalhado até o início do intervalo
    estado = "intervalo"; // Atualiza o estado para "intervalo"

    document.getElementById("IntervaloHorario").textContent = formatarHora(inicioIntervalo); // Exibe o horário de início do intervalo
    document.getElementById("intervaloStatus").textContent = "Intervalo em andamento";
    document.getElementById("resumoIntervalo").textContent = formatarHora(inicioIntervalo); // Atualiza o resumo do início do intervalo

    atualizarBotoes(); // Atualiza os botões disponíveis
}

function encerrarIntervalo() {
    if (estado !== "intervalo") return; // Só pode encerrar intervalo se estiver no intervalo

    fimIntervalo = new Date(); // Registra o horário de fim do intervalo
    inicioContagem = fimIntervalo; // A contagem do tempo volta a partir do fim do intervalo
    estado = "trabalhando"; // Atualiza o estado para "trabalhando"

    document.getElementById("intervaloStatus").textContent = "Intervalo encerrado"; // Atualiza o status do intervalo

    atualizarBotoes(); // Atualiza os botões disponíveis
}

function registrarSaida() {
    if (estado !== "trabalhando") return; // Só pode registrar saída se estiver trabalhando

    saida = new Date(); // Registra o horário de saída
    tempoAcumulado += saida - inicioContagem; // Acumula o tempo trabalhado até a saída
    estado = "encerrado"; // Atualiza o estado para "finalizado"

    document.getElementById("saidaHora").textContent = formatarHora(saida); // Exibe o horário de saída
    document.getElementById("saidaStatus").textContent = "Saída registrada"; // Atualiza o status da saída
    document.getElementById("resumoSaida").textContent = formatarHora(saida); // Atualiza o resumo da saída
    document.getElementById("tempoTrabalhado").textContent = formatarTempo(tempoAcumulado); // Exibe o tempo total acumulado

    atualizarBotoes(); // Atualiza os botões disponíveis
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
    const botaoFimIntervalo = document.getElementById("botaoFimIntervalo");
    const botaoSaida = document.getElementById("botaoSaida");

    if (estado === "inicial") {
        botaoEntrada.disabled = false;
        botaoIntervalo.disabled = true;
        botaoFimIntervalo.disabled = true;
        botaoSaida.disabled = true;
    } else if (estado === "trabalhando") {
        botaoEntrada.disabled = true;
        botaoIntervalo.disabled = false;
        botaoFimIntervalo.disabled = false;
        botaoSaida.disabled = true;
    } else if (estado === "intervalo") {
        botaoEntrada.disabled = true;
        botaoIntervalo.disabled = true;
        botaoFimIntervalo.disabled = false;
        botaoSaida.disabled = true;
    } else if (estado === "encerrado") {
        botaoEntrada.disabled = true;
        botaoIntervalo.disabled = true;
        botaoFimIntervalo.disabled = true;
        botaoSaida.disabled = false;
    }
}
