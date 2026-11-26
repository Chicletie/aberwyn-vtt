// Mesa MÍNIMA do Marco 1. Serve só para mexer no estado e ver o palco reagir.
//
// O ciclo é sempre o mesmo (fluxo de mão única):
//   clique → função do estado.js altera o estado → enviarEstado(estadoPublico(estado)) → desenha a mesa.

import { aplicarPaletaNoCss, cores } from '../paleta.js';
import * as E from '../estado.js';
import { abrirCanal } from '../canal.js';

aplicarPaletaNoCss();

const estado = E.criarEstadoExemplo();
const canal = abrirCanal('local');

/** Aplica uma alteração, avisa o palco e redesenha a mesa. Toda mudança passa por aqui. */
function alterar(funcao) {
  funcao();
  canal.enviarEstado(E.estadoPublico(estado));
  desenharMesa();
}

// ───────────── Controles de cima ─────────────

document.body.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;
  const { acao, lado } = botao.dataset;
  if (acao === 'nova-rodada') alterar(() => E.novaRodada(estado));
  if (acao === 'vez') alterar(() => E.definirLadoDaVez(estado, lado));
  if (acao === 'encerrar-turno') alterar(() => E.encerrarTurno(estado));
  if (acao === 'banner') alterar(() => E.mostrarBanner(estado, textoBanner.value.trim(), corDeQuemAge()));
  if (acao === 'limpar-banner') alterar(() => E.mostrarBanner(estado, null));
});

const textoBanner = /** @type {HTMLInputElement} */ (document.getElementById('texto-banner'));
textoBanner.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') alterar(() => E.mostrarBanner(estado, textoBanner.value.trim(), corDeQuemAge()));
});

/** Cor da borda da fita: a de quem age (herói = cor-assinatura; inimigo; vilão). */
function corDeQuemAge() {
  const c = estado.combatentes.find((x) => x.id === estado.agindoId);
  if (!c) return cores.borda;
  if (c.lado === 'heroi') return c.corAssinatura;
  return c.lado === 'vilao' ? cores.vilao : cores.inimigo;
}

const seletorAcao = /** @type {HTMLSelectElement} */ (document.getElementById('acao-menu'));
const seletorItem = /** @type {HTMLSelectElement} */ (document.getElementById('item-submenu'));
seletorAcao.addEventListener('change', () => alterar(() => E.destacarAcao(estado, seletorAcao.value || null)));
seletorItem.addEventListener('change', () =>
  alterar(() => E.destacarAcao(estado, seletorAcao.value || null, seletorItem.value || null)),
);

// ───────────── Tabela do elenco ─────────────

const corpoTabela = document.getElementById('elenco');

corpoTabela.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button');
  if (!botao) return;
  const linha = botao.closest('tr');
  const id = linha.dataset.id;
  const numero = Number(linha.querySelector('input[type=number]').value) || 0;
  const tipo = botao.dataset.tipo;

  if (tipo === 'agindo') alterar(() => E.definirAgindo(estado, estado.agindoId === id ? null : id));
  if (tipo === 'dano') alterar(() => E.aplicarDano(estado, id, numero));
  if (tipo === 'cura') alterar(() => E.aplicarCura(estado, id, numero));
  if (tipo === 'pm-') alterar(() => E.alterarPm(estado, id, numero));
  if (tipo === 'pm+') alterar(() => E.alterarPm(estado, id, -numero));
  if (tipo === 'cond') alterar(() => E.alternarCondicao(estado, id, botao.dataset.cond));
  if (tipo === 'revelar') alterar(() => E.definirRevelado(estado, id, !E.acharCombatente(estado, id).revelado));
});

// Enter no campo de número = dano (o atalho mais comum).
corpoTabela.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter' || evento.target.type !== 'number') return;
  const id = evento.target.closest('tr').dataset.id;
  alterar(() => E.aplicarDano(estado, id, Number(evento.target.value) || 0));
});

const SIGLAS = { lento: 'LEN', atordoado: 'ATO', fraco: 'FRA', abalado: 'ABA', enfurecido: 'ENF', envenenado: 'VEN' };

/** Redesenha a mesa inteira a partir do estado (é pequena, então redesenhar tudo é simples). */
function desenharMesa() {
  document.getElementById('rodada').textContent = String(estado.rodada);
  document.getElementById('modo').textContent = '';
  for (const b of document.querySelectorAll('[data-acao=vez]')) {
    b.classList.toggle('ligado', b.dataset.lado === estado.ladoDaVez);
  }

  // Guarda os números digitados para não perder ao redesenhar.
  const digitados = {};
  for (const input of corpoTabela.querySelectorAll('input[type=number]')) {
    digitados[input.closest('tr').dataset.id] = input.value;
  }

  corpoTabela.innerHTML = estado.combatentes
    .map((c) => {
      const cor = c.lado === 'heroi' ? c.corAssinatura : c.lado === 'vilao' ? cores.vilao : cores.inimigo;
      const condicoes = E.CONDICOES.map(
        (k) =>
          `<button class="cond ${c.condicoes.includes(k) ? 'ligado' : ''}" data-tipo="cond" data-cond="${k}" title="${k}">${SIGLAS[k]}</button>`,
      ).join('');
      return `<tr data-id="${c.id}">
        <td><button data-tipo="agindo" class="${estado.agindoId === c.id ? 'ligado' : ''}">▶</button></td>
        <td><span class="faixa-cor" style="background:${cor}"></span>${c.nome}</td>
        <td>${c.lado}</td>
        <td>${c.pv.atual} / ${c.pv.max}</td>
        <td><input type="number" min="0" value="${digitados[c.id] ?? 10}" /></td>
        <td><button data-tipo="dano">Dano</button> <button data-tipo="cura">Cura</button></td>
        <td>${c.pm.atual} / ${c.pm.max} <button data-tipo="pm-">−</button><button data-tipo="pm+">+</button></td>
        <td>${condicoes}</td>
        <td>${c.turnosUsados} / ${c.turnosPorRodada}</td>
        <td>${c.lado === 'heroi' ? '' : `<button data-tipo="revelar" class="${c.revelado ? 'ligado' : ''}">${c.revelado ? 'sim' : 'não'}</button>`}</td>
      </tr>`;
    })
    .join('');

  // Menu de quem age (só heróis têm menu no palco).
  const agindo = estado.combatentes.find((x) => x.id === estado.agindoId);
  const menu = agindo?.lado === 'heroi' ? agindo.menu : [];
  seletorAcao.innerHTML =
    '<option value="">(nenhuma)</option>' +
    menu.map((m) => `<option value="${m.id}">${m.nome}</option>`).join('');
  seletorAcao.value = estado.acaoDestacada?.acao ?? '';
  const itens = agindo?.submenu?.[estado.acaoDestacada?.acao] ?? [];
  seletorItem.innerHTML =
    '<option value="">(nenhum)</option>' + itens.map((i) => `<option>${i}</option>`).join('');
  seletorItem.value = estado.acaoDestacada?.item ?? '';
}

// Começa: desenha e manda o estado inicial (palcos já abertos recebem na hora).
canal.enviarEstado(E.estadoPublico(estado));
desenharMesa();
