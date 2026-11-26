// Janelas (modais) da mesa: o que é raro mora aqui, fora da tela principal.
// Ficha de combatente, adicionar ao elenco, formação, ordem do painel, aviso, iniciar e
// encerrar combate, sessão, ajuda/arquivo e o editor de cenário (em editor-cenario.js).

import * as E from '../estado.js';
import { todas as paletaToda, assinaturasReserva } from '../paleta.js';
import { exportarJson, importarJson } from '../persistencia.js';
import { h, botao, seletor, tituloSecao, rotulo, campoNumero, campoTexto, lista, marcador, abrirJanela, fecharJanela, avisoRapido } from './ui.js';
export { abrirEditorCenario } from './editor-cenario.js';

// ───────────── Sessão ─────────────

export function abrirSessao(ctx) {
  let n = ctx.estado.sessao;
  abrirJanela('NÚMERO DA SESSÃO', [h('div', { class: 'm-linha' }, rotulo('SESSÃO'), campoNumero(n, (v) => (n = v)))], {
    largura: 220,
    botoes: [botao('SALVAR', () => {
      ctx.alterar((s) => (s.sessao = Math.max(1, n)));
      fecharJanela();
    }, { tom: 'ouro' })],
  });
}

// ───────────── Iniciar combate (p. 61: quem venceu a iniciativa) ─────────────

export function abrirIniciarCombate(ctx) {
  if (!E.emCampo(ctx.estado).length) return avisoRapido('Coloque alguém no elenco primeiro (+ HERÓI / + INIMIGO).');
  const iniciar = (lado) => {
    ctx.alterar((s) => E.iniciarCombate(s, lado));
    ctx.mostrarFrase('Rodada 1.');
    fecharJanela();
  };
  abrirJanela('INICIAR COMBATE', [
    h('div', { class: 't-corpo' }, 'Qual lado venceu a iniciativa?'),
    h('div', { class: 't-rotulo m-dica' }, 'ESSE LADO COMEÇA TODA RODADA (P. 61).'),
  ], {
    largura: 280,
    botoes: [botao('HERÓIS', () => iniciar('herois'), { tom: 'ouro' }), botao('INIMIGOS', () => iniciar('inimigos'), { tom: 'perigo' })],
  });
}

// ───────────── Encerrar combate ─────────────

const FINS = [
  ['vitoria', 'Vitória', 'INIMIGOS VIRAM LUZ · POSE DE VITÓRIA', 'Vitória!', 'dourado'],
  ['fuga', 'Inimigos fogem', 'SAEM PELA BORDA', 'Eles fugiram!', 'neutro'],
  ['acordo', 'Acordo', 'A LUTA PARA SEM VENCEDOR', 'Trégua.', 'neutro'],
  ['rendicao', 'Rendição do grupo', 'O MUNDO PERDE A COR', 'O grupo se rende...', 'sombrio'],
  ['personalizado', 'Personalizado', '[TEXTO SEU]', '', 'neutro'],
];

export function abrirEncerrarCombate(ctx) {
  const opcoes = FINS.map(([tipo, nome, descricao, titulo, tom]) =>
    h('button', { class: `m-opcao-fim ${tipo === 'rendicao' ? 'perigo' : ''}`, type: 'button', onclick: () => abrirTextoDoFim(ctx, tipo, nome, titulo, tom) },
      h('span', { class: 't-corpo' }, nome),
      h('span', { class: 't-rotulo' }, descricao)));
  abrirJanela('COMO ESTA LUTA TERMINA?', opcoes, { largura: 260 });
}

function abrirTextoDoFim(ctx, tipo, nome, tituloPadrao, tomPadrao) {
  let titulo = tituloPadrao;
  let texto = '';
  let tom = tomPadrao;
  const conteudo = [
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('TÍTULO')), campoTexto(titulo, (v) => (titulo = v), { largura: 220, corretores: true, limite: 28 })),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('FRASE')), campoTexto('', (v) => (texto = v), { largura: 220, placeholder: 'frase de resultado (opcional)', corretores: true, limite: 60 })),
  ];
  if (tipo === 'personalizado') {
    const sel = h('span');
    const redesenhar = () => sel.replaceChildren(seletor([['dourado', 'DOURADO'], ['neutro', 'NEUTRO'], ['sombrio', 'SOMBRIO']], tom, (v) => ((tom = v), redesenhar())));
    redesenhar();
    conteudo.push(h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('ESTILO')), sel));
  }
  abrirJanela(nome.toUpperCase(), conteudo, {
    largura: 320,
    botoes: [botao('ENCERRAR', () => {
      ctx.alterar((s) => E.encerrarCombate(s, tipo, titulo.trim(), texto.trim(), tom));
      fecharJanela();
      avisoRapido('No palco até você clicar em CONTINUAR.');
    }, { tom: 'perigo' })],
  });
}

// ───────────── Fase do chefe (12d) ─────────────

/** Troca a fase: clarão (aviso de virada escrito pelo mestre) e as frases de efeito da fase. */
export function trocarFase(ctx, vilao, fase) {
  if (fase === ctx.estado.fase) return;
  let titulo = '';
  let linha = '';
  abrirJanela(`FASE ${fase} · ${vilao.nome.toUpperCase()}`, [
    h('div', { class: 't-rotulo m-dica' }, 'AVISO DE VIRADA (OPCIONAL). PV/PM NOVOS: AJUSTE NA LINHA OU NA FICHA.'),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('TÍTULO')), campoTexto('', (v) => (titulo = v), { largura: 220, placeholder: 'O Marco desperta', corretores: true, limite: 28 })),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('LINHA')), campoTexto('', (v) => (linha = v), { largura: 220, placeholder: 'O chão treme sob vocês.', corretores: true, limite: 60 })),
  ], {
    largura: 330,
    botoes: [botao('MUDAR DE FASE', () => {
      ctx.alterar((s) => {
        E.definirFase(s, fase);
        if (titulo.trim()) E.mostrarAviso(s, { titulo: titulo.trim(), linha: linha.trim(), tom: 'vinho', duracao: 4 });
      });
      ctx.tela.frases.fila = [];
      fecharJanela();
    }, { tom: 'ouro' })],
  });
}

// ───────────── Aviso central ─────────────

export function abrirAviso(ctx, { guardar = false } = {}) {
  const a = { titulo: '', linha: '', tom: 'neutro', duracao: 4 };
  let ateFechar = false;
  const tomEl = h('span');
  const tempoEl = h('span');
  const redesenhar = () => {
    tomEl.replaceChildren(seletor([['neutro', 'NEUTRO'], ['dourado', 'DOURADO'], ['vermelho', 'VERMELHO'], ['vinho', 'VINHO']], a.tom, (v) => ((a.tom = v), redesenhar())));
    tempoEl.replaceChildren(
      seletor([[false, 'SOME EM'], [true, 'ATÉ EU FECHAR']], ateFechar, (v) => ((ateFechar = v), redesenhar())),
      ateFechar ? null : campoNumero(a.duracao, (n) => (a.duracao = Math.max(1, n))),
      ateFechar ? null : rotulo('S'));
  };
  redesenhar();
  const pronto = () => ({ ...a, titulo: a.titulo.trim(), linha: a.linha.trim(), duracao: ateFechar ? null : a.duracao });
  abrirJanela('AVISO CENTRAL', [
    h('div', { class: 't-rotulo m-dica' }, 'O TEXTO É SEMPRE SEU. DOURADO = ALGO BOM · VERMELHO = PERIGO · VINHO = VILÃO.'),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('TÍTULO')), campoTexto('', (v) => (a.titulo = v), { largura: 240, corretores: true, limite: 28 })),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('LINHA')), campoTexto('', (v) => (a.linha = v), { largura: 240, corretores: true, limite: 60 })),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('TOM')), tomEl),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('TEMPO')), tempoEl),
  ], {
    largura: 380,
    botoes: [
      botao('GUARDAR COMO PRONTO', () => {
        if (!a.titulo.trim()) return avisoRapido('Escreva um título.');
        ctx.alterar((s) => E.adicionarAvisoPronto(s, pronto()));
        if (guardar) fecharJanela();
      }),
      guardar ? null : botao('MOSTRAR', () => {
        if (!a.titulo.trim()) return avisoRapido('Escreva um título.');
        ctx.alterar((s) => E.mostrarAviso(s, pronto()));
        fecharJanela();
      }, { tom: 'ouro' }),
    ].filter(Boolean),
  });
}

// ───────────── Ajuda, atalhos e arquivo ─────────────

export function abrirAjuda(ctx) {
  const atalhos = [
    ['ENTER', 'EXECUTAR a ação montada'],
    ['CTRL+Z', 'DESFAZER a última ação inteira'],
    ['CLIQUE NA LINHA', 'quem age agora'],
    ['CLIQUE DIREITO / ✎', 'ficha do combatente'],
    ['SHIFT + − / +', 'muda 10 de uma vez'],
    ['ESC', 'fecha esta janela'],
  ];
  abrirJanela('ATALHOS E ARQUIVO', [
    tituloSecao('ATALHOS'),
    ...atalhos.map(([tecla, o]) => h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo largo' }, rotulo(tecla, 'dourado')), h('span', { class: 't-corpo' }, o))),
    tituloSecao('ARQUIVO'),
    h('div', { class: 't-rotulo m-dica' }, 'A MESA SALVA SOZINHA NESTE NAVEGADOR. O ARQUIVO .JSON É O BACKUP (E SERVE PARA PREPARAR COMBATES).'),
    h('div', { class: 'm-linha' },
      botao('SALVAR ARQUIVO', () => exportarJson(ctx.estado, `aberwyn-sessao-${ctx.estado.sessao}.json`)),
      botao('ABRIR ARQUIVO', async () => {
        try {
          const novo = await importarJson();
          if (!novo) return;
          ctx.alterar((s) => Object.assign(s, novo));
          fecharJanela();
          avisoRapido('Combate carregado.');
        } catch (erro) {
          avisoRapido(erro.message);
        }
      })),
    h('div', { class: 'm-linha' },
      botao('NOVO COMBATE', () => {
        if (!confirm('Começar um combate novo? O elenco atual sai (dá para desfazer).')) return;
        ctx.alterar((s) => {
          const vazio = E.criarEstadoVazio();
          Object.assign(s, { ...vazio, sessao: s.sessao, cortina: s.cortina, chaos: s.chaos, avisosProntos: s.avisosProntos, cenaId: s.cenaId, cenario: s.cenario });
        });
        fecharJanela();
      }, { tom: 'perigo' }),
      botao('CARREGAR EXEMPLO', () => {
        ctx.alterar((s) => Object.assign(s, E.criarEstadoExemplo()));
        fecharJanela();
      })),
  ], { largura: 380 });
}

// ───────────── Adicionar ao elenco ─────────────

/**
 * @param {'heroi'|'inimigo'|'qualquer'} lado
 * @param {boolean} chegaNoFim marca para entrar só no fim da rodada (p. 60)
 */
export function abrirAdicionar(ctx, lado, chegaNoFim) {
  const presentes = new Set(ctx.estado.combatentes.map((c) => c.id));
  const adicionar = (base) => {
    const novo = ctx.alterar((s) => E.adicionarCombatente(s, { ...base, chegaNoFim }));
    if (novo) {
      fecharJanela();
      avisoRapido(chegaNoFim ? `${novo.nome} chega no fim da rodada.` : `${novo.nome} entrou.`);
    }
  };
  const corLivre = () => assinaturasReserva.find((c) => !ctx.estado.combatentes.some((x) => x.corAssinatura === c)) ?? assinaturasReserva[0];

  const blocos = [];
  if (lado !== 'inimigo') {
    const disponiveis = ctx.dados.herois.filter((h) => !presentes.has(h.id));
    blocos.push(tituloSecao('HERÓIS (DADOS/HEROIS.JSON)'),
      h('div', { class: 'm-grade-botoes' },
        disponiveis.map((x) => botao(x.nome, () => adicionar({ ...x, lado: 'heroi', corAssinatura: x.corAssinatura ?? corLivre() }))),
        botao('+ HERÓI DO ZERO', () => adicionar({ id: 'heroi', nome: 'Herói', lado: 'heroi', corAssinatura: corLivre() }), { classe: 'apagado' })));
  }
  if (lado !== 'heroi') {
    blocos.push(tituloSecao('CORINGAS (DADOS/CORINGAS.JSON)'),
      h('div', { class: 'm-grade-botoes' },
        ctx.dados.coringas.map((x) => botao(x.nome, () => adicionar({ ...x, lado: 'inimigo', nome: `${x.nome} A` }))),
        botao('+ INIMIGO DO ZERO', () => adicionar({ id: 'inimigo', nome: 'Inimigo A', lado: 'inimigo' }), { classe: 'apagado' }),
        botao('+ VILÃO DO ZERO', () => adicionar({ id: 'vilao', nome: 'Vilão', lado: 'vilao', porte: 'grande', revelado: false }), { classe: 'apagado' })));
  }
  if (chegaNoFim) {
    const jaNaLuta = ctx.estado.combatentes.filter((c) => !c.chegaNoFim);
    if (jaNaLuta.length) {
      blocos.unshift(h('div', { class: 't-rotulo m-dica' }, 'NOVOS PARTICIPANTES ENTRAM NO FIM DA RODADA (P. 60). ESCOLHA ALGUÉM NOVO:'));
    }
  }
  abrirJanela(chegaNoFim ? 'CHEGA NO FIM DA RODADA' : lado === 'heroi' ? 'ADICIONAR HERÓI' : 'ADICIONAR INIMIGO', blocos, { largura: 380 });
}

// ───────────── Ficha do combatente (mesa) ─────────────

/** Tudo de um combatente que não cabe na linha: o mestre edita aqui. */
export function abrirFicha(ctx, id) {
  const c = ctx.estado.combatentes.find((x) => x.id === id);
  if (!c) return;
  const heroi = c.lado === 'heroi';
  // Edita uma cópia; SALVAR aplica tudo de uma vez (e o DESFAZER desfaz junto).
  const m = structuredClone(c);
  const linhaCampo = (titulo, ...campos) => h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo(titulo)), ...campos);
  const txt = (campo, opcoes = {}) => campoTexto(m[campo] ?? '', (v) => (m[campo] = v), { largura: 160, ...opcoes });
  const num = (obj, campo, largura) => campoNumero(obj[campo], (v) => (obj[campo] = Math.max(0, v)), largura);

  const corEl = h('span', { class: 'm-paleta' });
  const redesenharCores = () =>
    corEl.replaceChildren(...paletaToda.map((hex) =>
      h('button', { type: 'button', class: `m-cor ${m.corAssinatura === hex ? 'escolhida' : ''}`, style: { background: hex }, title: hex, onclick: () => ((m.corAssinatura = hex), redesenharCores()) })));

  const conteudo = [
    linhaCampo('NOME', txt('nome', { corretores: true, limite: heroi ? 8 : 18 })),
  ];
  if (heroi) {
    redesenharCores();
    conteudo.push(
      linhaCampo('JOGADOR', txt('jogador')),
      linhaCampo('COR', corEl),
      linhaCampo('FILEIRA', lista([['', 'automática'], ['frente', 'frente'], ['tras', 'trás']], m.fileira ?? '', (v) => (m.fileira = v || null), 90)),
      linhaCampo('PI', num(m.pi, 'atual'), h('span', { class: 't-corpo' }, '/'), num(m.pi, 'max')),
      linhaCampo('MENU', campoTexto(m.menu.map((x) => (x.proprio ? `*${x.nome}` : x.nome)).join(', '), (v) => (m.menuTexto = v), { largura: 250 })),
      h('div', { class: 't-rotulo m-dica' }, 'SEPARE POR VÍRGULA. *NOME = COMANDO PRÓPRIO (DOURADO). AÇÕES DO LIVRO: ' + E.ACOES_PADRAO.map((a) => a.nome.toUpperCase()).join(', ') + '.'),
      linhaCampo('FEITIÇOS', campoTexto((m.submenu.feitico ?? []).join(', '), (v) => (m.submenu.feitico = separar(v)), { largura: 250 })),
      linhaCampo('PODERES', campoTexto((m.submenu.poder ?? []).join(', '), (v) => (m.submenu.poder = separar(v)), { largura: 250 })),
      linhaCampo('INVENTÁRIO', campoTexto((m.submenu.inventario ?? []).join(', '), (v) => (m.submenu.inventario = separar(v)), { largura: 250 })),
    );
  } else {
    conteudo.push(
      linhaCampo('LADO', lista([['inimigo', 'inimigo'], ['vilao', 'vilão']], m.lado, (v) => (m.lado = v), 90),
        rotulo('PORTE'), lista([['normal', 'normal'], ['grande', 'grande']], m.porte ?? 'normal', (v) => (m.porte = v), 80)),
      tituloSecao('O QUE O ESTUDO REVELA (TEXTO SEU)'),
      linhaCampo('PATENTE', campoTexto(m.fichaInimigo?.patente ?? '', (v) => (m.fichaInimigo.patente = v), { largura: 100 }), rotulo('ESPÉCIE'), campoTexto(m.fichaInimigo?.especie ?? '', (v) => (m.fichaInimigo.especie = v), { largura: 100 })),
      linhaCampo('TRAÇOS 10+', campoTexto(m.fichaInimigo?.tracos ?? '', (v) => (m.fichaInimigo.tracos = v), { largura: 250 })),
      linhaCampo('AFINID. 10+', campoTexto(m.fichaInimigo?.afinidades ?? '', (v) => (m.fichaInimigo.afinidades = v), { largura: 250 })),
      linhaCampo('ATAQUES 13+', campoTexto(m.fichaInimigo?.ataques ?? '', (v) => (m.fichaInimigo.ataques = v), { largura: 250 })),
      linhaCampo('FEITIÇOS 13+', campoTexto(m.fichaInimigo?.feiticos ?? '', (v) => (m.fichaInimigo.feiticos = v), { largura: 250 })),
    );
    m.fichaInimigo ??= {};
  }
  conteudo.push(
    tituloSecao('NÚMEROS E ARTE'),
    linhaCampo('PV MÁX', num(m.pv, 'max'), rotulo('PM MÁX'), num(m.pm, 'max'), rotulo('TURNOS/RODADA'), num(m, 'turnosPorRodada', 20)),
    linhaCampo('SPRITE', txt('sprite', { largura: 90, placeholder: 'id da pasta' }), rotulo('RETRATO'), txt('retrato', { largura: 90, placeholder: 'id do png' })),
    linhaCampo('ENTRADA', lista([['desliza', 'desliza'], ['fade', 'fade'], ['surge', 'surge'], ['pose', 'pose (desenhada)']], m.entrada, (v) => (m.entrada = v), 110)),
    linhaCampo('CHEGADA', marcador('ENTRA NO FIM DA RODADA', m.chegaNoFim, (v) => (m.chegaNoFim = v))),
    linhaCampo('ANOTAÇÕES', campoTexto(m.anotacoes ?? '', (v) => (m.anotacoes = v), { largura: 250, multilinha: true, placeholder: 'só você vê' })),
  );

  abrirJanela(`FICHA · ${c.nome.toUpperCase()}`, conteudo, {
    largura: 420,
    botoes: [
      botao('REMOVER', () => {
        if (!confirm(`Tirar ${c.nome} da luta? (dá para desfazer)`)) return;
        ctx.alterar((s) => E.removerCombatente(s, id));
        fecharJanela();
      }, { tom: 'perigo' }),
      heroi ? null : botao('DUPLICAR', () => {
        ctx.alterar((s) => E.duplicarCombatente(s, id));
        fecharJanela();
      }),
      botao('SALVAR', () => {
        if (m.menuTexto !== undefined) m.menu = menuDeTexto(m.menuTexto);
        delete m.menuTexto;
        m.sprite = m.sprite || null;
        m.retrato = m.retrato || null;
        m.turnosPorRodada = Math.max(1, m.turnosPorRodada);
        m.pv.atual = Math.min(m.pv.atual, m.pv.max);
        m.pm.atual = Math.min(m.pm.atual, m.pm.max);
        if (m.pi) m.pi.atual = Math.min(m.pi.atual, m.pi.max);
        ctx.alterar((s) => E.editarCombatente(s, id, m));
        fecharJanela();
      }, { tom: 'ouro' }),
    ].filter(Boolean),
  });
}

function separar(texto) {
  return texto.split(',').map((x) => x.trim()).filter(Boolean);
}

/** "Ataque, *Provocar, Feitiço" → itens do menu (ações do livro reconhecidas pelo nome). */
function menuDeTexto(texto) {
  return separar(texto).map((nome) => {
    const proprio = nome.startsWith('*');
    const limpo = proprio ? nome.slice(1).trim() : nome;
    const doLivro = E.ACOES_PADRAO.find((a) => a.nome.toLowerCase() === limpo.toLowerCase());
    if (doLivro && !proprio) return { ...doLivro };
    const id = limpo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
    return { id, nome: limpo, proprio: true };
  });
}

// ───────────── Formação (só fileira e ordem; o app calcula os pixels) ─────────────

export function abrirFormacao(ctx) {
  const herois = () => ctx.estado.combatentes.filter((c) => c.lado === 'heroi' && !c.chegaNoFim);
  // Começa da formação que está na tela (mesmo a automática), para o mestre só ajustar.
  const montar = () => {
    const hs = [...herois()].sort((a, b) => (a.posFileira ?? 99) - (b.posFileira ?? 99) || a.ordemPainel - b.ordemPainel);
    const padrao = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]][Math.min(hs.length, 8)][0];
    const frente = hs.filter((x) => x.fileira === 'frente');
    const tras = hs.filter((x) => x.fileira === 'tras');
    for (const x of hs.filter((y) => !y.fileira)) (frente.length < padrao ? frente : tras).push(x);
    return { frente: frente.map((x) => x.id), tras: tras.map((x) => x.id) };
  };
  let f = montar();
  const corpo = h('div', { class: 'm-formacao' });
  const aplicar = () => {
    ctx.alterar((s) => {
      f.frente.forEach((id, i) => E.definirFileira(s, id, 'frente', i));
      f.tras.forEach((id, i) => E.definirFileira(s, id, 'tras', i));
    });
    redesenhar();
  };
  const coluna = (nome, chave, outra) =>
    h('div', { class: 'm-coluna-formacao' },
      tituloSecao(`${nome} ${f[chave].length}/4`),
      f[chave].map((id, i) => {
        const c = ctx.estado.combatentes.find((x) => x.id === id);
        return h('div', { class: 'm-linha' },
          h('span', { class: 'm-faixa-cor', style: { background: c.corAssinatura } }),
          h('span', { class: 't-corpo m-nome-formacao' }, c.nome),
          botao('▲', () => (i > 0 && ([f[chave][i - 1], f[chave][i]] = [f[chave][i], f[chave][i - 1]]), aplicar()), { classe: 'mini', desligado: i === 0 }),
          botao('▼', () => (i < f[chave].length - 1 && ([f[chave][i + 1], f[chave][i]] = [f[chave][i], f[chave][i + 1]]), aplicar()), { classe: 'mini', desligado: i === f[chave].length - 1 }),
          botao('⇄', () => {
            if (f[outra].length >= 4) return avisoRapido('Máximo de 4 por fileira.');
            f[chave].splice(i, 1);
            f[outra].push(id);
            aplicar();
          }, { classe: 'mini', titulo: 'Trocar de fileira' }));
      }));
  const redesenhar = () =>
    corpo.replaceChildren(
      h('div', { class: 't-rotulo m-dica' }, 'SÓ VISUAL (O LIVRO NÃO TEM FILEIRAS). ▲▼ = ORDEM (0 = EM CIMA). A BARRA NO PAINEL NÃO MUDA DE LUGAR.'),
      h('div', { class: 'm-duas-colunas' }, coluna('FRENTE', 'frente', 'tras'), coluna('TRÁS', 'tras', 'frente')));
  redesenhar();
  abrirJanela('FORMAÇÃO', corpo, {
    largura: 400,
    botoes: [botao('VOLTAR AO AUTOMÁTICO', () => {
      ctx.alterar((s) => herois().forEach((x) => E.definirFileira(s, x.id, null, null)));
      f = montar();
      redesenhar();
    })],
  });
}

// ───────────── Ordem do painel de status ─────────────

export function abrirOrdemPainel(ctx) {
  const corpo = h('div');
  const redesenhar = () => {
    const ordem = ctx.estado.combatentes.filter((c) => c.lado === 'heroi').sort((a, b) => a.ordemPainel - b.ordemPainel);
    const mover = (i, d) => {
      const ids = ordem.map((c) => c.id);
      [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
      ctx.alterar((s) => E.reordenarPainel(s, ids));
      redesenhar();
    };
    corpo.replaceChildren(
      h('div', { class: 't-rotulo m-dica' }, 'ORDEM DAS BARRAS NO PALCO. NÃO MUDA COM A FORMAÇÃO, PARA CADA JOGADOR ACHAR A SUA SEMPRE NO MESMO LUGAR.'),
      ...ordem.map((c, i) =>
        h('div', { class: 'm-linha' },
          h('span', { class: 'm-faixa-cor', style: { background: c.corAssinatura } }),
          h('span', { class: 't-corpo m-nome-formacao' }, c.nome),
          botao('▲', () => mover(i, -1), { classe: 'mini', desligado: i === 0 }),
          botao('▼', () => mover(i, 1), { classe: 'mini', desligado: i === ordem.length - 1 }))));
  };
  redesenhar();
  abrirJanela('ORDEM DO PAINEL', corpo, { largura: 300 });
}


// ───────────── Online: login do mestre, sala e link ─────────────

/** Mensagens de erro do login em português (os códigos vêm do Firebase). */
const ERROS_LOGIN = {
  'auth/invalid-credential': 'E-mail ou senha errados.',
  'auth/invalid-email': 'Esse e-mail não parece certo.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem internet (ou o Firebase não respondeu).',
};

export function abrirOnline(ctx) {
  const o = ctx.online;
  if (!o.configurado) {
    return abrirJanela('ONLINE', [
      h('div', { class: 't-corpo' }, 'O modo online ainda não foi configurado.'),
      h('div', { class: 't-rotulo m-dica' }, 'FALTA COLAR OS DADOS DO PROJETO DO FIREBASE EM SRC/CONFIG-ONLINE.JS (O CLAUDE TE GUIA). ATÉ LÁ, O PALCO FUNCIONA SÓ EM OUTRA ABA DESTE NAVEGADOR.'),
    ], { largura: 340 });
  }

  if (!o.logado) {
    let email = '';
    let senha = '';
    const erro = h('div', { class: 't-rotulo perigo m-dica', hidden: true });
    const campoSenha = h('input', { class: 'm-campo t-corpo', type: 'password', style: { width: '200px' }, autocomplete: 'current-password', oninput: (e) => (senha = e.target.value), onkeydown: (e) => { e.stopPropagation(); if (e.key === 'Enter') tentar(); } });
    const tentar = async () => {
      erro.hidden = true;
      try {
        await ctx.entrar(email.trim(), senha);
        fecharJanela();
        avisoRapido('Conectado. A sala já está recebendo a mesa.');
      } catch (e) {
        erro.textContent = (ERROS_LOGIN[e.code] ?? `Não consegui entrar (${e.code ?? e.message}).`).toUpperCase();
        erro.hidden = false;
      }
    };
    return abrirJanela('ENTRAR COMO MESTRE', [
      h('div', { class: 't-rotulo m-dica' }, 'SÓ A CONTA DO MESTRE CONSEGUE ESCREVER NA SALA. QUEM CONFERE É O SERVIDOR (AS REGRAS DO FIREBASE).'),
      h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('E-MAIL')),
        h('input', { class: 'm-campo t-corpo', type: 'email', style: { width: '200px' }, autocomplete: 'username', oninput: (e) => (email = e.target.value), onkeydown: (e) => e.stopPropagation() })),
      h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('SENHA')), campoSenha),
      erro,
    ], { largura: 320, botoes: [botao('ENTRAR', tentar, { tom: 'ouro' })] });
  }

  const link = ctx.linkDoPalco();
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      avisoRapido('Link copiado. Mande no Discord.');
    } catch {
      avisoRapido('Não consegui copiar; selecione o link e copie à mão.');
    }
  };
  abrirJanela('ONLINE', [
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('MESTRE')), h('span', { class: 't-corpo' }, o.email)),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('SALA')), h('span', { class: 't-titulo titulo-dourado' }, o.sala)),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('CONEXÃO')),
      rotulo(o.erro ? `ERRO: ${o.erro}` : o.conectado ? 'TRANSMITINDO' : 'RECONECTANDO…', o.erro ? 'perigo' : o.conectado ? 'dourado' : '')),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo' }, rotulo('BACKUP')),
      rotulo(o.backupEm ? `NA NUVEM · ${quando(o.backupEm)}` : 'AINDA NÃO FEITO', o.backupEm ? 'dourado' : 'apagado')),
    tituloSecao('LINK DOS JOGADORES'),
    h('input', { class: 'm-campo t-corpo', readonly: true, value: link, style: { width: '330px' }, onfocus: (e) => e.target.select() }),
    h('div', { class: 't-rotulo m-dica' }, 'NOVA SALA = UM CÓDIGO NOVO; O LINK ANTIGO PARA DE RECEBER (BOM SE O LINK VAZAR).'),
  ], {
    largura: 360,
    botoes: [
      botao('SAIR', async () => {
        await ctx.sair();
        fecharJanela();
      }),
      botao('NOVA SALA', () => {
        if (!confirm('Trocar o código da sala? Os jogadores vão precisar do link novo.')) return;
        ctx.novaSala();
        fecharJanela();
        abrirOnline(ctx);
      }),
      botao('COPIAR LINK', copiar, { tom: 'ouro' }),
    ],
  });
}

// ───────────── Backup na nuvem: recuperar ─────────────

/** Data e hora legíveis ("26/11 às 21:40"). */
function quando(ms) {
  const d = new Date(ms);
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)} às ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

/**
 * A nuvem tem uma mesa mais nova que este navegador (navegador limpo, outro computador…).
 * O mestre escolhe: recuperar a da nuvem ou manter a deste navegador (que vira o novo backup).
 */
export function oferecerRecuperarBackup(nuvem, aoEscolher) {
  const e = nuvem.estado;
  const herois = (e.combatentes ?? []).filter((c) => c.lado === 'heroi').length;
  const inimigos = (e.combatentes ?? []).length - herois;
  let escolhido = false;
  const escolher = (valor) => {
    escolhido = true;
    fecharJanela();
    aoEscolher(valor);
  };
  abrirJanela('BACKUP NA NUVEM', [
    h('div', { class: 't-corpo' }, 'A nuvem tem uma mesa mais nova que a deste navegador.'),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo largo' }, rotulo('SALVA NA NUVEM')), h('span', { class: 't-corpo' }, quando(nuvem.em))),
    h('div', { class: 'm-linha' }, h('span', { class: 'm-rotulo-fixo largo' }, rotulo('NELA')), h('span', { class: 't-corpo' }, `Sessão ${e.sessao ?? '?'} · ${herois} heróis · ${inimigos} inimigos`)),
    h('div', { class: 't-rotulo m-dica' }, 'RECUPERAR TROCA A MESA DESTE NAVEGADOR PELA DA NUVEM (DÁ PARA DESFAZER). MANTER FAZ A MESA DESTE NAVEGADOR VIRAR O BACKUP.'),
  ], {
    largura: 360,
    // Fechar sem escolher = manter a deste navegador (o mais seguro: não apaga nada da tela).
    aoFechar: () => {
      if (!escolhido) aoEscolher(false);
    },
    botoes: [
      botao('MANTER A DESTE NAVEGADOR', () => escolher(false)),
      botao('RECUPERAR DA NUVEM', () => escolher(true), { tom: 'ouro' }),
    ],
  });
}
