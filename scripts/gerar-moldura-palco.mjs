// Gera as artes da volta do palco (versão provisória, para o Cadu redesenhar à mão).
// Conceito (pedido do Cadu): um MAPA CELESTE aberto sobre a mesa, com o fio dourado como
// moldura; um tinteiro tombou, a pena caiu ao lado, e a tinta escorre apagando as estrelas.
//
//   moldura-palco.png       34×34  9-slice: cantos de 12 (nó do fio com uma estrela de luz) e
//                                  um trecho de 10 que se repete (o fio dourado trançado)
//   fundo-palco.png         64×64  ladrilho: o papel do mapa (os anéis, as estrelas e a tinta
//                                  são desenhados pelo código, em src/palco/ceu.js)
//   ornamento-pena.png          a pena, com o bico mergulhado na poça de tinta
//   ornamento-tinteiro.png      o tinteiro tombado, visto de cima, boca para o palco
//   ornamento-novelo.png        o novelo (o fio até a moldura é desenhado pelo código)
//   ornamento-mapa.png          um mapa grande, jogado (metade para fora da tela)
//   ornamento-instrumentos.png  esquadro, compasso e lápis
//   ornamento-baralho.png       o objeto do Wesley
//   ornamento-pincel.png        o objeto da Nue (tinta vermelho-sangue)
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

// ═══════════ Objetos sobre a mesa ═══════════
// Cada objeto é desenhado "girado": para cada pixel da imagem, calculamos onde ele cai no
// desenho reto do objeto (u = ao longo, v = de lado) e escolhemos a cor ali. Assim dá para
// deitar o objeto na diagonal sem desenhar pixel a pixel.

/** Desenha "pintar(u, v)" girado de "angulo" (graus) em volta de (cx, cy). */
function girado(img, cx, cy, angulo, pintar) {
  const a = (angulo * Math.PI) / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      const dx = x - cx, dy = y - cy;
      const cor = pintar(dx * c + dy * s, -dx * s + dy * c);
      if (cor) ponto(img, x, y, cor);
    }
  }
}

/** Sombra na mesa: elipse mais escura que o papel, sem contorno, só nos pixels vazios. */
function sombra(img, cx, cy, rx, ry) {
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      if (vazio(img, x, y) && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) ponto(img, x, y, C.tinta);
    }
  }
}

/** Espelha a imagem na horizontal (para virar o objeto para o outro lado). */
function espelhar(img) {
  const copia = img.pixels.slice();
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      const de = (y * img.largura + (img.largura - 1 - x)) * 4;
      img.pixels.set(copia.subarray(de, de + 4), (y * img.largura + x) * 4);
    }
  }
}

/** Polígono cheio (lista de pontos), para as faces do tinteiro. */
function poligono(img, pontos, cor) {
  const ys = pontos.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const cruzamentos = [];
    for (let i = 0; i < pontos.length; i++) {
      const [x1, y1] = pontos[i];
      const [x2, y2] = pontos[(i + 1) % pontos.length];
      if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) cruzamentos.push(x1 + ((y + 0.5 - y1) * (x2 - x1)) / (y2 - y1));
    }
    cruzamentos.sort((a, b) => a - b);
    for (let i = 0; i + 1 < cruzamentos.length; i += 2) {
      for (let x = Math.round(cruzamentos[i]); x < Math.round(cruzamentos[i + 1]); x++) ponto(img, x, y, typeof cor === 'function' ? cor(x, y) : cor);
    }
  }
}

// ─── A pena (curva, barbas bem marcadas, bico mergulhado e melado de tinta) ───
// Deitada na diagonal; o bico fica embaixo à direita, em (PENA_BICO), dentro da poça.
const pena = nova(44, 116);
export const PENA_BICO = [40, 112];
{
  const topo = [5, 3];
  const ponta = PENA_BICO;
  const L = Math.hypot(ponta[0] - topo[0], ponta[1] - topo[1]);
  const eixo = [(ponta[0] - topo[0]) / L, (ponta[1] - topo[1]) / L];
  const normal = [-eixo[1], eixo[0]];
  const curva = (s) => Math.sin(Math.PI * s) * 4; // a haste é levemente curva
  for (let y = 0; y < pena.altura; y++) {
    for (let x = 0; x < pena.largura; x++) {
      const dx = x - topo[0];
      const dy = y - topo[1];
      const u = dx * eixo[0] + dy * eixo[1];
      const s = u / L;
      if (s < 0 || s > 1) continue;
      const v = dx * normal[0] + dy * normal[1] - curva(s);
      let cor = null;
      if (s < 0.68) {
        const perfil = Math.sin(Math.PI * Math.min(1, s / 0.68)) ** 0.55;
        const largura = (v < 0 ? 10 : 6.5) * perfil + 0.5;
        // Barbas separadas em dois lugares, como pena de verdade que já foi muito usada.
        const falha = (v < 0 && Math.abs(s - 0.3) < 0.012) || (v < 0 && Math.abs(s - 0.47) < 0.01) || (v > 0 && Math.abs(s - 0.55) < 0.012);
        if (Math.abs(v) <= largura && !falha) {
          const barba = Math.abs(v) > 1.4 && ((Math.round(u * 1.1 - Math.abs(v) * 0.9) % 3) + 3) % 3 === 0;
          const borda = Math.abs(v) > largura - 1.3;
          if (Math.abs(v) < 0.75) cor = C.cinzaClaro; // a haste
          else if (v < 0) cor = borda ? C.claro : barba ? C.claro : s < 0.12 ? C.ciano : C.branco;
          else cor = borda ? C.cinza : barba ? C.cinzaClaro : C.claro;
          // A ponta de cima da pena um pouco mais escura (as barbas são mais finas ali).
          if (s < 0.06 && Math.abs(v) > 1) cor = C.cinzaClaro;
        }
      } else if (s < 0.86) {
        if (Math.abs(v) < 1.2) cor = v < 0 ? C.branco : C.cinzaClaro; // o cálamo, sem barbas
      } else {
        // O bico dourado; da metade para a ponta, molhado de tinta (brilho azulado).
        const largura = 2.3 * (1 - (s - 0.86) / 0.14) + 0.4;
        if (Math.abs(v) <= largura) {
          cor = v < -0.3 ? C.ouro : C.laranja;
          if (Math.abs(v) < 0.5 && s > 0.89 && s < 0.93) cor = C.ouroEscuro; // a fenda
          if (s > 0.92) cor = v < -0.5 ? C.azulMedio : C.contorno; // tinta no bico
        }
      }
      if (cor) ponto(pena, x, y, cor);
    }
  }
  contornar(pena);
}
gravarPng('public/assets/ui/ornamento-pena.png', pena);

// ─── O tinteiro tombado, VISTO DE CIMA (como tudo na mesa) ───
// Vidro quadrado deitado: de cima vemos a face de cima (com o rótulo) e, embaixo, uma
// faixinha da lateral (a espessura). A tinta que ficou dentro escurece o vidro do lado de
// baixo. Gargalo e boca para a DIREITA: virado para dentro, para o palco; a tinta sai por ali.
// Sem sombra: a poça de tinta é a sombra.
const tinteiro = nova(64, 40);
export const TINTEIRO_BOCA = [62, 19];
{
  // Corpo: face de cima (y 4..28) e a lateral vista de cima (y 29..33), com quinas arredondadas.
  for (let y = 4; y <= 33; y++) {
    for (let x = 2; x <= 41; x++) {
      const quina = (x < 4 || x > 39) && (y < 6 || y > 31);
      if (quina) continue;
      let cor;
      if (y >= 29) cor = y === 29 ? C.azul : C.azulEscuro; // a lateral (espessura do vidro)
      else if (y >= 22) cor = C.contorno; // a tinta deitada no lado de baixo, vista pelo vidro
      else if (y === 21) cor = C.azulMedio; // a superfície da tinta lá dentro
      else cor = y <= 6 ? C.azulClaro : C.azul; // o vidro, mais claro na borda de cima
      if (y >= 5 && y <= 26 && (x === 5 || x === 6)) cor = y < 20 ? C.ciano : C.azulMedio; // reflexo comprido
      if (x === 38 && y >= 7 && y <= 13) cor = C.azulClaro; // reflexo do outro lado
      ponto(tinteiro, x, y, cor);
    }
  }
  // Arestas: a de cima pega a luz.
  for (let x = 4; x <= 39; x++) ponto(tinteiro, x, 4, C.branco);
  // Rótulo de papel na face de cima: estrela da Fabula e duas linhas escritas.
  for (let y = 8; y <= 18; y++) for (let x = 12; x <= 31; x++) ponto(tinteiro, x, y, y === 8 ? C.branco : y === 18 ? C.cinzaClaro : C.claro);
  estrela(tinteiro, 17, 13, 2, C.ouroEscuro, C.ouro);
  for (let x = 21; x <= 29; x++) {
    if (x % 3 !== 2) ponto(tinteiro, x, 11, C.cinza);
    if (x % 4 !== 1 && x < 28) ponto(tinteiro, x, 15, C.cinza);
  }
  // Ombro, gargalo com anel dourado e a boca (a abertura vista de lado: uma fenda escura).
  for (let x = 42; x <= 62; x++) {
    for (let y = 8; y <= 31; y++) {
      const meia = x <= 44 ? 10 - (x - 42) * 2 : x <= 55 ? 5 : 6;
      const centro = 19;
      if (Math.abs(y - centro) > meia) continue;
      let cor = y < centro - 2 ? C.azulClaro : y > centro + 2 ? C.contorno : C.azulMedio;
      if (x >= 48 && x <= 52) cor = y < centro - 2 ? C.branco : y > centro + 2 ? C.ouroEscuro : C.ouro; // anel dourado
      if (x >= 56) cor = y < centro - 3 ? C.ouro : y > centro + 3 ? C.ouroEscuro : x >= 59 ? C.contorno : C.laranja; // borda da boca
      ponto(tinteiro, x, y, cor);
    }
  }
  contornar(tinteiro);
  // A rolha que pulou, caída perto (vista de cima: um disco de cortiça).
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) ponto(tinteiro, 54 + dx, 35 + dy, dx + dy < 0 ? C.ouro : C.ouroEscuro);
  ponto(tinteiro, 54, 35, C.marrom);
}
gravarPng('public/assets/ui/ornamento-tinteiro.png', tinteiro);

// ─── O novelo (mais voltas, uma laçada solta; o fio até a moldura é desenhado pelo código) ───
// O fio sai do novelo em NOVELO_SAIDA.
const novelo = nova(60, 56);
export const NOVELO_SAIDA = [14, 40];
{
  const cx = 32, cy = 26, R = 20;
  for (let y = 0; y < novelo.altura; y++) {
    for (let x = 0; x < novelo.largura; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r > R) continue;
      const luz = -dx * 0.7 - dy;
      let cor = luz > 10 ? C.ouro : luz > -6 ? C.laranja : C.ouroEscuro;
      // Voltas do fio: elipses em várias direções; linha escura com brilho ao lado.
      for (const [angulo, achatado] of [[0.3, 0.36], [1.15, 0.6], [2.1, 0.48], [2.75, 0.84], [1.65, 0.22], [0.75, 0.75]]) {
        const a = dx * Math.cos(angulo) + dy * Math.sin(angulo);
        const b = -dx * Math.sin(angulo) + dy * Math.cos(angulo);
        const e = Math.sqrt((a / R) ** 2 + (b / (R * achatado)) ** 2);
        if (Math.abs(e - 1) < 0.05) cor = luz > 4 ? C.ouroEscuro : C.marrom;
        else if (Math.abs(e - 0.94) < 0.04 && luz > -8) cor = luz > 10 ? C.branco : C.ouro;
      }
      if (r > R - 1.3) cor = luz > 3 ? C.ouro : C.marrom;
      ponto(novelo, x, y, cor);
    }
  }
  // Uma laçada solta por cima do novelo (o fio se desenrolando).
  for (let t = 0; t < Math.PI * 1.3; t += 0.05) {
    const x = cx - 4 + Math.cos(t + 2.2) * 11;
    const y = cy + 4 + Math.sin(t + 2.2) * 6;
    ponto(novelo, x, y, C.branco);
    ponto(novelo, x, y + 1, C.ouroEscuro);
  }
  // O começo do fio saindo do novelo (o resto é desenhado pelo código até a moldura).
  for (let i = 0; i <= 6; i++) {
    ponto(novelo, NOVELO_SAIDA[0] + 6 - i, NOVELO_SAIDA[1] - 4 + Math.round(i * 0.66), C.ouro);
    ponto(novelo, NOVELO_SAIDA[0] + 6 - i, NOVELO_SAIDA[1] - 3 + Math.round(i * 0.66), C.ouroEscuro);
  }
  estrela(novelo, cx - 9, cy - 9, 2);
  contornar(novelo);
  sombra(novelo, cx + 4, cy + R - 1, R + 2, 5);
}
gravarPng('public/assets/ui/ornamento-novelo.png', novelo);

// ─── O mapa (grande, metade para fora da tela: só um canto aparece) ───
const mapa = nova(170, 124);
{
  sombra(mapa, 90, 66, 82, 56);
  girado(mapa, 84, 60, -11, (u, v) => {
    if (Math.abs(u) > 74 || Math.abs(v) > 50) return null;
    // Canto rasgado embaixo à direita.
    if (u > 62 && v > 38 && (u - 62) + (v - 38) > 14 + Math.sin(u * 1.7) * 2) return null;
    // Papel envelhecido, mais escuro perto das bordas, com as dobras (vincos) do mapa.
    const borda = Math.min(74 - Math.abs(u), 50 - Math.abs(v));
    let cor = borda < 3 ? C.cinza : C.cinzaClaro;
    if (Math.abs(u + 25) < 0.6 || Math.abs(u - 25) < 0.6 || Math.abs(v) < 0.6) cor = C.cinza; // vincos
    if (Math.abs(Math.abs(u) - 69) < 0.6 && Math.abs(v) < 46) cor = C.cinza; // moldurinha desenhada
    if (Math.abs(Math.abs(v) - 45) < 0.6 && Math.abs(u) < 69) cor = C.cinza;
    // Mar (lado de cima) e terra, com o litoral recortado.
    const costa = -12 + Math.sin(u / 9) * 7 + Math.sin(u / 3.3) * 2.2;
    if (borda >= 6) {
      if (v < costa - 1 && Math.round(u * 0.5 + v) % 7 === 0 && Math.abs(v - costa) > 4) cor = C.azul; // ondinhas do mar
      if (Math.abs(v - costa) < 0.8) cor = C.azulMedio; // o litoral
    }
    // Montanhas (^) e florestas (pontos) em terra.
    for (const [mu, mv] of [[-40, 8], [-33, 12], [-47, 14], [30, 20], [37, 16]]) {
      const du = u - mu, dv = v - mv;
      if (dv <= 0 && dv > -4 && Math.abs(Math.abs(du) + dv) < 0.7) cor = C.cinza;
    }
    for (const [fu, fv] of [[-8, 28], [-4, 31], [0, 27], [4, 30], [-2, 34]]) if (Math.hypot(u - fu, v - fv) < 1.1) cor = C.verde ?? C.cinza;
    // Rota pontilhada até o X vermelho.
    const rota = 10 + Math.sin(u / 11) * 9;
    if (Math.abs(v - rota) < 0.7 && u > -55 && u < 40 && Math.round(u + 100) % 4 < 2) cor = C.marrom;
    if (Math.abs(Math.abs(u - 44) - Math.abs(v - (10 + Math.sin(44 / 11) * 9))) < 0.75 && Math.abs(u - 44) < 3.2) cor = '#a53030';
    // Rosa dos ventos no canto do mar.
    const rosa = [-52, -32];
    const ru = u - rosa[0], rv = v - rosa[1];
    if ((Math.abs(ru) < 0.6 && Math.abs(rv) < 7) || (Math.abs(rv) < 0.6 && Math.abs(ru) < 7)) cor = C.ouroEscuro;
    if (Math.abs(ru) + Math.abs(rv) < 2.5) cor = C.ouro;
    if (Math.abs(ru) < 0.6 && rv < -6 && rv > -8) cor = '#a53030'; // norte
    return cor;
  });
  contornar(mapa);
}
gravarPng('public/assets/ui/ornamento-mapa.png', mapa);

// ─── Instrumentos de navegação: esquadro, compasso e lápis (um conjunto, no canto) ───
const instrumentos = nova(120, 100);
{
  // O esquadro de latão (triângulo retângulo com um vão no meio e marcas de medida).
  girado(instrumentos, 52, 50, 14, (u, v) => {
    // Triângulo com o ângulo reto em (−34, 30); catetos de 66 (para a direita) e 62 (para cima).
    const x = u + 34, y = 30 - v;
    if (x < 0 || y < 0 || x / 66 + y / 62 > 1) return null;
    const dentro = x > 9 && y > 9 && (x - 9) / 44 + (y - 9) / 41 < 1; // o vão do meio
    if (dentro) return null;
    let cor = x / 66 + y / 62 > 0.93 ? C.ouro : C.ouroEscuro; // a borda inclinada pega a luz
    if (y < 1.2 && Math.round(x) % 4 === 0) cor = C.marrom; // marquinhas de medida
    if (x < 1.2 && Math.round(y) % 4 === 0) cor = C.marrom;
    if (y < 1.2 && Math.round(x) % 12 === 0) cor = C.contorno;
    return cor;
  });
  // O lápis (corpo azul, ponta de madeira e grafite, borracha rosa com anel dourado).
  girado(instrumentos, 70, 78, -24, (u, v) => {
    if (u < -34 || u > 34 || Math.abs(v) > 3.2) return null;
    if (u > 25) {
      const meia = 3.2 * (1 - (u - 25) / 9);
      if (Math.abs(v) > meia) return null;
      return u > 31 ? C.cinza : v < 0 ? C.ouro : C.laranja; // madeira e grafite
    }
    if (u < -29) return v < 0 ? '#df84a5' : '#c65197'; // borracha
    if (u < -25) return v < -1 ? C.branco : C.ouro; // anel de metal
    return v < -1.5 ? C.azulClaro : v > 1.5 ? C.azulMedio : C.azul; // corpo sextavado
  });
  // O compasso (duas pernas de aço abertas, dobradiça dourada com o parafuso).
  const dobradica = [88, 10];
  for (const [px, py] of [[70, 66], [110, 62]]) {
    const passos = Math.hypot(px - dobradica[0], py - dobradica[1]);
    for (let i = 4; i <= passos; i++) {
      const x = dobradica[0] + ((px - dobradica[0]) * i) / passos;
      const y = dobradica[1] + ((py - dobradica[1]) * i) / passos;
      const ponta = i > passos - 6;
      const grossura = ponta ? 1 : i < passos * 0.5 ? 3 : 2;
      for (let g = 0; g < grossura; g++) ponto(instrumentos, x + g, y, ponta ? (g ? C.contorno : C.cinzaClaro) : g === 0 ? C.branco : g === 1 ? C.claro : C.cinzaClaro);
    }
  }
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const r = Math.hypot(dx, dy);
      if (r > 5) continue;
      ponto(instrumentos, dobradica[0] + dx, dobradica[1] + dy, r > 4 ? C.ouroEscuro : dx + dy < -1 ? C.ouro : C.laranja);
    }
  }
  ponto(instrumentos, dobradica[0], dobradica[1], C.marrom); // o parafuso
  ponto(instrumentos, dobradica[0] - 1, dobradica[1], C.marrom);
  ponto(instrumentos, dobradica[0] - 2, dobradica[1] - 2, C.branco);
  contornar(instrumentos);
  sombra(instrumentos, 62, 70, 52, 22);
}
gravarPng('public/assets/ui/ornamento-instrumentos.png', instrumentos);

// ═══════════ Objetos dos personagens (um por PJ; os que faltam chegam depois da sessão 0) ═══════════

// ─── Wesley: um baralho (o monte, umas cartas espalhadas e uma virada para cima) ───
const baralho = nova(78, 60);
{
  const carta = (cx, cy, angulo, virada) =>
    girado(baralho, cx, cy, angulo, (u, v) => {
      if (Math.abs(u) > 9 || Math.abs(v) > 13) return null;
      const quina = Math.abs(u) > 7.5 && Math.abs(v) > 11.5;
      if (quina) return null;
      const borda = Math.abs(u) > 8 || Math.abs(v) > 12;
      if (!virada) {
        // Verso: azul com moldura dourada e um losango no meio.
        if (borda) return C.claro;
        if (Math.abs(u) > 6.5 || Math.abs(v) > 10.5) return C.ouroEscuro;
        if (Math.abs(u) + Math.abs(v) * 0.7 < 4) return C.ouro;
        return (Math.round(u) + Math.round(v)) % 3 === 0 ? C.azulMedio : C.azulEscuro;
      }
      // Frente: papel claro, uma estrela vermelha grande no meio e os cantinhos marcados.
      if (borda) return C.cinzaClaro;
      const estrelaGrande = (Math.abs(u) < 0.8 && Math.abs(v) < 5) || (Math.abs(v) < 0.8 && Math.abs(u) < 4) || Math.abs(u) + Math.abs(v) < 2.2;
      if (estrelaGrande) return '#a53030';
      if ((Math.abs(u + 5.5) < 0.8 && Math.abs(v + 9) < 1.5) || (Math.abs(u - 5.5) < 0.8 && Math.abs(v - 9) < 1.5)) return '#a53030';
      return C.branco;
    });
  // O monte (algumas cartas empilhadas, a de cima um pouco torta).
  for (let i = 0; i < 4; i++) carta(22 + i * 0.4, 30 - i, -6 + i, false);
  // Cartas espalhadas e uma virada.
  carta(44, 34, 22, false);
  carta(58, 26, 38, true);
  contornar(baralho);
  sombra(baralho, 40, 38, 34, 18);
}
gravarPng('public/assets/ui/ornamento-baralho.png', baralho);

// ─── Nue: um pincel molhado de tinta vermelho-sangue, e o rastro que ele deixou na mesa ───
const SANGUE = '#a53030';
const SANGUE_ESCURO = '#752438';
const pincel = nova(96, 56);
{
  // A pincelada vermelha na mesa (larga no começo, falhando no fim, com respingos).
  // Ela termina onde a ponta do pincel saiu do papel (28, 40).
  for (let x = 2; x <= 27; x++) {
    const t = (x - 2) / 25;
    const meio = 47 - t * 7 + Math.sin(t * 5) * 1.5;
    const meia = 3.6 * (1 - t * 0.55);
    for (let y = Math.floor(meio - meia); y <= Math.ceil(meio + meia); y++) {
      if (t < 0.25 && (x * 7 + y * 3) % 4 === 0) continue; // o começo, com pouca tinta: falhado
      const cor = y < meio - meia + 1 ? '#cf573c' : y > meio + meia - 1 ? SANGUE_ESCURO : SANGUE;
      ponto(pincel, x, y, cor);
    }
  }
  for (const [x, y] of [[6, 38], [14, 53], [22, 34], [33, 47], [3, 52]]) {
    ponto(pincel, x, y, SANGUE);
    ponto(pincel, x + 1, y, SANGUE_ESCURO);
  }
  // O pincel deitado na diagonal: cabo escuro e comprido, virola de metal, cerdas vermelhas.
  girado(pincel, 58, 26, -28, (u, v) => {
    if (u < -34 || u > 36) return null;
    if (u < -10) {
      // Cerdas: largas perto da virola, afinando até a ponta; molhadas de vermelho.
      const meia = u < -26 ? 3.4 * ((u + 34) / 8) + 0.6 : 4 - (u + 26) * 0.03;
      if (Math.abs(v) > meia) return null;
      if (u > -14) return v < 0 ? C.marrom : C.contorno; // a raiz das cerdas, seca
      return v < -1 ? '#cf573c' : v > 1.5 ? SANGUE_ESCURO : SANGUE;
    }
    if (u < -2) {
      if (Math.abs(v) > 4.2) return null;
      return v < -1.5 ? C.branco : v > 1.5 ? C.cinza : C.claro; // virola de metal
    }
    // Cabo laqueado, afinando para a ponta, com um anel dourado.
    const meia = 3.2 - (u + 2) * 0.04;
    if (Math.abs(v) > meia) return null;
    if (u > 4 && u < 7) return v < 0 ? C.ouro : C.ouroEscuro;
    return v < -1 ? C.marrom : v > 1 ? C.contorno : '#4d2b32';
  });
  contornar(pincel);
}
gravarPng('public/assets/ui/ornamento-pincel.png', pincel);

console.log('Geradas em public/assets/ui/: moldura, fundo, pena, tinteiro, novelo, mapa, instrumentos, baralho, pincel');
console.log('Encaixes: bico da pena', JSON.stringify(PENA_BICO), '· boca do tinteiro', JSON.stringify(TINTEIRO_BOCA), '· saída do novelo', JSON.stringify(NOVELO_SAIDA));
