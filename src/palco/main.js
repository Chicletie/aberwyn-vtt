// Ponto de entrada do palco (a tela dos jogadores):
// 1) amplia o palco por um número INTEIRO de pixels reais da tela (pixel art nítida);
// 2) escuta o canal e redesenha tudo a cada estado que a mesa mandar;
// 3) liga/desliga o modo debug com a tecla D.
// O palco nunca altera o estado: só desenha.

import { aplicarPaletaNoCss } from '../paleta.js';
import { abrirCanal } from '../canal.js';
import { criarPalco } from './palco.js';
import { carregarDados } from '../dados.js';
import { criarTelaGire } from './gire.js';
import { prepararMolduras } from '../molduras.js';

aplicarPaletaNoCss();

const LARGURA = 480;
const ALTURA = 270;

const suporte = document.getElementById('suporte');
const palco = document.getElementById('palco');
const debug = document.getElementById('debug');

/**
 * Calcula a escala e posiciona o palco no centro da janela.
 * Por que usar devicePixelRatio (dpr): no Windows com zoom de 125% ou 150%, e nos celulares,
 * 1 "pixel CSS" não é 1 pixel real da tela. Se ampliássemos só em pixels CSS, a escala
 * real ficaria quebrada (ex.: 2 × 1,25 = 2,5) e a arte borraria. Então calculamos em pixels reais.
 */
function ajustarEscala() {
  const dpr = window.devicePixelRatio || 1;
  const larguraReal = window.innerWidth * dpr;
  const alturaReal = window.innerHeight * dpr;

  let escalaReal = Math.floor(Math.min(larguraReal / LARGURA, alturaReal / ALTURA));
  // Tela menor que 480×270 pixels reais (celular pequeno): reduz fracionado só para caber.
  if (escalaReal < 1) escalaReal = Math.min(larguraReal / LARGURA, alturaReal / ALTURA);

  const escalaCss = escalaReal / dpr;
  // Arredondar o canto para um pixel real inteiro evita que tudo fique "entre pixels".
  const esquerda = Math.floor((larguraReal - LARGURA * escalaReal) / 2) / dpr;
  const topo = Math.floor((alturaReal - ALTURA * escalaReal) / 2) / dpr;

  // Por que "zoom" e não "transform: scale": o navegador arredonda bordas para pixels reais
  // ANTES de aplicar o transform. Com dpr 1,25, uma borda de 1 px virava 1 pixel real fininho
  // (em vez de 3 na escala 3×); com zoom out, ficava grossa demais. O "zoom" amplia antes de
  // arredondar, então 1 px da grade vira exatamente "escalaReal" pixels reais, para tudo.
  suporte.style.left = `${esquerda}px`;
  suporte.style.top = `${topo}px`;
  palco.style.zoom = escalaCss;
  debug.textContent = `ESCALA ${Number(escalaReal.toFixed(2))}X  DPR ${Number(dpr.toFixed(2))}`;
}

window.addEventListener('resize', ajustarEscala);
// Celular em pé: tela "Gire o celular" no lugar do palco (some sozinha ao deitar).
criarTelaGire(document.getElementById('gire'));
// Mudar o zoom do navegador (Ctrl + / Ctrl -) também dispara "resize", então já está coberto.
ajustarEscala();

window.addEventListener('keydown', (evento) => {
  if (evento.key === 'd' || evento.key === 'D') debug.hidden = !debug.hidden;
});

// ───────────── Canal: recebe o estado da mesa ─────────────

// Espera as fontes pixel e os dados dos cenários antes de desenhar
// (a largura das fitas depende das fontes; a faixa de chão depende dos cenários).
const pronto = Promise.all([
  document.fonts.load('27px "Jersey 15 PF"'),
  document.fonts.load('18.6667px "Jersey 10 PF"'),
  document.fonts.load('8px "Silkscreen"'),
  carregarDados(),
  prepararMolduras(),
]).then(([, , , dados]) => criarPalco(palco, { cenarios: dados.cenarios, interativo: true }));

// O código da sala vem no endereço: palco.html?sala=XXXXX (o link que o mestre manda).
// Sem código, o palco escuta só a mesa no mesmo navegador (modo local, para testes).
const sala = new URLSearchParams(location.search).get('sala')?.toUpperCase() || null;
const canal = abrirCanal({ sala, online: !!sala, palco: true });

// Testando no próprio computador (localhost)? Então o palco sem código escuta a mesa local.
const noComputadorDoMestre = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

// ───────────── Caixa para digitar o código da sala ─────────────
// O jogador digita o código (ou cola o link inteiro) e a página recarrega já com ?sala=XXXXX.
const formSala = document.getElementById('entrar-sala');
const campoSala = document.getElementById('codigo-sala');
const erroSala = document.getElementById('erro-sala');

/** Aceita "5uud8", " 5UUD8 " ou o link inteiro colado; devolve o código limpo (ou null). */
function lerCodigo(texto) {
  const doLink = texto.match(/[?&]sala=([A-Za-z0-9]+)/);
  const codigo = (doLink ? doLink[1] : texto).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return /^[A-Z0-9]{4,8}$/.test(codigo) ? codigo : null;
}

function mostrarCaixaSala(mostrar) {
  formSala.hidden = !mostrar;
}

formSala.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const codigo = lerCodigo(campoSala.value);
  if (!codigo) {
    erroSala.textContent = 'CÓDIGO INVÁLIDO (4 A 8 LETRAS/NÚMEROS)';
    erroSala.hidden = false;
    return;
  }
  const endereco = new URL(location.href);
  endereco.searchParams.set('sala', codigo);
  location.href = endereco.toString();
});
campoSala.addEventListener('input', () => {
  erroSala.hidden = true;
});

canal.aoReceberEstado(async (estado) => {
  // Fica no console para conferir com F12 o que REALMENTE chegou (e o que não chegou).
  console.log('[palco] estado recebido:', estado);
  const p = await pronto;
  // Sala existe no link, mas está vazia: código errado, ou a mesa nunca transmitiu nela.
  if (!estado) {
    mostrarCaixaSala(true);
    return p.renderizar(null, `Sala ${sala} vazia. Confira o código com o mestre.`);
  }
  mostrarCaixaSala(false);
  window.ultimoEstado = estado;
  p.renderizar(estado);
});

pronto.then((p) => {
  if (window.ultimoEstado) return;
  // Sem código da sala no link (fora do computador do mestre): pedir o código, em vez de esperar à toa.
  if (!sala && !noComputadorDoMestre) {
    p.renderizar(null, 'Digite o código da sala que o mestre passou.');
    mostrarCaixaSala(true);
  } else p.renderizar(null); // "Aguardando a mesa…" até chegar o primeiro estado
  canal.pedirEstado();
});

// "Reconectando…" discreto se a internet cair; some sozinho quando a conexão volta.
// (O Firebase reconecta sozinho e, ao voltar, entrega o estado mais recente da sala.)
const avisoConexao = document.getElementById('reconectando');
if (sala && canal.online) {
  let primeiraVez = true;
  canal.aoMudarConexao((conectado) => {
    // Na abertura a conexão leva um instante: só avisa se cair DEPOIS de ter conectado.
    if (conectado) primeiraVez = false;
    avisoConexao.hidden = conectado || primeiraVez;
  });
} else if (sala) {
  console.warn('[palco] link com sala, mas o modo online ainda não foi configurado (config-online.js).');
}

/**
 * Lupa de depuração (só pelo console, F12): amplia o palco e mostra a partir do ponto (x, y)
 * da grade, para conferir pixel por pixel. Ex.: inspecionar(30, 150, 5). F5 volta ao normal.
 */
window.inspecionar = (x, y, escala = 5) => {
  const z = escala / (window.devicePixelRatio || 1);
  palco.style.zoom = z;
  suporte.style.left = `${-x * z}px`;
  suporte.style.top = `${-y * z}px`;
};
