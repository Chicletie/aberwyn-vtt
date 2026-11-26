// Molduras das janelas e plaquinhas, montadas a partir dos PNGs desenháveis à mão
// (assets/ui/janela.png e assets/ui/plaquinha.png).
//
// Por que não usar "border-image" (o jeito padrão do CSS para molduras 9-slice)?
// Porque o Firefox recorta a imagem errado quando a página está ampliada com "zoom": em vez de
// uma moldura em volta da caixa, aparecem várias caixinhas pontilhadas lado a lado (print do
// Cadu, 26/11). Então o próprio código recorta a imagem: os 4 cantos e um pedacinho de cada
// borda (que se repete). Cada pedaço vira uma variável CSS (--janela-ce, --janela-topo…), e o
// CSS monta a moldura com fundos comuns, que todo navegador desenha igual.
//
// Redesenhar o PNG continua mudando todas as janelas, sem mexer no código.

const cache = new Map();

function carregarImagem(url) {
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = rejeitar;
    img.src = url;
  });
}

function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Recorta um pedaço da imagem (trocando cores, se pedido) e devolve "url(data:…)". */
function recortar(img, x, y, largura, altura, trocas) {
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext('2d');
  ctx.drawImage(img, x, y, largura, altura, 0, 0, largura, altura);
  if (trocas) {
    const dados = ctx.getImageData(0, 0, largura, altura);
    const p = dados.data;
    const lista = Object.entries(trocas).map(([de, para]) => [hexParaRgb(de), hexParaRgb(para)]);
    for (let i = 0; i < p.length; i += 4) {
      for (const [de, para] of lista) {
        if (p[i] === de[0] && p[i + 1] === de[1] && p[i + 2] === de[2]) {
          [p[i], p[i + 1], p[i + 2]] = para;
          break;
        }
      }
    }
    ctx.putImageData(dados, 0, 0);
  }
  return `url(${tela.toDataURL()})`;
}

/**
 * Corta uma moldura 9-slice em pedaços.
 * @param {string} url       PNG da moldura
 * @param {number} canto     tamanho do canto (6 na janela, 3 na plaquinha)
 * @param {number} periodo   largura do pedaço de borda que se repete (4 = um ciclo da costura)
 * @param {Object<string,string>|null} trocas cores a trocar (ex.: a borda clara pela cor do aviso)
 */
export async function cortarMoldura(url, canto, periodo, trocas = null) {
  const chave = JSON.stringify([url, canto, periodo, trocas]);
  if (cache.has(chave)) return cache.get(chave);
  const img = await carregarImagem(url);
  const w = img.width;
  const h = img.height;
  const partes = {
    ce: recortar(img, 0, 0, canto, canto, trocas), // canto de cima, esquerda
    cd: recortar(img, w - canto, 0, canto, canto, trocas),
    be: recortar(img, 0, h - canto, canto, canto, trocas), // canto de baixo, esquerda
    bd: recortar(img, w - canto, h - canto, canto, canto, trocas),
    topo: recortar(img, canto, 0, periodo, canto, trocas),
    base: recortar(img, canto, h - canto, periodo, canto, trocas),
    esq: recortar(img, 0, canto, canto, periodo, trocas),
    dir: recortar(img, w - canto, canto, canto, periodo, trocas),
  };
  cache.set(chave, partes);
  return partes;
}

/** Põe os pedaços como variáveis CSS (--nome-ce, --nome-topo…) num elemento. */
export function aplicarMoldura(elemento, nome, partes) {
  for (const [parte, valor] of Object.entries(partes)) elemento.style.setProperty(`--${nome}-${parte}`, valor);
}

/** Prepara as molduras padrão da página inteira (chamar antes de desenhar). */
export async function prepararMolduras() {
  const raiz = document.documentElement;
  const [janela, plaquinha] = await Promise.all([
    cortarMoldura('./assets/ui/janela.png', 6, 4),
    cortarMoldura('./assets/ui/plaquinha.png', 3, 1),
  ]);
  aplicarMoldura(raiz, 'janela', janela);
  aplicarMoldura(raiz, 'plaquinha', plaquinha);
}
