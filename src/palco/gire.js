// Tela "Gire o celular": aparece no lugar do palco quando o celular está em pé.
//
// Regras da SPEC ("Gire o celular", 25/11):
// - O celular é desenhado em QUADROS (nunca girado por código: rotação gera serrilhado).
//   Em pé (20×36) → giro (já deitado, com o contorno de onde estava como rastro) → deitado
//   (36×20) com a telinha acendendo um mini palco (céu, chão, dois heróis e um inimigo).
// - Em cima, um meio-círculo dourado de 2 px, com um brilho correndo da esquerda para a direita
//   e uma ponta de seta de 8 px apontando para baixo na ponta direita.
// - Loop de ~2,8 s. Deitou o celular, o palco aparece.
//
// Tudo é desenhado pixel a pixel num <canvas> de 96×64; o zoom da tela amplia sem borrar.

import { cores } from '../paleta.js';

const LARGURA_GRADE = 200; // a tela do "gire" é uma grade em pé de 200×320
const ALTURA_GRADE = 320;
const QUADROS = 28; // 28 quadros a 10 por segundo = 2,8 s
const MS_POR_QUADRO = 100;

/**
 * Monta a tela dentro de `raiz` e devolve { atualizar() }, que mostra ou esconde conforme
 * a posição do celular.
 * @param {HTMLElement} raiz
 */
export function criarTelaGire(raiz) {
  // O "suporte" só posiciona (em pixels reais); a "grade" é que leva o zoom (igual ao palco).
  raiz.innerHTML = `
    <div class="gire-suporte"><div class="gire-grade">
      <div class="janela gire-janela">
        <canvas class="gire-desenho" width="96" height="64"></canvas>
        <div class="t-titulo gire-titulo">Gire o celular</div>
        <div class="gire-divisor"><div class="gire-losango"></div></div>
        <div class="t-corpo gire-texto">A plataforma é projetada para uso horizontal, como numa tela de JRPG.</div>
        <div class="t-rotulo gire-assinatura">ERRANTES</div>
      </div>
    </div></div>`;
  const suporte = raiz.querySelector('.gire-suporte');
  const grade = raiz.querySelector('.gire-grade');
  const ctx = raiz.querySelector('canvas').getContext('2d');
  let quadro = 0;
  let relogio = null;

  /** Em pé e com tela de toque (ou ?gire=1 no endereço, para testar no computador). */
  const deveMostrar = () => {
    const forcado = new URLSearchParams(location.search).has('gire');
    const emPe = window.matchMedia('(orientation: portrait)').matches;
    const toque = window.matchMedia('(pointer: coarse)').matches;
    return forcado || (emPe && toque);
  };

  /** Escala inteira em pixels reais, igual ao palco. */
  const ajustarEscala = () => {
    const dpr = window.devicePixelRatio || 1;
    const larguraReal = window.innerWidth * dpr;
    const alturaReal = window.innerHeight * dpr;
    let escala = Math.floor(Math.min(larguraReal / LARGURA_GRADE, alturaReal / ALTURA_GRADE));
    if (escala < 1) escala = Math.min(larguraReal / LARGURA_GRADE, alturaReal / ALTURA_GRADE);
    grade.style.zoom = escala / dpr;
    suporte.style.left = `${Math.floor((larguraReal - LARGURA_GRADE * escala) / 2) / dpr}px`;
    suporte.style.top = `${Math.floor((alturaReal - ALTURA_GRADE * escala) / 2) / dpr}px`;
  };

  function atualizar() {
    const mostrar = deveMostrar();
    raiz.hidden = !mostrar;
    document.body.classList.toggle('girando', mostrar);
    if (mostrar) {
      ajustarEscala();
      if (!relogio) {
        relogio = setInterval(() => {
          quadro = (quadro + 1) % QUADROS;
          desenharQuadro(ctx, quadro);
        }, MS_POR_QUADRO);
        desenharQuadro(ctx, quadro);
      }
    } else if (relogio) {
      clearInterval(relogio);
      relogio = null;
    }
  }

  window.addEventListener('resize', atualizar);
  window.addEventListener('orientationchange', atualizar);
  atualizar();
  return { atualizar };
}

// ───────────── Desenho dos quadros ─────────────

/** Pinta um pixel (ou um retângulo) na grade do desenho. */
function px(ctx, x, y, cor, l = 1, a = 1) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, l, a);
}

/**
 * Desenha um quadro da animação.
 * 0–9: em pé · 10–12: giro (deitado + rastro) · 13–27: deitado, a telinha acende.
 */
function desenharQuadro(ctx, f) {
  ctx.clearRect(0, 0, 96, 64);
  desenharArco(ctx, f);
  if (f < 10) desenharCelularEmPe(ctx);
  else {
    if (f < 13) desenharRastro(ctx, f - 10);
    desenharCelularDeitado(ctx, f < 13 ? -1 : f - 13);
  }
}

const CENTRO_ARCO = { x: 48, y: 34 };
const RAIO = 26;

/**
 * Meio-círculo dourado de 2 px (de ~180° a 0°), com um brilho branco que corre da
 * esquerda para a direita nos primeiros quadros, e a ponta de seta na ponta direita.
 */
function desenharArco(ctx, f) {
  const brilho = f <= 13 ? 180 - (180 * f) / 13 : null; // ângulo do brilho, em graus
  for (let y = 0; y <= CENTRO_ARCO.y; y++) {
    for (let x = 0; x < 96; x++) {
      const dx = x + 0.5 - CENTRO_ARCO.x;
      const dy = y + 0.5 - CENTRO_ARCO.y;
      const d = Math.hypot(dx, dy);
      if (d < RAIO - 1 || d >= RAIO + 1) continue; // anel de 2 px, rasterizado limpo
      const angulo = (Math.atan2(-dy, dx) * 180) / Math.PI;
      if (angulo < 8) continue; // deixa a ponta direita para a seta
      const perto = brilho !== null && Math.abs(angulo - brilho) < 10;
      px(ctx, x, y, perto ? cores.texto : cores.dourado);
    }
  }
  // Ponta de seta de 8 px, apontando para baixo, com contorno escuro.
  const sx = CENTRO_ARCO.x + RAIO; // centro da seta na ponta direita do arco
  const sy = CENTRO_ARCO.y - 4;
  const linhas = ['kkkkkkkkkk', 'kddddddddk', '.kddddddk.', '..kddddk..', '...kddk...', '....kk....'];
  linhas.forEach((linha, i) => {
    [...linha].forEach((ch, j) => {
      if (ch === 'k') px(ctx, sx - 5 + j, sy + i, cores.contorno);
      if (ch === 'd') px(ctx, sx - 5 + j, sy + i, cores.dourado);
    });
  });
}

/** Celular em pé, 20×36: contorno preto, moldura clara, tela azul. */
function desenharCelularEmPe(ctx) {
  const x = 38;
  const y = 26;
  px(ctx, x, y, cores.contorno, 20, 36);
  px(ctx, x + 1, y + 1, cores.borda, 18, 34);
  px(ctx, x + 3, y + 4, cores.ceu, 14, 28);
  px(ctx, x + 8, y + 2, cores.linhaEscura, 4, 1); // alto-falante
}

/** O contorno de onde o celular estava, sumindo aos poucos (pontilhado cada vez mais ralo). */
function desenharRastro(ctx, passo) {
  const x = 38;
  const y = 26;
  const intervalo = [2, 3, 4][passo];
  for (let i = 0; i < 20; i++) {
    if (i % intervalo === 0) {
      px(ctx, x + i, y, cores.costura);
      px(ctx, x + i, y + 35, cores.costura);
    }
  }
  for (let j = 0; j < 36; j++) {
    if (j % intervalo === 0) {
      px(ctx, x, y + j, cores.costura);
      px(ctx, x + 19, y + j, cores.costura);
    }
  }
}

/**
 * Celular deitado, 36×20. luz = -1 (tela apagada, logo depois do giro) ou 0..14
 * (a telinha acende aos poucos um mini palco).
 */
function desenharCelularDeitado(ctx, luz) {
  const x = 30;
  const y = 34;
  px(ctx, x, y, cores.contorno, 36, 20);
  px(ctx, x + 1, y + 1, cores.borda, 34, 18);
  px(ctx, x + 2, y + 9, cores.linhaEscura, 1, 4); // alto-falante (agora na lateral)
  const tx = x + 4;
  const ty = y + 3;
  const tl = 28;
  const ta = 14;
  px(ctx, tx, ty, cores.fundoEscuro, tl, ta);
  if (luz < 0) return;
  // Acende de cima para baixo: céu, horizonte, chão; depois os heróis e o inimigo.
  const linhasAcesas = Math.min(ta, luz * 3);
  for (let j = 0; j < linhasAcesas; j++) {
    const cor = j < 6 ? cores.ceu : j === 6 ? cores.horizonte : j < 10 ? cores.chao : cores.chaoFundo;
    px(ctx, tx, ty + j, cor, tl, 1);
  }
  if (luz >= 6) {
    // Dois heróis (2×4) à esquerda e um inimigo (4×3) à direita, como no palco.
    px(ctx, tx + 5, ty + 6, cores.contorno, 3, 5);
    px(ctx, tx + 6, ty + 7, '#da863e', 1, 3);
    px(ctx, tx + 9, ty + 8, cores.contorno, 3, 5);
    px(ctx, tx + 10, ty + 9, '#4f8fba', 1, 3);
  }
  if (luz >= 8) {
    px(ctx, tx + 19, ty + 7, cores.contorno, 5, 4);
    px(ctx, tx + 20, ty + 8, cores.inimigo, 3, 2);
  }
}
