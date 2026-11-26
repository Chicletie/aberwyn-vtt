// O CANAL é a única peça que sabe COMO o estado viaja da mesa até o palco.
// Mesa e palco só chamam enviarEstado / aoReceberEstado; não sabem se é local ou internet.
//
// Marco 1: modo LOCAL, com BroadcastChannel (conversa entre abas do mesmo navegador, sem internet).
// Marco 3: modo ONLINE (serviço de tempo real) entra aqui, com as mesmas funções.

/**
 * Abre o canal de uma sala.
 * @param {string} sala Código da sala (no modo local, qualquer texto serve).
 */
export function abrirCanal(sala = 'local') {
  const canal = new BroadcastChannel(`errante-vtt:${sala}`);
  let ultimoEnviado = null;
  /** @type {((estadoPublico: object) => void)[]} */
  const ouvintesEstado = [];

  canal.onmessage = (evento) => {
    const msg = evento.data;
    if (msg.tipo === 'estado') {
      for (const ouvinte of ouvintesEstado) ouvinte(msg.estado);
    }
    // Um palco que acabou de abrir pede o estado atual; quem tiver (a mesa) responde.
    if (msg.tipo === 'pedido' && ultimoEnviado) {
      canal.postMessage({ tipo: 'estado', estado: ultimoEnviado });
    }
  };

  return {
    /** Mesa: manda o estado PÚBLICO (nunca o completo) para todos os palcos. */
    enviarEstado(estadoPublico) {
      ultimoEnviado = estadoPublico;
      canal.postMessage({ tipo: 'estado', estado: estadoPublico });
    },

    /** Palco: registra o que fazer quando chegar um estado novo. */
    aoReceberEstado(funcao) {
      ouvintesEstado.push(funcao);
    },

    /** Palco: pede o estado atual (usado ao abrir ou recarregar a página). */
    pedirEstado() {
      canal.postMessage({ tipo: 'pedido' });
    },
  };
}
