// A mesa em volta do palco: um MAPA CELESTE aberto, com o palco no centro do mapa.
//  - Anéis e meridianos do mapa centrados no palco, com uma régua de graus (astrolábio).
//  - Estrelas em lugares únicos e constelações ligadas por fios (os Laços); algumas piscam.
//  - A TINTA: um tinteiro tombou e a tinta escorre pelo mapa. Onde ela passa, as estrelas
//    se apagam (o tema do apagamento). O tamanho da mancha é o nível de "tinta" (0 a 5) que o
//    mestre escolhe na mesa: dá para a mancha crescer ao longo dos arcos da história.
// Tudo na grade do palco (mesmo zoom), por baixo da moldura e do palco.

import { pixelArte } from './pixel.js';

const OURO = '#e8c170';
const BRANCO = '#ebede9';
const TINTA = '#090a14';

// Raio da mancha em cada nível de tinta (em pixels da grade).
const RAIOS = [11, 22, 44, 74, 114, 168];

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

/**
 * O fio solto sobre a mesa, como o de um novelo que caiu e rolou: em vez de uma curva lisa,
 * passa por pontos espalhados dos dois lados do caminho (ondas desiguais) e faz uma laçada no
 * meio do caminho. Um caminho suave (Catmull-Rom) liga os pontos. 2 px de grossura: ouro,
 * sombra embaixo e um brilho de vez em quando, como as voltas do fio trançado da moldura.
 */
function desenharFio(g, de, para) {
  const sorte = sorteador(2718);
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  const comprimento = Math.hypot(dx, dy) || 1;
  const lado = { x: -dy / comprimento, y: dx / comprimento }; // perpendicular ao caminho
  // Caminho de base: sai do novelo para baixo e para fora, antes de voltar para o nó.
  const base = (t) => ({
    x: de.x + dx * t + Math.sin(Math.PI * t) * 38,
    y: de.y + dy * t + Math.sin(Math.PI * t) * 14,
  });
  const pontos = [de];
  const passos = 9;
  for (let i = 1; i < passos; i++) {
    const t = i / passos;
    const b = base(t);
    // Para um lado e para o outro, com tamanhos desiguais (fio solto não ondula certinho).
    const desvio = (i % 2 ? 1 : -1) * (8 + sorte() * 16);
    pontos.push({ x: b.x + lado.x * desvio, y: b.y + lado.y * desvio });
    if (i === 4) {
      // A laçada: o fio dá uma volta em si mesmo.
      const c = pontos[pontos.length - 1];
      for (const a of [0.5, 1.6, 2.7, 3.8, 4.9]) pontos.push({ x: c.x + Math.cos(a) * 11 + 9, y: c.y + Math.sin(a) * 8 });
    }
  }
  pontos.push(para);

  // Catmull-Rom: uma curva suave que passa exatamente por todos os pontos.
  let anterior = null;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[Math.max(0, i - 1)];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[Math.min(pontos.length - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.02) {
      const t2 = t * t, t3 = t2 * t;
      const x = Math.round(0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3));
      const y = Math.round(0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3));
      if (anterior && anterior.x === x && anterior.y === y) continue;
      // Liga ao ponto anterior pixel a pixel: sem isso, nos trechos rápidos da curva o fio
      // saía "picotado" (pulava pixels).
      const de2 = anterior ?? { x, y };
      const passos = Math.max(Math.abs(x - de2.x), Math.abs(y - de2.y), 1);
      for (let k = 1; k <= passos; k++) {
        const xi = Math.round(de2.x + ((x - de2.x) * k) / passos);
        const yi = Math.round(de2.y + ((y - de2.y) * k) / passos);
        g.fillStyle = '#ad7757';
        g.fillRect(xi, yi + 1, 1, 1);
        g.fillStyle = (xi + yi) % 5 === 0 ? BRANCO : OURO;
        g.fillRect(xi, yi, 1, 1);
      }
      anterior = { x, y };
    }
  }
}

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

  let medidas = null; // { largura, altura, centro, proibidas, fonte, fio }
  let nivel = 1; // nível de tinta mostrado agora (pode ser fracionário durante a animação)
  let alvo = 1;
  let animando = null;

  /** A mancha de tinta: uma função "esta posição está molhada?" para o raio dado. */
  function mancha(fonte, raio) {
    const sorte = sorteador(4242);
    // Borda irregular: o raio varia com o ângulo (soma de ondas com fases sorteadas).
    const ondas = [2, 3, 5, 7].map((k) => ({ k, fase: sorte() * Math.PI * 2, forca: 0.22 / k ** 0.5 }));
    // Escorridos: "dedos" finos que descem da mancha (a tinta escorrendo).
    const dedos = Array.from({ length: 6 }, () => ({ dx: (sorte() - 0.5) * 1.6, comprimento: 0.5 + sorte() * 0.9, largura: 1 + Math.floor(sorte() * 2) }));
    return (x, y) => {
      if (raio <= 0) return false;
      const dx = x - fonte.x;
      const dy = y - fonte.y;
      // Escorre mais para baixo do que para cima, e mais para a direita: para onde a boca do
      // tinteiro aponta (para dentro, por baixo do palco).
      const ex = dx > 0 ? dx * 0.75 : dx * 1.3;
      const ey = dy > 0 ? dy * 0.7 : dy * 1.6;
      const angulo = Math.atan2(ey, ex);
      let r = raio;
      for (const o of ondas) r *= 1 + o.forca * Math.sin(o.k * angulo + o.fase);
      if (Math.hypot(ex, ey) < r) return true;
      // Dedos que escorrem para baixo a partir da borda de baixo da mancha.
      for (const d of dedos) {
        const xd = fonte.x + d.dx * raio;
        if (Math.abs(x - xd) > d.largura) continue;
        if (y > fonte.y && y < fonte.y + raio * (0.6 + d.comprimento)) return true;
      }
      return false;
    };
  }

  function desenhar() {
    if (!medidas) return;
    const { largura, altura, centro, proibidas, fonte, fio } = medidas;
    tela.width = largura;
    tela.height = altura;
    tela.style.width = `${largura}px`;
    tela.style.height = `${altura}px`;
    const g = tela.getContext('2d');
    g.clearRect(0, 0, largura, altura);
    piscas.replaceChildren();

    const sorte = sorteador(largura * 7919 + altura);
    const fora = (x, y, folga = 3) =>
      proibidas.some((r) => x > r.x - folga && x < r.x + r.w + folga && y > r.y - folga && y < r.y + r.h + folga);
    const raio = nivel <= 0 ? 0 : RAIOS[Math.floor(nivel)] + (RAIOS[Math.min(5, Math.ceil(nivel))] - RAIOS[Math.floor(nivel)]) * (nivel % 1);
    const molhado = mancha(fonte, raio);
    const px = (x, y, cor) => {
      if (molhado(x, y)) return;
      g.fillStyle = cor;
      g.fillRect(x, y, 1, 1);
    };

    // ── O mapa: anéis pontilhados e meridianos em volta do palco (o centro do mapa).
    const maxR = Math.hypot(largura, altura);
    for (let r = 212; r < maxR; r += 42) {
      const passos = Math.ceil(2 * Math.PI * r);
      for (let i = 0; i < passos; i += 3) {
        const a = (i / passos) * Math.PI * 2;
        px(Math.round(centro.x + Math.cos(a) * r * 1.25), Math.round(centro.y + Math.sin(a) * r * 0.78), '#3c5e8b');
      }
    }
    // Meridianos (de 30 em 30 graus), saindo do anel de dentro para fora.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
      for (let r = 212; r < maxR; r += 3) px(Math.round(centro.x + Math.cos(a) * r * 1.25), Math.round(centro.y + Math.sin(a) * r * 0.78), '#253a5e');
    }
    // A régua de graus no primeiro anel (como num astrolábio): tracinhos, e os de 30° dourados.
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const longo = k % 6 === 0;
      for (let t = 0; t < (longo ? 4 : 2); t++) {
        const r = 212 - t;
        px(Math.round(centro.x + Math.cos(a) * r * 1.25), Math.round(centro.y + Math.sin(a) * r * 0.78), longo ? '#e8c170' : '#4f8fba');
      }
    }

    // ── As estrelas.
    const estrelas = [];
    const tentativas = Math.round((largura * altura) / 650);
    for (let i = 0; i < tentativas; i++) {
      const x = Math.floor(sorte() * largura);
      const y = Math.floor(sorte() * altura);
      const brilho = sorte();
      if (x < 3 || y < 3 || x > largura - 4 || y > altura - 4 || fora(x, y)) continue;
      estrelas.push({ x, y, tipo: brilho > 0.88 ? 'grande' : brilho > 0.55 ? 'media' : 'pequena', apagada: molhado(x, y) });
    }

    // ── Constelações: fios pontilhados entre estrelas vizinhas (não atravessam a tinta).
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
        if (i % 3 === 0) continue;
        const x = Math.round(a.x + ((melhor.x - a.x) * i) / passos);
        const y = Math.round(a.y + ((melhor.y - a.y) * i) / passos);
        if (!fora(x, y, 1)) px(x, y, '#4f8fba');
      }
    }

    // ── A tinta (por cima do mapa): preta, com brilho molhado na borda de cima.
    if (raio > 0) {
      for (let y = 0; y < altura; y++) {
        for (let x = 0; x < largura; x++) {
          if (!molhado(x, y)) continue;
          g.fillStyle = !molhado(x, y - 1) ? '#3c5e8b' : !molhado(x - 1, y) || !molhado(x + 1, y) || !molhado(x, y + 1) ? '#10141f' : TINTA;
          g.fillRect(x, y, 1, 1);
        }
      }
      // Dois reflexos de luz na tinta molhada, perto do tinteiro.
      g.fillStyle = '#253a5e';
      for (const [dx, dy, w] of [[4, 3, 4], [9, 6, 2]]) {
        if (molhado(fonte.x + dx, fonte.y + dy) && raio > 12) g.fillRect(fonte.x + dx, fonte.y + dy, w, 1);
      }
    }

    // ── O fio dourado: sai do novelo e atravessa a mesa, solto, até o nó da moldura.
    if (fio) desenharFio(g, fio.de, fio.para);

    // ── As estrelas por cima: as que a tinta cobriu viraram um vulto apagado.
    for (const e of estrelas) {
      if (e.apagada) {
        if (e.tipo !== 'pequena') {
          g.fillStyle = '#172038';
          g.fillRect(e.x, e.y, 1, 1);
        }
        continue;
      }
      if (e.tipo === 'pequena') {
        g.fillStyle = sorte() < 0.5 ? '#819796' : '#4f8fba';
        g.fillRect(e.x, e.y, 1, 1);
      } else if (e.tipo === 'media') {
        g.fillStyle = '#73bed3';
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

    // ── Estrelas que piscam devagar (nunca dentro da tinta).
    let quantas = 0;
    for (let i = 0; i < 80 && quantas < 14; i++) {
      const x = Math.floor(sorte() * largura);
      const y = Math.floor(sorte() * altura);
      if (x < 4 || y < 4 || x > largura - 5 || y > altura - 5 || fora(x, y, 4) || molhado(x, y)) continue;
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

  /**
   * Novo tamanho de tela: (largura × altura) da grade, centro do palco, áreas a evitar e os
   * pontos dos objetos: de onde sai a tinta e de onde até onde vai o fio.
   */
  function atualizar(largura, altura, centro, proibidas, { tinta, fio }) {
    medidas = { largura, altura, centro, proibidas, fonte: tinta, fio };
    desenhar();
  }

  /** Nível de tinta (0 a 5). Mudou? A mancha cresce (ou encolhe) aos poucos, ~1 s. */
  function definirTinta(novo) {
    novo = Math.max(0, Math.min(5, Math.round(Number(novo) || 0)));
    if (novo === alvo) return;
    alvo = novo;
    clearInterval(animando);
    if (!medidas) {
      nivel = alvo;
      return;
    }
    const inicio = nivel;
    let passo = 0;
    animando = setInterval(() => {
      passo++;
      nivel = inicio + ((alvo - inicio) * passo) / 12;
      desenhar();
      if (passo >= 12) clearInterval(animando);
    }, 80);
  }

  return { atualizar, definirTinta };
}
