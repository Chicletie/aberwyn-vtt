// Posição manual dos inimigos: o mestre ARRASTA um inimigo na prévia do palco e ele fica ali
// (a posição manual sempre vence a formação automática). Duplo clique = volta ao automático.

import * as E from '../estado.js';
import { avisoRapido } from './ui.js';

/** Liga o arrastar na prévia do palco (chamar uma vez). */
export function ligarArrastarInimigos(raizPalco, ctx) {
  /** Id interno a partir do id que o palco desenhou (escondidos aparecem como "oculto-N"). */
  const idReal = (idPublico) => {
    const publico = E.estadoPublico(ctx.estado, { verTudo: ctx.tela.verComo === 'mestre' }).combatentes;
    const i = publico.findIndex((c) => c.id === idPublico);
    return i >= 0 ? E.emCampo(ctx.estado)[i]?.id : null;
  };

  raizPalco.addEventListener('pointerdown', (inicio) => {
    const el = inicio.target.closest?.('.lutador.inimigo');
    if (!el || inicio.button !== 0) return;
    inicio.preventDefault();
    const id = idReal(el.dataset.id);
    if (!id) return;
    // Quantos pixels da tela valem 1 pixel da grade do palco (a prévia está ampliada).
    const caixa = raizPalco.getBoundingClientRect();
    const porPixel = caixa.width / 480;
    const largura = parseFloat(el.style.width);
    const altura = parseFloat(el.style.height);
    const peInicial = { x: parseFloat(el.style.left) + largura / 2, y: parseFloat(el.style.top) + altura };
    let pe = null;
    el.classList.add('sem-transicao', 'arrastando');

    const mover = (evento) => {
      const dx = (evento.clientX - inicio.clientX) / porPixel;
      const dy = (evento.clientY - inicio.clientY) / porPixel;
      if (!pe && Math.hypot(dx, dy) < 2) return; // tremidinha do clique não conta
      // Pés sempre dentro do campo (entre a faixa de HUD e o painel de baixo).
      pe = {
        x: Math.round(Math.min(472, Math.max(8, peInicial.x + dx))),
        y: Math.round(Math.min(198, Math.max(60 + altura / 2, peInicial.y + dy))),
      };
      el.style.left = `${pe.x - largura / 2}px`;
      el.style.top = `${pe.y - altura}px`;
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      el.classList.remove('sem-transicao', 'arrastando');
      if (pe) ctx.alterar((s) => E.definirPosicao(s, id, pe));
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar, { once: true });
  });

  raizPalco.addEventListener('dblclick', (evento) => {
    const el = evento.target.closest?.('.lutador.inimigo');
    const id = el && idReal(el.dataset.id);
    if (!id || !E.acharCombatente(ctx.estado, id).posicao) return;
    ctx.alterar((s) => E.definirPosicao(s, id, null));
    avisoRapido('Posição automática de novo.');
  });
}
