// Peças de interface da mesa (botões, campos, janelas), todas no estilo "Pena e Fio".
// São funções pequenas que criam elementos; as seções da mesa montam a tela com elas.

import { CONDICOES, NOMES_CONDICOES } from '../estado.js';
import { pintarRosto } from '../arte.js';

/**
 * Cria um elemento. Exemplo: h('div', { class: 'linha' }, 'texto', outroElemento)
 * - atributos que começam com "on" viram eventos (onclick, oninput…)
 * - "class", "style" (objeto) e "dataset" (objeto) são tratados à parte
 */
export function h(tag, atributos = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos ?? {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (nome.startsWith('on')) el.addEventListener(nome.slice(2), valor);
    else if (nome === 'class') el.className = valor;
    else if (nome === 'style') {
      // Variáveis CSS ("--cor") só funcionam com setProperty; Object.assign as ignorava.
      for (const [prop, v] of Object.entries(valor)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, v);
        else el.style[prop] = v;
      }
    }
    else if (nome === 'dataset') Object.assign(el.dataset, valor);
    else if (nome in el && typeof valor !== 'string') el[nome] = valor;
    else el.setAttribute(nome, valor === true ? '' : valor);
  }
  for (const filho of filhos.flat()) {
    if (filho === null || filho === undefined || filho === false) continue;
    el.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return el;
}

/**
 * Botão plaquinha.
 * @param {string} texto
 * @param {(e: MouseEvent) => void} [aoClicar]
 * @param {{ligado?:boolean, tom?:'perigo'|'primario'|'ouro', desligado?:boolean, titulo?:string, classe?:string}} [opcoes]
 */
export function botao(texto, aoClicar, opcoes = {}) {
  const classes = ['m-botao'];
  if (opcoes.ligado) classes.push('ligado');
  if (opcoes.tom) classes.push(opcoes.tom);
  if (opcoes.classe) classes.push(opcoes.classe);
  return h(
    'button',
    {
      class: classes.join(' '),
      type: 'button',
      title: opcoes.titulo,
      disabled: !!opcoes.desligado,
      onclick: (e) => {
        e.stopPropagation();
        aoClicar?.(e);
      },
    },
    texto,
  );
}

/** Grupo de botões em que só um fica ligado (ex.: ACERTOU | ERROU | CRÍTICO). */
export function seletor(opcoes, valorAtual, aoEscolher, tom) {
  return h(
    'span',
    { class: 'm-seletor' },
    opcoes.map(([valor, texto]) => botao(texto, () => aoEscolher(valor), { ligado: valor === valorAtual, tom: valor === valorAtual ? tom : undefined })),
  );
}

/** Título de seção: rótulo + régua. */
export function tituloSecao(texto, ...extras) {
  return h('div', { class: 'm-titulo-secao' }, h('span', { class: 't-rotulo' }, texto), ...extras);
}

/** Rótulo pequeno (Silkscreen). */
export function rotulo(texto, classe = '') {
  return h('span', { class: `t-rotulo ${classe}` }, texto);
}

/**
 * Campo numérico que confirma ao apertar Enter ou sair do campo.
 * @param {number} valor
 * @param {(n:number) => void} aoMudar
 * @param {number} [largura] em pixels da grade
 */
export function campoNumero(valor, aoMudar, largura = 26) {
  const el = h('input', {
    class: 'm-campo t-corpo numero',
    type: 'text',
    inputmode: 'numeric',
    value: String(valor),
    style: { width: `${largura}px` },
  });
  const confirmar = () => {
    const n = parseInt(el.value, 10);
    if (Number.isFinite(n) && n !== valor) aoMudar(n);
    else el.value = String(valor);
  };
  el.addEventListener('change', confirmar);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      el.blur();
    }
  });
  el.addEventListener('focus', () => el.select());
  return el;
}

/**
 * Campo de texto com as correções rápidas de um clique (o "mestre fiscaliza tudo"):
 * Aa = primeira letra maiúscula, Tt = Título Em Cada Palavra, ␣ = tira espaços sobrando.
 * Mostra um aviso quando o texto passa do limite que cabe na caixa.
 */
export function campoTexto(valor, aoMudar, { largura = 160, limite = 0, placeholder = '', corretores = false, multilinha = false, foco } = {}) {
  const el = h(multilinha ? 'textarea' : 'input', {
    class: `m-campo t-corpo${multilinha ? ' multilinha' : ''}`,
    type: multilinha ? undefined : 'text',
    value: valor ?? '',
    placeholder,
    style: { width: `${largura}px` },
    // "foco" = nome do campo, para a mesa devolver o cursor a ele depois de redesenhar.
    dataset: foco ? { foco } : undefined,
  });
  if (multilinha) el.value = valor ?? '';
  const aviso = h('span', { class: 't-rotulo m-aviso-limite', hidden: true }, 'NÃO CABE');
  const conferir = () => {
    aviso.hidden = !(limite && el.value.length > limite);
  };
  el.addEventListener('input', () => {
    conferir();
    aoMudar(el.value, false);
  });
  el.addEventListener('change', () => aoMudar(el.value, true));
  el.addEventListener('keydown', (e) => e.stopPropagation());
  conferir();
  if (!corretores) return h('span', { class: 'm-campo-texto' }, el, aviso);

  const corrigir = (funcao) => {
    el.value = funcao(el.value);
    conferir();
    aoMudar(el.value, true);
  };
  return h(
    'span',
    { class: 'm-campo-texto' },
    el,
    botao('Aa', () => corrigir(primeiraMaiuscula), { titulo: 'Primeira letra maiúscula', classe: 'mini' }),
    botao('Tt', () => corrigir(tituloEmCadaPalavra), { titulo: 'Título Em Cada Palavra', classe: 'mini' }),
    botao('␣', () => corrigir(limparEspacos), { titulo: 'Remover espaços sobrando', classe: 'mini' }),
    aviso,
  );
}

export const primeiraMaiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const tituloEmCadaPalavra = (t) => t.replace(/(^|\s)(\p{L})/gu, (_, espaco, letra) => espaco + letra.toUpperCase());
export const limparEspacos = (t) => t.replace(/\s+/g, ' ').trim();

/** Lista suspensa no estilo da mesa. */
export function lista(opcoes, valorAtual, aoEscolher, largura = 80) {
  const el = h(
    'select',
    { class: 'm-campo t-corpo', style: { width: `${largura}px` }, onchange: () => aoEscolher(el.value), onkeydown: (e) => e.stopPropagation() },
    opcoes.map(([valor, texto]) => h('option', { value: valor, selected: valor === valorAtual }, texto)),
  );
  el.value = valorAtual ?? '';
  return el;
}

/** Caixinha de marcar. */
export function marcador(texto, marcado, aoMudar) {
  return h(
    'label',
    { class: 'm-marcador' },
    h('input', { type: 'checkbox', checked: !!marcado, onchange: (e) => aoMudar(e.target.checked) }),
    h('span', { class: 't-rotulo' }, texto),
  );
}

/** As 6 condições como quadradinhos clicáveis (ícone quando ativa; apagado quando não). */
export function quadradinhosCondicao(ativas, aoAlternar) {
  return h(
    'span',
    { class: 'm-condicoes' },
    CONDICOES.map((k) =>
      h('button', {
        type: 'button',
        class: `m-cond ${ativas.includes(k) ? 'ativa' : ''}`,
        title: NOMES_CONDICOES[k],
        style: { backgroundImage: `url(./assets/ui/condicoes/${k}.png)` },
        onclick: (e) => {
          e.stopPropagation();
          aoAlternar(k);
        },
      }),
    ),
  );
}

/** Rosto 24×24: recorte da cabeça do sprite ou do retrato; sem arte, quadrado na cor com a inicial. */
export function rosto(c, cor) {
  const el = h(
    'span',
    { class: 'm-rosto t-corpo', style: { background: cor } },
    (c.nome || '?')[0].toUpperCase(),
    h('span', { class: 'm-rosto-sublinhado', style: { background: cor } }),
  );
  if (pintarRosto(el, c)) el.firstChild.textContent = '';
  return el;
}

// ───────────── Janelas (modais) ─────────────

let janelaAberta = null;

/**
 * Abre uma janela sobre a mesa. Clicar fora ou em FECHAR fecha.
 * @param {string} titulo
 * @param {HTMLElement|HTMLElement[]} conteudo
 * @param {{largura?: number, aoFechar?: () => void, botoes?: HTMLElement[]}} [opcoes]
 */
export function abrirJanela(titulo, conteudo, opcoes = {}) {
  fecharJanela();
  const mesa = document.getElementById('mesa');
  const fundo = h('div', { class: 'm-fundo-janela', onclick: () => fecharJanela() });
  const janela = h(
    'div',
    { class: 'm-janela janela', style: { width: `${opcoes.largura ?? 360}px` }, onclick: (e) => e.stopPropagation() },
    h('div', { class: 'm-janela-topo' }, h('span', { class: 't-rotulo titulo-dourado' }, titulo), botao('FECHAR', () => fecharJanela())),
    h('div', { class: 'm-janela-corpo' }, conteudo),
    opcoes.botoes?.length ? h('div', { class: 'm-janela-botoes' }, opcoes.botoes) : null,
  );
  fundo.append(janela);
  mesa.append(fundo);
  janelaAberta = { fundo, aoFechar: opcoes.aoFechar };
  return janela;
}

export function fecharJanela() {
  if (!janelaAberta) return;
  janelaAberta.fundo.remove();
  janelaAberta.aoFechar?.();
  janelaAberta = null;
}

export function haJanelaAberta() {
  return !!janelaAberta;
}

/** Aviso rápido no canto (some sozinho). */
export function avisoRapido(texto) {
  const mesa = document.getElementById('mesa');
  const el = h('div', { class: 'm-aviso-rapido t-corpo' }, texto);
  mesa.append(el);
  setTimeout(() => el.remove(), 2600);
}

/** Troca o conteúdo de uma área, ignorando os itens vazios (null/false) das condições. */
export function encher(area, ...filhos) {
  area.replaceChildren(...filhos.flat().filter((f) => f !== null && f !== undefined && f !== false));
}
