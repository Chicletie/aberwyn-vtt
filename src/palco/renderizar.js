// renderizar(estadoPublico): desenha o palco a partir do estado que a mesa mandou.
//
// Por que não apagar e recriar tudo a cada mudança (o jeito mais simples)?
// Porque as animações (o passo de quem age, o rastro branco do dano, a fita abrindo) precisam
// que o MESMO elemento continue na tela entre um estado e outro. Então cada peça fica guardada
// por id e só é atualizada. Ver DECISOES, "Palco: atualizar em vez de recriar".

import { cores, clarear, escurecer } from '../paleta.js';
import { pixelArte, elipse, recolorir, rotulo3x5 } from './pixel.js';
import { posicoesHerois, posicoesInimigos, tamanhoProvisorio, CHAO_PADRAO } from './layout.js';

const UI = './assets/ui/';
const palco = document.getElementById('palco');

// ───────────── Ajudantes ─────────────

/** Cria um elemento com classe e (opcionalmente) coloca dentro de outro. */
function criar(tag, classe, pai) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (pai) pai.appendChild(el);
  return el;
}

/** Posiciona um elemento na grade de 480×270 (sempre em pixels inteiros). */
function posicionar(el, x, y, largura, altura) {
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  if (largura !== undefined) el.style.width = `${Math.round(largura)}px`;
  if (altura !== undefined) el.style.height = `${Math.round(altura)}px`;
}

/** Largura de um elemento em pixels da GRADE (desfaz o zoom do palco). */
function larguraNaGrade(el) {
  const zoom = parseFloat(palco.style.zoom) || 1;
  return Math.round(el.getBoundingClientRect().width / zoom);
}

/** Cor de quem é: herói = cor-assinatura; inimigo = vermelho; vilão = vinho. */
function corDe(c) {
  if (c.lado === 'heroi') return c.corAssinatura;
  return c.lado === 'vilao' ? cores.vilao : cores.inimigo;
}

/** Inicial do nome (para os desenhos provisórios sem arte). */
function inicial(c) {
  return c.revelado === false ? '?' : (c.nome || '?').trim()[0].toUpperCase();
}

/** Está em crise? Ponto de crise = metade do PV máximo, arredondado para baixo. */
function emCrise(pv) {
  return pv.atual > 0 && pv.atual <= Math.floor(pv.max / 2);
}

// Pequenos desenhos em pixel art feitos por código (provisórios; podem virar PNG depois).
const D = cores.dourado;
const K = cores.contorno;
const SETA_ESQUERDA = pixelArte(['...k', '..kd', '.kdd', 'kddd', '.kdd', '..kd', '...k'], { k: K, d: D });
const SETA_DIREITA = pixelArte(['k...', 'dk..', 'ddk.', 'dddk', 'ddk.', 'dk..', 'k...'], { k: K, d: D });
const TRIANGULO_BAIXO = pixelArte(['kkkkk', 'kdddk', '.kdk.', '..k..'], { k: K, d: D });
const TRIANGULO_CIMA = pixelArte(['..k..', '.kdk.', 'kdddk', 'kkkkk'], { k: K, d: D });

// ───────────── Camadas fixas do palco (criadas uma vez) ─────────────

const camadas = {
  cenario: criar('div', 'cenario', palco),
  campo: criar('div', 'campo', palco),
  faixa: criar('div', 'faixa-turnos', palco),
  hud: criar('div', 'hud', palco),
  painel: criar('div', 'painel', palco),
  flutuantes: criar('div', 'flutuantes', palco),
  cortina: criar('div', 'cortina', palco),
};
// Ordem das camadas (quem fica por cima de quem). Cada camada isola os z-index de dentro dela.
['cenario', 'campo', 'faixa', 'hud', 'painel'].forEach((nome, i) => (camadas[nome].style.zIndex = String(i + 1)));
camadas.flutuantes.style.zIndex = '20';
camadas.cortina.style.zIndex = '30';
// O texto de debug (tecla D) fica sempre por cima.
palco.appendChild(document.getElementById('debug'));

// Cenário provisório: faixas de cor (céu, horizonte, chão). Com arte, vira a imagem do cenário.
for (const [classe, y, h, cor] of [
  ['ceu', 32, 66, cores.ceu],
  ['horizonte', 98, 2, cores.horizonte],
  ['chao', 100, 50, cores.chao],
  ['chao-frente', 150, 50, cores.chaoFundo],
]) {
  const faixa = criar('div', classe, camadas.cenario);
  posicionar(faixa, 0, y, 480, h);
  faixa.style.background = cor;
}

// Faixa de turnos
const rotuloRodada = criar('div', 't-rotulo rotulo-rodada', camadas.faixa);
rotuloRodada.textContent = 'RODADA';
const numeroRodada = criar('div', 't-titulo numero-rodada', camadas.faixa);
const blocoHerois = criar('div', 'bloco-turnos plaquinha', camadas.faixa);
const blocoInimigos = criar('div', 'bloco-turnos plaquinha', camadas.faixa);
const setaVez = criar('div', 'seta-vez', camadas.faixa);

// Painel
const janelaRetrato = criar('div', 'janela janela-retrato', camadas.painel);
const retratoPainel = criar('div', 'retrato', janelaRetrato);
const janelaMenu = criar('div', 'janela janela-menu', camadas.painel);
const janelaStatus = criar('div', 'janela janela-status', camadas.painel);
const janelaSubmenu = criar('div', 'janela janela-submenu', palco);
janelaSubmenu.style.zIndex = '10';
posicionar(janelaRetrato, 2, 202, 62, 66);
posicionar(janelaMenu, 66, 202, 88, 66);

// Cortina (modo cortina e "aguardando")
const janelaCortina = criar('div', 'janela janela-cortina', camadas.cortina);
const textoCortina = criar('div', 't-corpo', janelaCortina);

// ───────────── Guardados entre um estado e outro ─────────────

/** @type {Map<string, HTMLElement>} */
const lutadores = new Map();
/** @type {Map<string, {el: HTMLElement, pv: number, pm: number}>} */
const linhasStatus = new Map();
const efeitosVistos = new Set();
let primeiroEstado = true;
let bannerAtual = null;
/** Pés de cada um, para os números flutuantes saberem onde nascer. */
let pes = new Map();

// ───────────── Função principal ─────────────

/**
 * Redesenha o palco a partir do estado público.
 * @param {object|null} estado null = ainda não chegou nada da mesa.
 */
export function renderizar(estado) {
  if (!estado) {
    mostrarCortina('Aguardando a mesa…');
    return;
  }
  if (estado.modo === 'cortina') {
    mostrarCortina(estado.cortina.texto);
    return;
  }
  camadas.cortina.hidden = true;

  const herois = estado.combatentes.filter((c) => c.lado === 'heroi');
  const inimigos = estado.combatentes.filter((c) => c.lado !== 'heroi');

  desenharFaixaTurnos(estado, herois, inimigos);
  desenharCampo(estado, herois, inimigos);
  desenharBanner(estado.banner);
  desenharPainel(estado, herois);
  desenharFlutuantes(estado.efeitos);
  primeiroEstado = false;
}

function mostrarCortina(texto) {
  camadas.cortina.hidden = false;
  textoCortina.textContent = texto;
  const largura = Math.min(400, larguraNaGrade(textoCortina) + 32);
  posicionar(janelaCortina, 240 - Math.floor(largura / 2), 110, largura, 44);
}

// ───────────── Faixa de turnos (0–32) ─────────────

function desenharFaixaTurnos(estado, herois, inimigos) {
  numeroRodada.textContent = String(estado.rodada);

  const preencher = (bloco, lista, xInicio, alinharDireita) => {
    bloco.replaceChildren();
    const largura = 27 * lista.length + 3;
    const x = alinharDireita ? 476 - largura : xInicio;
    posicionar(bloco, x, 1, largura, 30);
    lista.forEach((c, i) => {
      const rosto = criar('div', 'rosto', bloco);
      posicionar(rosto, i * 27, 0, 24, 24);
      const agiu = c.turnosUsados >= c.turnosPorRodada;
      rosto.classList.toggle('agiu', agiu);
      // Sem retrato ainda: quadrado na cor de quem é, com a inicial.
      const desenho = criar('div', 'rosto-desenho t-corpo', rosto);
      desenho.textContent = inicial(c);
      desenho.style.background = c.revelado === false ? cores.fundoEscuro : corDe(c);
      desenho.style.color = c.revelado === false ? cores.texto : cores.contorno;
      // Sublinhado de 1 px na cor de quem é.
      criar('div', 'rosto-sublinhado', rosto).style.background = corDe(c);
      // Condições: até 3 ícones no canto de cima à esquerda; mais que isso vira "+".
      const conds = c.condicoes.length > 3 ? [...c.condicoes.slice(0, 2), '+'] : c.condicoes;
      conds.forEach((k, j) => {
        const icone = criar('div', 'icone-condicao', rosto);
        posicionar(icone, -1 + j * 7, -1, 7, 7);
        if (k === '+') icone.classList.add('mais');
        else icone.style.backgroundImage = `url(${UI}condicoes/${k}.png)`;
      });
      // Mais de um turno por rodada: pontinhos, um por turno, apagando conforme usa.
      if (c.turnosPorRodada > 1) {
        for (let t = 0; t < c.turnosPorRodada; t++) {
          const ponto = criar('div', 'ponto-turno', rosto);
          posicionar(ponto, 2 + t * 3, 25, 2, 2);
          ponto.classList.toggle('usado', t < c.turnosUsados);
        }
      }
      // Quem age agora: ▼ em cima.
      if (c.id === estado.agindoId) {
        const marca = criar('div', 'marca-agindo', rosto);
        posicionar(marca, 9, -4, 5, 4);
        marca.style.backgroundImage = `url(${TRIANGULO_BAIXO})`;
      }
    });
    return { x, largura };
  };

  const h = preencher(blocoHerois, herois, 40, false);
  const i = preencher(blocoInimigos, inimigos, 0, true);
  blocoHerois.classList.toggle('da-vez', estado.ladoDaVez === 'herois');
  blocoInimigos.classList.toggle('da-vez', estado.ladoDaVez === 'inimigos');

  // A seta fica sempre no meio do espaço entre os dois blocos e aponta para o lado da vez.
  const meio = Math.round((h.x + h.largura + i.x) / 2);
  posicionar(setaVez, meio - 2, 12, 4, 7);
  setaVez.style.backgroundImage = `url(${estado.ladoDaVez === 'herois' ? SETA_ESQUERDA : SETA_DIREITA})`;
}

// ───────────── Campo (58–200) ─────────────

function desenharCampo(estado, herois, inimigos) {
  const chao = CHAO_PADRAO; // Marco 2: vem de dados/cenarios.json
  pes = new Map([...posicoesHerois(herois, chao), ...posicoesInimigos(inimigos, chao)]);

  const presentes = new Set();
  for (const c of estado.combatentes) {
    presentes.add(c.id);
    let el = lutadores.get(c.id);
    if (!el) {
      el = criarLutador(c);
      lutadores.set(c.id, el);
    }
    atualizarLutador(el, c, pes.get(c.id), estado.agindoId === c.id);
  }
  // Quem saiu da luta sai do campo.
  for (const [id, el] of lutadores) {
    if (!presentes.has(id)) {
      el.remove();
      lutadores.delete(id);
    }
  }
}

function criarLutador(c) {
  const el = criar('div', 'lutador', camadas.campo);
  criar('div', 'sombra', el);
  criar('div', 'anel', el);
  const corpo = criar('div', 'corpo t-titulo', el);
  corpo.dataset.inicial = '';
  criar('div', 'seta-agindo', el);
  criar('div', 'barra-inimigo', el);
  // Sem transição na primeira vez (senão ele "voaria" do canto da tela até o lugar).
  el.classList.add('sem-transicao');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('sem-transicao')));
  return el;
}

function atualizarLutador(el, c, pe, agindo) {
  const { largura, altura } = tamanhoProvisorio(c);
  const cor = corDe(c);
  el.dataset.lado = c.lado;
  el.classList.toggle('agindo', agindo);
  el.classList.toggle('oculto', c.revelado === false);
  el.classList.toggle('caido', c.lado === 'heroi' && c.pv.atual === 0);
  el.classList.toggle('inimigo', c.lado !== 'heroi');
  // A caixa do lutador tem o tamanho do sprite; os pés ficam no centro da borda de baixo.
  posicionar(el, pe.x - largura / 2, pe.y - altura, largura, altura);
  // Camadas: quem tem o pé mais embaixo fica na frente; quem age fica por cima de todos.
  el.style.zIndex = agindo ? '500' : String(pe.y);

  const corpo = el.querySelector('.corpo');
  corpo.textContent = inicial(c);
  corpo.style.background = c.revelado === false ? cores.contorno : cor;

  // Sombra comum ou, para quem age, anel na cor dele.
  const larguraSombra = largura >= 56 ? 48 : 24;
  const sombra = el.querySelector('.sombra');
  posicionar(sombra, (largura - larguraSombra) / 2, altura - 3, larguraSombra, 6);
  sombra.style.backgroundImage = `url(${elipse(larguraSombra, 6, cores.sombra)})`;
  const anel = el.querySelector('.anel');
  posicionar(anel, (largura - larguraSombra - 2) / 2, altura - 4, larguraSombra + 2, 8);
  anel.style.backgroundImage = `url(${elipse(larguraSombra + 2, 8, cor, true)})`;

  // Seta ► atrás de quem age (à esquerda do herói; espelhada à direita do inimigo).
  const seta = el.querySelector('.seta-agindo');
  const chegaDeCima = Math.round(altura / 2) - 6;
  if (c.lado === 'heroi') posicionar(seta, -10, chegaDeCima, 9, 13);
  else posicionar(seta, largura + 1, chegaDeCima, 9, 13);
  if (agindo) {
    recolorir(`${UI}seta.png`, {
      '#c7cfcc': clarear(cor, 0.5), '#819796': cor, '#394a50': escurecer(cor, 0.35),
    }).then((url) => (seta.style.backgroundImage = `url(${url})`));
  }

  // Inimigo revelado com "mostrar PV": barra fina logo abaixo dos pés.
  const barra = el.querySelector('.barra-inimigo');
  if (c.lado !== 'heroi' && c.pvAtual !== null && c.pvAtual !== undefined && c.pvMax) {
    barra.hidden = false;
    posicionar(barra, (largura - 26) / 2, altura + 4, 26, 4);
    barra.style.setProperty('--fracao', String(c.pvAtual / c.pvMax));
  } else {
    barra.hidden = true;
  }
}

// ───────────── Fita (caixa de mensagem, 32–58) ─────────────

function desenharBanner(banner) {
  const chave = banner ? banner.texto + '|' + banner.cor : null;
  if (chave === bannerAtual) return; // mesma mensagem: não reabre a animação
  bannerAtual = chave;
  camadas.hud.replaceChildren();
  if (!banner) return;

  const fita = criar('div', 'fita', camadas.hud);
  const caudaEsq = criar('div', 'fita-cauda esquerda', fita);
  const caudaDir = criar('div', 'fita-cauda direita', fita);
  const faixa = criar('div', 'fita-faixa', fita);
  faixa.style.setProperty('--cor-fita', banner.cor);
  const texto = criar('div', 'fita-texto t-corpo', faixa);
  // Cada letra é um <span> para entrar uma por vez (≈2 letras por quadro de 40 ms).
  // As letras de uma palavra ficam juntas num <span class="palavra">, para a quebra de linha
  // acontecer só entre palavras (nunca no meio de "Ação").
  let i = 0;
  banner.texto.split(' ').forEach((palavra, p) => {
    if (p > 0) texto.appendChild(document.createTextNode(' '));
    const spanPalavra = criar('span', 'palavra', texto);
    for (const letra of palavra) {
      const span = criar('span', 'letra', spanPalavra);
      span.textContent = letra;
      span.style.animationDelay = `${300 + i++ * 20}ms`;
    }
  });

  // Largura automática: texto + 8 px de cada lado, no máximo 300; passou disso, quebra a linha.
  // (mede o texto numa linha só, antes de dar largura à faixa)
  texto.style.width = 'max-content';
  const larguraTexto = larguraNaGrade(texto);
  const largura = Math.min(300, larguraTexto + 16 + 2);
  const linhas = larguraTexto + 18 > 300 ? 2 : 1;
  const altura = 19 + (linhas - 1) * 15;
  texto.classList.toggle('quebra', linhas > 1);
  texto.style.width = `${largura - 18}px`;
  const x = 240 - Math.floor(largura / 2);
  posicionar(fita, x, 35, largura, altura);
  posicionar(faixa, 0, 0, largura, altura);

  // Caudas: recortadas da fita de referência (assets/ui/fita.png) e pintadas na cor de quem age.
  const trocas = { '#c7cfcc': banner.cor, '#8b908e': escurecer(banner.cor, 0.25) };
  posicionar(caudaEsq, -14, altura - 14, 19, 19);
  posicionar(caudaDir, largura - 5, altura - 14, 19, 19);
  recolorir(`${UI}fita.png`, trocas, { x: 15, y: 5, largura: 19, altura: 19 }).then(
    (url) => (caudaEsq.style.backgroundImage = `url(${url})`),
  );
  recolorir(`${UI}fita.png`, trocas, { x: 76, y: 5, largura: 19, altura: 19 }).then(
    (url) => (caudaDir.style.backgroundImage = `url(${url})`),
  );
}

// ───────────── Painel (200–270) ─────────────

function desenharPainel(estado, herois) {
  const agindo = estado.combatentes.find((c) => c.id === estado.agindoId);
  // Retrato e menu só aparecem quando um HERÓI está agindo. Na vez dos inimigos, só o status.
  const comMenu = estado.ladoDaVez === 'herois' && agindo?.lado === 'heroi';
  camadas.painel.classList.toggle('so-status', !comMenu);

  const larguraStatus = comMenu ? 322 : 400;
  posicionar(janelaStatus, comMenu ? 156 : 40, 202, larguraStatus, 66);
  if (comMenu) {
    retratoPainel.textContent = inicial(agindo);
    retratoPainel.style.background = agindo.corAssinatura;
    desenharMenu(agindo, estado.acaoDestacada);
  } else {
    janelaSubmenu.hidden = true;
  }
  desenharStatus(estado, herois, larguraStatus);
}

function desenharMenu(heroi, destaque) {
  janelaMenu.replaceChildren();
  const menu = heroi.menu ?? [];
  const selecionado = Math.max(0, menu.findIndex((m) => m.id === destaque?.acao));
  // Mostra 4 itens; rola para o selecionado ficar visível.
  const primeiro = Math.min(Math.max(0, selecionado - 3), Math.max(0, menu.length - 4));
  menu.slice(primeiro, primeiro + 4).forEach((m, i) => {
    const item = criar('div', 'item-menu t-corpo', janelaMenu);
    item.textContent = m.nome;
    // Posições relativas ao conteúdo da janela (a borda de 6 px fica de fora).
    posicionar(item, 12, -4 + i * 14);
    item.classList.toggle('proprio', !!m.proprio);
    if (destaque && primeiro + i === selecionado) {
      item.classList.add('selecionado');
      colocarPena(janelaMenu, 12, -4 + i * 14);
    }
  });
  if (primeiro > 0) setinha(janelaMenu, TRIANGULO_CIMA, 33, -5);
  if (primeiro + 4 < menu.length) setinha(janelaMenu, TRIANGULO_BAIXO, 33, 51);

  // Submenu (ex.: Feitiço → Chama): janelinha acima do painel, com a pena no item.
  const itens = destaque?.item ? heroi.submenu?.[destaque.acao] : null;
  janelaSubmenu.hidden = !itens;
  if (!itens) return;
  janelaSubmenu.replaceChildren();
  const altura = 12 + itens.length * 14 + 4;
  itens.forEach((nome, i) => {
    const item = criar('div', 'item-menu t-corpo', janelaSubmenu);
    item.textContent = nome;
    posicionar(item, 12, -4 + i * 14);
    if (nome === destaque.item) {
      item.classList.add('selecionado');
      colocarPena(janelaSubmenu, 12, -4 + i * 14);
    }
  });
  posicionar(janelaSubmenu, 150, 198 - altura, 96, altura);
}

/** A pena: a PONTA (último pixel, embaixo à direita) encosta no começo do item. */
function colocarPena(janela, xItem, yItem) {
  const pena = criar('div', 'pena', janela);
  posicionar(pena, xItem - 15, yItem + 10 - 14, 16, 16);
}

function setinha(janela, url, x, y) {
  const s = criar('div', 'setinha', janela);
  posicionar(s, x, y, 5, 4);
  s.style.backgroundImage = `url(${url})`;
}

/**
 * Status do grupo. Até 4 heróis: uma coluna larga; 5 a 8: duas colunas.
 * A ordem é a do painel (ordemPainel), nunca a da formação.
 */
function desenharStatus(estado, herois, larguraJanela) {
  const ordem = [...herois].sort((a, b) => (a.ordemPainel ?? 0) - (b.ordemPainel ?? 0));
  const n = ordem.length;
  const colunas = n <= 4 ? 1 : 2;
  const porColuna = Math.ceil(n / colunas);
  const passo = porColuna <= 3 ? 16 : 14;
  const larguraConteudo = larguraJanela - 12 - 8;
  const larguraColuna = colunas === 1 ? larguraConteudo : Math.floor((larguraConteudo - 10) / 2);
  const alturaConteudo = 66 - 12;
  const alturaBloco = passo * (porColuna - 1) + 11;
  const y0 = Math.floor((alturaConteudo - alturaBloco) / 2);

  const presentes = new Set();
  ordem.forEach((c, i) => {
    presentes.add(c.id);
    let linha = linhasStatus.get(c.id);
    if (!linha) {
      linha = { el: criarLinhaStatus(), pv: c.pv.atual, pm: c.pm.atual };
      linhasStatus.set(c.id, linha);
    }
    const coluna = Math.floor(i / porColuna);
    const x = 4 + coluna * (larguraColuna + 10);
    const y = y0 + (i % porColuna) * passo;
    atualizarLinhaStatus(linha, c, x, y, larguraColuna, colunas === 1, estado.agindoId === c.id);
  });
  for (const [id, linha] of linhasStatus) {
    if (!presentes.has(id)) {
      linha.el.remove();
      linhasStatus.delete(id);
    }
  }
}

function criarLinhaStatus() {
  const el = criar('div', 'linha-status', janelaStatus);
  // Rótulos PV/PM/PI na mini-fonte 3×5, cada um na cor da sua barra.
  for (const [classe, letras, cor] of [['r-pv', 'PV', cores.rotuloPv], ['r-pm', 'PM', cores.rotuloPm], ['r-pi', 'PI', cores.rotuloPi]]) {
    rotulo3x5(letras, cor).then((url) => (el.querySelector('.' + classe).style.backgroundImage = `url(${url})`));
  }
  el.innerHTML = `
    <div class="destaque-linha"></div>
    <div class="faixinha"></div>
    <div class="nome t-corpo"></div>
    <div class="conds"></div>
    <div class="rotulo-3x5 r-pv"></div>
    <div class="rotulo-3x5 r-pm"></div>
    <div class="barra barra-pv"><div class="rastro"></div><div class="cheio"></div><div class="marca-crise"></div></div>
    <div class="barra barra-pm"><div class="rastro"></div><div class="cheio"></div></div>
    <div class="caido t-rotulo">CAÍDO</div>
    <div class="numero t-corpo"></div>
    <div class="rotulo-3x5 r-pi"></div>
    <div class="numero-pi t-rotulo"></div>`;
  return el;
}

/**
 * Atualiza uma linha do status. Medidas (relativas ao topo do bloco de barras, "y"):
 * barra de PV y..y+5, barra de PM y+6..y+10; o nome fica com as maiúsculas centradas nesse bloco.
 */
function atualizarLinhaStatus(linha, c, x, y, largura, larga, agindo) {
  const el = linha.el;
  const q = (seletor) => el.querySelector(seletor);
  const caido = c.pv.atual === 0;
  const crise = emCrise(c.pv);
  posicionar(el, x, y, largura, 11);
  el.classList.toggle('caido-linha', caido);
  el.classList.toggle('crise', crise);

  // Destaque de quem age: fundo escuro e borda na cor-assinatura.
  const destaque = q('.destaque-linha');
  destaque.hidden = !agindo;
  destaque.style.borderColor = c.corAssinatura;

  q('.faixinha').style.background = c.corAssinatura;
  const nome = q('.nome');
  nome.textContent = c.nome.slice(0, 8); // nomes com mais de 8 letras são cortados
  posicionar(nome, 5, -3);

  // Medidas da linha (o que sobra vai para as barras).
  const xRotulos = larga ? 70 : 54;
  const larguraNumero = larga ? 50 : 22;
  const larguraPi = 12;
  // Condições: até 6 ícones na coluna larga; nas duas colunas, até 3 (ou 2 + "+N").
  const maxIcones = larga ? 6 : 3;
  const larguraIcones = maxIcones * 8 + 2;
  // Rótulo (7 px) + 2 px de folga antes da barra, alinhado pelo topo com o contorno da barra.
  const xBarra = xRotulos + 9;
  const larguraBarra = largura - xBarra - 4 - larguraNumero - 4 - larguraPi - larguraIcones;

  posicionar(q('.r-pv'), xRotulos, 0, 7, 5);
  posicionar(q('.r-pm'), xRotulos, 6, 7, 5);

  atualizarBarra(q('.barra-pv'), xBarra, 0, larguraBarra, 4, c.pv, linha, 'pv');
  atualizarBarra(q('.barra-pm'), xBarra, 6, larguraBarra, 3, c.pm, linha, 'pm');
  const marca = q('.marca-crise');
  posicionar(marca, 1 + Math.floor((larguraBarra - 2) / 2), -1, 1, 2);

  const caidoTexto = q('.caido');
  caidoTexto.hidden = !caido;
  posicionar(caidoTexto, xBarra + Math.floor(larguraBarra / 2) - 13, 2, 26, 8);

  const numero = q('.numero');
  numero.textContent = caido ? '' : larga ? `${c.pv.atual}/${c.pv.max}` : String(c.pv.atual);
  posicionar(numero, xBarra + larguraBarra + 4, -3, larguraNumero);

  const xPi = largura - larguraPi;
  posicionar(q('.r-pi'), xPi, 0, 7, 5);
  const numeroPi = q('.numero-pi');
  numeroPi.textContent = c.pi ? String(c.pi.atual) : '';
  posicionar(numeroPi, xPi, 2, larguraPi);

  // Ícones de condição entre o número e o PI, centrados na altura das barras.
  const conds = q('.conds');
  conds.replaceChildren();
  const lista = c.condicoes.length > maxIcones ? c.condicoes.slice(0, maxIcones - 1) : c.condicoes;
  lista.forEach((k, j) => {
    const icone = criar('div', 'icone-condicao', conds);
    posicionar(icone, j * 8, 0, 7, 7);
    icone.style.backgroundImage = `url(${UI}condicoes/${k}.png)`;
  });
  if (c.condicoes.length > maxIcones) {
    const mais = criar('div', 'mais-condicoes t-rotulo', conds);
    mais.textContent = `+${c.condicoes.length - lista.length}`;
    posicionar(mais, lista.length * 8, -2);
  }
  posicionar(conds, xPi - larguraIcones, 2);
}

/**
 * Barra de PV ou PM: contorno 1 px, fundo escuro, cor com brilho em cima e sombra embaixo.
 * Rastro de dano: o pedaço perdido fica branco e encolhe em ~400 ms.
 */
function atualizarBarra(barra, x, y, larguraInterna, alturaInterna, valor, linha, campo) {
  posicionar(barra, x, y, larguraInterna + 2, alturaInterna + 2);
  const fracaoPx = (v) => {
    if (v <= 0 || valor.max <= 0) return 0;
    return Math.max(1, Math.round((larguraInterna * Math.min(v, valor.max)) / valor.max));
  };
  const cheio = barra.querySelector('.cheio');
  const rastro = barra.querySelector('.rastro');
  const novo = fracaoPx(valor.atual);
  cheio.style.width = `${novo}px`;

  const anterior = linha[campo];
  if (valor.atual < anterior && !primeiroEstado) {
    // Caiu: o rastro começa na largura antiga e encolhe até a nova.
    rastro.style.transition = 'none';
    rastro.style.width = `${fracaoPx(anterior)}px`;
    rastro.getBoundingClientRect(); // força o navegador a "ver" a largura antiga antes de animar
    rastro.style.transition = '';
    rastro.style.width = `${novo}px`;
  } else {
    rastro.style.transition = 'none';
    rastro.style.width = `${novo}px`;
  }
  linha[campo] = valor.atual;
}

// ───────────── Números flutuantes ─────────────

function desenharFlutuantes(efeitos) {
  for (const e of efeitos) {
    if (efeitosVistos.has(e.id)) continue;
    efeitosVistos.add(e.id);
    // No primeiro estado (palco acabou de abrir), não repete efeitos antigos.
    if (primeiroEstado || Date.now() - e.em > 3000) continue;
    const pe = pes.get(e.alvoId);
    if (!pe) continue;
    const el = criar('div', 'flutuante', camadas.flutuantes);
    if (e.tipo === 'condicao') {
      el.classList.add('t-corpo', 'condicao');
      el.textContent = e.valor[0].toUpperCase() + e.valor.slice(1);
    } else {
      el.classList.add('t-titulo', e.tipo);
      el.textContent = e.tipo === 'dano' ? `-${e.valor}` : `${e.valor > 0 ? '+' : ''}${e.valor}`;
    }
    posicionar(el, pe.x + 6, pe.y - 44);
    el.addEventListener('animationend', () => el.remove());
  }
}
