// Paleta própria do projeto: Apollo (AdamCYounis, Lospec) + 13 cores extras do Cadu.
//
// REGRAS (ver docs/SPEC.md, "Paleta própria do projeto"):
// - Pode AJUSTAR o valor de uma cor (ex.: deixar um verde mais quente).
// - NÃO pode reordenar nem apagar: a ORDEM é o que a futura troca de paleta vai usar.
// - Toda cor usada no app sai daqui. O CSS usa as variáveis geradas por aplicarPaletaNoCss().

export const versao = 1;

/** As 46 cores da Apollo, na ordem original. */
export const base = [
  '#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb', '#19332d', '#25562e',
  '#468232', '#75a743', '#a8ca58', '#d0da91', '#4d2b32', '#7a4841', '#ad7757', '#c09473',
  '#d7b594', '#e7d5b3', '#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170',
  '#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#da863e', '#1e1d39', '#402751',
  '#7a367b', '#a23e8c', '#c65197', '#df84a5', '#090a14', '#10141f', '#151d28', '#202e37',
  '#394a50', '#577277', '#819796', '#a8b5b2', '#c7cfcc', '#ebede9',
];

/** 13 extras: 8 das referências de estilo + 5 tons de pele. */
export const extras = [
  '#e38a6a', '#b42f43', '#c9a962', '#b29b8e', '#897d6e', '#7e5f52', '#9fad57', '#827d55',
  '#5c3426', '#8a573b', '#b98058', '#e0aa80', '#f3cba8',
];

/** Lista completa e ordenada (base + extras). */
export const todas = [...base, ...extras];

/**
 * Cores com NOME DE USO. Cada uma aponta para uma cor da paleta (nunca um hex solto).
 * Se o Cadu ajustar a paleta, estes usos acompanham.
 */
export const cores = {
  // Janelas e fundos
  janela: base[1], //            #253a5e  fundo das caixas
  janelaClaro: base[2], //       #3c5e8b  chanfro claro
  fundoEscuro: base[0], //       #172038  fundo vazio das barras, faixa de turnos
  borda: base[44], //            #c7cfcc  borda das caixas
  contorno: base[36], //         #090a14  contorno preto e letterbox
  costura: base[41], //          #577277  costura, "já agiu"
  linhaEscura: base[40], //      #394a50
  // Texto
  texto: base[45], //            #ebede9
  textoSecundario: base[43], //  #a8b5b2
  dourado: base[23], //          #e8c170
  laranja: base[29], //          #da863e
  // Barras
  pv: base[9], pvBrilho: base[10], pvSombra: base[8], //              verde
  pvCrise: base[28], pvCriseBrilho: base[29], pvCriseSombra: base[27], // vermelho/laranja
  pm: base[4], pmBrilho: base[5], pmSombra: base[3], //               azul
  rotuloPv: base[10], rotuloPm: base[5], rotuloPi: base[23],
  // Lados
  inimigo: base[27], //          #a53030
  vilao: base[26], //            #752438
  // Cenário provisório (sem arte)
  ceu: base[4], horizonte: base[5], chao: base[8], chaoFundo: base[7],
  sombra: base[6], //            #19332d  sombra oval sob os sprites
};

/** As 8 cores-assinatura de reserva, para heróis ainda sem arte. */
export const assinaturasReserva = [
  '#da863e', '#e8c170', '#a8ca58', '#4f8fba', '#a4dddb', '#df84a5', '#c65197', '#ad7757',
];

/**
 * Cria as variáveis CSS (--cor-janela, --cor-texto, …) a partir de `cores`.
 * Assim o CSS nunca tem um hex escrito à mão.
 */
export function aplicarPaletaNoCss() {
  const raiz = document.documentElement.style;
  for (const [nome, hex] of Object.entries(cores)) {
    // "janelaClaro" vira "--cor-janela-claro"
    const nomeCss = nome.replace(/[A-Z]/g, (letra) => '-' + letra.toLowerCase());
    raiz.setProperty(`--cor-${nomeCss}`, hex);
  }
}

/**
 * Escurece uma cor hex numa proporção (0.25 = 25% mais escura). Usado nas caudas da fita.
 * @param {string} hex
 * @param {number} proporcao
 */
export function escurecer(hex, proporcao) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (deslocamento) => Math.round(((n >> deslocamento) & 255) * (1 - proporcao));
  return '#' + [16, 8, 0].map((d) => canal(d).toString(16).padStart(2, '0')).join('');
}

/**
 * Mistura uma cor com branco (0.5 = metade do caminho até o branco). Usado no brilho da seta.
 * @param {string} hex
 * @param {number} proporcao
 */
export function clarear(hex, proporcao) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (deslocamento) => {
    const v = (n >> deslocamento) & 255;
    return Math.round(v + (255 - v) * proporcao);
  };
  return '#' + [16, 8, 0].map((d) => canal(d).toString(16).padStart(2, '0')).join('');
}
