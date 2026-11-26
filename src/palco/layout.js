// Cálculo das POSIÇÕES no campo (grade de 480×270). Só matemática, nada de desenho:
// recebe a lista de combatentes e devolve onde ficam os PÉS de cada um.
// Regras em docs/SPEC.md, "Regras de layout".

/** Faixa de chão padrão (cada cenário poderá definir a sua no Marco 2). */
export const CHAO_PADRAO = { chaoTopo: 106, chaoBase: 194, heroiX: 0, inimigoX: 0 };

/** Divisão padrão frente/trás por quantidade de heróis (índice = quantidade). */
const DIVISAO_PADRAO = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]];

const X_FRENTE = 128;
const X_TRAS = 62;
const INCLINACAO = 14; // cada herói fica 14 px à esquerda do de cima
const MAX_POR_FILEIRA = 4;

/**
 * Separa os heróis em fileira da frente e de trás.
 * Quem tem `fileira` escolhida pelo mestre fica nela; os outros seguem a divisão padrão.
 * Uma fileira nunca passa de 4: o excedente vai para a outra.
 */
export function dividirFileiras(herois) {
  const ordenados = [...herois].sort(
    (a, b) => (a.posFileira ?? 99) - (b.posFileira ?? 99) || (a.ordemPainel ?? 0) - (b.ordemPainel ?? 0),
  );
  const frente = ordenados.filter((h) => h.fileira === 'frente');
  const tras = ordenados.filter((h) => h.fileira === 'tras');
  const semEscolha = ordenados.filter((h) => h.fileira !== 'frente' && h.fileira !== 'tras');

  // Quantos ainda faltam na frente, segundo a divisão padrão do total.
  const [alvoFrente] = DIVISAO_PADRAO[Math.min(herois.length, 8)];
  for (const h of semEscolha) {
    if (frente.length < alvoFrente) frente.push(h);
    else tras.push(h);
  }
  while (frente.length > MAX_POR_FILEIRA) tras.push(frente.pop());
  while (tras.length > MAX_POR_FILEIRA) frente.push(tras.pop());
  return { frente, tras };
}

/**
 * Posição dos pés de cada herói.
 * @returns {Map<string,{x:number,y:number}>}
 */
export function posicoesHerois(herois, chao = CHAO_PADRAO) {
  const posicoes = new Map();
  const { frente, tras } = dividirFileiras(herois);
  const altura = chao.chaoBase - chao.chaoTopo;
  const centroY = (chao.chaoTopo + chao.chaoBase) / 2;
  const mesmaQuantidade = frente.length === tras.length && frente.length > 1;

  const k = Math.max(frente.length, tras.length);
  // Com fileiras iguais, a de trás fica meio passo abaixo; o bloco todo precisa caber.
  let passo = 32;
  if (mesmaQuantidade) passo = Math.min(32, altura / (k - 0.5));
  else if (k > 1) passo = Math.min(32, altura / (k - 1));

  const colocar = (fileira, xFileira, deslocamento) => {
    const n = fileira.length;
    if (!n) return;
    const alturaBloco = mesmaQuantidade ? passo * (n - 0.5) : passo * (n - 1);
    const y0 = centroY - alturaBloco / 2;
    const larguraInclinacao = INCLINACAO * (n - 1);
    fileira.forEach((h, i) => {
      posicoes.set(h.id, {
        x: Math.round(xFileira + chao.heroiX + larguraInclinacao / 2 - i * INCLINACAO),
        y: Math.round(y0 + (i + deslocamento) * passo),
      });
    });
  };
  colocar(frente, X_FRENTE, 0);
  colocar(tras, X_TRAS, mesmaQuantidade ? 0.5 : 0);
  return posicoes;
}

/** Tamanho do desenho provisório (sem arte) de cada combatente. */
export function tamanhoProvisorio(c) {
  if (c.lado === 'heroi') return { largura: 32, altura: 48 };
  return c.porte === 'grande' ? { largura: 64, altura: 64 } : { largura: 32, altura: 32 };
}

/**
 * Posição dos pés de cada inimigo.
 * Grandes (≥ 56 px de largura) vão ao fundo à direita; os demais em colunas centralizadas.
 * A posição manual (`posicao`) sempre vence.
 * @returns {Map<string,{x:number,y:number}>}
 */
export function posicoesInimigos(inimigos, chao = CHAO_PADRAO) {
  const posicoes = new Map();
  const centroY = (chao.chaoTopo + chao.chaoBase) / 2;
  const altura = chao.chaoBase - chao.chaoTopo;

  const grandes = inimigos.filter((c) => tamanhoProvisorio(c).largura >= 56);
  const normais = inimigos.filter((c) => tamanhoProvisorio(c).largura < 56);

  // Grandes: x≈420, centralizados na vertical (dois = um acima do outro).
  grandes.forEach((c, i) => {
    const desloc = grandes.length === 1 ? 0 : (i - 0.5) * 44;
    const { altura: h } = tamanhoProvisorio(c);
    posicoes.set(c.id, { x: 420 + chao.inimigoX, y: Math.round(centroY + h / 2 + desloc) });
  });

  // Normais: até 3 → 1 coluna; 4–6 → 2 colunas. Recuam 30 px se houver grande.
  const recuo = grandes.length ? -30 : 0;
  const colunasX = normais.length <= 3 ? [330] : [300, 350];
  const porColuna = Math.ceil(normais.length / colunasX.length);
  colunasX.forEach((xColuna, ci) => {
    const coluna = normais.slice(ci * porColuna, (ci + 1) * porColuna);
    const n = coluna.length;
    // Inimigos de 32 px precisam de um vão entre eles; 40 px de passo deixa 8 px de chão aparecendo.
    const passo = n > 1 ? Math.min(40, altura / (n - 1)) : 0;
    // A segunda coluna fica meio passo abaixo, para ninguém ficar exatamente atrás de outro.
    const meio = ci === 1 && n > 1 ? passo / 2 : 0;
    const y0 = centroY - (passo * (n - 1)) / 2 + 16;
    coluna.forEach((c, i) => {
      posicoes.set(c.id, {
        x: xColuna + recuo + chao.inimigoX,
        y: Math.round(Math.min(chao.chaoBase, y0 + i * passo + meio)),
      });
    });
  });

  for (const c of inimigos) if (c.posicao) posicoes.set(c.id, { ...c.posicao });
  return posicoes;
}
