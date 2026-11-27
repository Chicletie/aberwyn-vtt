// Gera as duas artes da volta do palco (versão provisória, para o Cadu redesenhar à mão):
//   public/assets/ui/moldura-palco.png  — moldura 9-slice de 34×34: cantos de 12 e um trecho
//                                          de borda de 10 que se repete (480 e 270 são múltiplos de 10)
//   public/assets/ui/fundo-palco.png    — "tapeçaria" de 32×32 que se repete na parte escura
// Rodar:  node scripts/gerar-moldura-palco.mjs
// Depois de redesenhar os PNGs à mão, NÃO rode de novo (ele sobrescreveria o seu desenho).

import { gravarPng } from './png.mjs';

const COR = {
  contorno: '#090a14',
  noite: '#151d28',
  azulEscuro: '#172038',
  azulMedio: '#253a5e',
  azul: '#3c5e8b',
  azulClaro: '#4f8fba',
  ouro: '#e8c170',
  ouroEscuro: '#ad7757',
  laranja: '#da863e',
  cinza: '#394a50',
  claro: '#c7cfcc',
};

function nova(largura, altura) {
  return { largura, altura, pixels: new Uint8Array(largura * altura * 4) };
}

function ponto(img, x, y, hex) {
  if (x < 0 || y < 0 || x >= img.largura || y >= img.altura) return;
  const n = parseInt(hex.slice(1), 16);
  img.pixels.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], (y * img.largura + x) * 4);
}

/** Losango (contorno) de "raio" r centrado em (cx, cy), com miolo opcional. */
function losango(img, cx, cy, r, cor, miolo) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === r) ponto(img, cx + dx, cy + dy, cor);
      else if (d < r && miolo) ponto(img, cx + dx, cy + dy, miolo);
    }
  }
}

// ───────────── Moldura (34×34, canto 12, período 10) ─────────────
// Camadas de fora para dentro (distância até a borda de fora):
//  0 contorno · 1 ouro escuro · 2 ouro · 3 ouro escuro · 4 contorno ·
//  5–9 faixa azul-noite com losangos · 10 contorno · 11 filete azul que encosta no palco.
const TAM = 34;
const moldura = nova(TAM, TAM);
const camada = ['contorno', 'ouroEscuro', 'ouro', 'ouroEscuro', 'contorno', 'azulEscuro', 'azulEscuro', 'azulEscuro', 'azulEscuro', 'azulEscuro', 'contorno', 'azulMedio'];
for (let y = 0; y < TAM; y++) {
  for (let x = 0; x < TAM; x++) {
    const d = Math.min(x, y, TAM - 1 - x, TAM - 1 - y);
    if (d < camada.length) ponto(moldura, x, y, COR[camada[d]]);
  }
}
// Brilho: o ouro do lado de cima e da esquerda é mais claro (a luz vem do alto à esquerda).
for (let i = 2; i < TAM - 2; i++) {
  ponto(moldura, i, 2, COR.ouro);
  ponto(moldura, 2, i, COR.ouro);
  ponto(moldura, i, TAM - 3, COR.laranja);
  ponto(moldura, TAM - 3, i, COR.laranja);
}
// Linha fina no meio da faixa (linha 7), ligando os losangos.
for (let i = 12; i < TAM - 12; i++) {
  ponto(moldura, i, 7, COR.azulMedio);
  ponto(moldura, i, TAM - 8, COR.azulMedio);
  ponto(moldura, 7, i, COR.azulMedio);
  ponto(moldura, TAM - 8, i, COR.azulMedio);
}
// Um losango por trecho de 10 px, no meio do trecho (o trecho que se repete é 12…21).
const MEIO = 12 + 5;
losango(moldura, MEIO, 7, 2, COR.azulClaro, COR.ouro);
losango(moldura, MEIO, TAM - 8, 2, COR.azulClaro, COR.ouro);
losango(moldura, 7, MEIO, 2, COR.azulClaro, COR.ouro);
losango(moldura, TAM - 8, MEIO, 2, COR.azulClaro, COR.ouro);
// Cantos: um broche (losango dourado maior com miolo laranja) onde as faixas se cruzam.
for (const [cx, cy] of [[7, 7], [TAM - 8, 7], [7, TAM - 8], [TAM - 8, TAM - 8]]) {
  losango(moldura, cx, cy, 4, COR.contorno, COR.azulEscuro);
  losango(moldura, cx, cy, 3, COR.ouro, COR.ouroEscuro);
  losango(moldura, cx, cy, 1, COR.ouro, COR.laranja);
  ponto(moldura, cx, cy, COR.claro);
}
gravarPng('public/assets/ui/moldura-palco.png', moldura);

// ───────────── Fundo (tapeçaria 32×32 que se repete) ─────────────
// Treliça de losangos bem apagada, um losango azul no cruzamento do meio e uma estrelinha
// de 4 pontas nos cantos (os mesmos motivos do divisor e das cintilas do palco).
const T = 32;
const fundo = nova(T, T);
for (let y = 0; y < T; y++) {
  for (let x = 0; x < T; x++) {
    const linha = (x - y + T) % T === 0 || (x + y) % T === 0;
    ponto(fundo, x, y, linha ? COR.noite : COR.contorno);
  }
}
losango(fundo, 16, 16, 3, COR.azulEscuro, COR.contorno);
losango(fundo, 16, 16, 1, COR.azulMedio, null);
ponto(fundo, 16, 16, COR.ouroEscuro);
// Estrelinha nos cantos (aparece inteira onde 4 ladrilhos se encontram).
for (const [x, y] of [[0, 0], [1, 0], [T - 1, 0], [0, 1], [0, T - 1]]) ponto(fundo, x, y, COR.cinza);
ponto(fundo, 0, 0, COR.azulClaro);
gravarPng('public/assets/ui/fundo-palco.png', fundo);

console.log('Geradas: public/assets/ui/moldura-palco.png e fundo-palco.png');
