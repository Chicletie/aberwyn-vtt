// Textos do palco que o mestre corrige na hora (a antiga seção "fiscalizar" da SPEC):
// clique direito em qualquer texto da prévia do palco → EDITAR, Aa, TÍTULO, ESPAÇOS.
// Alternativa sem clique direito: o botão ✎ TEXTOS em cima da prévia abre todos de uma vez.

import { h, botao, rotulo, campoTexto, abrirJanela, fecharJanela, avisoRapido, primeiraMaiuscula, tituloEmCadaPalavra, limparEspacos } from './ui.js';

/**
 * Os textos que estão no palco agora, cada um com o nome, o valor e como gravar a correção.
 * @returns {{id:string, nome:string, valor:string, gravar:(estado:any, texto:string)=>void}[]}
 */
export function textosNoPalco(estado) {
  const lista = [];
  const add = (id, nome, valor, gravar) => {
    if (valor) lista.push({ id, nome, valor, gravar });
  };
  if (estado.modo === 'cortina') {
    const c = estado.cortina ?? {};
    const cortina = (campo) => (s, t) => (s.cortina = { ...s.cortina, [campo]: t });
    add('nomeCampanha', 'NOME DA CAMPANHA', c.nomeCampanha, cortina('nomeCampanha'));
    add('rotulo', 'RÓTULO', c.rotulo, cortina('rotulo'));
    add('linha', 'LINHA DA SESSÃO', c.linha, cortina('linha'));
    add('autor', 'QUEM DISSE', c.autor, cortina('autor'));
    add('proximaSessao', 'PRÓXIMA SESSÃO', c.proximaSessao, cortina('proximaSessao'));
    return lista;
  }
  // Editar não reinicia o tempo do aviso: só troca o texto.
  add('banner', 'FITA', estado.banner?.texto, (s, t) => s.banner && (s.banner = { ...s.banner, texto: t }));
  add('avisoTitulo', 'AVISO · TÍTULO', estado.aviso?.titulo, (s, t) => s.aviso && (s.aviso = { ...s.aviso, titulo: t }));
  add('avisoLinha', 'AVISO · LINHA', estado.aviso?.linha, (s, t) => s.aviso && (s.aviso = { ...s.aviso, linha: t }));
  add('dialogo', 'DIÁLOGO', estado.dialogo?.texto, (s, t) => s.dialogo && (s.dialogo = { ...s.dialogo, texto: t }));
  return lista;
}

/** Qual texto do estado foi clicado no palco (pela classe do elemento desenhado). */
const CLASSE_PARA_TEXTO = [
  ['.nome-campanha', 'nomeCampanha'],
  ['.linha-cortina', 'linha'],
  ['.autor', 'autor'],
  ['.proxima', 'proximaSessao'],
  ['.fita-texto', 'banner'],
  ['.aviso-titulo', 'avisoTitulo'],
  ['.aviso-linha', 'avisoLinha'],
  ['.texto-dialogo', 'dialogo'],
];

/** Liga o clique direito na prévia do palco (chamar uma vez). */
export function ligarCliqueDireito(raizPalco, ctx) {
  raizPalco.addEventListener('contextmenu', (evento) => {
    const textos = textosNoPalco(ctx.estado);
    const achado = CLASSE_PARA_TEXTO.find(([seletor]) => evento.target.closest?.(seletor));
    const texto = achado && textos.find((t) => t.id === achado[1]);
    if (!texto) return; // fora de um texto: deixa o menu normal do navegador
    evento.preventDefault();
    abrirMenu(evento, texto, ctx);
  });
}

let menuAberto = null;

function fecharMenu() {
  menuAberto?.remove();
  menuAberto = null;
}

function abrirMenu(evento, texto, ctx) {
  fecharMenu();
  const mesa = document.getElementById('mesa');
  // A mesa é ampliada com "zoom": a posição do mouse (em pixels da janela) é dividida por ele.
  const zoom = parseFloat(mesa.style.zoom) || 1;
  const corrigir = (funcao) => {
    fecharMenu();
    ctx.alterar((s) => texto.gravar(s, funcao(texto.valor)));
  };
  menuAberto = h(
    'div',
    {
      class: 'm-menu-contexto plaquinha',
      style: { left: `${Math.round(evento.clientX / zoom)}px`, top: `${Math.round(evento.clientY / zoom)}px` },
      onclick: (e) => e.stopPropagation(),
    },
    h('div', { class: 't-rotulo m-menu-titulo' }, texto.nome),
    botao('EDITAR…', () => (fecharMenu(), abrirEditor(ctx, texto.id))),
    botao('Aa', () => corrigir(primeiraMaiuscula), { titulo: 'Primeira letra maiúscula' }),
    botao('TÍTULO', () => corrigir(tituloEmCadaPalavra), { titulo: 'Título Em Cada Palavra' }),
    botao('ESPAÇOS', () => corrigir(limparEspacos), { titulo: 'Remover espaços sobrando' }),
  );
  mesa.append(menuAberto);
  // Fecha ao clicar fora ou apertar Esc.
  setTimeout(() => {
    document.addEventListener('click', fecharMenu, { once: true });
    document.addEventListener('keydown', (e) => e.key === 'Escape' && fecharMenu(), { once: true });
  });
}

/** Janela com todos os textos do palco (ou com o foco num deles), para corrigir com calma. */
export function abrirEditor(ctx, focoId = null) {
  const textos = textosNoPalco(ctx.estado);
  if (!textos.length) return avisoRapido('Nenhum texto no palco agora.');
  const novos = new Map(textos.map((t) => [t.id, t.valor]));
  const linhas = textos.map((t) =>
    h(
      'div',
      { class: 'm-linha' },
      h('span', { class: 'm-rotulo-fixo' }, rotulo(t.nome)),
      campoTexto(t.valor, (v) => novos.set(t.id, v), { largura: 250, corretores: true }),
    ),
  );
  const janela = abrirJanela('TEXTOS DO PALCO', [h('div', { class: 't-rotulo m-dica' }, 'CORRIJA E SALVE. O PALCO TROCA NA HORA.'), ...linhas], {
    largura: 420,
    botoes: [
      botao('SALVAR', () => {
        ctx.alterar((s) => {
          for (const t of textos) if (novos.get(t.id) !== t.valor) t.gravar(s, novos.get(t.id));
        });
        fecharJanela();
      }, { tom: 'ouro' }),
    ],
  });
  const indice = Math.max(0, textos.findIndex((t) => t.id === focoId));
  janela.querySelectorAll('.m-campo')[indice]?.focus();
}
