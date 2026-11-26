// O PALCO: desenha a tela dos jogadores a partir do estado público que a mesa mandou.
//
// criarPalco(elemento) monta um palco dentro de qualquer <div> de 480×270. Assim o MESMO código
// desenha a página do jogador (palco.html) e a prévia ao vivo dentro da mesa ("O QUE OS
// JOGADORES VEEM"): o que o mestre vê é exatamente o que o jogador vê.
//
// Por que não apagar e recriar tudo a cada mudança (o jeito mais simples)?
// Porque as animações (o passo de quem age, o rastro branco do dano, a fita abrindo) precisam
// que o MESMO elemento continue na tela entre um estado e outro. Então cada peça fica guardada
// por id e só é atualizada. Ver DECISOES, "Palco: atualizar em vez de recriar".
//
// Tudo que o jogador pode clicar aqui (cartão do inimigo, balão da barra) é CONSULTA:
// muda só a tela dele, nunca vai para a sala.

import { cores, clarear, escurecer } from '../paleta.js';
import { pixelArte, elipse, recolorir, rotulo3x5 } from './pixel.js';
import { cortarMoldura, aplicarMoldura } from '../molduras.js';
import { posicoesHerois, posicoesInimigos, tamanhoProvisorio, CHAO_PADRAO } from './layout.js';

const UI = './assets/ui/';

// ───────────── Ajudantes (não dependem de qual palco) ─────────────

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

/** Escreve um texto letra por letra (cada letra num <span>, palavras sem quebrar no meio). */
function escreverLetraPorLetra(pai, texto, atrasoInicial, msPorLetra = 20) {
  let i = 0;
  texto.split(' ').forEach((palavra, p) => {
    if (p > 0) pai.appendChild(document.createTextNode(' '));
    const spanPalavra = criar('span', 'palavra', pai);
    for (const letra of palavra) {
      const span = criar('span', 'letra', spanPalavra);
      span.textContent = letra;
      span.style.animationDelay = `${atrasoInicial + i++ * msPorLetra}ms`;
    }
  });
  return atrasoInicial + i * msPorLetra;
}

// Pequenos desenhos em pixel art feitos por código (provisórios; podem virar PNG depois).
const D = cores.dourado;
const K = cores.contorno;
const SETA_ESQUERDA = pixelArte(['...k', '..kd', '.kdd', 'kddd', '.kdd', '..kd', '...k'], { k: K, d: D });
const SETA_DIREITA = pixelArte(['k...', 'dk..', 'ddk.', 'dddk', 'ddk.', 'dk..', 'k...'], { k: K, d: D });
const TRIANGULO_BAIXO = pixelArte(['kkkkk', 'kdddk', '.kdk.', '..k..'], { k: K, d: D });
const TRIANGULO_CIMA = pixelArte(['..k..', '.kdk.', 'kdddk', 'kkkkk'], { k: K, d: D });
const LOSANGO = pixelArte(['..d..', '.d.d.', 'd...d', '.d.d.', '..d..'], { d: D });
const TRIANGULO_FALA = pixelArte(['ddddd', '.ddd.', '..d..'], { d: cores.texto });

/** Cores de cada tom de aviso: borda e cor do título. */
const TONS = {
  neutro: { borda: cores.borda, titulo: cores.dourado, fundo: null },
  dourado: { borda: cores.dourado, titulo: cores.texto, fundo: null },
  vermelho: { borda: cores.inimigo, titulo: cores.texto, fundo: null },
  vinho: { borda: cores.vilao, titulo: cores.texto, fundo: null },
  sombrio: { borda: cores.linhaEscura, titulo: cores.borda, fundo: cores.contorno },
};

/** Tipo de fim de combate → tom e título padrão do aviso. */
const FINS = {
  vitoria: { tom: 'dourado', titulo: 'Vitória!' },
  fuga: { tom: 'neutro', titulo: 'Eles fugiram!' },
  acordo: { tom: 'neutro', titulo: 'Trégua.' },
  rendicao: { tom: 'sombrio', titulo: 'O grupo se rende...' },
  personalizado: { tom: 'neutro', titulo: '' },
};

// ───────────── O palco ─────────────

/**
 * Monta um palco dentro de `raiz` (um <div> de 480×270).
 * @param {HTMLElement} raiz
 * @param {{cenarios?: object[], interativo?: boolean}} [opcoes]
 *   cenarios = lista de dados/cenarios.json; interativo = deixa clicar para consultar.
 */
export function criarPalco(raiz, opcoes = {}) {
  const cenarios = opcoes.cenarios ?? [];
  raiz.classList.add('palco');
  if (opcoes.interativo) raiz.classList.add('interativo');

  /** Largura de um elemento em pixels da GRADE (desfaz o zoom, venha ele de onde vier). */
  const larguraNaGrade = (el) => {
    const escala = raiz.getBoundingClientRect().width / 480 || 1;
    return Math.round(el.getBoundingClientRect().width / escala);
  };

  // ── Camadas fixas (criadas uma vez) ──
  const camadas = {};
  for (const [nome, z] of [
    ['cenario', 1], ['campo', 2], ['escurecer', 3], ['faixa', 4], ['hud', 5],
    ['painel', 6], ['janelas', 7], ['flutuantes', 8], ['transicao', 9], ['cortina', 10],
  ]) {
    camadas[nome] = criar('div', `camada ${nome}`, raiz);
    camadas[nome].style.zIndex = String(z);
  }

  // Cenário: faixas de cor por baixo; se houver imagem, ela cobre as faixas.
  for (const [classe, y, h, cor] of [
    ['ceu', 32, 66, cores.ceu], ['horizonte', 98, 2, cores.horizonte],
    ['chao', 100, 50, cores.chao], ['chao-frente', 150, 50, cores.chaoFundo],
  ]) {
    const faixa = criar('div', classe, camadas.cenario);
    posicionar(faixa, 0, y, 480, h);
    faixa.style.background = cor;
  }
  const imagemCenario = criar('div', 'imagem-cenario', camadas.cenario);
  posicionar(imagemCenario, 0, 0, 480, 270);

  // Faixa de turnos
  criar('div', 't-rotulo rotulo-rodada', camadas.faixa).textContent = 'RODADA';
  const numeroRodada = criar('div', 't-titulo numero-rodada', camadas.faixa);
  const blocoHerois = criar('div', 'bloco-turnos', camadas.faixa);
  const blocoInimigos = criar('div', 'bloco-turnos', camadas.faixa);
  const setaVez = criar('div', 'seta-vez', camadas.faixa);

  // Painel
  const janelaRetrato = criar('div', 'janela janela-retrato', camadas.painel);
  const retratoPainel = criar('div', 'retrato', janelaRetrato);
  const janelaMenu = criar('div', 'janela janela-menu', camadas.painel);
  const janelaStatus = criar('div', 'janela janela-status', camadas.painel);
  const janelaSubmenu = criar('div', 'janela janela-submenu', camadas.janelas);
  posicionar(janelaRetrato, 2, 202, 62, 66);
  posicionar(janelaMenu, 66, 202, 88, 66);

  // Janelas que aparecem sob demanda
  const caixaDialogo = criar('div', 'janela caixa-dialogo', camadas.janelas);
  const cartaoInimigo = criar('div', 'janela cartao-inimigo', camadas.janelas);
  const balao = criar('div', 'balao t-corpo', camadas.janelas);
  caixaDialogo.hidden = cartaoInimigo.hidden = balao.hidden = true;

  // Cortina
  const pontinhos = criar('div', 'pontinhos', camadas.cortina);
  for (let i = 0; i < 40; i++) {
    const p = criar('div', 'pontinho', pontinhos);
    // Posições "aleatórias" mas sempre iguais (para não pular a cada vez que desenha).
    posicionar(p, (i * 97) % 480, (i * 53 + 17) % 270, 1, 1);
    p.style.animationDelay = `${(i * 370) % 3000}ms`;
  }
  const janelaCortina = criar('div', 'janela janela-cortina', camadas.cortina);

  // ── Guardados entre um estado e outro ──
  /** @type {Map<string, HTMLElement>} */
  const lutadores = new Map();
  /** @type {Map<string, {el: HTMLElement, pv: number, pm: number}>} */
  const linhasStatus = new Map();
  const efeitosVistos = new Set();
  let primeiroEstado = true;
  let ultimo = null; // último estado desenhado
  let bannerAtual = null;
  let avisoAtual = null;
  let fimAtual = null;
  let cortinaAtual = null;
  let modoAnterior = null;
  let cartaoAbertoId = null;
  let temporizadorAviso = null;
  /** Pés de cada um, para os números flutuantes e cursores saberem onde ficar. */
  let pes = new Map();

  // ───────────── Função principal ─────────────

  /**
   * Redesenha o palco a partir do estado público.
   * @param {object|null} estado null = ainda não chegou nada da mesa.
   * @param {string} [espera] o que mostrar enquanto não chega nada (ex.: "Peça o link ao mestre").
   */
  function renderizar(estado, espera = 'Aguardando a mesa…') {
    if (!estado) {
      desenharCortina({ nomeCampanha: 'Errantes', linha: espera });
      mostrarCamadaCortina(true);
      return;
    }
    const mudouModo = modoAnterior !== null && modoAnterior !== estado.modo;
    if (mudouModo) tocarTransicao(estado.modo);
    modoAnterior = estado.modo;
    ultimo = estado;

    if (estado.modo === 'cortina') {
      desenharCortina(estado.cortina);
      // Ao sair do combate, a cortina só aparece depois do fade para preto.
      if (mudouModo) setTimeout(() => mostrarCamadaCortina(ultimo?.modo === 'cortina'), 250);
      else mostrarCamadaCortina(true);
      return;
    }
    mostrarCamadaCortina(false);

    const herois = estado.combatentes.filter((c) => c.lado === 'heroi');
    const inimigos = estado.combatentes.filter((c) => c.lado !== 'heroi');

    desenharCenario(estado);
    desenharFaixaTurnos(estado, herois, inimigos);
    desenharCampo(estado, herois, inimigos, mudouModo);
    desenharBanner(bannerDe(estado));
    desenharPainel(estado, herois);
    desenharDialogo(estado.dialogo);
    desenharAviso(estado.fim ? avisoDoFim(estado.fim) : estado.aviso);
    desenharFim(estado.fim);
    desenharFlutuantes(estado.efeitos);
    if (cartaoAbertoId) abrirCartao(cartaoAbertoId);
    primeiroEstado = false;
  }

  /**
   * Mostra/esconde a cortina com visibility (não display): escondida, ela continua medível,
   * e o texto já está no tamanho certo quando aparece.
   */
  function mostrarCamadaCortina(visivel) {
    camadas.cortina.style.visibility = visivel ? 'visible' : 'hidden';
  }

  // ───────────── Cenário ─────────────

  function chaoDe(estado) {
    const doArquivo = cenarios.find((c) => c.id === estado.cenario) ?? {};
    return { ...CHAO_PADRAO, ...pick(doArquivo), ...(estado.chao ?? {}) };
  }
  function pick(c) {
    const r = {};
    for (const k of ['chaoTopo', 'chaoBase', 'heroiX', 'inimigoX']) if (typeof c[k] === 'number') r[k] = c[k];
    return r;
  }

  function desenharCenario(estado) {
    const cenario = cenarios.find((c) => c.id === estado.cenario);
    // Sem arquivo (ou arquivo que não existe): as faixas de cor de baixo continuam aparecendo.
    imagemCenario.style.backgroundImage = cenario?.arquivo ? `url(./assets/cenarios/${cenario.arquivo})` : 'none';
  }

  // ───────────── Cortina ─────────────

  function desenharCortina(c) {
    const chave = JSON.stringify(c);
    if (chave === cortinaAtual) return;
    cortinaAtual = chave;
    janelaCortina.replaceChildren();
    // Linhas da janela, de cima para baixo: [classe, texto, altura da linha]
    const linhas = [['t-titulo nome-campanha', c.nomeCampanha || 'Errantes', 30]];
    linhas.push(['divisor', '', 9]);
    if (c.rotulo) linhas.push(['t-rotulo', c.rotulo, 12]);
    if (c.linha) linhas.push(['t-corpo linha-cortina', c.linha, 19]);
    if (c.autor) linhas.push(['t-rotulo autor', `— ${c.autor}`, 13]);
    if (c.proximaSessao) linhas.push(['t-rotulo proxima', c.proximaSessao, 14]);

    let y = 4;
    let maiorLargura = 120;
    const els = linhas.map(([classe, texto, altura]) => {
      const el = criar('div', classe, janelaCortina);
      if (classe === 'divisor') {
        const losango = criar('div', 'losango', el);
        losango.style.backgroundImage = `url(${LOSANGO})`;
      } else {
        el.textContent = texto;
        maiorLargura = Math.max(maiorLargura, larguraNaGrade(el));
      }
      const meu = { el, y, altura, classe };
      y += altura;
      return meu;
    });
    const largura = Math.min(440, maiorLargura + 28);
    const altura = y + 16;
    posicionar(janelaCortina, 240 - Math.floor(largura / 2), 135 - Math.floor(altura / 2), largura, altura);
    for (const { el, y: yy, classe } of els) {
      if (classe === 'divisor') {
        posicionar(el, 8, yy + 3, largura - 28, 1);
        posicionar(el.firstChild, Math.floor((largura - 28) / 2) - 2, -2, 5, 5);
      } else {
        const w = larguraNaGrade(el);
        posicionar(el, Math.floor((largura - 12 - w) / 2), yy - (classe.includes('titulo') ? 2 : 0));
      }
    }
  }

  // ───────────── Transições entre telas ─────────────

  /** Entrar em combate: clarão branco rápido. Sair: fade para preto. */
  function tocarTransicao(novoModo) {
    const t = criar('div', `transicao-${novoModo === 'combate' ? 'entrar' : 'sair'}`, camadas.transicao);
    posicionar(t, 0, 0, 480, 270);
    t.addEventListener('animationend', () => t.remove());
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
        rosto.classList.toggle('agiu', c.turnosUsados >= c.turnosPorRodada);
        rosto.dataset.id = c.id;
        // Sem retrato ainda: quadrado na cor de quem é, com a inicial.
        const desenho = criar('div', 'rosto-desenho t-corpo', rosto);
        desenho.textContent = inicial(c);
        desenho.style.background = c.revelado === false ? cores.fundoEscuro : corDe(c);
        desenho.style.color = c.revelado === false ? cores.texto : cores.contorno;
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

  function desenharCampo(estado, herois, inimigos, entrouAgora) {
    const chao = chaoDe(estado);
    pes = new Map([...posicoesHerois(herois, chao), ...posicoesInimigos(inimigos, chao)]);

    const presentes = new Set();
    let ordemEntrada = 0;
    for (const c of estado.combatentes) {
      presentes.add(c.id);
      let el = lutadores.get(c.id);
      const novo = !el;
      if (novo) {
        el = criarLutador();
        lutadores.set(c.id, el);
      }
      atualizarLutador(el, c, pes.get(c.id), estado);
      // Entrada: heróis deslizam pela esquerda um atrás do outro; inimigos aparecem com fade.
      if ((novo && !primeiroEstado) || entrouAgora) {
        el.classList.remove('entrando-desliza', 'entrando-fade', 'entrando-surge');
        void el.offsetWidth;
        const tipo = c.entrada === 'pose' || !c.entrada ? (c.lado === 'heroi' ? 'desliza' : 'fade') : c.entrada;
        el.classList.add(`entrando-${tipo}`);
        el.style.animationDelay = `${(entrouAgora ? 300 : 0) + (c.lado === 'heroi' ? ordemEntrada++ * 80 : 0)}ms`;
      }
    }
    for (const [id, el] of lutadores) {
      if (!presentes.has(id)) {
        el.remove();
        lutadores.delete(id);
      }
    }
  }

  function criarLutador() {
    const el = criar('div', 'lutador', camadas.campo);
    criar('div', 'sombra', el);
    criar('div', 'anel', el);
    criar('div', 'corpo t-titulo', el);
    criar('div', 'seta-agindo', el);
    criar('div', 'barra-inimigo', el);
    criar('div', 'nome-inimigo t-rotulo', el);
    criar('div', 'cursor-alvo', el);
    // Sem transição na primeira vez (senão ele "voaria" do canto da tela até o lugar).
    el.classList.add('sem-transicao');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('sem-transicao')));
    if (opcoes.interativo) {
      el.addEventListener('click', (evento) => {
        evento.stopPropagation();
        const id = el.dataset.id;
        const c = ultimo?.combatentes.find((x) => x.id === id);
        if (c && c.lado !== 'heroi') abrirCartao(cartaoAbertoId === id ? null : id);
      });
    }
    return el;
  }

  function atualizarLutador(el, c, pe, estado) {
    const agindo = estado.agindoId === c.id;
    const { largura, altura } = tamanhoProvisorio(c);
    const cor = corDe(c);
    el.dataset.id = c.id;
    el.dataset.lado = c.lado;
    el.classList.toggle('agindo', agindo);
    el.classList.toggle('oculto', c.revelado === false);
    el.classList.toggle('caido', c.lado === 'heroi' && c.pv.atual === 0);
    el.classList.toggle('inimigo', c.lado !== 'heroi');
    el.classList.toggle('alvo', estado.alvos?.includes(c.id));
    // A caixa do lutador tem o tamanho do sprite; os pés ficam no centro da borda de baixo.
    posicionar(el, pe.x - largura / 2, pe.y - altura, largura, altura);
    // Camadas: quem tem o pé mais embaixo fica na frente; quem age fica por cima de todos.
    el.style.zIndex = agindo ? '500' : String(pe.y);

    const corpo = el.querySelector('.corpo');
    corpo.textContent = inicial(c);
    corpo.style.background = c.revelado === false ? cores.contorno : cor;

    const larguraSombra = largura >= 56 ? 48 : 24;
    const sombra = el.querySelector('.sombra');
    posicionar(sombra, (largura - larguraSombra) / 2, altura - 3, larguraSombra, 6);
    sombra.style.backgroundImage = `url(${elipse(larguraSombra, 6, cores.sombra)})`;
    const anel = el.querySelector('.anel');
    posicionar(anel, (largura - larguraSombra - 2) / 2, altura - 4, larguraSombra + 2, 8);
    anel.style.backgroundImage = `url(${elipse(larguraSombra + 2, 8, cor, true)})`;

    // Seta ► atrás de quem age (à esquerda do herói; espelhada à direita do inimigo).
    const seta = el.querySelector('.seta-agindo');
    const peito = Math.round(altura / 2) - 6;
    if (c.lado === 'heroi') posicionar(seta, -10, peito, 9, 13);
    else posicionar(seta, largura + 1, peito, 9, 13);
    if (agindo) {
      recolorir(`${UI}seta.png`, {
        '#c7cfcc': clarear(cor, 0.5), '#819796': cor, '#394a50': escurecer(cor, 0.35),
      }).then((url) => (seta.style.backgroundImage = `url(${url})`));
    }

    // Alvo: a pena encosta a PONTA na borda esquerda do alvo, na altura do peito.
    posicionar(el.querySelector('.cursor-alvo'), -15, Math.round(altura / 2) - 14, 16, 16);

    // Inimigo revelado com "mostrar PV": barra fina e nome curto logo abaixo dos pés.
    const barra = el.querySelector('.barra-inimigo');
    const nome = el.querySelector('.nome-inimigo');
    const mostrar = c.lado !== 'heroi' && c.pvAtual !== null && c.pvAtual !== undefined && c.pvMax;
    barra.hidden = nome.hidden = !mostrar;
    if (mostrar) {
      posicionar(barra, (largura - 26) / 2, altura + 3, 26, 4);
      barra.style.setProperty('--cheio', `${Math.round((24 * c.pvAtual) / c.pvMax)}px`);
      nome.textContent = c.nome.slice(0, 10);
      posicionar(nome, (largura - larguraNaGrade(nome)) / 2, altura + 7);
    }
  }

  // ───────────── Cartão do inimigo (consulta local) ─────────────

  const NIVEL_CAMPO = { patente: 7, especie: 7, pvMax: 7, pmMax: 7, tracos: 10, afinidades: 10, ataques: 13, feiticos: 13 };

  function abrirCartao(id) {
    cartaoAbertoId = id;
    const c = id && ultimo?.combatentes.find((x) => x.id === id);
    cartaoInimigo.hidden = !c;
    if (!c) return;
    cartaoInimigo.replaceChildren();
    const linhas = [];
    const titulo = criar('div', 't-corpo titulo-cartao', cartaoInimigo);
    titulo.textContent = c.nome;
    const meta = criar('div', 't-rotulo', cartaoInimigo);
    meta.textContent = c.revelado === false ? 'NÃO REVELADO' : [c.cartao?.patente, c.cartao?.especie].filter(Boolean).join(' · ') || 'ESTUDO 7+ REVELA MAIS';
    linhas.push([titulo, 0], [meta, 18]);
    let y = 32;
    const campos = [
      ['PV', c.pvMax ? `${c.pvAtual ?? '?'} / ${c.pvMax}` : null, 7],
      ['TRAÇOS', c.cartao?.tracos, 10],
      ['AFINIDADES', c.cartao?.afinidades, 10],
      ['ATAQUES', c.cartao?.ataques, 13],
      ['FEITIÇOS', c.cartao?.feiticos, 13],
    ];
    if (c.revelado !== false) {
      for (const [rotulo, valor, nivel] of campos) {
        const r = criar('div', 't-rotulo', cartaoInimigo);
        r.textContent = rotulo;
        const v = criar('div', 't-corpo valor-cartao', cartaoInimigo);
        v.textContent = valor ? String(valor) : `??? (ESTUDO ${nivel}+)`;
        v.classList.toggle('desconhecido', !valor);
        linhas.push([r, y + 2], [v, y - 3]);
        r.style.width = '56px';
        v.style.left = '58px';
        y += 15;
      }
    }
    void NIVEL_CAMPO;
    for (const [el, yy] of linhas) {
      el.style.top = `${yy}px`;
      if (!el.style.left) el.style.left = '0px';
    }
    const largura = 210;
    const altura = y + 14;
    const pe = pes.get(id);
    const x = Math.max(4, Math.min(476 - largura, (pe?.x ?? 300) - largura - 20));
    posicionar(cartaoInimigo, x, Math.max(36, Math.min(196 - altura, (pe?.y ?? 150) - altura)), largura, altura);
  }

  // Clicar fora fecha o cartão e o balão.
  if (opcoes.interativo) {
    raiz.addEventListener('click', () => {
      abrirCartao(null);
      balao.hidden = true;
    });
  }

  // ───────────── Fita (caixa de mensagem, 32–58) ─────────────

  /**
   * Largura máxima da fita. A SPEC pede 300 px para sobrar o canto direito para os ícones de
   * relógio (x≈404–476). Os relógios só chegam em janeiro, então por enquanto a fita pode usar
   * quase a tela toda: 440 px (x 20–460; com as caudas, 6–474). Quando houver relógio visível,
   * voltar a 300. Ver DECISOES.
   */
  const LARGURA_MAX_FITA = 440;
  const DURACAO_FECHAR_FITA = 200;

  /**
   * Qual mensagem a fita mostra. Enquanto o mestre escolhe alvos, a fita mostra a ação e os
   * alvos do momento ("Feitiço » Chama » Espectro B"); senão, o banner da mesa.
   */
  function bannerDe(estado) {
    if (estado.alvos?.length && estado.agindoId) {
      const quem = estado.combatentes.find((c) => c.id === estado.agindoId);
      const partes = [];
      const acao = estado.acaoDestacada;
      if (acao?.acao) partes.push(quem?.menu?.find((m) => m.id === acao.acao)?.nome ?? acao.acao);
      if (acao?.item) partes.push(acao.item);
      const nomes = estado.alvos.map((id) => estado.combatentes.find((c) => c.id === id)?.nome).filter(Boolean);
      partes.push(nomes.join(', '));
      return { texto: partes.join('  »  '), cor: quem ? corDe(quem) : cores.borda, estilo: 'acao' };
    }
    return estado.banner;
  }

  function desenharBanner(banner) {
    const chave = banner ? `${banner.texto}|${banner.cor}|${banner.estilo}` : null;
    if (chave === bannerAtual) return; // mesma mensagem: não reabre a animação
    bannerAtual = chave;

    // A fita antiga não some seca: as caudas recolhem e a faixa fecha para o centro (~0,2 s).
    const antigas = [...camadas.hud.querySelectorAll('.fita:not(.saindo)')];
    for (const antiga of antigas) {
      antiga.classList.add('saindo');
      setTimeout(() => antiga.remove(), DURACAO_FECHAR_FITA + 20);
    }
    if (!banner) return;
    // Se havia fita na tela, a nova só começa a abrir depois que a antiga fechou.
    const atraso = antigas.length ? DURACAO_FECHAR_FITA : 0;
    const efeito = banner.estilo === 'efeito';
    const cor = efeito ? cores.linhaEscura : banner.cor;

    const fita = criar('div', `fita${efeito ? ' efeito' : ''}`, camadas.hud);
    fita.style.setProperty('--atraso', `${atraso}ms`);
    const caudaEsq = criar('div', 'fita-cauda esquerda', fita);
    const caudaDir = criar('div', 'fita-cauda direita', fita);
    const faixa = criar('div', 'fita-faixa', fita);
    faixa.style.setProperty('--cor-fita', cor);
    const texto = criar('div', 'fita-texto t-corpo', faixa);
    escreverLetraPorLetra(texto, banner.texto, atraso + 300);

    // Largura automática: texto + 8 px de cada lado, até o máximo; passou disso, quebra a linha.
    texto.style.width = 'max-content';
    const larguraTexto = larguraNaGrade(texto);
    const largura = Math.min(LARGURA_MAX_FITA, larguraTexto + 16 + 2);
    const linhas = larguraTexto + 18 > LARGURA_MAX_FITA ? 2 : 1;
    const altura = 19 + (linhas - 1) * 15;
    texto.classList.toggle('quebra', linhas > 1);
    // +1 px de folga: a medida é arredondada e, sem folga, a última palavra podia cair na linha de baixo.
    texto.style.width = `${largura - 18 + 1}px`;
    posicionar(fita, 240 - Math.floor(largura / 2), 35, largura, altura);
    posicionar(faixa, 0, 0, largura, altura);

    // Caudas: recortadas da fita de referência (assets/ui/fita.png) e pintadas na cor de quem age.
    const trocas = { '#c7cfcc': cor, '#8b908e': escurecer(cor, 0.25) };
    if (efeito) Object.assign(trocas, { '#1b2b46': cores.contorno });
    posicionar(caudaEsq, -14, altura - 14, 19, 19);
    posicionar(caudaDir, largura - 6, altura - 14, 19, 19); // a borda direita da faixa cai na coluna 5 do recorte
    // Onde está cada parte em fita.png (110×30): a faixa ocupa as linhas 3–21 e as colunas
    // 30–82; cada cauda ocupa as linhas 8–26 (5 abaixo da faixa) e sai 14 px para fora dela.
    // O recorte de cada cauda (19×19) pega junto uns pixels da ponta da faixa, que a faixa de
    // verdade cobre; eles são apagados. Fica só a cauda (com as duas bordas) e a dobra escura.
    recolorir(`${UI}fita.png`, trocas, { x: 16, y: 8, largura: 19, altura: 19 }, { x: 14, y: 0, largura: 5, altura: 14 })
      .then((url) => (caudaEsq.style.backgroundImage = `url(${url})`));
    recolorir(`${UI}fita.png`, trocas, { x: 77, y: 8, largura: 19, altura: 19 }, { x: 0, y: 0, largura: 6, altura: 14 })
      .then((url) => (caudaDir.style.backgroundImage = `url(${url})`));
  }

  // ───────────── Aviso central ─────────────

  function avisoDoFim(fim) {
    const padrao = FINS[fim.tipo] ?? FINS.personalizado;
    return { titulo: fim.titulo || padrao.titulo, linha: fim.texto || '', tom: fim.tom || padrao.tom, duracao: null, em: fim.em };
  }

  /**
   * Caixa central de 62 px: nasce como uma linha dourada que se estica, abre na vertical,
   * o título entra letra por letra, o divisor cresce do centro e a linha de baixo entra.
   */
  function desenharAviso(aviso) {
    const chave = aviso ? JSON.stringify([aviso.titulo, aviso.linha, aviso.tom, aviso.em]) : null;
    if (chave === avisoAtual) return;
    avisoAtual = chave;
    clearTimeout(temporizadorAviso);
    fecharAvisos();
    if (!aviso) return;
    // "Some sozinho em N s": cada palco conta o tempo a partir de quando a mesa mostrou.
    if (aviso.duracao) {
      const resta = aviso.em + aviso.duracao * 1000 - Date.now();
      if (resta <= 0) return;
      temporizadorAviso = setTimeout(() => {
        fecharAvisos();
      }, resta);
    }
    const tom = TONS[aviso.tom] ?? TONS.neutro;
    camadas.escurecer.classList.add('ativo');

    const caixa = criar('div', 'janela aviso-central', camadas.janelas);
    if (tom.fundo) caixa.classList.add('sombrio');
    // Tom do aviso: a borda clara da moldura vira a cor do tom (os pedaços são recortados de novo).
    cortarMoldura(`${UI}janela.png`, 6, 4, { '#c7cfcc': tom.borda }).then((partes) => aplicarMoldura(caixa, 'janela', partes));
    const titulo = criar('div', 't-titulo aviso-titulo', caixa);
    titulo.style.color = tom.titulo;
    const fimTitulo = escreverLetraPorLetra(titulo, aviso.titulo, 350, 25);
    const divisor = criar('div', 'aviso-divisor', caixa);
    const losango = criar('div', 'losango', divisor);
    losango.style.backgroundImage = `url(${LOSANGO})`;
    divisor.style.animationDelay = `${fimTitulo}ms`;
    const linha = criar('div', 't-corpo aviso-linha', caixa);
    if (tom.fundo) linha.style.color = cores.borda;
    if (aviso.linha) escreverLetraPorLetra(linha, aviso.linha, fimTitulo + 150, 15);

    titulo.style.width = linha.style.width = 'max-content';
    const largura = Math.min(460, Math.max(160, larguraNaGrade(titulo) + 48, larguraNaGrade(linha) + 48));
    const altura = aviso.linha ? 62 : 44;
    // Medidas relativas à borda de fora; o conteúdo começa 6 px para dentro (a moldura).
    const x = 240 - Math.floor(largura / 2);
    const y = 128 - Math.floor(altura / 2);
    posicionar(caixa, x, y, largura, altura);
    posicionar(titulo, 0, 11 - 6 - 6, largura - 12);
    posicionar(divisor, 12, 34 - 6, largura - 36, 1);
    posicionar(losango, Math.floor((largura - 36) / 2) - 2, -2, 5, 5);
    posicionar(linha, 0, 51 - 15 - 6, largura - 12);
    divisor.hidden = !aviso.linha;

    // A linha dourada que nasce no centro e se estica antes da caixa abrir.
    const fio = criar('div', 'aviso-fio', camadas.janelas);
    posicionar(fio, x, y + Math.floor(altura / 2), largura, 1);
    fio.addEventListener('animationend', () => fio.remove());
  }

  function fecharAvisos() {
    camadas.escurecer.classList.remove('ativo');
    for (const antigo of camadas.janelas.querySelectorAll('.aviso-central:not(.saindo)')) {
      antigo.classList.add('saindo');
      setTimeout(() => antigo.remove(), 220);
    }
  }

  // ───────────── Fim do combate ─────────────

  function desenharFim(fim) {
    const chave = fim ? `${fim.tipo}|${fim.em}` : null;
    if (chave === fimAtual) return;
    fimAtual = chave;
    raiz.classList.remove('fim-vitoria', 'fim-fuga', 'fim-rendicao');
    if (!fim) return;
    if (fim.tipo === 'vitoria') {
      raiz.classList.add('fim-vitoria');
      // Quem cai vira luz: faíscas subindo de cada inimigo.
      for (const [id, el] of lutadores) {
        if (el.dataset.lado === 'heroi') continue;
        const pe = pes.get(id);
        if (!pe) continue;
        for (let i = 0; i < 10; i++) {
          const f = criar('div', 'faisca', camadas.flutuantes);
          posicionar(f, pe.x - 12 + ((i * 7) % 24), pe.y - 8 - ((i * 13) % 28), 1, 1);
          f.style.animationDelay = `${(i * 60) % 400}ms`;
          f.style.background = i % 3 ? cores.dourado : cores.texto;
          f.addEventListener('animationend', () => f.remove());
        }
      }
    }
    if (fim.tipo === 'fuga') raiz.classList.add('fim-fuga');
    if (fim.tipo === 'rendicao') raiz.classList.add('fim-rendicao');
  }

  // ───────────── Painel (200–270) ─────────────

  function desenharPainel(estado, herois) {
    const agindo = estado.combatentes.find((c) => c.id === estado.agindoId);
    // Retrato e menu só aparecem quando um HERÓI está agindo (e o combate não acabou).
    const comMenu = !estado.fim && estado.ladoDaVez === 'herois' && agindo?.lado === 'heroi';
    camadas.painel.classList.toggle('so-status', !comMenu);

    const larguraStatus = comMenu ? 322 : 400;
    const xStatus = comMenu ? 156 : 40;
    animarJanelaStatus(xStatus, larguraStatus);
    posicionar(janelaStatus, xStatus, 202, larguraStatus, 66);
    if (comMenu) {
      retratoPainel.textContent = inicial(agindo);
      retratoPainel.style.background = agindo.corAssinatura;
      desenharMenu(agindo, estado.acaoDestacada);
    } else {
      janelaSubmenu.hidden = true;
    }
    desenharStatus(estado, herois, larguraStatus);
  }

  /**
   * A janela de status muda entre "ao lado do menu" (156, 322 de largura) e "centralizada"
   * (40, 400). Antes, left e width eram animados, e a moldura pontilhada era repintada em cada
   * passo; alguns navegadores deixavam restos dela ("quadradinhos pontilhados") na janela.
   * Agora a janela vai direto para o tamanho final (a moldura é pintada uma vez) e um recorte
   * (clip-path) abre do retângulo antigo até o novo, em passos de pixel.
   */
  let statusAnterior = null;
  function animarJanelaStatus(x, largura) {
    const antes = statusAnterior;
    statusAnterior = { x, largura };
    if (!antes || primeiroEstado || (antes.x === x && antes.largura === largura)) return;
    // Onde o retângulo antigo fica dentro do novo (o que passa da borda nova é ignorado).
    const esquerda = Math.max(0, antes.x - x);
    const direita = Math.max(0, x + largura - (antes.x + antes.largura));
    janelaStatus.animate(
      [{ clipPath: `inset(0 ${direita}px 0 ${esquerda}px)` }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: 200, easing: 'steps(10)' },
    );
  }

  function desenharMenu(heroi, destaque) {
    janelaMenu.replaceChildren();
    const menu = heroi.menu ?? [];
    const selecionado = Math.max(0, menu.findIndex((m) => m.id === destaque?.acao));
    const primeiro = Math.min(Math.max(0, selecionado - 3), Math.max(0, menu.length - 4));
    menu.slice(primeiro, primeiro + 4).forEach((m, i) => {
      const item = criar('div', 'item-menu t-corpo', janelaMenu);
      item.textContent = m.nome;
      posicionar(item, 12, -4 + i * 14);
      item.classList.toggle('proprio', !!m.proprio);
      if (destaque && primeiro + i === selecionado) {
        item.classList.add('selecionado');
        colocarPena(janelaMenu, 12, -4 + i * 14);
      }
    });
    if (primeiro > 0) setinha(janelaMenu, TRIANGULO_CIMA, 33, -5);
    if (primeiro + 4 < menu.length) setinha(janelaMenu, TRIANGULO_BAIXO, 33, 51);

    const itens = destaque?.item ? heroi.submenu?.[destaque.acao] : null;
    janelaSubmenu.hidden = !itens;
    if (!itens) return;
    janelaSubmenu.replaceChildren();
    const altura = 12 + itens.length * 14 + 4;
    let largura = 60;
    itens.forEach((nome, i) => {
      const item = criar('div', 'item-menu t-corpo', janelaSubmenu);
      item.textContent = nome;
      posicionar(item, 12, -4 + i * 14);
      largura = Math.max(largura, larguraNaGrade(item) + 28);
      if (nome === destaque.item) {
        item.classList.add('selecionado');
        colocarPena(janelaSubmenu, 12, -4 + i * 14);
      }
    });
    posicionar(janelaSubmenu, 156, 198 - altura, largura, altura);
  }

  function colocarPena(janela, xItem, yItem) {
    const pena = criar('div', 'pena', janela);
    posicionar(pena, xItem - 15, yItem + 10 - 14, 16, 16);
  }

  function setinha(janela, url, x, y) {
    const s = criar('div', 'setinha', janela);
    posicionar(s, x, y, 5, 4);
    s.style.backgroundImage = `url(${url})`;
  }

  function desenharStatus(estado, herois, larguraJanela) {
    const ordem = [...herois].sort((a, b) => (a.ordemPainel ?? 0) - (b.ordemPainel ?? 0));
    const n = ordem.length;
    const colunas = n <= 4 ? 1 : 2;
    const porColuna = Math.ceil(n / colunas) || 1;
    const passo = porColuna <= 3 ? 16 : 14;
    const larguraConteudo = larguraJanela - 12 - 8;
    const larguraColuna = colunas === 1 ? larguraConteudo : Math.floor((larguraConteudo - 10) / 2);
    const alturaBloco = passo * (porColuna - 1) + 11;
    const y0 = Math.floor((66 - 12 - alturaBloco) / 2);

    const presentes = new Set();
    ordem.forEach((c, i) => {
      presentes.add(c.id);
      let linha = linhasStatus.get(c.id);
      if (!linha) {
        linha = { el: criarLinhaStatus(c.id), pv: c.pv.atual, pm: c.pm.atual };
        linhasStatus.set(c.id, linha);
      }
      const coluna = Math.floor(i / porColuna);
      atualizarLinhaStatus(linha, c, 4 + coluna * (larguraColuna + 10), y0 + (i % porColuna) * passo, larguraColuna, colunas === 1, estado.agindoId === c.id);
    });
    for (const [id, linha] of linhasStatus) {
      if (!presentes.has(id)) {
        linha.el.remove();
        linhasStatus.delete(id);
      }
    }
  }

  function criarLinhaStatus(id) {
    const el = criar('div', 'linha-status', janelaStatus);
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
    for (const [classe, letras, cor] of [['r-pv', 'PV', cores.rotuloPv], ['r-pm', 'PM', cores.rotuloPm], ['r-pi', 'PI', cores.rotuloPi]]) {
      rotulo3x5(letras, cor).then((url) => (el.querySelector('.' + classe).style.backgroundImage = `url(${url})`));
    }
    // Clique na barra: balão com o número ("PM 16 / 40"). Consulta local, some em 3 s.
    if (opcoes.interativo) {
      for (const [seletor, rotulo] of [['.barra-pv', 'PV'], ['.barra-pm', 'PM']]) {
        el.querySelector(seletor).addEventListener('click', (evento) => {
          evento.stopPropagation();
          const c = ultimo?.combatentes.find((x) => x.id === id);
          if (c) mostrarBalao(el.querySelector(seletor), `${rotulo} ${c[rotulo.toLowerCase()].atual} / ${c[rotulo.toLowerCase()].max}`);
        });
      }
    }
    return el;
  }

  let temporizadorBalao = null;
  function mostrarBalao(alvo, texto) {
    balao.textContent = texto;
    balao.hidden = false;
    const r = alvo.getBoundingClientRect();
    const base = raiz.getBoundingClientRect();
    const escala = base.width / 480;
    const largura = larguraNaGrade(balao) + 10;
    const x = Math.round((r.left - base.left) / escala + 20);
    const y = Math.round((r.top - base.top) / escala) - 20;
    posicionar(balao, Math.min(470 - largura, x), y, largura, 17);
    clearTimeout(temporizadorBalao);
    temporizadorBalao = setTimeout(() => (balao.hidden = true), 3000);
  }

  function atualizarLinhaStatus(linha, c, x, y, largura, larga, agindo) {
    const el = linha.el;
    const q = (seletor) => el.querySelector(seletor);
    const caido = c.pv.atual === 0;
    posicionar(el, x, y, largura, 11);
    el.classList.toggle('caido-linha', caido);
    el.classList.toggle('crise', emCrise(c.pv));

    const destaque = q('.destaque-linha');
    destaque.hidden = !agindo;
    destaque.style.borderColor = c.corAssinatura;
    q('.faixinha').style.background = c.corAssinatura;
    const nome = q('.nome');
    nome.textContent = c.nome.slice(0, 8); // nomes com mais de 8 letras são cortados
    const xRotulos = larga ? 70 : 56;
    const larguraNumero = larga ? 50 : 20;
    const larguraPi = 12;
    const folga = larga ? 4 : 3;
    // Condições: até 6 ícones na coluna larga. Nas duas colunas (5 a 8 heróis) não sobra espaço
    // para ícones sem esmagar a barra; lá as condições aparecem nos rostos da faixa de turnos.
    const maxIcones = larga ? 6 : 0;
    const larguraIcones = maxIcones ? maxIcones * 8 + 2 : 0;
    // Rótulo (7 px) + 2 px de folga antes da barra, alinhado pelo topo com o contorno da barra.
    const xBarra = xRotulos + 9;
    // O nome nunca encosta no rótulo PV: se não couber, perde letras inteiras do fim
    // (cortar no meio de uma letra fica feio em pixel art).
    const espacoNome = xRotulos - 8;
    nome.style.width = 'max-content';
    while (nome.textContent.length > 1 && larguraNaGrade(nome) > espacoNome) nome.textContent = nome.textContent.slice(0, -1);
    posicionar(nome, 5, -3, espacoNome);
    const larguraBarra = largura - xBarra - folga - larguraNumero - folga - larguraPi - larguraIcones;

    posicionar(q('.r-pv'), xRotulos, 0, 7, 5);
    posicionar(q('.r-pm'), xRotulos, 6, 7, 5);
    atualizarBarra(q('.barra-pv'), xBarra, 0, larguraBarra, 4, c.pv, linha, 'pv');
    atualizarBarra(q('.barra-pm'), xBarra, 6, larguraBarra, 3, c.pm, linha, 'pm');
    posicionar(q('.marca-crise'), 1 + Math.floor((larguraBarra - 2) / 2), -1, 1, 2);

    const caidoTexto = q('.caido');
    caidoTexto.hidden = !caido;
    posicionar(caidoTexto, xBarra + Math.floor(larguraBarra / 2) - 14, 1, 28, 9);

    const numero = q('.numero');
    numero.textContent = caido ? '' : larga ? `${c.pv.atual}/${c.pv.max}` : String(c.pv.atual);
    posicionar(numero, xBarra + larguraBarra + folga, -3, larguraNumero);

    const xPi = largura - larguraPi;
    posicionar(q('.r-pi'), xPi, 0, 7, 5);
    const numeroPi = q('.numero-pi');
    numeroPi.textContent = c.pi ? String(c.pi.atual) : '';
    posicionar(numeroPi, xPi, 2, larguraPi);

    const conds = q('.conds');
    conds.replaceChildren();
    conds.hidden = !maxIcones;
    const lista = !maxIcones ? [] : c.condicoes.length > maxIcones ? c.condicoes.slice(0, maxIcones - 1) : c.condicoes;
    lista.forEach((k, j) => {
      const icone = criar('div', 'icone-condicao', conds);
      posicionar(icone, j * 8, 0, 7, 7);
      icone.style.backgroundImage = `url(${UI}condicoes/${k}.png)`;
    });
    if (maxIcones && c.condicoes.length > maxIcones) {
      const mais = criar('div', 'mais-condicoes t-rotulo', conds);
      mais.textContent = `+${c.condicoes.length - lista.length}`;
      posicionar(mais, lista.length * 8, -1);
    }
    posicionar(conds, xPi - larguraIcones, 2);
  }

  /**
   * Barra de PV ou PM: contorno 1 px, fundo escuro, cor com brilho em cima e sombra embaixo.
   * Rastro de dano: o pedaço perdido fica branco e encolhe em ~400 ms.
   */
  function atualizarBarra(barra, x, y, larguraInterna, alturaInterna, valor, linha, campo) {
    posicionar(barra, x, y, larguraInterna + 2, alturaInterna + 2);
    const px = (v) => {
      if (v <= 0 || valor.max <= 0) return 0;
      return Math.max(1, Math.round((larguraInterna * Math.min(v, valor.max)) / valor.max));
    };
    const cheio = barra.querySelector('.cheio');
    const rastro = barra.querySelector('.rastro');
    const novo = px(valor.atual);
    cheio.style.width = `${novo}px`;
    const anterior = linha[campo];
    rastro.style.transition = 'none';
    if (valor.atual < anterior && !primeiroEstado) {
      // Caiu: o rastro começa na largura antiga e encolhe até a nova.
      rastro.style.width = `${px(anterior)}px`;
      rastro.getBoundingClientRect(); // força o navegador a "ver" a largura antiga antes de animar
      rastro.style.transition = '';
    }
    rastro.style.width = `${novo}px`;
    linha[campo] = valor.atual;
  }

  // ───────────── Caixa de diálogo ─────────────

  let dialogoAtual = null;
  function desenharDialogo(dialogo) {
    const chave = dialogo ? JSON.stringify(dialogo) : null;
    if (chave === dialogoAtual) return;
    dialogoAtual = chave;
    caixaDialogo.hidden = !dialogo;
    if (!dialogo) return;
    caixaDialogo.replaceChildren();
    const f = dialogo.falante;
    // Narrador: sem retrato, o texto ocupa a caixa toda.
    const xTexto = f ? 58 : 6;
    if (f) {
      const retrato = criar('div', 'retrato-dialogo t-titulo', caixaDialogo);
      posicionar(retrato, 2, 2, 48, 48);
      retrato.style.background = f.cor;
      retrato.textContent = (f.nome || '?')[0];
      const faixinha = criar('div', 'faixinha-dialogo', caixaDialogo);
      posicionar(faixinha, xTexto, 2, 2, 9);
      faixinha.style.background = f.cor;
      const nome = criar('div', 't-corpo nome-dialogo', caixaDialogo);
      nome.textContent = f.nome;
      posicionar(nome, xTexto + 5, -3);
    }
    const texto = criar('div', 't-corpo texto-dialogo', caixaDialogo);
    posicionar(texto, xTexto, f ? 12 : 0, 400 - 12 - xTexto - 8);
    const fim = escreverLetraPorLetra(texto, dialogo.texto, 150, 18);
    // A caixa cresce para cima conforme o número de linhas (a base fica sempre em y=198,
    // logo acima do painel). Mínimo de 62 px, para caber o retrato de 48×48.
    caixaDialogo.hidden = false;
    const escala = raiz.getBoundingClientRect().width / 480 || 1;
    const alturaTexto = Math.round(texto.getBoundingClientRect().height / escala);
    const alturaConteudo = Math.max(50, (f ? 12 : 0) + alturaTexto + 6);
    const altura = alturaConteudo + 12;
    const seta = criar('div', 'seta-fala', caixaDialogo);
    posicionar(seta, 400 - 12 - 9, alturaConteudo - 6, 5, 3);
    seta.style.backgroundImage = `url(${TRIANGULO_FALA})`;
    seta.style.animationDelay = `${fim}ms`;
    posicionar(caixaDialogo, 40, 198 - altura, 400, altura);
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
      if (e.tipo === 'condicao' || e.tipo === 'texto') {
        el.classList.add('t-corpo', 'condicao');
        el.textContent = e.tipo === 'texto' ? e.valor : e.valor[0].toUpperCase() + e.valor.slice(1);
      } else {
        el.classList.add('t-titulo', e.tipo);
        el.textContent = e.tipo === 'dano' ? `-${e.valor}` : `${e.valor > 0 ? '+' : ''}${e.valor}`;
      }
      posicionar(el, pe.x + 6, pe.y - 46);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  return { renderizar, raiz };
}
