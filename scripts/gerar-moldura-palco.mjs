// Gera as artes da volta do palco (versão provisória, para o Cadu redesenhar à mão).
// Conceito (pedido do Cadu): um MAPA CELESTE aberto sobre a mesa, com o fio dourado como
// moldura; um tinteiro tombou, a pena caiu ao lado, e a tinta escorre apagando as estrelas.
//
//   moldura-palco.png       34×34  9-slice: cantos de 12 (nó do fio com uma estrela de luz) e
//                                  um trecho de 10 que se repete (o fio dourado trançado)
//   fundo-palco.png         64×64  ladrilho: o papel do mapa (os anéis, as estrelas e a tinta
//                                  são desenhados pelo código, em src/palco/ceu.js)
//   ornamento-pena.png      30×100 a pena caída, apoiada, com o bico perto da tinta
//   ornamento-tinteiro.png  36×26  o tinteiro tombado, com a boca virada para a direita
//
// Rodar:  node scripts/gerar-moldura-palco.mjs
// Depois de redesenhar algum PNG à mão, NÃO rode de novo (sobrescreveria o seu desenho).

import { gravarPng } from './png.mjs';

const C = {
  contorno: '#090a14',
  tinta: '#151d28',
  azulEscuro: '#172038',
  azulMedio: '#253a5e',
  azul: '#3c5e8b',
  azulClaro: '#4f8fba',
  ciano: '#a4dddb',
  ouro: '#e8c170',
  ouroEscuro: '#ad7757',
  laranja: '#da863e',
  marrom: '#7a4841',
  cinza: '#394a50',
  cinzaClaro: '#819796',
  claro: '#c7cfcc',
  branco: '#ebede9',
};

// Sorteio repetível (sempre o mesmo desenho a cada vez que roda).
let semente = 7;
const sorte = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);

function nova(largura, altura) {
  return { largura, altura, pixels: new Uint8Array(largura * altura * 4) };
}
function ponto(img, x, y, hex) {
  x = Math.round(x);
  y = Math.round(y);
  if (!hex || x < 0 || y < 0 || x >= img.largura || y >= img.altura) return;
  const n = parseInt(hex.slice(1), 16);
  img.pixels.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], (y * img.largura + x) * 4);
}
function vazio(img, x, y) {
  if (x < 0 || y < 0 || x >= img.largura || y >= img.altura) return true;
  return img.pixels[(y * img.largura + x) * 4 + 3] === 0;
}
/** Estrela de 4 pontas: miolo branco, braços dourados de tamanho "r". */
function estrela(img, x, y, r, braco = C.ouro, miolo = C.branco) {
  for (let i = 1; i <= r; i++) {
    const cor = i === r ? C.ouroEscuro : braco;
    ponto(img, x + i, y, cor); ponto(img, x - i, y, cor); ponto(img, x, y + i, cor); ponto(img, x, y - i, cor);
  }
  ponto(img, x, y, miolo);
}
/** Contorno escuro de 1 px em volta de tudo que foi desenhado (8 vizinhos). */
function contornar(img, cor = C.contorno) {
  const marcar = [];
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      if (!vazio(img, x, y)) continue;
      let perto = false;
      for (let dy = -1; dy <= 1 && !perto; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !vazio(img, x + dx, y + dy)) perto = true;
      if (perto) marcar.push([x, y]);
    }
  }
  for (const [x, y] of marcar) ponto(img, x, y, cor);
}

// ═══════════ Moldura: o fio dourado trançado ═══════════
// Distância até a borda de fora → camada:
//  0 contorno · 1 tinta · 2–6 o FIO trançado (5 px) · 7 contorno · 8 azul médio · 9 azul escuro
//  10 contorno · 11 filete azul que encosta no palco.
// O trançado: faixas inclinadas que se repetem a cada 5 px (2 por trecho de 10).
const TAM = 34;
const moldura = nova(TAM, TAM);
const fixo = { 0: C.contorno, 1: C.tinta, 7: C.contorno, 8: C.azulMedio, 9: C.azulEscuro, 10: C.contorno, 11: C.azul };
function corDoFio(ao, atraves) {
  // ao = posição ao longo do fio; atraves = 0 (lado de fora) … 4 (lado de dentro)
  const fase = (ao + atraves) % 5;
  if (fase === 0) return C.marrom; // o "vão" entre duas voltas do fio
  if (fase === 1) return atraves <= 1 ? C.branco : C.ouro; // brilho da volta
  if (fase === 4) return C.ouroEscuro;
  return atraves >= 3 ? C.laranja : C.ouro;
}
for (let y = 0; y < TAM; y++) {
  for (let x = 0; x < TAM; x++) {
    const d = Math.min(x, y, TAM - 1 - x, TAM - 1 - y);
    if (fixo[d]) { ponto(moldura, x, y, fixo[d]); continue; }
    if (d < 2 || d > 6) continue;
    const atraves = d - 2;
    // Em cima/embaixo o fio corre na horizontal; nos lados, na vertical (mesmo trançado).
    const horizontal = y === d || TAM - 1 - y === d;
    const ao = horizontal ? x : y;
    ponto(moldura, x, y, corDoFio(((ao % 5) + 5) % 5, atraves));
  }
}
// Cantos: o NÓ do fio (uma bola dourada) com uma estrela de luz no meio.
for (const [cx, cy] of [[5, 5], [TAM - 6, 5], [5, TAM - 6], [TAM - 6, TAM - 6]]) {
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const r = Math.hypot(dx, dy);
      if (r > 5.2) continue;
      let cor = r > 4.3 ? C.contorno : C.ouro;
      if (r <= 4.3 && dx + dy > 2) cor = C.laranja; // sombra embaixo à direita
      if (r <= 4.3 && dx + dy > 5) cor = C.ouroEscuro;
      if (r <= 4.3 && r > 2.5 && (dx * 2 + dy * 3 + 40) % 4 === 0) cor = C.marrom; // voltas do nó
      ponto(moldura, cx + dx, cy + dy, cor);
    }
  }
  estrela(moldura, cx - 1, cy - 1, 2, C.branco, C.branco);
}
gravarPng('public/assets/ui/moldura-palco.png', moldura);

// ═══════════ Fundo: o papel do mapa celeste ═══════════
// Só a textura do papel azul-noite (grão discreto). Os anéis do mapa, as estrelas, as
// constelações e a tinta derramada são desenhados pelo código, em lugares únicos.
const T = 64;
const fundo = nova(T, T);
for (let i = 0; i < T * T; i++) ponto(fundo, i % T, Math.floor(i / T), C.azulEscuro);
for (let i = 0; i < 70; i++) ponto(fundo, Math.floor(sorte() * T), Math.floor(sorte() * T), sorte() < 0.75 ? C.tinta : C.azulMedio);
gravarPng('public/assets/ui/fundo-palco.png', fundo);

// ═══════════ A pena caída (apoiada na diagonal, bico embaixo à direita) ═══════════
const pena = nova(30, 100);
{
  const topo = [6, 3];
  const ponta = [25, 96];
  const L = Math.hypot(ponta[0] - topo[0], ponta[1] - topo[1]);
  const eixo = [(ponta[0] - topo[0]) / L, (ponta[1] - topo[1]) / L];
  const normal = [-eixo[1], eixo[0]];
  for (let y = 0; y < pena.altura; y++) {
    for (let x = 0; x < pena.largura; x++) {
      const dx = x - topo[0];
      const dy = y - topo[1];
      const u = dx * eixo[0] + dy * eixo[1]; // ao longo da pena (0 = topo)
      const v = dx * normal[0] + dy * normal[1]; // para o lado (negativo = lado da luz)
      const s = u / L;
      if (s < 0 || s > 1) continue;
      let cor = null;
      if (s < 0.7) {
        // As barbas: mais larga no meio, afinando nas pontas; o lado de fora é mais largo.
        const perfil = Math.sin(Math.PI * Math.min(1, s / 0.7)) ** 0.6;
        const largura = (v < 0 ? 7 : 5) * perfil + 0.5;
        const falha = (v < 0 && Math.abs(s - 0.33) < 0.014) || (v > 0 && Math.abs(s - 0.52) < 0.014);
        if (Math.abs(v) <= largura && !falha) {
          const barba = Math.abs(v) > 1.5 && ((Math.round(u - Math.abs(v) * 0.8) % 3) + 3) % 3 === 0;
          if (Math.abs(v) < 0.8) cor = C.cinzaClaro; // a haste
          else if (v < 0) cor = barba ? C.claro : Math.abs(v) > largura - 1.2 ? C.claro : C.branco;
          else cor = barba ? C.cinzaClaro : Math.abs(v) > largura - 1.2 ? C.cinzaClaro : C.claro;
        }
      } else if (s < 0.88) {
        if (Math.abs(v) < 1.1) cor = v < 0 ? C.claro : C.cinzaClaro; // o cálamo
      } else {
        // O bico dourado, sujo de tinta na ponta.
        const largura = 2 * (1 - (s - 0.88) / 0.12) + 0.4;
        if (Math.abs(v) <= largura) {
          cor = v < -0.3 ? C.ouro : C.laranja;
          if (Math.abs(v) < 0.5 && s > 0.91 && s < 0.97) cor = C.ouroEscuro; // a fenda
          if (s > 0.96) cor = C.azulEscuro; // tinta no bico
        }
      }
      if (cor) ponto(pena, x, y, cor);
    }
  }
  contornar(pena);
}
gravarPng('public/assets/ui/ornamento-pena.png', pena);

// ═══════════ O tinteiro tombado (deitado, boca para a direita) ═══════════
const tinteiro = nova(36, 26);
{
  // Corpo de vidro escuro, quadrado de quinas arredondadas, deitado.
  for (let y = 5; y <= 22; y++) {
    for (let x = 2; x <= 21; x++) {
      const quina = (x < 4 || x > 19) && (y < 7 || y > 20);
      if (quina) continue;
      let cor = C.azulEscuro;
      if (y <= 7) cor = C.azul; // luz de cima
      if (y >= 19) cor = C.tinta; // sombra de baixo
      if (x === 5 && y >= 8 && y <= 13) cor = C.ciano; // reflexo do vidro
      if (x === 6 && y >= 9 && y <= 11) cor = C.azulClaro;
      // A tinta que ainda está dentro, deitada no fundo do vidro.
      if (y >= 15 && y <= 18 && x >= 4 && x <= 20) cor = C.contorno;
      ponto(tinteiro, x, y, cor);
    }
  }
  // Rótulo de papel com uma estrelinha (o tinteiro de quem escreve a Fabula).
  for (let y = 9; y <= 13; y++) for (let x = 10; x <= 17; x++) ponto(tinteiro, x, y, y === 9 ? C.branco : C.claro);
  estrela(tinteiro, 13, 11, 1, C.ouroEscuro, C.ouro);
  // Gargalo com anel dourado e a boca aberta.
  for (let y = 9; y <= 18; y++) {
    for (let x = 22; x <= 30; x++) {
      if (x <= 24 && (y < 10 || y > 17)) continue;
      if (x > 24 && (y < 11 || y > 16)) continue;
      let cor = x <= 24 ? (y <= 11 ? C.branco : y >= 16 ? C.ouroEscuro : C.ouro) : C.azulMedio;
      if (x > 24 && y === 11) cor = C.azul;
      if (x >= 29) cor = C.contorno; // a boca: escuro de tinta
      ponto(tinteiro, x, y, cor);
    }
  }
  contornar(tinteiro);
}
gravarPng('public/assets/ui/ornamento-tinteiro.png', tinteiro);

console.log('Geradas em public/assets/ui/: moldura-palco, fundo-palco, ornamento-pena, ornamento-tinteiro');
