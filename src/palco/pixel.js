// Pequenas ferramentas para criar pixel art por código (desenhos provisórios e recoloração).
// Tudo vira uma imagem (data URL) que o CSS usa como fundo, sempre em pixels inteiros.

const cache = new Map();

/**
 * Desenha pixel art a partir de texto. Cada caractere é um pixel; espaço ou "." = transparente.
 * Exemplo: pixelArte(['.#.', '###'], { '#': '#e8c170' })
 * @param {string[]} linhas
 * @param {Object<string,string>} mapa caractere → cor hex
 * @returns {string} data URL de um PNG
 */
export function pixelArte(linhas, mapa) {
  const chave = JSON.stringify([linhas, mapa]);
  if (cache.has(chave)) return cache.get(chave);
  const largura = Math.max(...linhas.map((l) => l.length));
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = linhas.length;
  const ctx = tela.getContext('2d');
  linhas.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      if (!mapa[ch]) return;
      ctx.fillStyle = mapa[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  const url = tela.toDataURL();
  cache.set(chave, url);
  return url;
}

/**
 * Elipse em pixel art (sombra no chão ou anel de quem age), sem suavização.
 * @param {number} largura
 * @param {number} altura
 * @param {string} cor
 * @param {boolean} [soAnel] true = só o contorno (anel), false = preenchida (sombra)
 */
export function elipse(largura, altura, cor, soAnel = false) {
  const linhas = [];
  const rx = largura / 2;
  const ry = altura / 2;
  const dentro = (x, y) => ((x + 0.5 - rx) / rx) ** 2 + ((y + 0.5 - ry) / ry) ** 2 <= 1;
  for (let y = 0; y < altura; y++) {
    let linha = '';
    for (let x = 0; x < largura; x++) {
      if (!dentro(x, y)) linha += '.';
      else if (!soAnel) linha += '#';
      else {
        // Anel = pixel dentro da elipse com algum vizinho fora.
        const borda = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
        linha += borda ? '#' : '.';
      }
    }
    linhas.push(linha);
  }
  return pixelArte(linhas, { '#': cor });
}

/** Carrega uma imagem e devolve uma Promise que termina quando ela chega (ou falha). */
function carregarImagem(url) {
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = rejeitar;
    img.src = url;
  });
}

/**
 * Troca cores de uma imagem (ex.: a seta modelo em cinza vira a cor-assinatura).
 * @param {string} url Imagem original (em assets/ui/).
 * @param {Object<string,string>} trocas cor original → cor nova (hex minúsculo)
 * @param {{x:number,y:number,largura:number,altura:number}} [recorte] parte da imagem a usar
 * @param {{x:number,y:number,largura:number,altura:number}} [apagar] parte do recorte que fica
 *   transparente (ex.: os pixels da faixa que vêm junto no recorte da cauda da fita)
 * @returns {Promise<string>} data URL
 */
export async function recolorir(url, trocas, recorte, apagar) {
  const chave = JSON.stringify([url, trocas, recorte, apagar]);
  if (cache.has(chave)) return cache.get(chave);
  const img = await carregarImagem(url);
  const r = recorte ?? { x: 0, y: 0, largura: img.width, altura: img.height };
  const tela = document.createElement('canvas');
  tela.width = r.largura;
  tela.height = r.altura;
  const ctx = tela.getContext('2d');
  ctx.drawImage(img, r.x, r.y, r.largura, r.altura, 0, 0, r.largura, r.altura);
  const dados = ctx.getImageData(0, 0, r.largura, r.altura);
  const p = dados.data;
  const trocasRgb = Object.entries(trocas).map(([de, para]) => [hexParaRgb(de), hexParaRgb(para)]);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;
    for (const [de, para] of trocasRgb) {
      if (p[i] === de[0] && p[i + 1] === de[1] && p[i + 2] === de[2]) {
        [p[i], p[i + 1], p[i + 2]] = para;
        break;
      }
    }
  }
  ctx.putImageData(dados, 0, 0);
  if (apagar) ctx.clearRect(apagar.x, apagar.y, apagar.largura, apagar.altura);
  const saida = tela.toDataURL();
  cache.set(chave, saida);
  return saida;
}

/**
 * Monta um rótulo da mini-fonte 3×5 (PV, PM, PI) a partir de assets/ui/rotulos.png.
 * A folha tem as letras P, V, M, I lado a lado, 3 px cada com 1 px de espaço.
 * @param {string} letras ex.: "PV"
 * @param {string} cor hex
 * @returns {Promise<string>} data URL (largura = 4 × letras − 1, altura 5)
 */
export async function rotulo3x5(letras, cor) {
  const chave = JSON.stringify(['rotulo', letras, cor]);
  if (cache.has(chave)) return cache.get(chave);
  const folha = await carregarImagem('./assets/ui/rotulos.png');
  const posicao = { P: 0, V: 4, M: 8, I: 12 };
  const tela = document.createElement('canvas');
  tela.width = letras.length * 4 - 1;
  tela.height = 5;
  const ctx = tela.getContext('2d');
  [...letras].forEach((letra, i) => ctx.drawImage(folha, posicao[letra], 0, 3, 5, i * 4, 0, 3, 5));
  // Pinta as letras (desenhadas em branco) na cor pedida.
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, tela.width, tela.height);
  const url = tela.toDataURL();
  cache.set(chave, url);
  return url;
}

function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
