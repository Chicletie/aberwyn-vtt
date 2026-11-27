// O céu em volta do palco: a "luz da Fabula" sobre o manuscrito apagado.
// Estrelas e constelações (estrelas ligadas por fios, como os Laços) desenhadas em lugares
// ÚNICOS, sem repetir como um ladrilho; algumas piscam devagar. Também solta luzinhas douradas
// da ponta da pena. Tudo na grade do palco (mesmo zoom), fora do palco e da moldura.

import { pixelArte } from './pixel.js';

const OURO = '#e8c170';
const BRANCO = '#ebede9';

// Estrela que pisca (5 quadros de 5×5): apagada → pequena → grande → pequena → apagada.
const PISCA = pixelArte(
  [
    '.......o.................',
    '.......o.....o...........',
    '..W...oWo...oWo..ooWoo...',
    '.......o.....o...........',
    '.......o.................',
  ],
  { o: OURO, W: BRANCO },
);

/** Sorteio repetível: o mesmo céu para o mesmo tamanho de tela (não "pula" ao redesenhar). */
function sorteador(semente) {
  let s = semente % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function criarCeu(fundo) {
  const tela = document.createElement('canvas');
  tela.className = 'ceu';
  fundo.append(tela);
  const piscas = document.createElement('div');
  piscas.className = 'ceu-piscas';
  fundo.append(piscas);

  /**
   * Redesenha o céu para uma tela de (largura × altura) pixels da grade, com o palco em
   * (px, py) e as áreas "proibidas" (moldura, pena, novelo) em "livres = false".
   */
  function atualizar(largura, altura, proibidas) {
    tela.width = largura;
    tela.height = altura;
    tela.style.width = `${largura}px`;
    tela.style.height = `${altura}px`;
    const g = tela.getContext('2d');
    g.clearRect(0, 0, largura, altura);
    piscas.replaceChildren();

    const sorte = sorteador(largura * 7919 + altura);
    const livre = (x, y, folga = 3) =>
      x > 2 && y > 2 && x < largura - 3 && y < altura - 3 &&
      !proibidas.some((r) => x > r.x - folga && x < r.x + r.w + folga && y > r.y - folga && y < r.y + r.h + folga);

    // Estrelas: mais ou menos uma a cada 700 pixels de área livre.
    const estrelas = [];
    const tentativas = Math.round((largura * altura) / 700);
    for (let i = 0; i < tentativas; i++) {
      const x = Math.floor(sorte() * largura);
      const y = Math.floor(sorte() * altura);
      if (!livre(x, y)) continue;
      const brilho = sorte();
      estrelas.push({ x, y, tipo: brilho > 0.88 ? 'grande' : brilho > 0.55 ? 'media' : 'pequena' });
    }

    // Constelações: cada estrela média ou grande se liga à vizinha mais próxima (até 46 px)
    // por um fio pontilhado, como os Laços ligam as pessoas.
    g.fillStyle = '#253a5e';
    const ligadas = new Set();
    for (const a of estrelas) {
      if (a.tipo === 'pequena' || sorte() < 0.35) continue;
      let melhor = null;
      let distancia = 46;
      for (const b of estrelas) {
        if (b === a || b.tipo === 'pequena') continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < distancia && d > 10) [melhor, distancia] = [b, d];
      }
      if (!melhor) continue;
      const chave = [a, melhor].map((e) => `${e.x},${e.y}`).sort().join('|');
      if (ligadas.has(chave)) continue;
      ligadas.add(chave);
      const passos = Math.max(Math.abs(melhor.x - a.x), Math.abs(melhor.y - a.y));
      for (let i = 2; i < passos - 1; i++) {
        if (i % 3 === 0) continue; // pontilhado
        const x = Math.round(a.x + ((melhor.x - a.x) * i) / passos);
        const y = Math.round(a.y + ((melhor.y - a.y) * i) / passos);
        if (livre(x, y, 1)) g.fillRect(x, y, 1, 1);
      }
    }

    // As estrelas por cima dos fios.
    for (const e of estrelas) {
      if (e.tipo === 'pequena') {
        g.fillStyle = sorte() < 0.5 ? '#394a50' : '#3c5e8b';
        g.fillRect(e.x, e.y, 1, 1);
      } else if (e.tipo === 'media') {
        g.fillStyle = '#4f8fba';
        g.fillRect(e.x - 1, e.y, 3, 1);
        g.fillRect(e.x, e.y - 1, 1, 3);
        g.fillStyle = '#c7cfcc';
        g.fillRect(e.x, e.y, 1, 1);
      } else {
        g.fillStyle = '#ad7757';
        g.fillRect(e.x - 2, e.y, 5, 1);
        g.fillRect(e.x, e.y - 2, 1, 5);
        g.fillStyle = OURO;
        g.fillRect(e.x - 1, e.y, 3, 1);
        g.fillRect(e.x, e.y - 1, 1, 3);
        g.fillStyle = BRANCO;
        g.fillRect(e.x, e.y, 1, 1);
      }
    }

    // Algumas estrelas a mais, que piscam devagar (cada uma no seu tempo).
    let quantas = 0;
    for (let i = 0; i < 80 && quantas < 14; i++) {
      const x = Math.floor(sorte() * largura);
      const y = Math.floor(sorte() * altura);
      if (!livre(x, y, 4)) continue;
      const p = document.createElement('div');
      p.className = 'ceu-pisca';
      p.style.left = `${x - 2}px`;
      p.style.top = `${y - 2}px`;
      p.style.backgroundImage = `url(${PISCA})`;
      p.style.animationDuration = `${2400 + Math.floor(sorte() * 3000)}ms`;
      p.style.animationDelay = `${-Math.floor(sorte() * 5000)}ms`;
      piscas.append(p);
      quantas++;
    }
  }

  return { atualizar };
}

/** Luzinhas douradas que sobem da ponta da pena (a pena "escrevendo" com luz). */
export function criarLuzesDaPena(pai, xPonta, yPonta) {
  pai.replaceChildren();
  for (let i = 0; i < 4; i++) {
    const luz = document.createElement('div');
    luz.className = 'luz-pena';
    luz.style.left = `${xPonta + (i % 2 ? 1 : -2)}px`;
    luz.style.top = `${yPonta - 2}px`;
    luz.style.animationDelay = `${i * 650}ms`;
    luz.style.setProperty('--deriva', `${i % 2 ? 3 : -4}px`);
    pai.append(luz);
  }
}
