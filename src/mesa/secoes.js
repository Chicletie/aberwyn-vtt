// As quatro áreas da mesa (prévia docs: mesa-combate.png):
// topo (barra de cima), esquerda (heróis e inimigos), centro (palco ao vivo + AÇÃO), direita
// (mensagens, fala, avisos, cena). Cada função redesenha a sua área a partir do estado.
//
// Princípio da SPEC: uma jogada comum em 3–4 cliques; o raro mora na ficha (clique direito ou ✎).

import * as E from '../estado.js';
import { cores } from '../paleta.js';
import { h, botao, seletor, tituloSecao, rotulo, campoNumero, campoTexto, lista, quadradinhosCondicao, rosto, avisoRapido, encher } from './ui.js';
import * as J from './janelas.js';
import { silhuetaDe } from '../arte.js';
import { ligarCliqueDireito, abrirEditor } from './textos-palco.js';
import { ligarArrastarInimigos } from './posicoes.js';

/** Cor de um combatente na mesa (o mestre vê o vilão em vinho mesmo escondido). */
function corNaMesa(c) {
  if (c.lado === 'heroi') return c.corAssinatura;
  return c.lado === 'vilao' ? cores.vilao : cores.inimigo;
}

// ═════════════════════════ TOPO ═════════════════════════

export function desenharTopo(area, ctx) {
  const e = ctx.estado;
  const emCombate = e.modo === 'combate';
  const alterar = ctx.alterar;

  const irParaCombate = () => {
    if (e.rodada === 0 || e.fim) return J.abrirIniciarCombate(ctx);
    alterar((s) => E.definirModo(s, 'combate'));
  };

  const vezTexto = e.ladoDaVez === 'herois' ? 'VEZ: HERÓIS' : 'VEZ: INIMIGOS';
  const todosAgiram = emCombate && !E.sugerirProximoLado(e) && !e.agindoId;

  encher(area, 
    h('span', { class: 't-titulo m-logo' }, 'Mesa'),
    h('span', { class: 't-rotulo m-sessao', title: 'Clique para mudar o número da sessão', onclick: () => J.abrirSessao(ctx) }, `SESSÃO ${e.sessao}`),
    indicadorOnline(ctx),
    botao('CORTINA', () => alterar((s) => E.definirModo(s, 'cortina')), { ligado: e.modo === 'cortina' }),
    h('span', { class: 'm-seletor' },
      botao('CENA', null, { desligado: true, titulo: 'Modo cena: janeiro' }),
      botao('COMBATE', irParaCombate, { ligado: emCombate })),
    emCombate ? h('span', { class: 't-rotulo m-rodada' }, `RODADA ${e.rodada}`) : null,
    emCombate
      ? botao(vezTexto, () => alterar((s) => E.definirLadoDaVez(s, s.ladoDaVez === 'herois' ? 'inimigos' : 'herois')), { ligado: true, titulo: 'Trocar o lado da vez' })
      : null,
    emCombate && !e.fim
      ? botao('FIM DA RODADA', () => {
          const chegaram = alterar((s) => E.fimDaRodada(s));
          ctx.mostrarFrase(`Rodada ${ctx.estado.rodada}.`);
          if (chegaram?.length) avisoRapido(`${chegaram.length} chegou/chegaram.`);
        }, { tom: todosAgiram ? 'ouro' : undefined, titulo: 'Todos voltam a ter turnos; quem estava marcado chega.' })
      : null,
    emCombate && !e.fim ? botao('ENCERRAR COMBATE', () => J.abrirEncerrarCombate(ctx), { tom: 'perigo' }) : null,
    emCombate && e.fim ? botao('CONTINUAR', () => alterar((s) => E.continuarDepoisDoFim(s)), { tom: 'ouro', titulo: 'Sai do combate para a cortina' }) : null,
    h('span', { class: 'm-espaco' }),
    botao('ÉPICA', null, { desligado: true, titulo: 'Luta épica: janeiro (Pontos de Fabula)' }),
    botao('AVISO', () => J.abrirAviso(ctx)),
    botao(`DESFAZER${ctx.pilhaTamanho ? ` ${ctx.pilhaTamanho}` : ''}`, () => ctx.desfazer(), { desligado: !ctx.pilhaTamanho, titulo: 'Ctrl+Z' }),
    botao('?', () => J.abrirAjuda(ctx)),
  );
}

/**
 * Situação do modo online na barra de cima (clique abre a janela ONLINE):
 * LOCAL (não configurado) · ENTRAR (configurado, sem login) · SALA XXXXX (transmitindo).
 * Ponto verde = transmitindo; amarelo = sem login ou sem conexão; vermelho = erro.
 */
function indicadorOnline(ctx) {
  const o = ctx.online;
  let texto = 'LOCAL';
  let estado = 'local';
  if (o.configurado && !o.logado) [texto, estado] = ['ENTRAR', 'atencao'];
  else if (o.configurado && o.erro) [texto, estado] = ['SEM PERMISSÃO', 'erro'];
  else if (o.configurado && !o.conectado) [texto, estado] = [`SALA ${o.sala} · RECONECTANDO`, 'atencao'];
  else if (o.configurado) [texto, estado] = [`SALA ${o.sala}`, 'ok'];
  return h('button', { class: `m-botao m-conexao ${estado}`, type: 'button', title: 'Modo online', onclick: () => J.abrirOnline(ctx) },
    h('span', { class: 'm-ponto' }), texto);
}

// ═════════════════════════ ESQUERDA: heróis e inimigos ═════════════════════════

export function desenharEsquerda(area, ctx) {
  const e = ctx.estado;
  const herois = e.combatentes.filter((c) => c.lado === 'heroi' && !c.chegaNoFim);
  const inimigos = e.combatentes.filter((c) => c.lado !== 'heroi' && !c.chegaNoFim);
  const chegando = e.combatentes.filter((c) => c.chegaNoFim);

  encher(area, 
    tituloSecao(`HERÓIS ${herois.length}/${E.MAX_HEROIS}`),
    ...herois.map((c) => linhaHeroi(c, ctx)),
    h('div', { class: 't-rotulo m-dica' }, 'CLIQUE = AGE · CLIQUE DIREITO OU ✎ = FICHA'),
    tituloSecao(`INIMIGOS ${inimigos.length}/${E.MAX_INIMIGOS}`),
    ...inimigos.map((c) => linhaInimigo(c, ctx)),
    chegando.length ? tituloSecao('CHEGAM NO FIM DA RODADA') : null,
    ...chegando.map((c) =>
      h('div', { class: 'm-chegando', oncontextmenu: (ev) => (ev.preventDefault(), J.abrirFicha(ctx, c.id)) },
        h('span', { class: 'm-faixa-cor', style: { background: corNaMesa(c) } }),
        h('span', { class: 't-corpo' }, c.nome),
        botao('✎', () => J.abrirFicha(ctx, c.id), { classe: 'mini' }),
        botao('CANCELAR', () => ctx.alterar((s) => E.definirChegaNoFim(s, c.id, false)), { classe: 'mini' })),
    ),
    h('div', { class: 'm-linha-botoes' },
      botao('+ HERÓI', () => J.abrirAdicionar(ctx, 'heroi', false)),
      botao('+ INIMIGO', () => J.abrirAdicionar(ctx, 'inimigo', false)),
      botao('+ CHEGA NO FIM DA RODADA', () => J.abrirAdicionar(ctx, 'qualquer', true))),
    h('div', { class: 'm-linha-botoes' },
      botao('FORMAÇÃO', () => J.abrirFormacao(ctx)),
      botao('PAINEL', () => J.abrirOrdemPainel(ctx), { titulo: 'Ordem das barras no painel de status' })),
    tituloSecao('HISTÓRICO'),
    h('div', { class: 'm-historico' },
      e.historico.slice(0, 12).map((item) => h('div', { class: 't-rotulo' }, item.texto))),
  );
}

/** Uma linha de herói: rosto, nome, jogador, condições, PV e PM. */
function linhaHeroi(c, ctx) {
  const e = ctx.estado;
  const alterar = ctx.alterar;
  const agindo = e.agindoId === c.id;
  const agiu = c.turnosUsados >= c.turnosPorRodada;
  const recurso = (sigla, campo) =>
    h('span', { class: 'm-recurso' },
      rotulo(sigla, `sigla-${campo}`),
      campoNumero(c[campo].atual, (n) => alterar((s) => E.definirRecurso(s, c.id, campo, 'atual', n))),
      h('span', { class: 't-corpo m-max' }, `/${c[campo].max}`),
      botao('−', (ev) => alterar((s) => (campo === 'pv' ? E.aplicarDano(s, c.id, ev.shiftKey ? 10 : 1) : E.alterarPm(s, c.id, ev.shiftKey ? 10 : 1))), { classe: 'mini', titulo: 'Shift = 10' }),
      botao('+', (ev) => alterar((s) => (campo === 'pv' ? E.aplicarCura(s, c.id, ev.shiftKey ? 10 : 1) : E.alterarPm(s, c.id, ev.shiftKey ? -10 : -1))), { classe: 'mini', titulo: 'Shift = 10' }));

  return h(
    'div',
    {
      class: `m-heroi${agindo ? ' agindo' : ''}${c.pv.atual === 0 ? ' caido' : ''}`,
      style: { '--cor': c.corAssinatura },
      onclick: () => escolherQuem(ctx, agindo ? null : c.id),
      oncontextmenu: (ev) => (ev.preventDefault(), J.abrirFicha(ctx, c.id)),
    },
    rosto(c, c.corAssinatura),
    h('span', { class: 'm-heroi-meio' },
      h('span', { class: 't-corpo m-nome' }, c.nome),
      h('span', { class: 't-rotulo m-jogador' }, `${c.jogador || '—'}${agiu ? ' · AGIU' : ''}`),
      quadradinhosCondicao(c.condicoes, (k) => alterar((s) => E.alternarCondicao(s, c.id, k)))),
    h('span', { class: 'm-recursos' }, recurso('PV', 'pv'), recurso('PM', 'pm')),
    botao('✎', () => J.abrirFicha(ctx, c.id), { classe: 'mini m-editar', titulo: 'Ficha (PI, fileira, menu…)' }),
  );
}

/** Uma linha de inimigo: nome, PV, Estudo, ver PV, revelado e (vilão) fase. */
function linhaInimigo(c, ctx) {
  const e = ctx.estado;
  const alterar = ctx.alterar;
  const agindo = e.agindoId === c.id;
  const nivel = c.estudo?.nivel ?? null;
  return h(
    'div',
    {
      class: `m-inimigo${agindo ? ' agindo' : ''}${c.pv.atual === 0 ? ' caido' : ''}`,
      style: { '--cor': corNaMesa(c) },
      onclick: () => escolherQuem(ctx, agindo ? null : c.id),
      oncontextmenu: (ev) => (ev.preventDefault(), J.abrirFicha(ctx, c.id)),
    },
    h('span', { class: 'm-inimigo-linha' },
      h('span', { class: 'm-faixa-cor', style: { background: corNaMesa(c) } }),
      h('span', { class: 't-corpo m-nome' }, c.nome),
      botao(c.revelado ? '◉' : '?', () => alterar((s) => E.definirRevelado(s, c.id, !c.revelado)), { classe: 'mini', ligado: !c.revelado, titulo: c.revelado ? 'Revelado (clique para esconder)' : 'Oculto: ??? e silhueta no palco (clique para revelar)' }),
      h('span', { class: 'm-espaco' }),
      rotulo('PV', 'sigla-pv'),
      campoNumero(c.pv.atual, (n) => alterar((s) => E.definirRecurso(s, c.id, 'pv', 'atual', n)), 30),
      h('span', { class: 't-corpo m-max' }, `/${c.pv.max}`),
      botao('−', (ev) => alterar((s) => E.aplicarDano(s, c.id, ev.shiftKey ? 10 : 1)), { classe: 'mini', titulo: 'Shift = 10' })),
    h('span', { class: 'm-inimigo-linha' },
      c.turnosPorRodada > 1 ? rotulo(`${c.turnosUsados}/${c.turnosPorRodada}T`, 'm-turnos') : null,
      rotulo('ESTUDO'),
      seletor([[null, '−'], [7, '7+'], [10, '10+'], [13, '13+']], nivel, (n) => alterar((s) => E.definirEstudo(s, c.id, n, s.agindoId))),
      botao('VER PV', () => alterar((s) => E.definirMostrarPv(s, c.id, !c.mostrarPv)), { ligado: c.mostrarPv, titulo: 'Regra da casa: barra de PV atual sob o inimigo (com Estudo 7+)' }),
      c.lado === 'vilao' ? seletor([[1, 'F1'], [2, 'F2'], [3, 'F3']], e.fase, (f) => J.trocarFase(ctx, c, f)) : null,
      h('span', { class: 'm-espaco' }),
      botao('✎', () => J.abrirFicha(ctx, c.id), { classe: 'mini', titulo: 'Ficha do inimigo' })),
  );
}

/** Escolhe quem age (clique na linha ou QUEM no painel AÇÃO). */
function escolherQuem(ctx, id) {
  ctx.tela.rascunho = ctx.novoRascunho(id);
  ctx.alterar((s) => E.definirAgindo(s, id), { desfazivel: false });
}

// ═════════════════════════ CENTRO: palco ao vivo + AÇÃO ═════════════════════════

/** Partes fixas do centro (criadas uma vez para o palco ao vivo não reiniciar as animações). */
let centroMontado = null;

export function desenharCentro(area, ctx) {
  if (!centroMontado || centroMontado.area !== area) {
    const cabecalho = h('div', { class: 'm-cabecalho-palco' });
    const hospedeiro = h('div', { class: 'm-palco-previa' }, ctx.palcoPrevia.raiz);
    const painel = h('div', { class: 'm-painel-acao' });
    encher(area, cabecalho, hospedeiro, painel);
    centroMontado = { area, cabecalho, painel };
    ligarCliqueDireito(ctx.palcoPrevia.raiz, ctx);
    ligarArrastarInimigos(ctx.palcoPrevia.raiz, ctx);
  }
  const { cabecalho, painel } = centroMontado;
  const e = ctx.estado;

  encher(cabecalho, 
    rotulo('O QUE OS JOGADORES VEEM'),
    h('span', { class: 'm-espaco' }),
    botao('✎ TEXTOS', () => abrirEditor(ctx), { titulo: 'Corrigir os textos do palco (ou clique direito num texto da prévia)', classe: 'mini' }),
    rotulo('VER COMO'),
    seletor([['jogadores', 'JOGADORES'], ['mestre', 'MESTRE']], ctx.tela.verComo, (v) => {
      ctx.tela.verComo = v;
      ctx.desenhar();
    }),
  );
  ctx.palcoPrevia.renderizar(E.estadoPublico(e, { verTudo: ctx.tela.verComo === 'mestre', silhueta: silhuetaDe }));

  encher(painel, e.modo === 'cortina' ? painelCortina(ctx) : painelAcao(ctx));
}

/** Painel AÇÃO: quem, ação, alvos com dano, resultado, tipo, condição, EXECUTAR. */
function painelAcao(ctx) {
  const e = ctx.estado;
  const r = ctx.tela.rascunho;
  if (r.quemId !== e.agindoId) Object.assign(r, ctx.novoRascunho(e.agindoId));
  const campo = E.emCampo(e);
  const quem = r.quemId ? campo.find((c) => c.id === r.quemId) : null;
  const menu = quem?.lado === 'heroi' ? quem.menu : E.ACOES_PADRAO;
  const itensSubmenu = quem?.submenu?.[r.acao] ?? null;

  // Mudanças no rascunho que o palco também mostra (menu destacado, alvos) não entram no DESFAZER.
  const atualizarPrevia = () =>
    ctx.alterar((s) => {
      E.destacarAcao(s, r.acao, r.item);
      E.definirAlvos(s, r.alvos.map((a) => a.id));
    }, { desfazivel: false });

  const linhaAlvos = r.alvos.map((a, i) => {
    const c = campo.find((x) => x.id === a.id);
    return h('span', { class: 'm-alvo' },
      botao(c?.nome ?? '?', () => {
        r.alvos.splice(i, 1);
        atualizarPrevia();
      }, { ligado: !a.errou, titulo: 'Tirar este alvo' }),
      // Ataque multi: um teste só, comparado com a Defesa de cada alvo (p. 69).
      // ✗ marca que ESTE alvo não foi atingido (só vale com ACERTOU; crítico atinge todos).
      botao('✗', () => {
        a.errou = !a.errou;
        ctx.desenhar();
      }, { classe: 'mini', ligado: !!a.errou, tom: a.errou ? 'perigo' : undefined, titulo: 'Este alvo esquivou (errou só ele)' }),
      rotulo(r.tipo === 'cura' ? 'CURA' : 'DANO'),
      campoNumero(a.valor, (n) => {
        a.valor = Math.max(0, n);
        ctx.desenhar();
      }, 30));
  });
  const candidatos = campo.filter((c) => !r.alvos.some((a) => a.id === c.id));

  const executar = () => {
    if (!quem) return avisoRapido('Escolha QUEM age.');
    const acao = { ...r, alvos: r.alvos.map((a) => ({ ...a })) };
    ctx.alterar((s) => E.executarAcao(s, acao));
    ctx.tela.rascunho = { ...ctx.novoRascunho(quem.id), acao: r.acao, item: r.item, tipo: r.tipo };
    ctx.desenhar();
  };

  const encerrar = () => {
    const sugestao = ctx.alterar((s) => E.encerrarTurno(s));
    ctx.tela.sugestao = sugestao;
    avisoRapido(sugestao ? `Vez sugerida: ${sugestao === 'herois' ? 'HERÓIS' : 'INIMIGOS'}` : 'Todos já agiram: FIM DA RODADA');
  };

  return [
    tituloSecao('AÇÃO'),
    h('div', { class: 'm-linha' },
      rotulo('QUEM'),
      lista([['', '(ninguém)'], ...campo.map((c) => [c.id, c.nome])], r.quemId ?? '', (id) => escolherQuem(ctx, id || null), 96),
      rotulo('AÇÃO'),
      lista([['', '(nenhuma)'], ...menu.map((m) => [m.id, m.nome])], r.acao ?? '', (v) => {
        r.acao = v || null;
        r.item = null;
        atualizarPrevia();
      }, 96),
      h('span', { class: 't-corpo m-seta' }, '›'),
      itensSubmenu
        ? lista([['', '(item)'], ...itensSubmenu.map((x) => [x, x])], r.item ?? '', (v) => {
            r.item = v || null;
            atualizarPrevia();
          }, 90)
        : campoTexto(r.item ?? '', (v, final) => {
            r.item = v || null;
            if (final) atualizarPrevia();
          }, { largura: 80, placeholder: 'nome' }),
      rotulo('CUSTO'),
      campoNumero(r.custoPm, (n) => {
        r.custoPm = Math.max(0, n);
        ctx.desenhar();
      }),
      h('span', { class: 't-rotulo', title: 'O PM é descontado sozinho ao EXECUTAR' }, 'PM')),
    h('div', { class: 'm-linha' },
      rotulo('ALVOS'),
      ...linhaAlvos,
      candidatos.length
        ? lista([['', '+ ALVO'], ['@inimigos', 'todos os inimigos'], ['@herois', 'todos os heróis'], ...candidatos.map((c) => [c.id, c.nome])], '', (id) => {
            const novos = id === '@inimigos' ? candidatos.filter((c) => c.lado !== 'heroi') : id === '@herois' ? candidatos.filter((c) => c.lado === 'heroi') : candidatos.filter((c) => c.id === id);
            r.alvos.push(...novos.map((c) => ({ id: c.id, valor: 0, errou: false })));
            atualizarPrevia();
          }, 76)
        : null),
    h('div', { class: 'm-linha' },
      rotulo('RESULTADO'),
      seletor([['acertou', 'ACERTOU'], ['errou', 'ERROU'], ['critico', 'CRÍTICO'], ['falha', 'FALHA CRÍTICA']], r.resultado, (v) => {
        r.resultado = v;
        ctx.desenhar();
      }),
      rotulo('TIPO'),
      lista(E.TIPOS.map((t) => [t, t.toUpperCase()]), r.tipo, (v) => {
        r.tipo = v;
        ctx.desenhar();
      }, 70)),
    h('div', { class: 'm-linha' },
      rotulo('CONDIÇÃO'),
      quadradinhosCondicao(r.condicao ? [r.condicao] : [], (k) => {
        r.condicao = r.condicao === k ? null : k;
        ctx.desenhar();
      }),
      rotulo(r.condicao ? `${E.NOMES_CONDICOES[r.condicao].toUpperCase()} NOS ALVOS (SE ACERTAR)` : 'NOS ALVOS MARCADOS', 'apagado')),
    h('div', { class: 'm-linha m-linha-executar' },
      h('button', { class: 'm-botao primario t-corpo', type: 'button', dataset: { acaoExecutar: '1' }, onclick: executar, disabled: !quem || !!e.fim }, 'EXECUTAR'),
      rotulo('ENTER', 'apagado'),
      h('span', { class: 'm-espaco' }),
      botao('ENCERRAR TURNO', encerrar, { desligado: !e.agindoId, titulo: 'Gasta o turno de quem age e sugere o outro lado' })),
    tituloSecao(quem?.lado === 'heroi' ? `FABULA · ${quem.nome.toUpperCase()}` : 'FABULA'),
    h('div', { class: 'm-linha' },
      ['EVOCAR TRAÇO', 'EVOCAR LAÇO', 'MUDAR A HISTÓRIA', 'USAR PODER'].map((t) => botao(t, null, { desligado: true, titulo: 'Pontos de Fabula: janeiro' }))),
  ];
}

/** Painel da CORTINA (no lugar da AÇÃO quando a sessão está fechada). */
function painelCortina(ctx) {
  const c = ctx.estado.cortina;
  const salvar = (campo) => (v, final) => {
    if (final) ctx.alterar((s) => E.editarCortina(s, { [campo]: v }));
  };
  const linhaCampo = (titulo, campo, opcoes) =>
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo(titulo)), campoTexto(c[campo], salvar(campo), { largura: 330, corretores: true, ...opcoes, foco: `cortina-${campo}` }));
  return [
    tituloSecao('CORTINA · O QUE APARECE COM A SESSÃO FECHADA'),
    linhaCampo('CAMPANHA', 'nomeCampanha', { limite: 24 }),
    linhaCampo('RÓTULO', 'rotulo', { placeholder: 'opcional (ex.: ONDE PARAMOS)', limite: 40 }),
    linhaCampo('LINHA', 'linha', { placeholder: 'a linha desta sessão', limite: 70 }),
    linhaCampo('QUEM DISSE', 'autor', { placeholder: 'opcional', limite: 30 }),
    linhaCampo('PRÓXIMA', 'proximaSessao', { placeholder: 'ex.: SÁBADO · 20H', limite: 40 }),
    h('div', { class: 'm-linha m-linha-executar' },
      h('button', { class: 'm-botao primario t-corpo', type: 'button', onclick: () => (ctx.estado.rodada > 0 && !ctx.estado.fim ? ctx.alterar((s) => E.definirModo(s, 'combate')) : J.abrirIniciarCombate(ctx)) }, ctx.estado.rodada > 0 && !ctx.estado.fim ? 'VOLTAR AO COMBATE' : 'INICIAR COMBATE')),
    h('div', { class: 't-rotulo m-dica' }, 'OS ROSTOS QUE ACENDEM QUANDO CADA JOGADOR CHEGA ENTRAM COM O MODO ONLINE (MARCO 3).'),
  ];
}

// ═════════════════════════ DIREITA ═════════════════════════

export function desenharDireita(area, ctx) {
  const e = ctx.estado;
  const t = ctx.tela;
  const alterar = ctx.alterar;
  const cena = ctx.dados.cenas.find((c) => c.id === e.cenaId);
  const avisos = [...(cena?.avisos ?? []), ...e.avisosProntos];
  const proxima = t.frases.fila[0] ?? '(sem frases nesta cena)';
  const corFita = cores.borda;

  encher(area, 
    tituloSecao('MENSAGENS'),
    rotulo('FRASE DE EFEITO (AUTOMÁTICA)', 'apagado'),
    h('div', { class: 't-corpo m-frase', title: proxima }, frasePrevista(ctx) ?? proxima),
    h('div', { class: 'm-linha' },
      botao('ENVIAR', () => ctx.mostrarFrase()),
      botao('PRÓXIMA', () => ctx.pularFrase()),
      botao(t.frases.pausado ? 'RETOMAR' : 'PAUSAR', () => {
        t.frases.pausado = !t.frases.pausado;
        ctx.desenhar();
      }, { ligado: t.frases.pausado })),
    h('div', { class: 'm-linha' },
      campoTexto(t.mensagemLivre, (v) => (t.mensagemLivre = v), { largura: 150, placeholder: '[mensagem livre]', corretores: false, limite: 60, foco: 'mensagem-livre' }),
      botao('MOSTRAR', () => {
        if (!t.mensagemLivre.trim()) return;
        alterar((s) => E.mostrarBanner(s, t.mensagemLivre.trim(), corFita));
      })),
    h('div', { class: 'm-linha' }, botao('LIMPAR FITA', () => alterar((s) => E.mostrarBanner(s, null)), { desligado: !e.banner })),

    tituloSecao('FALA'),
    h('div', { class: 'm-linha' },
      lista([['', 'Narrador'], ...e.combatentes.map((c) => [c.id, c.nome])], t.fala.falanteId, (v) => (t.fala.falanteId = v), 90),
      botao('FALAR', () => {
        if (!t.fala.texto.trim()) return;
        alterar((s) => E.mostrarDialogo(s, t.fala.falanteId || null, t.fala.texto.trim()));
      }),
      botao('FECHAR', () => alterar((s) => E.mostrarDialogo(s, null, null)), { desligado: !e.dialogo })),
    campoTexto(t.fala.texto, (v) => (t.fala.texto = v), { largura: 212, placeholder: 'texto da fala', multilinha: true, limite: 110, foco: 'fala' }),

    tituloSecao('AVISOS PRONTOS'),
    h('div', { class: 'm-avisos-prontos' },
      avisos.map((a) =>
        botao(a.titulo, () => alterar((s) => E.mostrarAviso(s, a)), { classe: `tom-${a.tom}`, titulo: a.linha })),
      botao('+ NOVO', () => J.abrirAviso(ctx, { guardar: true }), { classe: 'apagado' })),
    e.aviso ? h('div', { class: 'm-linha' }, rotulo(`NO PALCO: ${e.aviso.titulo}`), botao('FECHAR AVISO', () => alterar((s) => E.mostrarAviso(s, null)))) : null,

    tituloSecao('CENA E CENÁRIO'),
    h('div', { class: 'm-linha' },
      rotulo('CENA'),
      lista([['', '(nenhuma)'], ...ctx.dados.cenas.map((c) => [c.id, c.titulo])], e.cenaId ?? '', (v) => {
        t.frases.fila = [];
        alterar((s) => E.escolherCena(s, v || null));
        // A cena traz o cenário dela (se existir em cenarios.json).
        const nova = ctx.dados.cenas.find((c) => c.id === v);
        if (nova?.cenario && ctx.dados.cenarios.some((c) => c.id === nova.cenario)) alterar((s) => E.escolherCenario(s, nova.cenario), { desfazivel: false });
      }, 170)),
    h('div', { class: 'm-linha' },
      rotulo('CENÁRIO'),
      lista(ctx.dados.cenarios.map((c) => [c.id, c.nome ?? c.id]), e.cenario, (v) => alterar((s) => E.escolherCenario(s, v)), 120),
      botao('CHÃO', () => J.abrirEditorCenario(ctx), { titulo: 'Ajustar a faixa de chão deste cenário' })),
    h('div', { class: 'm-linha' },
      rotulo('TURNO PARADO'),
      campoNumero(e.opcoes.segundosParado, (n) => alterar((s) => (s.opcoes.segundosParado = Math.max(10, n)))),
      rotulo('S → FRASE', 'apagado')),
    h('div', { class: 't-rotulo m-dica' }, 'RELÓGIOS, SOM E PENDENTES: JANEIRO.'),
  );
}

/** Texto da próxima frase (sem tirar da fila). */
function frasePrevista(ctx) {
  const f = ctx.tela.frases;
  if (f.fila.length) return f.fila[0];
  const cena = ctx.dados.cenas.find((c) => c.id === ctx.estado.cenaId);
  const fases = cena?.combate?.fases ?? {};
  const lista = fases[String(ctx.estado.fase)] ?? fases['1'] ?? cena?.ambiente ?? [];
  return lista[0] ?? null;
}
