// Editor de cenário: ajusta a FAIXA DE CHÃO de cada cenário arrastando duas linhas.
// - chaoTopo: onde ficam os pés de quem está mais ao fundo;
// - chaoBase: os pés de quem está mais à frente da tela.
// A prévia mostra 8 heróis e 6 inimigos provisórios (o pior caso), para conferir se cabe.

import * as E from '../estado.js';
import { CHAO_PADRAO } from '../palco/layout.js';
import { criarPalco } from '../palco/palco.js';
import { h, botao, rotulo, lista, abrirJanela, fecharJanela, avisoRapido } from './ui.js';

const LIMITE_TOPO = 106; // pé nunca acima disso (não invade a faixa da fita)
const LIMITE_BASE = 196;

export function abrirEditorCenario(ctx) {
  let cenarioId = ctx.estado.cenario;
  let chao = chaoAtual(ctx, cenarioId);

  const palcoEl = h('div');
  const palco = criarPalco(palcoEl, { cenarios: ctx.dados.cenarios });
  const linhaTopo = h('div', { class: 'm-linha-chao topo' });
  const linhaBase = h('div', { class: 'm-linha-chao base' });
  const sobreposicao = h('div', { class: 'm-sobreposicao-chao' }, linhaTopo, linhaBase);
  const area = h('div', { class: 'm-editor-chao' }, palcoEl, sobreposicao);
  const info = h('div', { class: 'm-linha' });

  // Estado falso com o máximo de gente: 8 heróis e 6 inimigos.
  const exemplo = E.criarEstadoVazio();
  exemplo.modo = 'combate';
  exemplo.rodada = 1;
  ['#da863e', '#e8c170', '#a8ca58', '#4f8fba', '#a4dddb', '#df84a5', '#c65197', '#ad7757'].forEach((cor, i) =>
    exemplo.combatentes.push(E.novoHeroi({ id: `h${i}`, nome: `H${i + 1}`, corAssinatura: cor, ordemPainel: i })));
  for (let i = 0; i < 6; i++) exemplo.combatentes.push(E.novoInimigo({ id: `i${i}`, nome: `I${i + 1}` }));

  const redesenhar = () => {
    exemplo.cenario = cenarioId;
    exemplo.chaos = { [cenarioId]: chao };
    palco.renderizar(E.estadoPublico(exemplo));
    linhaTopo.style.top = `${chao.chaoTopo}px`;
    linhaBase.style.top = `${chao.chaoBase}px`;
    // Com 4 por fileira e fileiras iguais, o passo é altura / 3,5 (ver layout.js).
    const passo = (chao.chaoBase - chao.chaoTopo) / 3.5;
    info.replaceChildren(
      rotulo(`TOPO ${chao.chaoTopo}`, 'dourado'),
      rotulo(`BASE ${chao.chaoBase}`, 'dourado'),
      rotulo(passo < 20 ? 'APERTADO DEMAIS PARA 8 HERÓIS (PASSO < 20 PX)' : `PASSO COM 8 HERÓIS: ${Math.floor(passo)} PX`, passo < 20 ? 'perigo' : 'apagado'),
    );
  };

  // Arrastar as linhas (mouse ou dedo).
  const arrastar = (qual) => (evento) => {
    evento.preventDefault();
    const alvo = evento.currentTarget;
    alvo.setPointerCapture(evento.pointerId);
    const mover = (ev) => {
      const r = palcoEl.getBoundingClientRect();
      const y = Math.round(((ev.clientY - r.top) / r.height) * 270);
      if (qual === 'topo') chao.chaoTopo = Math.max(LIMITE_TOPO, Math.min(chao.chaoBase - 20, y));
      else chao.chaoBase = Math.min(LIMITE_BASE, Math.max(chao.chaoTopo + 20, y));
      redesenhar();
    };
    const soltar = () => {
      alvo.removeEventListener('pointermove', mover);
      alvo.removeEventListener('pointerup', soltar);
    };
    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerup', soltar);
  };
  linhaTopo.addEventListener('pointerdown', arrastar('topo'));
  linhaBase.addEventListener('pointerdown', arrastar('base'));

  abrirJanela('CHÃO DO CENÁRIO', [
    h('div', { class: 'm-linha' },
      rotulo('CENÁRIO'),
      lista(ctx.dados.cenarios.map((c) => [c.id, c.nome ?? c.id]), cenarioId, (v) => {
        cenarioId = v;
        chao = chaoAtual(ctx, v);
        redesenhar();
      }, 160),
      rotulo('ARRASTE AS DUAS LINHAS', 'apagado')),
    area,
    info,
    h('div', { class: 't-rotulo m-dica' }, 'O AJUSTE FICA SALVO NA MESA. PARA FIXAR NO ARQUIVO, COPIE OS NÚMEROS PARA DADOS/CENARIOS.JSON.'),
  ], {
    largura: 500,
    botoes: [
      botao('PADRÃO', () => {
        chao = { ...CHAO_PADRAO, ...doArquivo(ctx, cenarioId) };
        redesenhar();
      }),
      botao('SALVAR', () => {
        ctx.alterar((s) => E.ajustarChao(s, cenarioId, chao));
        fecharJanela();
        avisoRapido(`Chão de "${cenarioId}" salvo.`);
      }, { tom: 'ouro' }),
    ],
  });
  redesenhar();
}

function doArquivo(ctx, id) {
  const c = ctx.dados.cenarios.find((x) => x.id === id) ?? {};
  const r = {};
  for (const k of ['chaoTopo', 'chaoBase', 'heroiX', 'inimigoX']) if (typeof c[k] === 'number') r[k] = c[k];
  return r;
}

function chaoAtual(ctx, id) {
  return { ...CHAO_PADRAO, ...doArquivo(ctx, id), ...(ctx.estado.chaos[id] ?? {}) };
}
