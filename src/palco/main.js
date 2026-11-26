// Ponto de entrada do palco. No Marco 0 ele só faz duas coisas:
// 1) amplia o palco por um número INTEIRO de pixels reais da tela (pixel art nítida);
// 2) liga/desliga o modo debug com a tecla D.

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
// Mudar o zoom do navegador (Ctrl + / Ctrl -) também dispara "resize", então já está coberto.
ajustarEscala();

window.addEventListener('keydown', (evento) => {
  if (evento.key === 'd' || evento.key === 'D') debug.hidden = !debug.hidden;
});
