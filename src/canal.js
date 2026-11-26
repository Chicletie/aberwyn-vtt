// O CANAL é a única peça que sabe COMO o estado viaja da mesa até o palco.
// Mesa e palco só chamam enviarEstado / aoReceberEstado; não sabem se é local ou internet.
//
// Dois caminhos, que funcionam juntos:
// - LOCAL: BroadcastChannel, conversa entre abas do MESMO navegador, sem internet.
//   Serve para o mestre testar sozinho e para a prévia numa segunda aba.
// - ONLINE: o serviço de tempo real (Firebase). A mesa grava o estado público na sala;
//   cada palco, em qualquer lugar, escuta a sala e redesenha.

import { onlineConfigurado, gravarSala, escutarSala, aoMudarConexao } from './online.js';

const INTERVALO_MINIMO_MS = 100; // no máximo 10 gravações por segundo no serviço online

/**
 * Abre o canal.
 * @param {{sala?: string|null, online?: boolean}} [opcoes]
 *   sala = código da sala online; online = usar o serviço online (se estiver configurado).
 */
export function abrirCanal(opcoes = {}) {
  const local = new BroadcastChannel('errante-vtt:local');
  let ultimoEnviado = null;
  let sala = opcoes.sala ?? null;
  const usarOnline = !!opcoes.online && onlineConfigurado();
  /** @type {((estadoPublico: object) => void)[]} */
  const ouvintesEstado = [];
  /** @type {((erro: Error|null) => void)[]} */
  const ouvintesErro = [];

  local.onmessage = (evento) => {
    const msg = evento.data;
    // O palco online ignora o canal local (senão veria duas mesas ao mesmo tempo).
    if (msg.tipo === 'estado' && !(usarOnline && sala && opcoes.palco)) {
      for (const ouvinte of ouvintesEstado) ouvinte(msg.estado);
    }
    // Um palco que acabou de abrir pede o estado atual; quem tiver (a mesa) responde.
    if (msg.tipo === 'pedido' && ultimoEnviado) {
      local.postMessage({ tipo: 'estado', estado: ultimoEnviado });
    }
  };

  // ── Gravação online com freio: se a mesa mudar 30 coisas num segundo, grava no máximo
  //    10 vezes, sempre com o estado mais recente (nada se perde, só se junta).
  let ultimaGravacao = 0;
  let pendente = null;
  let temporizador = null;
  const gravarAgora = () => {
    temporizador = null;
    if (!pendente || !sala) return;
    const estado = pendente;
    pendente = null;
    ultimaGravacao = Date.now();
    gravarSala(sala, estado).then(
      () => ouvintesErro.forEach((f) => f(null)),
      (erro) => ouvintesErro.forEach((f) => f(erro)),
    );
  };

  // ── Palco online: escuta a sala.
  if (usarOnline && sala && opcoes.palco) {
    escutarSala(sala, (estado) => ouvintesEstado.forEach((f) => f(estado)));
  }

  return {
    /** Online de verdade? (configurado e pedido) */
    online: usarOnline,

    /** Mesa: troca o código da sala (o próximo envio já vai para a sala nova). */
    definirSala(novaSala) {
      sala = novaSala;
    },

    /** Mesa: manda o estado PÚBLICO (nunca o completo) para todos os palcos. */
    enviarEstado(estadoPublico, { gravarOnline = true } = {}) {
      ultimoEnviado = estadoPublico;
      local.postMessage({ tipo: 'estado', estado: estadoPublico });
      if (!usarOnline || !sala || !gravarOnline) return;
      pendente = estadoPublico;
      if (temporizador) return;
      const espera = Math.max(0, INTERVALO_MINIMO_MS - (Date.now() - ultimaGravacao));
      temporizador = setTimeout(gravarAgora, espera);
    },

    /** Palco: registra o que fazer quando chegar um estado novo. */
    aoReceberEstado(funcao) {
      ouvintesEstado.push(funcao);
    },

    /** Palco local: pede o estado atual (o online já recebe sozinho ao conectar). */
    pedirEstado() {
      local.postMessage({ tipo: 'pedido' });
    },

    /** Avisa quando a conexão com o serviço online cai ou volta (true = conectado). */
    aoMudarConexao(funcao) {
      if (usarOnline) aoMudarConexao(funcao);
      else funcao(true);
    },

    /** Mesa: avisa quando uma gravação online falha (ex.: sem permissão) ou volta a dar certo. */
    aoErroDeGravacao(funcao) {
      ouvintesErro.push(funcao);
    },
  };
}
