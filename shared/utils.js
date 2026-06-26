export function formatarHora(dataIso) {
  if (!dataIso) return 'Aguardando...';

  return new Date(dataIso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatarDataHoraBanco(dataIso) {
  if (!dataIso) return 'Não registrado';

  return new Date(dataIso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium'
  });
}

export function formatarDataComDiaSemana(dataIso) {
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

export function formatarDuracaoMs(ms) {
  const totalSegundos = Math.max(0, Math.floor((ms || 0) / 1000));
  const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, '0');
  const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, '0');
  const segundos = String(totalSegundos % 60).padStart(2, '0');

  return `${horas}:${minutos}:${segundos}`;
}

export function formatarPeriodo(inicio, fim) {
  if (inicio === 'Não registrado' && fim === 'Não registrado') {
    return 'Não registrado';
  }

  if (inicio !== 'Não registrado' && fim === 'Não registrado') {
    return `${inicio} → Em andamento`;
  }

  return `${inicio} → ${fim}`;
}

export function aplicarClasseVazia(elemento, temValor) {
  if (!elemento) return;
  elemento.classList.toggle('vazio', !temValor);
}

export function classeStatusHistorico(status) {
  if (status === 'encerrado') return 'status-encerrado';
  if (status === 'intervalo') return 'status-intervalo';
  if (status === 'trabalhando') return 'status-trabalhando';
  return 'status-inicial';
}