// A MESA do mestre: o painel de controle (só o mestre vê).
//
// O ciclo é sempre o mesmo (fluxo de mão única):
//   clique → função do estado.js altera o estado → salva → envia estadoPublico ao palco → redesenha.
// Tudo passa por alterar(). É lá que mora o DESFAZER e o salvamento automático.

import { aplicarPaletaNoCss } from '../paleta.js';
import * as E from '../estado.js';
import { abrirCanal } from '../canal.js';
import { carregarDados } from '../dados.js';
import { salvarLocal, carregarLocal, criarPilhaDesfazer } from '../persistencia.js';
import { criarPalco } from '../palco/palco.js';
import { avisoRapido, haJanelaAberta, fecharJanela } from './ui.js';
import { desenharTopo, desenharEsquerda, desenharCentro, desenharDireita } from './secoes.js';

aplicarPaletaNoCss();

// ───────────── Escala (a mesa é uma grade de 960×540, ampliada por número inteiro) ─────────────

const LARGURA = 960;
const mesaEl = document.getElementById('mesa');
const suporte = document.getElementById('mesa-suporte');

/**
 * Mesma ideia do palco (pixels reais, escala inteira), mas a escala segue só a LARGURA da janela:
 * se a altura não couber, a página rola um pouco. Assim, num monitor 1080p com a barra do
 * navegador, a mesa fica em 2× (nítida e grande) em vez de cair para 1× (pequena demais).
 */
function ajustarEscala() {
  const dpr = window.devicePixelRatio || 1;
  const larguraReal = document.documentElement.clientWidth * dpr;
  const escalaReal = Math.max(1, Math.floor(larguraReal / LARGURA));
  mesaEl.style.zoom = escalaReal / dpr;
  suporte.style.paddingLeft = `${Math.floor((larguraReal - LARGURA * escalaReal) / 2) / dpr}px`;
}
window.addEventListener('resize', ajustarEscala);
ajustarEscala();

// ───────────── Núcleo ─────────────

const canal = abrirCanal('local');
const pilha = criarPilhaDesfazer();

/** Contexto compartilhado com as seções (estado, dados e o que é só da tela da mesa). */
const ctx = {
  estado: carregarLocal() ?? E.criarEstadoExemplo(),
  dados: { herois: [], coringas: [], cenas: [], cenarios: [] },
  /** Coisas da tela da mesa que não vão para o palco nem para o salvamento. */
  tela: {
    verComo: 'jogadores',
    rascunho: novoRascunho(null),
    frases: { fila: [], proxima: null, pausado: false, ultimaAtividade: Date.now(), efeitoAte: 0 },
    mensagemLivre: '',
    fala: { falanteId: '', texto: '' },
    sugestao: null,
  },
  alterar,
  desfazer,
  desenhar,
  mostrarFrase,
  pularFrase,
  palcoPrevia: null,
};
window.mesa = ctx; // para inspecionar no F12, se precisar

/** Rascunho do painel AÇÃO (o que o mestre está montando antes de EXECUTAR). */
function novoRascunho(quemId) {
  return { quemId, acao: null, item: null, custoPm: 0, alvos: [], resultado: 'acertou', tipo: 'físico', condicao: null };
}

/**
 * Faz uma alteração no estado.
 * @param {(estado: E.Estado) => any} funcao
 * @param {{desfazivel?: boolean}} [opcoes] desfazivel = false para coisas automáticas ou de
 *   pré-visualização (frase de efeito, alvos marcados), que o DESFAZER não deve "comer".
 */
function alterar(funcao, opcoes = {}) {
  const desfazivel = opcoes.desfazivel !== false;
  if (desfazivel) pilha.guardar(ctx.estado);
  let resultado;
  try {
    resultado = funcao(ctx.estado);
  } catch (erro) {
    avisoRapido(erro.message);
    if (desfazivel) {
      const anterior = pilha.voltar();
      if (anterior) ctx.estado = E.migrar(anterior);
    }
    return undefined;
  }
  if (desfazivel) ctx.tela.frases.ultimaAtividade = Date.now();
  depois();
  return resultado;
}

/** DESFAZER: volta a cópia inteira de antes da última ação (dano, cura, condição, PM…). */
function desfazer() {
  const anterior = pilha.voltar();
  if (!anterior) return avisoRapido('Nada para desfazer.');
  ctx.estado = E.migrar(anterior);
  depois();
  avisoRapido('Desfeito.');
}

/** Depois de toda alteração: salva, avisa os palcos e redesenha a mesa. */
function depois() {
  salvarLocal(ctx.estado);
  canal.enviarEstado(E.estadoPublico(ctx.estado));
  desenhar();
}

// ───────────── Desenho da mesa ─────────────

const areas = {
  topo: document.getElementById('m-topo'),
  esquerda: document.getElementById('m-esquerda'),
  centro: document.getElementById('m-centro'),
  direita: document.getElementById('m-direita'),
};

/** Redesenha as seções. Guarda o campo em que o mestre estava digitando, para não perder o foco. */
function desenhar() {
  const ativo = document.activeElement;
  const foco = ativo?.dataset?.foco;
  const selecao = foco && 'selectionStart' in ativo ? [ativo.selectionStart, ativo.selectionEnd] : null;
  const rolagens = Object.fromEntries(Object.entries(areas).map(([k, el]) => [k, el.scrollTop]));

  ctx.pilhaTamanho = pilha.tamanho;
  desenharTopo(areas.topo, ctx);
  desenharEsquerda(areas.esquerda, ctx);
  desenharCentro(areas.centro, ctx);
  desenharDireita(areas.direita, ctx);

  for (const [k, el] of Object.entries(areas)) el.scrollTop = rolagens[k];
  if (foco) {
    const novo = mesaEl.querySelector(`[data-foco="${foco}"]`);
    if (novo) {
      novo.focus();
      if (selecao && 'setSelectionRange' in novo) {
        try { novo.setSelectionRange(...selecao); } catch { /* campos numéricos não têm seleção */ }
      }
    }
  }
}

// ───────────── Frases de efeito (12c): começo da rodada e turno parado ─────────────

/** Frases possíveis agora: as da fase do chefe na cena escolhida; sem elas, as de ambiente. */
function frasesPossiveis() {
  const cena = ctx.dados.cenas.find((c) => c.id === ctx.estado.cenaId);
  const fases = cena?.combate?.fases ?? {};
  let lista = fases[String(ctx.estado.fase)] ?? fases['1'] ?? [];
  if (!lista.length) lista = cena?.ambiente ?? [];
  return lista;
}

/** Próxima frase: ordem embaralhada, sem repetir até passar por todas. */
function proximaFrase() {
  const f = ctx.tela.frases;
  if (!f.fila.length) {
    f.fila = [...frasesPossiveis()].sort(() => Math.random() - 0.5);
    if (f.fila.length > 1 && f.fila[0] === f.ultima) f.fila.push(f.fila.shift());
  }
  return f.fila[0] ?? null;
}

/** Mostra uma frase de efeito na fita (estilo apagado) por ~5 s. */
function mostrarFrase(prefixo = '') {
  const f = ctx.tela.frases;
  const frase = proximaFrase();
  if (!frase && !prefixo) return;
  f.fila.shift();
  f.ultima = frase;
  const texto = [prefixo, frase].filter(Boolean).join(' ');
  f.efeitoAte = Date.now() + 5000;
  f.ultimaAtividade = Date.now();
  alterar((e) => E.mostrarBanner(e, texto, null, 'efeito'), { desfazivel: false });
}

function pularFrase() {
  ctx.tela.frases.fila.shift();
  desenhar();
}

// Relógio da mesa: limpa o que tem prazo e dispara a frase do turno parado.
setInterval(() => {
  const e = ctx.estado;
  const f = ctx.tela.frases;
  const agora = Date.now();
  if (e.banner?.estilo === 'efeito' && agora > f.efeitoAte) {
    alterar((s) => E.mostrarBanner(s, null), { desfazivel: false });
  }
  if (e.aviso?.duracao && agora > e.aviso.em + e.aviso.duracao * 1000) {
    alterar((s) => E.mostrarAviso(s, null), { desfazivel: false });
  }
  const parado = agora - f.ultimaAtividade > e.opcoes.segundosParado * 1000;
  if (e.modo === 'combate' && !e.fim && !f.pausado && !e.banner && parado) mostrarFrase();
}, 1000);

// ───────────── Atalhos de teclado ─────────────

window.addEventListener('keydown', (evento) => {
  const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (evento.key === 'Escape' && haJanelaAberta()) return fecharJanela();
  if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'z' && !digitando) {
    evento.preventDefault();
    return desfazer();
  }
  if (evento.key === 'Enter' && !haJanelaAberta() && document.activeElement?.tagName !== 'TEXTAREA') {
    const executar = mesaEl.querySelector('[data-acao-executar]');
    if (executar && !executar.disabled) {
      evento.preventDefault();
      executar.click();
    }
  }
});

// ───────────── Começo ─────────────

async function iniciar() {
  await Promise.all([
    document.fonts.load('27px "Jersey 15 PF"'),
    document.fonts.load('18.6667px "Jersey 10 PF"'),
    document.fonts.load('8px "Silkscreen"'),
  ]);
  ctx.dados = await carregarDados();
  ctx.palcoPrevia = criarPalco(document.createElement('div'), { cenarios: ctx.dados.cenarios });
  ctx.tela.rascunho = novoRascunho(ctx.estado.agindoId);
  ctx.novoRascunho = novoRascunho;
  canal.enviarEstado(E.estadoPublico(ctx.estado));
  desenhar();
}
iniciar();

/**
 * Lupa de depuração (só pelo console, F12): amplia a mesa e mostra a partir do ponto (x, y)
 * da grade. Ex.: inspecionar(240, 30, 4). F5 volta ao normal.
 */
window.inspecionar = (x, y, escala = 4) => {
  const z = escala / (window.devicePixelRatio || 1);
  mesaEl.style.zoom = z;
  suporte.style.position = 'relative';
  suporte.style.paddingLeft = '0';
  suporte.style.left = `${-x * z}px`;
  suporte.style.top = `${-y * z}px`;
};
