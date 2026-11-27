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
//   ornamento-tinteiro-em-pe.png o tinteiro em pé (tinta nível 0), com a pena mergulhada
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

/** Sombra na mesa (não usada: a luz vem de cima, como numa mesa vista de cima; ficou para quem quiser). */
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
  // A rolha que pulou, caída de lado perto do gargalo: um cilindrinho de cortiça do tamanho
  // da boca (5 px de diâmetro), com a ponta redonda virada para cá.
  for (let y = 33; y <= 37; y++) {
    for (let x = 47; x <= 53; x++) ponto(tinteiro, x, y, y === 33 ? C.ouro : y === 37 ? C.marrom : (x + y) % 3 === 0 ? C.marrom : C.ouroEscuro);
    ponto(tinteiro, 54, y, y === 33 || y === 37 ? C.ouroEscuro : C.ouro); // a ponta, pegando luz
  }
  for (let x = 46; x <= 55; x++) { ponto(tinteiro, x, 32, C.contorno); ponto(tinteiro, x, 38, C.contorno); }
  for (let y = 33; y <= 37; y++) { ponto(tinteiro, 46, y, C.contorno); ponto(tinteiro, 55, y, C.contorno); }
}
gravarPng('public/assets/ui/ornamento-tinteiro.png', tinteiro);

// ─── O tinteiro EM PÉ (tinta nível 0: ainda não tombou), VISTO DE CIMA ───
// Vidro quadrado de quinas arredondadas. De cima, o que dá volume é o OMBRO: quatro faces
// inclinadas subindo das bordas até o gargalo redondo, com as arestas do vidro nas diagonais
// (mais claras do lado da luz, que vem do alto à esquerda). A borda grossa do vidro brilha.
// O gargalo é um círculo medido: anel dourado de raio 8 e a boca de raio 5, com a tinta lá
// dentro e um brilho em meia-lua. A pena sai da boca (o bico fica escondido dentro do vidro).
const emPe = nova(54, 46);
export const TINTEIRO_EM_PE_BOCA = [22, 22];
{
  const [cx, cy] = TINTEIRO_EM_PE_BOCA;
  const meio = 19.5; // metade do lado do quadrado (x e y de 2.5 a 41.5)
  const raioQuina = 6;
  const R_ANEL = 8, R_BOCA = 5;
  for (let y = 0; y < 46; y++) {
    for (let x = 0; x < 46; x++) {
      const dx = x - cx, dy = y - cy;
      // Quadrado de quinas arredondadas: distância até a borda.
      const qx = Math.max(Math.abs(dx) - (meio - raioQuina), 0);
      const qy = Math.max(Math.abs(dy) - (meio - raioQuina), 0);
      if (Math.hypot(qx, qy) > raioQuina) continue;
      const r = Math.hypot(dx, dy);
      let cor;
      if (r <= R_ANEL) {
        // O gargalo: anel dourado (sombreado pela luz) e a boca com a tinta.
        if (r <= R_BOCA) {
          cor = C.contorno;
          // brilho em meia-lua na superfície da tinta, do lado da luz
          if (r > R_BOCA - 1.6 && dx + dy < -2.5) cor = C.azulMedio;
          if (r > R_BOCA - 0.9 && dx + dy < -4.5) cor = C.azul;
        } else if (r > R_ANEL - 1) {
          cor = C.marrom; // a borda de fora do anel
        } else if (r <= R_BOCA + 1) {
          cor = dx + dy < 0 ? C.ouroEscuro : C.marrom; // a borda de dentro (a "parede" da boca)
        } else {
          cor = dx + dy < -3 ? C.ouro : dx + dy > 4 ? C.ouroEscuro : C.laranja;
          if (dx + dy < -6 && r < R_ANEL - 1.5) cor = C.branco; // reflexo no metal
        }
      } else {
        // O ombro de vidro: qual das quatro faces (a que a posição mais "aponta").
        const borda = Math.max(Math.abs(dx), Math.abs(dy)); // 8..19.5
        const naBorda = meio - borda < 2.2 || Math.hypot(qx, qy) > raioQuina - 2.2; // vidro grosso da borda
        const face = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esq' : 'dir') : dy < 0 ? 'cima' : 'baixo';
        const aresta = Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.9 && !naBorda; // as diagonais do ombro
        // Tom de cada face (luz do alto à esquerda), mais escuro perto do gargalo (a tinta por baixo).
        const tons = { cima: [C.azulClaro, C.azul], esq: [C.azul, C.azulMedio], dir: [C.azulMedio, C.azulEscuro], baixo: [C.azulEscuro, C.tinta] };
        const t = (borda - R_ANEL) / (meio - R_ANEL); // 0 perto do gargalo … 1 na borda
        cor = t > 0.45 ? tons[face][0] : tons[face][1];
        if (aresta) cor = dx + dy < 0 || (dx < 0 && dy > 0 && Math.abs(dx) > Math.abs(dy)) ? C.ciano : C.azulClaro;
        if (aresta && dx > 0 && dy > 0) cor = C.azul; // a aresta de baixo à direita, na sombra
        if (naBorda) cor = face === 'cima' || face === 'esq' ? (face === 'cima' ? C.ciano : C.azulClaro) : face === 'dir' ? C.azul : C.azulMedio;
        // Reflexo comprido do vidro (uma faixa curva perto da quina de cima à esquerda) e um brilho.
        if (Math.abs(dx + dy + 22) < 0.8 && dx < -6 && dy < -6 && !naBorda) cor = C.branco;
        if (dx === 13 && dy === 12) cor = C.branco;
      }
      ponto(emPe, x, y, cor);
    }
  }
  contornar(emPe);
  // A rolha, deitada ao lado (vista de cima: um cilindrinho de cortiça).
  for (let y = 34; y <= 38; y++) {
    for (let x = 45; x <= 51; x++) ponto(emPe, x, y, y === 34 ? C.ouro : y === 38 ? C.marrom : (x + y) % 3 === 0 ? C.marrom : C.ouroEscuro);
  }
  for (let x = 44; x <= 52; x++) { ponto(emPe, x, 33, C.contorno); ponto(emPe, x, 39, C.contorno); }
  for (let y = 34; y <= 38; y++) { ponto(emPe, 44, y, C.contorno); ponto(emPe, 52, y, C.contorno); }
}
gravarPng('public/assets/ui/ornamento-tinteiro-em-pe.png', emPe);

// A pena EM PÉ dentro do tinteiro, vista de cima: ela sai da boca inclinada para o alto à
// esquerda e aparece ENCURTADA pela perspectiva (está quase de pé, apontando para quem olha).
// Por isso é curta e fica mais larga perto da ponta de cima, que está mais perto da "câmera".
// A base (onde ela entra na boca) fica em PENA_EM_PE_BASE.
const penaEmPe = nova(40, 44);
export const PENA_EM_PE_BASE = [33, 38];
{
  const [bx, by] = PENA_EM_PE_BASE;
  const dir = [-0.55, -0.835]; // para o alto à esquerda
  const lado = [-dir[1], dir[0]];
  const L = 40;
  for (let y = 0; y < penaEmPe.altura; y++) {
    for (let x = 0; x < penaEmPe.largura; x++) {
      const dx = x - bx, dy = y - by;
      const u = dx * dir[0] + dy * dir[1]; // 0 na boca … L na ponta de cima
      const v = dx * lado[0] + dy * lado[1];
      if (u < 0 || u > L) continue;
      let cor = null;
      if (u < 7) {
        if (Math.abs(v) < 1.2) cor = v < 0 ? C.branco : C.cinzaClaro; // o cálamo saindo da boca
      } else {
        // As barbas: crescem para a ponta (perto da câmera) e se fecham num arredondado.
        const s = (u - 7) / (L - 7);
        const perfil = Math.sin(Math.PI * Math.min(1, s * 0.92 + 0.08)) ** 0.5 * (0.55 + 0.45 * s);
        const largura = (v < 0 ? 9 : 6.5) * perfil + 0.6;
        const falha = v < 0 && Math.abs(s - 0.42) < 0.03; // uma barba separada
        if (Math.abs(v) <= largura && !falha) {
          const barba = Math.abs(v) > 1.3 && ((Math.round(u * 1.1 - Math.abs(v) * 0.8) % 3) + 3) % 3 === 0;
          const borda = Math.abs(v) > largura - 1.2;
          if (Math.abs(v) < 0.7) cor = C.cinzaClaro; // a haste
          else if (v < 0) cor = borda ? C.claro : barba ? C.claro : s > 0.85 ? C.ciano : C.branco;
          else cor = borda ? C.cinza : barba ? C.cinzaClaro : C.claro;
        }
      }
      if (cor) ponto(penaEmPe, x, y, cor);
    }
  }
  contornar(penaEmPe);
}
gravarPng('public/assets/ui/ornamento-pena-em-pe.png', penaEmPe);

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
}
gravarPng('public/assets/ui/ornamento-novelo.png', novelo);

// ─── O mapa (grande, metade para fora da tela: só um canto aparece) ───
const mapa = nova(170, 124);
{
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

// ─── Instrumentos de navegação: esquadro, compasso e lápis (um conjunto) ───
const instrumentos = nova(124, 104);
{
  // O esquadro de latão: chanfro claro na borda de fora, borda de dentro em baixo-relevo,
  // régua com marcas (as de 10 em 10 mais compridas), um furo de pendurar com rebite e uma
  // estrelinha gravada no canto do ângulo reto.
  girado(instrumentos, 52, 52, 14, (u, v) => {
    // Triângulo com o ângulo reto em (−34, 30); catetos de 68 (direita) e 64 (para cima).
    const x = u + 34, y = 30 - v;
    if (x < 0 || y < 0 || x / 68 + y / 64 > 1) return null;
    const dentro = x > 11 && y > 11 && (x - 11) / 42 + (y - 11) / 40 < 1; // o vão do meio
    if (dentro) return null;
    const hipotenusa = x / 68 + y / 64;
    const vaoDist = (x - 11) / 42 + (y - 11) / 40; // distância até o vão (1 = encostado)
    let cor = C.ouroEscuro;
    if (hipotenusa > 0.95) cor = C.ouro; // chanfro da borda inclinada, pegando a luz
    if (y < 1.2 || x < 1.2) cor = C.laranja; // as bordas retas
    // A borda do vão: um filete escuro e, logo fora, um filete claro (baixo-relevo).
    if (x > 9.8 && y > 9.8 && vaoDist < 1.07 && (x < 11.2 || y < 11.2 || vaoDist > 0.96)) cor = C.marrom;
    else if (x > 8.8 && y > 8.8 && vaoDist < 1.13 && (x < 10 || y < 10 || vaoDist > 1.02)) cor = C.ouro;
    // A régua: marcas a cada 2 px nas duas bordas retas; de 10 em 10, mais compridas.
    const marca = (pos, prof) => Math.round(pos) % 2 === 0 && prof < (Math.round(pos) % 10 === 0 ? 4.5 : 2.2);
    if (y < 5 && x > 3 && x < 60 && marca(x, y)) cor = C.marrom;
    if (x < 5 && y > 3 && y < 56 && marca(y, x)) cor = C.marrom;
    // O furo com rebite, perto do ângulo reto, e a estrelinha gravada.
    const furo = Math.hypot(x - 6.5, y - 6.5);
    if (furo < 2.6) cor = furo < 1.2 ? C.branco : C.marrom;
    if ((Math.abs(x - 22) < 0.6 && Math.abs(y - 6) < 2.5) || (Math.abs(y - 6) < 0.6 && Math.abs(x - 22) < 2.5)) cor = C.marrom;
    return cor;
  });
  // O lápis (corpo azul sextavado, ponta de madeira e grafite, anel e borracha).
  girado(instrumentos, 70, 82, -24, (u, v) => {
    if (u < -34 || u > 34 || Math.abs(v) > 3.2) return null;
    if (u > 25) {
      const meia = 3.2 * (1 - (u - 25) / 9);
      if (Math.abs(v) > meia) return null;
      return u > 31 ? C.cinza : v < 0 ? C.ouro : C.laranja;
    }
    if (u < -29) return v < 0 ? '#df84a5' : '#c65197';
    if (u < -25) return v < -1 ? C.branco : Math.round(u) % 2 ? C.ouro : C.ouroEscuro;
    if (Math.abs(u - 8) < 3 && Math.abs(v) < 1) return C.ouro; // uma marca dourada no corpo
    return v < -1.5 ? C.azulClaro : v > 1.5 ? C.azulMedio : C.azul;
  });
  // O compasso de navegação: pernas de aço afinando até as pontas, um arco de ajuste entre elas
  // (com o parafuso), a cabeça com dobradiça dourada e um pináculo em cima para segurar.
  const cabeca = [90, 14];
  const pernas = [[72, 70], [112, 66]];
  const pontoNaPerna = (p, f) => [cabeca[0] + (p[0] - cabeca[0]) * f, cabeca[1] + (p[1] - cabeca[1]) * f];
  for (const p of pernas) {
    const passos = Math.hypot(p[0] - cabeca[0], p[1] - cabeca[1]);
    for (let i = 5; i <= passos; i++) {
      const [x, y] = pontoNaPerna(p, i / passos);
      const ponta = i > passos - 7;
      const grossura = ponta ? 1 : i < passos * 0.45 ? 3 : 2;
      for (let g = 0; g < grossura; g++) {
        ponto(instrumentos, x + g, y, ponta ? (g ? C.contorno : C.cinza) : g === 0 ? C.branco : g === 1 ? C.claro : C.cinzaClaro);
      }
    }
  }
  // O arco de ajuste (de uma perna à outra, a 55% do comprimento) e o parafuso dele.
  const [ax, ay] = pontoNaPerna(pernas[0], 0.55);
  const [bx, by] = pontoNaPerna(pernas[1], 0.55);
  for (let t = 0; t <= 1; t += 0.02) {
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t - Math.sin(Math.PI * t) * 5;
    ponto(instrumentos, x, y, C.ouro);
    ponto(instrumentos, x, y + 1, C.ouroEscuro);
  }
  for (const [x, y] of [[ax + 1, ay], [bx + 1, by]]) {
    ponto(instrumentos, x, y, C.branco);
    ponto(instrumentos, x + 1, y, C.marrom);
  }
  // A cabeça: dobradiça dourada redonda com o parafuso, um anel e o pináculo em cima.
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      const r = Math.hypot(dx, dy);
      if (r > 6) continue;
      let cor = r > 5 ? C.ouroEscuro : dx + dy < -2 ? C.ouro : C.laranja;
      if (r < 2.4) cor = r < 1.2 ? C.marrom : C.ouroEscuro; // o parafuso
      if (Math.abs(dx + dy) < 0.5 && r < 2.2) cor = C.contorno; // a fenda do parafuso
      ponto(instrumentos, cabeca[0] + dx, cabeca[1] + dy, cor);
    }
  }
  ponto(instrumentos, cabeca[0] - 3, cabeca[1] - 3, C.branco);
  for (let y = cabeca[1] - 13; y <= cabeca[1] - 6; y++) {
    const meia = y < cabeca[1] - 10 ? 1 : 2; // pináculo: mais fino em cima
    for (let dx = -meia; dx <= meia; dx++) ponto(instrumentos, cabeca[0] + dx, y, dx < 0 ? C.ouro : C.ouroEscuro);
  }
  ponto(instrumentos, cabeca[0], cabeca[1] - 14, C.branco); // a bolinha da ponta
  contornar(instrumentos);
}
gravarPng('public/assets/ui/ornamento-instrumentos.png', instrumentos);


// ═══════════ Objetos dos personagens (um por PJ; os que faltam chegam depois da sessão 0) ═══════════

// ─── Wesley: um baralho (na escala da pena: carta de 30×44) ───
// O monte, três cartas espalhadas em leque e uma virada para cima.
const baralho = nova(140, 116);
const INCLINACAO_BARALHO = 16; // o conjunto todo, um pouco torto na mesa (graus)
{
  const carta = (cx0, cy0, angulo0, virada) => {
    // Gira a posição da carta em volta do centro do conjunto, e a carta junto.
    const r = (INCLINACAO_BARALHO * Math.PI) / 180;
    const [ox, oy] = [cx0 - 66, cy0 - 50];
    const cx = 70 + ox * Math.cos(r) - oy * Math.sin(r);
    const cy = 58 + ox * Math.sin(r) + oy * Math.cos(r);
    const angulo = angulo0 + INCLINACAO_BARALHO;
    return girado(baralho, cx, cy, angulo, (u, v) => {
      if (Math.abs(u) > 15 || Math.abs(v) > 22) return null;
      if (Math.abs(u) > 13 && Math.abs(v) > 20) return null; // quinas arredondadas
      if (Math.abs(u) > 14 || Math.abs(v) > 21) return C.claro; // a borda branca da carta
      if (!virada) {
        // Verso: azul-noite com moldura dourada, uma estrela no meio e uma trama de losangos.
        if (Math.abs(u) > 11.5 || Math.abs(v) > 18.5) return Math.abs(u) > 12.5 || Math.abs(v) > 19.5 ? C.azulEscuro : C.ouroEscuro;
        const r = Math.abs(u) + Math.abs(v) * 0.8;
        if ((Math.abs(u) < 0.7 && Math.abs(v) < 7) || (Math.abs(v) < 0.7 && Math.abs(u) < 5.5)) return C.ouro;
        if (r < 3) return C.branco;
        if (r > 6 && r < 7) return C.ouroEscuro;
        return (Math.round(u + 40) + Math.round(v + 40)) % 4 === 0 || (Math.round(u + 40) - Math.round(v + 40) + 80) % 4 === 0 ? C.azulMedio : C.azulEscuro;
      }
      // Frente: papel claro, a estrela vermelha grande no meio, os cantinhos e uma letra.
      // A estrela do meio fica sempre "em pé" na mesa (senão, com a carta torta, vira um X).
      const ar = (angulo * Math.PI) / 180;
      const su = u * Math.cos(ar) - v * Math.sin(ar), sv = u * Math.sin(ar) + v * Math.cos(ar);
      const estrelaGrande = (Math.abs(su) < 1 && Math.abs(sv) < 8) || (Math.abs(sv) < 1 && Math.abs(su) < 6.5) || Math.abs(su) + Math.abs(sv) < 3.6;
      if (estrelaGrande) return Math.abs(su) + Math.abs(sv) < 1.5 ? '#cf573c' : '#a53030';
      // Cantinhos: uma estrelinha e um "A" (em pixel) em cima à esquerda e embaixo à direita.
      for (const s of [1, -1]) {
        const cu = (u + 10 * s) * s, cv = (v + 16 * s) * s;
        if ((Math.abs(cu) < 0.6 && Math.abs(cv) < 2) || (Math.abs(cv) < 0.6 && Math.abs(cu) < 1.6)) return '#a53030';
        const au = cu, av = cv + 5;
        if (av > -2.5 && av < 2.5 && Math.abs(Math.abs(au) - (av + 2.5) * 0.45) < 0.55) return C.cinza; // o "A"
        if (Math.abs(av - 0.5) < 0.5 && Math.abs(au) < 1.2) return C.cinza;
      }
      return v > 18 ? C.claro : C.branco;
    });
  };
  // O monte: cinco cartas empilhadas, cada uma um pouco torta, com a espessura aparecendo.
  for (let i = 0; i < 5; i++) carta(30 + i * 0.5, 54 - i * 1.2, -8 + i * 2, false);
  // As espalhadas: duas de costas em leque e uma virada.
  carta(62, 56, 18, false);
  carta(84, 50, 34, false);
  carta(104, 46, 26, true);
  contornar(baralho);
}
gravarPng('public/assets/ui/ornamento-baralho.png', baralho);

// ─── Nue: um pincel japonês de caligrafia e a pincelada vermelho-sangue que ele acabou de fazer ───
// Referência do Cadu: cabo de bambu com nós salientes, anéis perto da virola, virola bojuda de
// madeira escura, cerdas brancas longas e curvas até a ponta fina; no topo, um remate escuro com
// cordão e borla vermelhos. O pincel está deitado com a PONTA exatamente onde a pincelada termina:
// acabou de fazê-la.
const SANGUE = '#a53030';
const SANGUE_CLARO = '#cf573c';
const SANGUE_ESCURO = '#752438';
const pincel = nova(198, 152);
{
  const PONTA = [108, 128]; // a ponta das cerdas = o fim da pincelada
  const ANGULO = -58; // o pincel sobe para a direita a partir da ponta
  const L = 150; // comprimento total
  girado(pincel, PONTA[0], PONTA[1], ANGULO, (u, v) => {
    if (u < 0 || u > L) return null;
    if (u < 30) {
      // Cerdas: curvas como uma lâmina (a ponta entorta para um lado), largas na base.
      const curva = 2.8 * ((30 - u) / 30) ** 2;
      const vv = v - curva;
      const meia = 4.4 * Math.sin((Math.PI / 2) * (u / 30)) ** 0.7 + 0.3;
      if (Math.abs(vv) > meia) return null;
      if (u < 10) return vv < -0.8 ? SANGUE_CLARO : vv > 0.8 ? SANGUE_ESCURO : SANGUE; // ponta molhada
      if (u < 13) return vv < 0 ? SANGUE_CLARO : C.claro; // a tinta subindo pelas cerdas
      if (Math.abs(vv) > meia - 1.1) return vv < 0 ? C.claro : C.cinzaClaro; // a borda das cerdas
      // Os fios das cerdas: linhas ao longo do pincel.
      return Math.round(vv * 1.6 + 20) % 3 === 0 ? C.claro : vv > 1 ? C.claro : C.branco;
    }
    if (u < 45) {
      // Virola bojuda de madeira escura, com um brilho comprido.
      const meia = 4.3 + Math.sin((Math.PI * (u - 30)) / 15) * 1.4;
      if (Math.abs(v) > meia) return null;
      if (u < 31.5) return C.contorno; // o encaixe das cerdas
      if (v < -meia + 1.6 && u > 33 && u < 43) return C.marrom; // brilho
      if (Math.abs(v + 1) < 0.6 && u > 34 && u < 41) return C.ouroEscuro; // reflexo fino
      return v > 1.5 ? C.contorno : '#4d2b32';
    }
    if (u < 53) {
      // Anéis do colarinho.
      if (Math.abs(v) > 3.1) return null;
      const anel = Math.floor(u - 45) % 2 === 0;
      return v < -1.2 ? C.ouro : anel ? C.ouroEscuro : C.marrom;
    }
    if (u < 141) {
      // O cabo de bambu, com nós salientes.
      const no = [70, 95, 119].some((n) => Math.abs(u - n) < 1.6);
      const meia = no ? 3.2 : 2.5;
      if (Math.abs(v) > meia) return null;
      if (no) return Math.abs(u - [70, 95, 119].find((n) => Math.abs(u - n) < 1.6)) < 0.6 ? C.marrom : v < -1 ? C.ouro : C.ouroEscuro;
      return v < -1.1 ? C.ouro : v > 1.1 ? C.marrom : C.ouroEscuro;
    }
    // O remate do topo: madeira escura entalhada, um pouco mais largo.
    const meia = 3.4 - Math.abs(u - 145.5) * 0.15;
    if (Math.abs(v) > meia) return null;
    if (Math.abs(u - 143.5) < 0.6) return C.contorno; // o entalhe
    return v < -1.2 ? C.marrom : v > 1 ? C.contorno : '#4d2b32';
  });
  // O cordão vermelho: sai do remate, faz uma volta e termina na borla pendurada.
  const a = (ANGULO * Math.PI) / 180;
  const topo = [PONTA[0] + Math.cos(a) * (L - 1), PONTA[1] + Math.sin(a) * (L - 1)];
  for (let t = 0; t <= 1; t += 0.01) {
    const x = topo[0] - 6 * t - 14 * t * t + Math.sin(t * Math.PI) * 4;
    const y = topo[1] + 4 + 16 * t + Math.sin(t * Math.PI * 1.5) * 3;
    ponto(pincel, x, y, SANGUE);
  }
  // A borla: um tufo de fios vermelhos caindo.
  const borla = [topo[0] - 20, topo[1] + 20];
  for (let i = -3; i <= 3; i++) {
    for (let j = 0; j <= 8 - Math.abs(i); j++) ponto(pincel, borla[0] + i + Math.round(j * 0.25 * Math.sign(i)), borla[1] + j, j < 2 ? SANGUE_ESCURO : Math.abs(i) === 3 ? SANGUE_ESCURO : SANGUE);
  }
  ponto(pincel, borla[0], borla[1] - 1, C.ouro); // o nozinho dourado da borla
  contornar(pincel);

  // A pincelada: vem da esquerda e termina na ponta do pincel, afinando em fiapos secos.
  // Desenhada depois, só nos pixels vazios: fica por baixo do pincel e sem contorno.
  const pintarSeVazio = (x, y, cor) => vazio(pincel, Math.round(x), Math.round(y)) && ponto(pincel, x, y, cor);
  let semente2 = 99;
  const sorte2 = () => ((semente2 = (semente2 * 1103515245 + 12345) % 2147483648) / 2147483648);
  const fiapos = Array.from({ length: 12 }, () => sorte2());
  const P0 = [8, 118], P1 = [52, 152], P2 = PONTA;
  const pontoDa = (t) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  const largura = (t) => (t < 0.06 ? 4 + t * 50 : t < 0.5 ? 7 - (t - 0.06) * 3 : 5.7 * (1 - (t - 0.5) / 0.5) ** 0.8 + 0.4);
  for (let t = 0; t <= 1; t += 0.0015) {
    const [x, y] = pontoDa(t);
    const [x2, y2] = pontoDa(Math.min(1, t + 0.01));
    const comp = Math.hypot(x2 - x, y2 - y) || 1;
    const n = [-(y2 - y) / comp, (x2 - x) / comp];
    const w = largura(t);
    for (let k = -w; k <= w; k += 0.5) {
      const fio = Math.min(11, Math.floor(((k / w + 1) / 2) * 12));
      if (t > 0.55 && fiapos[fio] < (t - 0.55) * 2.2) continue; // fiapos secos no fim
      const cor = k < -w + 1.2 ? SANGUE_CLARO : k > w - 1.2 ? SANGUE_ESCURO : t < 0.05 ? SANGUE_ESCURO : SANGUE;
      pintarSeVazio(x + n[0] * k, y + n[1] * k, cor);
    }
  }
  // Respingos perto de onde o pincel apoiou no começo.
  for (const [x, y, r] of [[3, 112, 1.5], [6, 128, 1], [18, 134, 1.2], [24, 108, 0.8]]) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= r * r) pintarSeVazio(x + dx, y + dy, SANGUE);
  }
}
gravarPng('public/assets/ui/ornamento-pincel.png', pincel);

console.log('Geradas em public/assets/ui/: moldura, fundo, pena, tinteiro, novelo, mapa, instrumentos, baralho, pincel');
console.log('Encaixes: bico da pena', JSON.stringify(PENA_BICO), '· boca do tinteiro', JSON.stringify(TINTEIRO_BOCA), '· saída do novelo', JSON.stringify(NOVELO_SAIDA));
