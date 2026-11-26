// O ESTADO é o objeto que guarda a verdade da mesa: quem está na luta, PV, PM, de quem é a vez…
//
// Regras deste arquivo (ver docs/DECISOES.md):
// - Só a MESA altera o estado, sempre pelas funções pequenas e nomeadas daqui de baixo.
// - O palco NUNCA recebe o estado completo: recebe estadoPublico(estado), que tira os segredos.
// - Nenhuma regra de jogo é calculada aqui. O mestre decide os números; o app só guarda e mostra.

// ───────────────────────── Formatos (documentação com JSDoc) ─────────────────────────

/** @typedef {'lento'|'atordoado'|'fraco'|'abalado'|'enfurecido'|'envenenado'} Condicao */

/**
 * @typedef {Object} Combatente
 * @property {string} id              Identificador sem espaço (também é o nome da pasta da arte).
 * @property {string} nome
 * @property {'heroi'|'inimigo'|'vilao'} lado
 * @property {string} [corAssinatura] Hex, só heróis (ex.: "#e8c170").
 * @property {string|null} sprite     Id da pasta em assets/sprites/ (null = sem arte).
 * @property {string|null} retrato    Id do arquivo em assets/retratos/.
 * @property {'normal'|'grande'} [porte] Só para o desenho provisório de inimigos sem arte.
 * @property {{atual:number,max:number}} pv
 * @property {{atual:number,max:number}} pm
 * @property {{atual:number,max:number}} [pi] Pontos de Inventário (heróis).
 * @property {number} turnosPorRodada
 * @property {number} turnosUsados
 * @property {Condicao[]} condicoes
 * @property {'frente'|'tras'|null} [fileira]  Só visual (heróis).
 * @property {number|null} [posFileira]        Ordem dentro da fileira (0 = em cima).
 * @property {number} [ordemPainel]            Posição da linha no painel de status.
 * @property {'desliza'|'fade'|'surge'|'pose'} [entrada]
 * @property {string|null} [pose]              null = automática pelo PV.
 * @property {boolean} revelado
 * @property {boolean} mostrarPv               Regra da casa: mostra o PV ATUAL do inimigo.
 * @property {{nivel:7|10|13, por:string}|null} [estudo]
 * @property {Object} [fichaInimigo]           Dados que o Estudo revela aos poucos (escritos pelo mestre).
 * @property {{x:number,y:number}|null} [posicao] Posição manual de inimigo (vence a automática).
 * @property {{id:string,nome:string,proprio?:boolean}[]} [menu] Menu JRPG do herói.
 * @property {Object<string,string[]>} [submenu] Itens com nome por ação (ex.: feitico: ["Chama"]).
 * @property {string} [anotacoes]              Só o mestre vê. Nunca vai ao palco.
 */

/**
 * @typedef {Object} Estado
 * @property {number} versao
 * @property {'cortina'|'combate'} modo  (janeiro: "cena")
 * @property {{texto:string}} cortina
 * @property {string} cenario
 * @property {number} rodada               0 = combate não iniciado.
 * @property {'herois'|'inimigos'} ladoDaVez
 * @property {string|null} agindoId
 * @property {{acao:string,item:string|null}|null} acaoDestacada
 * @property {{texto:string,cor:string}|null} banner
 * @property {Combatente[]} combatentes
 * @property {{id:number,alvoId:string,tipo:'dano'|'cura'|'pm'|'condicao',valor:number|string,em:number}[]} efeitos
 * @property {number} proximoEfeito       Contador para dar id único aos efeitos.
 */
// Reservado (NÃO implementar agora): cena (janeiro), pedidos (jogadores pedem), cutscene.
// As FICHAS dos jogadores (Marco 5) ficam FORA deste estado, em fichas/{heroiId} no serviço
// online. Formato proposto em docs/SPEC.md ("Formato dos dados"). A mesa vai ler e escrever
// nelas PV, PM, PI, PF e condições; por isso os nomes desses campos aqui são os mesmos de lá.

export const CONDICOES = ['lento', 'atordoado', 'fraco', 'abalado', 'enfurecido', 'envenenado'];

/** As 10 ações do livro (p. 66–67). Só os nomes (rótulos); nenhum texto do livro. */
export const ACOES_PADRAO = [
  { id: 'ataque', nome: 'Ataque' },
  { id: 'poder', nome: 'Poder' },
  { id: 'feitico', nome: 'Feitiço' },
  { id: 'estudo', nome: 'Estudo' },
  { id: 'guarda', nome: 'Guarda' },
  { id: 'impedimento', nome: 'Impedimento' },
  { id: 'objetivo', nome: 'Objetivo' },
  { id: 'inventario', nome: 'Inventário' },
  { id: 'equipamento', nome: 'Equipamento' },
  { id: 'outro', nome: 'Outro' },
];

// ───────────────────────── Estado de exemplo (Marco 1) ─────────────────────────

/**
 * Um combate falso para testar o palco sem arte: 3 heróis e 2 inimigos (um não revelado).
 * Nomes tirados das prévias; todos provisórios.
 * @returns {Estado}
 */
export function criarEstadoExemplo() {
  /** @param {Partial<Combatente>} dados @returns {Combatente} */
  const heroi = (dados) => ({
    lado: 'heroi', sprite: null, retrato: null,
    pm: { atual: 30, max: 30 }, pi: { atual: 3, max: 6 },
    turnosPorRodada: 1, turnosUsados: 0, condicoes: [],
    fileira: null, posFileira: null, entrada: 'desliza', pose: null,
    revelado: true, mostrarPv: true, estudo: null, posicao: null,
    menu: ACOES_PADRAO.slice(0, 5), submenu: {}, anotacoes: '',
    ...dados,
  });
  /** @param {Partial<Combatente>} dados @returns {Combatente} */
  const inimigo = (dados) => ({
    lado: 'inimigo', sprite: null, retrato: null, porte: 'normal',
    pm: { atual: 10, max: 10 },
    turnosPorRodada: 1, turnosUsados: 0, condicoes: [],
    entrada: 'fade', pose: null,
    revelado: true, mostrarPv: false, estudo: null, fichaInimigo: {}, posicao: null, anotacoes: '',
    ...dados,
  });

  return {
    versao: 1,
    modo: 'combate',
    cortina: { texto: 'Preparando o combate…' },
    cenario: 'padrao',
    rodada: 1,
    ladoDaVez: 'herois',
    agindoId: 'jonaz',
    acaoDestacada: { acao: 'feitico', item: 'Chama' },
    banner: null,
    combatentes: [
      heroi({
        id: 'edu', nome: 'Edu', corAssinatura: '#da863e', ordemPainel: 0,
        pv: { atual: 48, max: 60 }, pm: { atual: 22, max: 40 },
      }),
      heroi({
        id: 'jonaz', nome: 'Jonaz', corAssinatura: '#4f8fba', ordemPainel: 1,
        pv: { atual: 18, max: 52 }, pm: { atual: 16, max: 40 }, pi: { atual: 1, max: 6 },
        condicoes: ['lento'],
        menu: [
          ACOES_PADRAO[0], ACOES_PADRAO[2],
          { id: 'provocar', nome: 'Provocar', proprio: true },
          ACOES_PADRAO[4], ACOES_PADRAO[3], ACOES_PADRAO[7],
        ],
        submenu: { feitico: ['Chama', 'Gelo', 'Purificação'] },
      }),
      heroi({
        id: 'pedro', nome: 'Pedro', corAssinatura: '#a8ca58', ordemPainel: 2,
        pv: { atual: 42, max: 55 }, pi: { atual: 2, max: 6 },
      }),
      inimigo({
        id: 'espectro-a', nome: 'Espectro A', revelado: true,
        pv: { atual: 30, max: 30 },
        estudo: { nivel: 7, por: 'edu' },
        fichaInimigo: { patente: 'soldado', especie: 'espírito', tracos: '[texto do mestre]' },
        anotacoes: 'Foge quando ficar sozinho.',
      }),
      inimigo({
        id: 'guardiao-marco', nome: 'Guardião do Marco', lado: 'vilao', porte: 'grande',
        revelado: false, turnosPorRodada: 2,
        pv: { atual: 126, max: 126 }, pm: { atual: 60, max: 60 },
        anotacoes: 'Segredo: desperta na fase 2.',
      }),
    ],
    efeitos: [],
    proximoEfeito: 1,
  };
}

// ───────────────────────── Funções que alteram o estado ─────────────────────────
// Cada uma muda UMA coisa. A mesa chama a função e depois envia o estado público ao palco.

/** Procura um combatente pelo id (ou dá erro claro, para o bug aparecer logo). */
export function acharCombatente(estado, id) {
  const c = estado.combatentes.find((x) => x.id === id);
  if (!c) throw new Error(`Combatente não encontrado: ${id}`);
  return c;
}

/** Mantém um número entre um mínimo e um máximo. */
function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

/** Guarda um número flutuante para o palco mostrar (só os 20 últimos ficam). */
function registrarEfeito(estado, alvoId, tipo, valor) {
  estado.efeitos.push({ id: estado.proximoEfeito++, alvoId, tipo, valor, em: Date.now() });
  if (estado.efeitos.length > 20) estado.efeitos.shift();
}

/** Tira PV (trava em 0). */
export function aplicarDano(estado, id, valor) {
  const c = acharCombatente(estado, id);
  c.pv.atual = limitar(c.pv.atual - valor, 0, c.pv.max);
  registrarEfeito(estado, id, 'dano', valor);
}

/** Devolve PV (trava no máximo). */
export function aplicarCura(estado, id, valor) {
  const c = acharCombatente(estado, id);
  c.pv.atual = limitar(c.pv.atual + valor, 0, c.pv.max);
  registrarEfeito(estado, id, 'cura', valor);
}

/** Gasta PM (valor positivo) ou recupera (valor negativo). */
export function alterarPm(estado, id, gasto) {
  const c = acharCombatente(estado, id);
  c.pm.atual = limitar(c.pm.atual - gasto, 0, c.pm.max);
  registrarEfeito(estado, id, 'pm', -gasto);
}

/** Liga ou desliga uma condição. */
export function alternarCondicao(estado, id, condicao) {
  const c = acharCombatente(estado, id);
  if (c.condicoes.includes(condicao)) {
    c.condicoes = c.condicoes.filter((x) => x !== condicao);
  } else {
    c.condicoes.push(condicao);
    registrarEfeito(estado, id, 'condicao', condicao);
  }
}

/** Marca quem está agindo agora (null = ninguém). */
export function definirAgindo(estado, id) {
  estado.agindoId = id;
  estado.acaoDestacada = null;
}

/** Troca o lado da vez. */
export function definirLadoDaVez(estado, lado) {
  estado.ladoDaVez = lado;
}

/** Gasta um turno de quem está agindo e limpa o destaque. */
export function encerrarTurno(estado) {
  if (!estado.agindoId) return;
  const c = acharCombatente(estado, estado.agindoId);
  c.turnosUsados = Math.min(c.turnosUsados + 1, c.turnosPorRodada);
  estado.agindoId = null;
  estado.acaoDestacada = null;
  estado.banner = null;
}

/** Começa uma nova rodada: todo mundo volta a ter os turnos. */
export function novaRodada(estado) {
  estado.rodada += 1;
  for (const c of estado.combatentes) c.turnosUsados = 0;
  estado.agindoId = null;
  estado.acaoDestacada = null;
  estado.banner = null;
}

/** Revela (ou volta a esconder) um inimigo. */
export function definirRevelado(estado, id, revelado) {
  acharCombatente(estado, id).revelado = revelado;
}

/** Destaca uma ação no menu do herói que está agindo (item = nome do submenu ou null). */
export function destacarAcao(estado, acao, item = null) {
  estado.acaoDestacada = acao ? { acao, item } : null;
}

/** Mostra uma mensagem na fita (banner). cor = cor da borda (de quem age). */
export function mostrarBanner(estado, texto, cor) {
  estado.banner = texto ? { texto, cor } : null;
}

/** Troca entre cortina e combate. */
export function definirModo(estado, modo) {
  estado.modo = modo;
}

// ───────────────────────── O filtro de segredos ─────────────────────────

/** O que cada nível de Estudo revela (p. 319). Os textos são sempre escritos pelo mestre. */
const REVELADO_POR_ESTUDO = {
  7: ['patente', 'especie'],
  10: ['patente', 'especie', 'tracos', 'atributos', 'defesa', 'defesaMagica', 'afinidades'],
  13: ['patente', 'especie', 'tracos', 'atributos', 'defesa', 'defesaMagica', 'afinidades', 'ataques', 'feiticos'],
};

/**
 * Monta a versão do estado que PODE ir para os jogadores.
 * Função "pura": não altera o estado original, só devolve uma cópia filtrada.
 *
 * O que sai daqui:
 * - Modo cortina: só a cortina.
 * - Inimigo não revelado: id trocado por um id neutro, nome "???", sem PV, sem ficha.
 * - Inimigo revelado: PV atual só se "mostrar PV" estiver ligado; PV/PM máximos só com Estudo 7+;
 *   o resto da ficha só até o nível de Estudo alcançado.
 * - Anotações do mestre: nunca.
 * @param {Estado} estado
 */
export function estadoPublico(estado) {
  if (estado.modo === 'cortina') {
    return { versao: estado.versao, modo: 'cortina', cortina: { texto: estado.cortina.texto } };
  }

  // Inimigos escondidos ganham ids neutros ("oculto-1"), senão o id ("guardiao-marco") contaria quem é.
  const idPublico = new Map();
  let ocultos = 0;
  for (const c of estado.combatentes) {
    idPublico.set(c.id, c.lado !== 'heroi' && !c.revelado ? `oculto-${++ocultos}` : c.id);
  }

  const combatentes = estado.combatentes.map((c) => {
    const comum = {
      id: idPublico.get(c.id),
      turnosPorRodada: c.turnosPorRodada,
      turnosUsados: c.turnosUsados,
      condicoes: [...c.condicoes],
      entrada: c.entrada,
      pose: c.pose,
      posicao: c.posicao ? { ...c.posicao } : null,
    };

    if (c.lado === 'heroi') {
      return {
        ...comum,
        nome: c.nome, lado: c.lado, corAssinatura: c.corAssinatura,
        sprite: c.sprite, retrato: c.retrato,
        pv: { ...c.pv }, pm: { ...c.pm }, pi: c.pi ? { ...c.pi } : null,
        fileira: c.fileira, posFileira: c.posFileira, ordemPainel: c.ordemPainel,
        menu: c.menu.map((m) => ({ ...m })),
        submenu: structuredClone(c.submenu),
        revelado: true,
      };
    }

    if (!c.revelado) {
      // Escondido: "inimigo" mesmo se for vilão (a moldura vinho também contaria).
      // ATENÇÃO: o sprite vai junto para desenhar a silhueta. Ver DECISOES (nome do arquivo).
      return { ...comum, nome: '???', lado: 'inimigo', revelado: false, sprite: c.sprite, porte: c.porte };
    }

    const nivel = c.estudo?.nivel ?? 0;
    /** @type {Object<string, any>} */
    const cartao = {};
    for (const campo of REVELADO_POR_ESTUDO[nivel] ?? []) {
      if (c.fichaInimigo?.[campo] !== undefined) cartao[campo] = structuredClone(c.fichaInimigo[campo]);
    }
    return {
      ...comum,
      nome: c.nome, lado: c.lado, revelado: true, sprite: c.sprite, retrato: c.retrato, porte: c.porte,
      nivelEstudo: nivel,
      pvMax: nivel >= 7 ? c.pv.max : null,
      pmMax: nivel >= 7 ? c.pm.max : null,
      pvAtual: c.mostrarPv && nivel >= 7 ? c.pv.atual : null,
      cartao,
    };
  });

  return {
    versao: estado.versao,
    modo: estado.modo,
    cenario: estado.cenario,
    rodada: estado.rodada,
    ladoDaVez: estado.ladoDaVez,
    agindoId: estado.agindoId ? idPublico.get(estado.agindoId) : null,
    acaoDestacada: estado.acaoDestacada ? { ...estado.acaoDestacada } : null,
    banner: estado.banner ? { ...estado.banner } : null,
    combatentes,
    efeitos: estado.efeitos.map((e) => ({ ...e, alvoId: idPublico.get(e.alvoId) ?? e.alvoId })),
  };
}
