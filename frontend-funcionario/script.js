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

