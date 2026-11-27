// Carregador de arte (sprites e retratos), usado pela mesa e pelo palco.
//
// Regra de ouro (SPEC): o app TEM que funcionar sem arte. Então ninguém espera imagem:
// quem desenha pergunta "já tem a arte?" e recebe a informação na hora (ou null). Se ainda
// não tem, este arquivo começa a procurar em segundo plano e, quando acha, avisa quem pediu
// para redesenhar. Arquivo que não existe vira "falta" e não é procurado de novo.
//
// Pastas (dentro de public/, ver docs/DADOS.md):
//   assets/sprites/<id>/<pose>.png   (+ opcional <pose>.json: { "fps": 4, "repetir": true, "quadros": 4 })
//   assets/retratos/<id>.png         (48×48)

const BASE = './assets/';

/** @typedef {{url:string, largura:number, altura:number, quadros:number, fps:number, repetir:boolean, cabeca:{x:number,y:number}}} InfoSprite */

/** caminho → 'carregando' | InfoSprite | {url,largura,altura} | null (null = não existe) */
const cache = new Map();
const ouvintes = new Set();
let avisoMarcado = false;

/** Chama a função sempre que alguma arte nova terminar de chegar (para redesenhar). */
export function aoChegarArte(funcao) {
  ouvintes.add(funcao);
  return () => ouvintes.delete(funcao);
}

function avisar() {
  // Várias imagens costumam chegar juntas: junta os avisos num só redesenho.
  if (avisoMarcado) return;
  avisoMarcado = true;
  requestAnimationFrame(() => {
    avisoMarcado = false;
    for (const f of ouvintes) f();
  });
}

function carregarImagem(url) {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = url;
  });
}

async function carregarJson(url) {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return {};
    return await resposta.json();
  } catch {
    return {};
  }
}

/** Id de pasta/arquivo seguro (letras, números, - e _). Qualquer outra coisa = sem arte. */
function idValido(id) {
  return typeof id === 'string' && /^[a-z0-9_-]+$/i.test(id);
}

function buscar(caminho, montar) {
  if (cache.has(caminho)) {
    const v = cache.get(caminho);
    return v === 'carregando' ? null : v;
  }
  cache.set(caminho, 'carregando');
  montar().then((info) => {
    cache.set(caminho, info);
    if (info) avisar();
  });
  return null;
}

/** Informação de UMA pose (ou null se ainda não chegou / não existe). */
function pose(id, nomePose) {
  if (!idValido(id) || !idValido(nomePose)) return null;
  const url = `${BASE}sprites/${id}/${nomePose}.png`;
  return buscar(url, async () => {
    const [img, json] = await Promise.all([carregarImagem(url), carregarJson(url.replace(/\.png$/, '.json'))]);
    if (!img) return null;
    const largura = img.naturalWidth;
    const altura = img.naturalHeight;
    // Quantos quadros lado a lado? O .json manda; sem ele, sprite de herói (48 de altura) tem
    // quadros de 32 de largura; qualquer outro tamanho é 1 quadro só (imagem parada).
    let quadros = Number(json.quadros) || (altura === 48 && largura % 32 === 0 ? largura / 32 : 1);
    if (largura % quadros !== 0) quadros = 1;
    const larguraQuadro = largura / quadros;
    return {
      url,
      largura: larguraQuadro,
      altura,
      quadros,
      fps: Number(json.fps) || 4,
      repetir: json.repetir !== false,
      // De onde recortar a "cabeça" 24×24 (faixa de turnos e retrato de reserva).
      cabeca: {
        x: Number.isFinite(json.cabeca?.x) ? json.cabeca.x : Math.round((larguraQuadro - 24) / 2),
        y: Number.isFinite(json.cabeca?.y) ? json.cabeca.y : 0,
      },
    };
  });
}

/**
 * Sprite para desenhar: a primeira pose da lista que existir (ex.: ['caido', 'parado']).
 * Pede todas da lista ao mesmo tempo; enquanto uma pose preferida ainda está carregando,
 * usa a seguinte que já chegou (e troca sozinho quando a preferida chegar).
 * @returns {InfoSprite|null}
 */
export function spriteDe(id, poses = ['parado']) {
  if (!idValido(id)) return null;
  const lista = [...new Set([...poses.filter(Boolean), 'parado'])];
  let achado = null;
  for (const p of lista) {
    const info = pose(id, p);
    if (info && !achado) achado = info;
  }
  return achado;
}

/** Retrato 48×48: { url, largura, altura } ou null. */
export function retratoDe(id) {
  if (!idValido(id)) return null;
  const url = `${BASE}retratos/${id}.png`;
  return buscar(url, async () => {
    const img = await carregarImagem(url);
    return img ? { url, largura: img.naturalWidth, altura: img.naturalHeight } : null;
  });
}

/**
 * Pinta um elemento 24×24 (rosto) com a melhor arte disponível:
 * recorte da cabeça do sprite → recorte do topo do retrato → nada (devolve false).
 */
export function pintarRosto(el, c) {
  const s = spriteDe(c.sprite);
  if (s) {
    el.style.backgroundImage = `url(${s.url})`;
    el.style.backgroundPosition = `${-s.cabeca.x}px ${-s.cabeca.y}px`;
    return true;
  }
  const r = retratoDe(c.retrato);
  if (r) {
    el.style.backgroundImage = `url(${r.url})`;
    el.style.backgroundPosition = `${-Math.round((r.largura - 24) / 2)}px -6px`;
    return true;
  }
  el.style.backgroundImage = '';
  return false;
}

/**
 * Pinta uma caixa 48×48 (painel e diálogo) com o retrato; sem retrato, a cabeça do sprite
 * em 1× (nunca ampliada) no meio da caixa. Devolve false se não houver arte nenhuma.
 */
export function pintarRetrato(el, c) {
  const r = retratoDe(c.retrato);
  if (r) {
    el.style.backgroundImage = `url(${r.url})`;
    el.style.backgroundPosition = 'center';
    el.style.backgroundSize = '';
    return true;
  }
  const s = spriteDe(c.sprite);
  if (s) {
    // Recorte 24×24 da cabeça, centralizado na caixa de 48: começa 12 px para dentro.
    el.style.backgroundImage = `url(${s.url})`;
    el.style.backgroundPosition = `${12 - s.cabeca.x}px ${12 - s.cabeca.y}px`;
    el.style.backgroundSize = '';
    return true;
  }
  el.style.backgroundImage = '';
  return false;
}

// ───────────── Silhueta dos inimigos escondidos (só a mesa usa) ─────────────

const silhuetas = new Map(); // id do sprite → {url,largura,altura} | 'gerando' | null

/**
 * Silhueta pronta ({ url: dataURL, largura, altura }) do primeiro quadro da pose "parado", ou null se ainda não há.
 * Por que a mesa gera a imagem em vez de mandar o nome do sprite: o nome do arquivo
 * (ex.: "guardiao-marco") apareceria no F12 do jogador e estragaria a surpresa.
 * A silhueta vai como imagem pronta, sem nome nenhum.
 */
export function silhuetaDe(idSprite) {
  if (!idValido(idSprite)) return null;
  const pronta = silhuetas.get(idSprite);
  if (pronta && pronta !== 'gerando') return pronta;
  if (pronta === 'gerando') return null;
  const s = spriteDe(idSprite);
  if (!s) return null; // o sprite ainda não chegou; quando chegar, aoChegarArte redesenha e pede de novo
  silhuetas.set(idSprite, 'gerando');
  carregarImagem(s.url).then((img) => {
    if (!img) return silhuetas.set(idSprite, null);
    const tela = document.createElement('canvas');
    tela.width = s.largura;
    tela.height = s.altura;
    const g = tela.getContext('2d');
    g.drawImage(img, 0, 0);
    // Mantém só o formato: todo pixel visível vira preto.
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, s.largura, s.altura);
    silhuetas.set(idSprite, { url: tela.toDataURL('image/png'), largura: s.largura, altura: s.altura });
    avisar();
  });
  return null;
}
