// Gera as artes da volta do palco (versão provisória, para o Cadu redesenhar à mão).
// Conceito (pedido do Cadu): "Pena e Fio" + manuscrito apagado + a luz da Fabula (estrelas).
//
//   moldura-palco.png     34×34  9-slice: cantos de 12 (nó do fio com uma estrela de luz) e
//                                um trecho de 10 que se repete (o fio dourado trançado)
//   fundo-palco.png       96×96  ladrilho: página de manuscrito apagado (as estrelas são do código)
//   ornamento-pena.png    40×120 a pena, em pé, com a ponta encostando no fio (lado esquerdo)
//   ornamento-novelo.png  48×64  o novelo de onde o fio sai (lado direito)
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

// ═══════════ Fundo: manuscrito apagado sob um céu de estrelas ligadas por fios ═══════════
const T = 96;
const fundo = nova(T, T);
for (let i = 0; i < T * T; i++) ponto(fundo, i % T, Math.floor(i / T), C.contorno);
// Linhas de escrita: "palavras" de rabiscos na cor da tinta, com trechos apagados.
for (let linha = 0; linha < 8; linha++) {
  const yBase = 6 + linha * 12;
  let x = Math.floor(sorte() * 6);
  while (x < T - 4) {
    const tamanho = 4 + Math.floor(sorte() * 9);
    const apagada = sorte() < 0.3; // o apagamento: algumas palavras sumiram
    for (let i = 0; i < tamanho && x + i < T; i++) {
      if (apagada && sorte() < 0.8) continue;
      const altura = sorte() < 0.18 ? 3 : 1; // letras altas (l, t, d) e baixas
      const sobe = sorte() < 0.5;
      for (let h = 0; h < altura; h++) ponto(fundo, x + i, yBase + (sobe ? -h : h), C.tinta);
      if (sorte() < 0.5) ponto(fundo, x + i, yBase + 1, C.tinta);
    }
    x += tamanho + 2 + Math.floor(sorte() * 3);
  }
}
// (As estrelas e os fios da constelação NÃO ficam no ladrilho: o palco os desenha em lugares
// únicos, sem repetir, e faz algumas piscarem. Ver src/palco/ceu.js.)
// Pó de estrelas bem apagado, só para a página não ficar chapada.
for (let i = 0; i < 10; i++) ponto(fundo, Math.floor(sorte() * T), Math.floor(sorte() * T), C.azulEscuro);
gravarPng('public/assets/ui/fundo-palco.png', fundo);

// ═══════════ A pena (em pé, levemente inclinada, ponta embaixo à direita) ═══════════
const pena = nova(40, 120);
{
  const topo = [12, 3];
  const ponta = [33, 116];
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
        // As barbas da pena: mais larga no meio, afinando nas pontas; o lado de fora é mais largo.
        const perfil = Math.sin(Math.PI * Math.min(1, s / 0.7)) ** 0.6;
        const largura = (v < 0 ? 9 : 6) * perfil + 0.5;
        // Duas falhas nas barbas (pena de verdade não é lisa).
        const falha = (v < 0 && Math.abs(s - 0.33) < 0.012) || (v > 0 && Math.abs(s - 0.52) < 0.012);
        if (Math.abs(v) <= largura && !falha) {
          // Barbas: linhas que saem da haste inclinadas para cima, a cada 3 px.
          const barba = Math.abs(v) > 1.5 && ((Math.round(u - Math.abs(v) * 0.8) % 3) + 3) % 3 === 0;
          if (Math.abs(v) < 0.8) cor = C.cinzaClaro; // a haste
          else if (v < 0) cor = barba ? C.claro : Math.abs(v) > largura - 1.2 ? C.claro : C.branco;
          else cor = barba ? C.cinzaClaro : Math.abs(v) > largura - 1.2 ? C.cinzaClaro : C.claro;
        }
      } else if (s < 0.89) {
        if (Math.abs(v) < 1.1) cor = v < 0 ? C.claro : C.cinzaClaro; // o cálamo (sem barbas)
      } else {
        // O bico dourado: afina até a ponta, com a fenda no meio.
        const largura = 2.2 * (1 - (s - 0.89) / 0.11) + 0.4;
        if (Math.abs(v) <= largura) {
          cor = v < -0.3 ? C.ouro : C.laranja;
          if (Math.abs(v) < 0.5 && s > 0.92 && s < 0.98) cor = C.ouroEscuro; // a fenda
          if (s > 0.985) cor = C.contorno; // a ponta, molhada de tinta
        }
      }
      if (cor) ponto(pena, x, y, cor);
    }
  }
  contornar(pena);
}
gravarPng('public/assets/ui/ornamento-pena.png', pena);

// ═══════════ O novelo (o fio sai dele para a esquerda, em direção à moldura) ═══════════
const novelo = nova(48, 64);
{
  const cx = 28, cy = 34, R = 13;
  // O fio que sai do novelo e vai até a borda esquerda (onde encosta na moldura), ondulando.
  for (let x = 0; x <= cx - R + 2; x++) {
    const y = cy + 2 + Math.round(Math.sin(x / 3.2) * 1.4);
    ponto(novelo, x, y, C.ouro);
    ponto(novelo, x, y + 1, C.ouroEscuro);
  }
  for (let y = cy - R - 1; y <= cy + R + 1; y++) {
    for (let x = cx - R - 1; x <= cx + R + 1; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r > R) continue;
      // Voltas do fio enrolado: elipses inclinadas em direções diferentes (como os "círculos"
      // de um novelo de verdade), cada uma uma linha escura com um brilho ao lado.
      const luz = -dx - dy; // luz do alto à esquerda
      let cor = luz > 8 ? C.ouro : luz > -6 ? C.laranja : C.ouroEscuro;
      for (const [angulo, achatado] of [[0.35, 0.42], [1.25, 0.7], [2.3, 0.55], [2.9, 0.88]]) {
        const a = dx * Math.cos(angulo) + dy * Math.sin(angulo);
        const b = -dx * Math.sin(angulo) + dy * Math.cos(angulo);
        const e = Math.sqrt((a / R) ** 2 + (b / (R * achatado)) ** 2);
        if (Math.abs(e - 1) < 0.07) cor = luz > 2 ? C.ouroEscuro : C.marrom;
        else if (Math.abs(e - 0.92) < 0.05 && luz > -4) cor = C.branco;
      }
      if (r > R - 1) cor = luz > 0 ? C.ouro : C.marrom;
      ponto(novelo, x, y, cor);
    }
  }
  // A luz da Fabula: uma estrela pousada no novelo.
  estrela(novelo, cx - 5, cy - 6, 3);
  contornar(novelo);
}
gravarPng('public/assets/ui/ornamento-novelo.png', novelo);

console.log('Geradas em public/assets/ui/: moldura-palco, fundo-palco, ornamento-pena, ornamento-novelo');
