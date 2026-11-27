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

// ═══════════ Objetos sobre a mesa ═══════════
// Cada um é desenhado "girado": para cada pixel da imagem, calculamos onde ele cai no desenho
// reto do objeto (u = ao longo, v = de lado) e escolhemos a cor ali. Assim dá para deitar o
// objeto na diagonal sem desenhar pixel a pixel.

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

/** Sombra na mesa: elipse mais escura que o papel, SEM contorno e só por baixo do objeto
 *  (por isso é desenhada depois do contorno, e só nos pixels vazios). */
function sombra(img, cx, cy, rx, ry) {
  for (let y = 0; y < img.altura; y++) {
    for (let x = 0; x < img.largura; x++) {
      if (vazio(img, x, y) && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) ponto(img, x, y, C.tinta);
    }
  }
}

// ─── O tinteiro tombado (grande, em perspectiva, deitado na diagonal) ───
// Vidro quadrado deitado: vemos a face de cima (mais clara) e a da frente (com o rótulo).
// A boca aponta para baixo à direita, para o palco; a tinta sai por ela.
const tinteiro = nova(60, 46);
{
  girado(tinteiro, 27, 22, 18, (u, v) => {
    // u: −20 (fundo do vidro) … +24 (boca); v: −13 (face de cima) … +10 (base)
    if (u < -20 || u > 25) return null;
    const ponta = u < -17 && (v < -11 || v > 8); // quinas arredondadas no fundo
    if (ponta) return null;
    if (u <= 9) {
      // Corpo de vidro.
      if (v < -13 || v > 10) return null;
      if (v < -7) return v < -11.5 ? C.ciano : C.azulClaro; // face de cima (pega a luz)
      if (v < -6) return C.branco; // aresta brilhando
      // Face da frente: vidro escuro com a tinta deitada no fundo.
      if (u > -9 && u < 3 && v > -4 && v < 5) {
        // Rótulo de papel com a estrela da Fabula.
        if (Math.abs(u + 3) < 1.2 && Math.abs(v) < 1.2) return C.ouro;
        if ((Math.abs(u + 3) < 3 && Math.abs(v) < 0.6) || (Math.abs(v) < 3 && Math.abs(u + 3) < 0.6)) return C.ouroEscuro;
        return v > 3 ? C.cinzaClaro : C.claro;
      }
      if (v > 4) return C.contorno; // a tinta que ficou dentro, deitada
      if (u < -16 && v < 2) return C.azulClaro; // reflexo no fundo do vidro
      return v < -2 ? C.azul : C.azulMedio;
    }
    if (u <= 13) {
      // Ombro: o vidro afina até o gargalo.
      const meia = 10 - (u - 9) * 1.6;
      if (v < -meia - 2 || v > meia) return null;
      return v < -meia + 1 ? C.azulClaro : C.azulMedio;
    }
    if (u <= 17) {
      // Gargalo com anel dourado.
      if (Math.abs(v + 1) > 4.5) return null;
      return v < -3 ? C.branco : v > 2 ? C.ouroEscuro : C.ouro;
    }
    // Boca aberta, com a borda dourada e o escuro da tinta saindo.
    if (Math.abs(v + 1) > 5.5) return null;
    if (u > 22) return Math.abs(v + 1) < 3.5 ? C.contorno : C.ouroEscuro;
    return v < -3.5 ? C.ouro : C.laranja;
  });
  contornar(tinteiro);
  sombra(tinteiro, 30, 36, 25, 7);
  // A rolha, que pulou para fora (no canto de cima à esquerda da imagem).
  for (const [x, y, cor] of [[4, 6, C.ouroEscuro], [5, 6, C.ouroEscuro], [6, 6, C.marrom], [3, 7, C.ouro], [4, 7, C.ouroEscuro], [5, 7, C.ouroEscuro], [6, 7, C.marrom], [3, 8, C.ouroEscuro], [4, 8, C.marrom], [5, 8, C.marrom], [6, 8, C.marrom], [4, 9, C.marrom], [5, 9, C.marrom]]) ponto(tinteiro, x, y, cor);
}
gravarPng('public/assets/ui/ornamento-tinteiro.png', tinteiro);

// ─── O novelo (o fio sai dele e vai até o nó do canto da moldura) ───
// O fio termina no canto de baixo à esquerda da imagem (2, 52), que fica embaixo do nó.
const novelo = nova(62, 60);
{
  const cx = 40, cy = 30, R = 17;
  // O fio solto: sai da base do novelo e faz uma curva até o nó da moldura.
  let anterior = null;
  for (let t = 0; t <= 1; t += 0.01) {
    const x = Math.round((1 - t) ** 2 * (cx - 10) + 2 * (1 - t) * t * 18 + t * t * 2);
    const y = Math.round((1 - t) ** 2 * (cy + 14) + 2 * (1 - t) * t * 58 + t * t * 52);
    if (anterior && anterior[0] === x && anterior[1] === y) continue;
    anterior = [x, y];
    ponto(novelo, x, y, C.ouro);
    ponto(novelo, x, y + 1, C.ouroEscuro);
  }
  for (let y = 0; y < novelo.altura; y++) {
    for (let x = 0; x < novelo.largura; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r > R) continue;
      const luz = -dx * 0.7 - dy; // luz do alto à esquerda
      let cor = luz > 9 ? C.ouro : luz > -5 ? C.laranja : C.ouroEscuro;
      // As voltas do fio: elipses em direções diferentes, cada uma com linha escura e brilho.
      for (const [angulo, achatado] of [[0.3, 0.38], [1.2, 0.62], [2.2, 0.5], [2.8, 0.85], [1.7, 0.25]]) {
        const a = dx * Math.cos(angulo) + dy * Math.sin(angulo);
        const b = -dx * Math.sin(angulo) + dy * Math.cos(angulo);
        const e = Math.sqrt((a / R) ** 2 + (b / (R * achatado)) ** 2);
        if (Math.abs(e - 1) < 0.06) cor = luz > 3 ? C.ouroEscuro : C.marrom;
        else if (Math.abs(e - 0.93) < 0.045 && luz > -6) cor = luz > 8 ? C.branco : C.ouro;
      }
      if (r > R - 1.2) cor = luz > 2 ? C.ouro : C.marrom;
      ponto(novelo, x, y, cor);
    }
  }
  // A ponta do fio enrolado, aparecendo por cima do novelo.
  for (let i = 0; i < 7; i++) ponto(novelo, cx - 6 + i, cy - 12 + Math.round(Math.sin(i / 1.5)), C.branco);
  estrela(novelo, cx - 8, cy - 7, 2);
  contornar(novelo);
  sombra(novelo, cx + 3, cy + R - 1, R + 2, 5);
}
gravarPng('public/assets/ui/ornamento-novelo.png', novelo);

// ─── Uma folha de mapa jogada (rota pontilhada, um X, a borda desenhada) ───
const folha = nova(60, 48);
{
  girado(folha, 29, 23, -9, (u, v) => {
    if (Math.abs(u) > 25 || Math.abs(v) > 17) return null;
    if (u > 19 && v < -11 && u - 19 > v + 17) return null; // canto dobrado (cortado)
    if (u > 19 && v < -11 && u - 19 > v + 15) return C.cinzaClaro; // o verso do canto dobrado
    let cor = v > 14 || u < -23 ? C.cinza : C.cinzaClaro; // papel envelhecido (sombra na borda)
    if (Math.abs(Math.abs(u) - 22) < 0.6 || Math.abs(Math.abs(v) - 14) < 0.6) cor = C.cinza; // moldurinha desenhada
    // Litoral: uma linha ondulada, terra de um lado.
    const costa = -6 + Math.sin(u / 4) * 3 + Math.sin(u / 1.7) * 1.2;
    if (Math.abs(v - costa) < 0.7 && Math.abs(u) < 21 && Math.abs(v) < 13) cor = C.azulMedio;
    // Rota pontilhada até o X.
    const rota = 6 + Math.sin(u / 5) * 4;
    if (Math.abs(v - rota) < 0.6 && Math.abs(u) < 15 && Math.round(u + 30) % 3 === 0) cor = C.marrom;
    if (Math.abs(Math.abs(u - 15) - Math.abs(v - 4)) < 0.7 && Math.abs(u - 15) < 2.5) cor = '#a53030';
    return cor;
  });
  contornar(folha);
  sombra(folha, 31, 28, 27, 18);
}
gravarPng('public/assets/ui/ornamento-folha.png', folha);

// ─── Um compasso de navegação (duas pernas de metal e a dobradiça dourada) ───
const compasso = nova(30, 40);
{
  const dobradica = [15, 5];
  for (const [px, py] of [[6, 36], [24, 34]]) {
    const passos = Math.hypot(px - dobradica[0], py - dobradica[1]);
    for (let i = 0; i <= passos; i++) {
      const x = dobradica[0] + ((px - dobradica[0]) * i) / passos;
      const y = dobradica[1] + ((py - dobradica[1]) * i) / passos;
      const ponta = i > passos - 4;
      ponto(compasso, x, y, ponta ? C.cinza : C.claro);
      ponto(compasso, x + 1, y, ponta ? C.contorno : C.cinzaClaro);
    }
  }
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 9) ponto(compasso, dobradica[0] + dx, dobradica[1] + dy, dx + dy < 0 ? C.ouro : C.ouroEscuro);
  ponto(compasso, dobradica[0], dobradica[1], C.branco);
  contornar(compasso);
  sombra(compasso, 16, 34, 11, 3);
}
gravarPng('public/assets/ui/ornamento-compasso.png', compasso);

console.log('Geradas em public/assets/ui/: moldura, fundo, pena, tinteiro, novelo, folha, compasso');
