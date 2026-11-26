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
 * @property {string} [jogador]       Quem joga com o herói (só aparece na mesa).
 * @property {'heroi'|'inimigo'|'vilao'} lado
 * @property {string} [corAssinatura] Hex, só heróis (ex.: "#e8c170").
 * @property {string|null} sprite     Id da pasta em assets/sprites/ (null = sem arte).
 * @property {string|null} retrato    Id do arquivo em assets/retratos/.
 * @property {'normal'|'grande'} [porte] Só para o desenho provisório de inimigos sem arte.
 * @property {{atual:number,max:number}} pv
 * @property {{atual:number,max:number}} pm
 * @property {{atual:number,max:number}|null} [pi] Pontos de Inventário (heróis).
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
 * @property {{nivel:7|10|13, por:string|null}|null} [estudo]
 * @property {Object} [fichaInimigo]           Dados que o Estudo revela aos poucos (escritos pelo mestre).
 * @property {{x:number,y:number}|null} [posicao] Posição manual de inimigo (vence a automática).
 * @property {{id:string,nome:string,proprio?:boolean}[]} [menu] Menu JRPG do herói.
 * @property {Object<string,string[]>} [submenu] Itens com nome por ação (ex.: feitico: ["Chama"]).
 * @property {boolean} [chegaNoFim]            Marcado para entrar no fim da rodada (ainda fora do campo).
 * @property {string} [anotacoes]              Só o mestre vê. Nunca vai ao palco.
 */

/**
 * @typedef {Object} Aviso
 * @property {string} titulo
 * @property {string} linha
 * @property {'neutro'|'dourado'|'vermelho'|'vinho'|'sombrio'} tom
 * @property {number|null} duracao  Segundos até sumir sozinho; null = até o mestre fechar.
 * @property {number} [em]          Quando apareceu (para o palco animar só uma vez).
 */

/**
 * @typedef {Object} Estado
 * @property {number} versao
 * @property {number} sessao
 * @property {'cortina'|'combate'} modo  (janeiro: "cena")
 * @property {{nomeCampanha:string,rotulo:string,linha:string,autor:string,proximaSessao:string}} cortina
 * @property {string} cenario              Id em dados/cenarios.json.
 * @property {Object<string,{chaoTopo:number,chaoBase:number,heroiX:number,inimigoX:number}>} chaos
 *           Ajustes de chão feitos no editor de cenário (vencem os do arquivo).
 * @property {string|null} cenaId          Id em dados/cenas.json (frases de ambiente e avisos prontos).
 * @property {number} rodada               0 = combate não iniciado.
 * @property {'herois'|'inimigos'} ladoDaVez
 * @property {'herois'|'inimigos'} ladoIniciativa  Quem venceu a iniciativa (começa toda rodada).
 * @property {string|null} agindoId
 * @property {{acao:string,item:string|null}|null} acaoDestacada
 * @property {string[]} alvos              Alvos marcados na ação (cursor ▶ no palco).
 * @property {{texto:string,cor:string,estilo:'acao'|'efeito'}|null} banner
 * @property {{falanteId:string|null,texto:string}|null} dialogo
 * @property {Aviso|null} aviso
 * @property {1|2|3} fase                  Fase do chefe (escolhe as frases de efeito).
 * @property {{tipo:string,titulo:string,texto:string,em:number}|null} fim  Fim do combate.
 * @property {Combatente[]} combatentes
 * @property {{id:number,alvoId:string,tipo:'dano'|'cura'|'pm'|'condicao'|'texto',valor:number|string,em:number}[]} efeitos
 * @property {number} proximoEfeito
 * @property {Aviso[]} avisosProntos       Avisos criados na mesa (além dos da cena).
 * @property {{em:number,texto:string}[]} historico  Só na mesa.
 * @property {{segundosParado:number}} opcoes
 */
// Reservado (NÃO implementar agora): cena (janeiro), pedidos (jogadores pedem), cutscene.
// As FICHAS dos jogadores (Marco 5) ficam FORA deste estado, em fichas/{heroiId} no serviço
// online. Formato proposto em docs/SPEC.md ("Formato dos dados"). A mesa vai ler e escrever
// nelas PV, PM, PI, PF e condições; por isso os nomes desses campos aqui são os mesmos de lá.

export const VERSAO = 2;

export const CONDICOES = ['lento', 'atordoado', 'fraco', 'abalado', 'enfurecido', 'envenenado'];

/** Nomes das condições como aparecem na tela (termos do livro, p. 94). */
export const NOMES_CONDICOES = {
  lento: 'Lento', atordoado: 'Atordoado', fraco: 'Fraco',
  abalado: 'Abalado', enfurecido: 'Enfurecido', envenenado: 'Envenenado',
};

/** Os tipos de dano do livro (só os nomes) + CURA, para a ação rápida. */
export const TIPOS = ['físico', 'ar', 'raio', 'fogo', 'gelo', 'terra', 'luz', 'sombra', 'veneno', 'cura'];

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

/** Limites da mesa (decisão do Cadu, pela fluidez). */
export const MAX_HEROIS = 8;
export const MAX_INIMIGOS = 6;

// ───────────────────────── Fábricas (combatentes com os campos padrão) ─────────────────────────

/** @param {Partial<Combatente>} dados @returns {Combatente} */
export function novoHeroi(dados) {
  return {
    lado: 'heroi', jogador: '', sprite: null, retrato: null,
    pv: { atual: 40, max: 40 }, pm: { atual: 40, max: 40 }, pi: { atual: 6, max: 6 },
    turnosPorRodada: 1, turnosUsados: 0, condicoes: [],
    fileira: null, posFileira: null, ordemPainel: 0, entrada: 'desliza', pose: null,
    revelado: true, mostrarPv: true, estudo: null, posicao: null,
    menu: ACOES_PADRAO.map((a) => ({ ...a })), submenu: {}, chegaNoFim: false, anotacoes: '',
    ...structuredClone(dados),
  };
}

/** @param {Partial<Combatente>} dados @returns {Combatente} */
export function novoInimigo(dados) {
  return {
    lado: 'inimigo', sprite: null, retrato: null, porte: 'normal',
    pv: { atual: 30, max: 30 }, pm: { atual: 10, max: 10 }, pi: null,
    turnosPorRodada: 1, turnosUsados: 0, condicoes: [],
    entrada: 'fade', pose: null,
    revelado: true, mostrarPv: false, estudo: null, fichaInimigo: {}, posicao: null,
    chegaNoFim: false, anotacoes: '',
    ...structuredClone(dados),
  };
}

/** Estado sem ninguém, na cortina. */
export function criarEstadoVazio() {
  return {
    versao: VERSAO,
    sessao: 1,
    modo: 'cortina',
    cortina: { nomeCampanha: 'Errantes', rotulo: '', linha: '[texto do mestre]', autor: '', proximaSessao: '' },
    cenario: 'padrao',
    chaos: {},
    cenaId: null,
    rodada: 0,
    ladoDaVez: 'herois',
    ladoIniciativa: 'herois',
    agindoId: null,
    acaoDestacada: null,
    alvos: [],
    banner: null,
    dialogo: null,
    aviso: null,
    fase: 1,
    fim: null,
    combatentes: [],
    efeitos: [],
    proximoEfeito: 1,
    avisosProntos: [],
    historico: [],
    opcoes: { segundosParado: 40 },
  };
}

/**
 * Um combate de exemplo (nomes das prévias, todos provisórios): 5 heróis, 3 Espectros e o
 * Guardião do Marco escondido, com 2 turnos por rodada.
 * @returns {Estado}
 */
export function criarEstadoExemplo() {
  const e = criarEstadoVazio();
  e.modo = 'combate';
  e.rodada = 1;
  e.cenaId = 'bosque-marco';
  const herois = [
    ['joshua', 'Joshua', 'Edu', '#da863e', 48, 60, 24, 40],
    ['nue', 'Nue', 'Jonaz', '#a4dddb', 18, 60, 22, 40],
    ['drake', 'Drake', 'Pedro', '#a8ca58', 42, 60, 20, 40],
    ['feitan', 'Feitan', 'Feitan', '#df84a5', 60, 60, 32, 40],
    ['alienx', 'AlienX', 'AlienX', '#4f8fba', 36, 60, 18, 40],
  ];
  herois.forEach(([id, nome, jogador, cor, pv, pvMax, pm, pmMax], i) =>
    e.combatentes.push(
      novoHeroi({ id, nome, jogador, corAssinatura: cor, ordemPainel: i, pv: { atual: pv, max: pvMax }, pm: { atual: pm, max: pmMax } }),
    ),
  );
  const nue = e.combatentes[1];
  nue.condicoes = ['lento'];
  nue.submenu = { feitico: ['Chama', 'Gelo', 'Purificação'] };
  e.combatentes[0].menu.splice(2, 0, { id: 'provocar', nome: 'Provocar', proprio: true });

  for (const letra of ['A', 'B', 'C']) {
    e.combatentes.push(novoInimigo({ id: `espectro-${letra.toLowerCase()}`, nome: `Espectro ${letra}`, fichaInimigo: { patente: 'soldado', especie: 'espírito' } }));
  }
  e.combatentes.push(
    novoInimigo({
      id: 'guardiao-marco', nome: 'Guardião do Marco', lado: 'vilao', porte: 'grande',
      revelado: false, turnosPorRodada: 2, pv: { atual: 126, max: 180 }, pm: { atual: 60, max: 60 },
      anotacoes: 'Segredo: desperta na fase 2.',
    }),
  );
  return e;
}

/**
 * Atualiza um estado salvo de uma versão antiga, para não perder nada ao abrir.
 * @param {any} salvo
 * @returns {Estado}
 */
export function migrar(salvo) {
  const base = criarEstadoVazio();
  const e = { ...base, ...salvo, versao: VERSAO };
  if (typeof e.cortina?.texto === 'string' && !e.cortina.linha) {
    e.cortina = { ...base.cortina, linha: e.cortina.texto };
  }
  e.cortina = { ...base.cortina, ...e.cortina };
  e.opcoes = { ...base.opcoes, ...e.opcoes };
  e.combatentes = (e.combatentes ?? []).map((c) => (c.lado === 'heroi' ? novoHeroi(c) : novoInimigo(c)));
  return e;
}

// ───────────────────────── Leitura (não altera nada) ─────────────────────────

/** Procura um combatente pelo id (ou dá erro claro, para o bug aparecer logo). */
export function acharCombatente(estado, id) {
  const c = estado.combatentes.find((x) => x.id === id);
  if (!c) throw new Error(`Combatente não encontrado: ${id}`);
  return c;
}

/** Quem está no campo (sem os que só chegam no fim da rodada). */
export function emCampo(estado) {
  return estado.combatentes.filter((c) => !c.chegaNoFim);
}

/** Ainda tem turno nesta rodada? */
export function temTurno(c) {
  return c.turnosUsados < c.turnosPorRodada && c.pv.atual > 0;
}

/** Lado de um combatente na contagem de turnos. */
export function ladoDe(c) {
  return c.lado === 'heroi' ? 'herois' : 'inimigos';
}

/** Nome que os jogadores podem ver ("???" se o inimigo está escondido). */
export function nomePublico(c) {
  return c.lado !== 'heroi' && !c.revelado ? '???' : c.nome;
}

/** Junta nomes: "A", "A e B", "A, B e C". */
export function juntarNomes(nomes) {
  if (nomes.length <= 1) return nomes.join('');
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
}

/**
 * Sugestão de quem joga depois de um turno (p. 58–62): o outro lado, se ainda tiver alguém
 * com turno; senão, o mesmo lado; se ninguém tiver turno, null (hora de fechar a rodada).
 * É só sugestão: o mestre pode escolher outro.
 */
export function sugerirProximoLado(estado) {
  const campo = emCampo(estado);
  const outro = estado.ladoDaVez === 'herois' ? 'inimigos' : 'herois';
  const tem = (lado) => campo.some((c) => ladoDe(c) === lado && temTurno(c));
  if (tem(outro)) return outro;
  if (tem(estado.ladoDaVez)) return estado.ladoDaVez;
  return null;
}

// ───────────────────────── Funções que alteram o estado ─────────────────────────
// Cada uma muda UMA coisa. A mesa chama a função e depois envia o estado público ao palco.

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

/** Guarda um número flutuante para o palco mostrar (só os 20 últimos ficam). */
function registrarEfeito(estado, alvoId, tipo, valor) {
  estado.efeitos.push({ id: estado.proximoEfeito++, alvoId, tipo, valor, em: Date.now() });
  if (estado.efeitos.length > 20) estado.efeitos.shift();
}

/** Anota no histórico da mesa (só o mestre vê). */
export function registrarHistorico(estado, texto) {
  estado.historico.unshift({ em: Date.now(), texto });
  if (estado.historico.length > 60) estado.historico.pop();
}

/** Tira PV (trava em 0). */
export function aplicarDano(estado, id, valor) {
  const c = acharCombatente(estado, id);
  c.pv.atual = limitar(c.pv.atual - valor, 0, c.pv.max);
  registrarEfeito(estado, id, 'dano', valor);
  registrarHistorico(estado, `${c.nome}: −${valor} PV (${c.pv.atual}/${c.pv.max})`);
}

/** Devolve PV (trava no máximo). */
export function aplicarCura(estado, id, valor) {
  const c = acharCombatente(estado, id);
  c.pv.atual = limitar(c.pv.atual + valor, 0, c.pv.max);
  registrarEfeito(estado, id, 'cura', valor);
  registrarHistorico(estado, `${c.nome}: +${valor} PV (${c.pv.atual}/${c.pv.max})`);
}

/** Gasta PM (valor positivo) ou recupera (valor negativo). */
export function alterarPm(estado, id, gasto) {
  const c = acharCombatente(estado, id);
  c.pm.atual = limitar(c.pm.atual - gasto, 0, c.pm.max);
  registrarEfeito(estado, id, 'pm', -gasto);
  registrarHistorico(estado, `${c.nome}: ${gasto > 0 ? '−' : '+'}${Math.abs(gasto)} PM (${c.pm.atual}/${c.pm.max})`);
}

/** Muda um recurso direto para um número (o mestre digitou "atual" ou "máximo"). */
export function definirRecurso(estado, id, recurso, campo, valor) {
  const c = acharCombatente(estado, id);
  const r = c[recurso];
  if (!r) return;
  const v = Math.max(0, Math.round(Number(valor) || 0));
  if (campo === 'max') {
    r.max = v;
    r.atual = Math.min(r.atual, v);
  } else {
    r.atual = Math.min(v, r.max);
  }
}

/** Liga ou desliga uma condição. */
export function alternarCondicao(estado, id, condicao) {
  const c = acharCombatente(estado, id);
  if (c.condicoes.includes(condicao)) {
    c.condicoes = c.condicoes.filter((x) => x !== condicao);
    registrarHistorico(estado, `${c.nome}: sem ${NOMES_CONDICOES[condicao]}`);
  } else {
    c.condicoes.push(condicao);
    registrarEfeito(estado, id, 'condicao', condicao);
    registrarHistorico(estado, `${c.nome}: ${NOMES_CONDICOES[condicao]}`);
  }
}

/** Marca quem está agindo agora (null = ninguém). Muda a vez para o lado dele. */
export function definirAgindo(estado, id) {
  estado.agindoId = id;
  estado.acaoDestacada = null;
  estado.alvos = [];
  if (id) estado.ladoDaVez = ladoDe(acharCombatente(estado, id));
}

/** Troca o lado da vez. */
export function definirLadoDaVez(estado, lado) {
  estado.ladoDaVez = lado;
  if (estado.agindoId && ladoDe(acharCombatente(estado, estado.agindoId)) !== lado) {
    estado.agindoId = null;
    estado.acaoDestacada = null;
  }
}

/** Começa o combate: rodada 1, o lado que venceu a iniciativa começa (p. 61). */
export function iniciarCombate(estado, ladoIniciativa) {
  estado.modo = 'combate';
  estado.rodada = 1;
  estado.fase = 1;
  estado.fim = null;
  estado.ladoIniciativa = ladoIniciativa;
  estado.ladoDaVez = ladoIniciativa;
  estado.agindoId = null;
  estado.acaoDestacada = null;
  estado.alvos = [];
  estado.banner = null;
  estado.aviso = null;
  for (const c of estado.combatentes) c.turnosUsados = 0;
  registrarHistorico(estado, `Combate iniciado (começam os ${ladoIniciativa === 'herois' ? 'heróis' : 'inimigos'})`);
}

/**
 * Gasta um turno de quem está agindo, limpa o destaque e passa a vez para o lado sugerido.
 * @returns {'herois'|'inimigos'|null} o lado sugerido (null = todos já agiram)
 */
export function encerrarTurno(estado) {
  if (estado.agindoId) {
    const c = acharCombatente(estado, estado.agindoId);
    c.turnosUsados = Math.min(c.turnosUsados + 1, c.turnosPorRodada);
    registrarHistorico(estado, `${c.nome} encerra o turno`);
  }
  estado.agindoId = null;
  estado.acaoDestacada = null;
  estado.alvos = [];
  estado.banner = null;
  const sugestao = sugerirProximoLado(estado);
  if (sugestao) estado.ladoDaVez = sugestao;
  return sugestao;
}

/**
 * Fecha a rodada: todos voltam a ter turnos, o lado da iniciativa começa,
 * e quem estava marcado para "chegar no fim da rodada" entra (p. 60).
 * @returns {Combatente[]} quem chegou
 */
export function fimDaRodada(estado) {
  estado.rodada += 1;
  for (const c of estado.combatentes) c.turnosUsados = 0;
  estado.agindoId = null;
  estado.acaoDestacada = null;
  estado.alvos = [];
  estado.banner = null;
  estado.ladoDaVez = estado.ladoIniciativa;
  const chegaram = estado.combatentes.filter((c) => c.chegaNoFim);
  for (const c of chegaram) c.chegaNoFim = false;
  registrarHistorico(estado, `Rodada ${estado.rodada}`);
  if (chegaram.length) {
    const nomes = juntarNomes(chegaram.map(nomePublico));
    estado.aviso = { titulo: `${nomes} ${chegaram.length > 1 ? 'chegaram' : 'chegou'}!`, linha: '', tom: 'neutro', duracao: 3, em: Date.now() };
  }
  return chegaram;
}

/** Revela (ou volta a esconder) um inimigo. */
export function definirRevelado(estado, id, revelado) {
  const c = acharCombatente(estado, id);
  c.revelado = revelado;
  registrarHistorico(estado, `${c.nome} ${revelado ? 'revelado' : 'escondido'}`);
}

/** Nível de Estudo alcançado pelo grupo num inimigo (null = nenhum). */
export function definirEstudo(estado, id, nivel, por = null) {
  const c = acharCombatente(estado, id);
  c.estudo = nivel ? { nivel, por } : null;
}

/** Liga/desliga "mostrar PV" (regra da casa). */
export function definirMostrarPv(estado, id, mostrar) {
  acharCombatente(estado, id).mostrarPv = mostrar;
}

/** Destaca uma ação no menu do herói que está agindo (item = nome do submenu ou null). */
export function destacarAcao(estado, acao, item = null) {
  estado.acaoDestacada = acao ? { acao, item } : null;
}

/** Marca os alvos (cursor ▶ no palco). */
export function definirAlvos(estado, ids) {
  estado.alvos = [...ids];
}

/** Mostra uma mensagem na fita. estilo "acao" (borda na cor de quem age) ou "efeito" (apagado). */
export function mostrarBanner(estado, texto, cor, estilo = 'acao') {
  estado.banner = texto ? { texto, cor, estilo } : null;
}

/** Caixa de diálogo (falante = id de combatente ou null para Narrador). */
export function mostrarDialogo(estado, falanteId, texto) {
  estado.dialogo = texto ? { falanteId, texto } : null;
}

/** Aviso central. null fecha. */
export function mostrarAviso(estado, aviso) {
  estado.aviso = aviso ? { ...aviso, em: Date.now() } : null;
  if (aviso) registrarHistorico(estado, `Aviso: ${aviso.titulo}`);
}

/** Troca entre cortina e combate. */
export function definirModo(estado, modo) {
  estado.modo = modo;
}

/** Textos da cortina. */
export function editarCortina(estado, campos) {
  estado.cortina = { ...estado.cortina, ...campos };
}

/** Fase do chefe (1, 2 ou 3): muda as frases de efeito. */
export function definirFase(estado, fase) {
  estado.fase = fase;
  registrarHistorico(estado, `Fase ${fase}`);
}

/**
 * Encerra o combate com um tipo de fim (o palco faz a animação de cada um).
 * @param {'vitoria'|'fuga'|'acordo'|'rendicao'|'personalizado'} tipo
 */
export function encerrarCombate(estado, tipo, titulo, texto, tom) {
  estado.fim = { tipo, titulo, texto, tom: tom ?? null, em: Date.now() };
  estado.agindoId = null;
  estado.acaoDestacada = null;
  estado.alvos = [];
  estado.banner = null;
  estado.aviso = null;
  registrarHistorico(estado, `Fim do combate: ${titulo}`);
}

/** Depois do fim do combate: "Continuar" volta para a cortina (em janeiro, para a cena). */
export function continuarDepoisDoFim(estado) {
  estado.fim = null;
  estado.modo = 'cortina';
  estado.rodada = 0;
}

/** Escolhe o cenário (id de dados/cenarios.json). */
export function escolherCenario(estado, id) {
  estado.cenario = id;
}

/** Guarda a faixa de chão de um cenário (editor de cenário). */
export function ajustarChao(estado, cenarioId, chao) {
  estado.chaos[cenarioId] = { ...chao };
}

/** Escolhe a cena (frases de ambiente e avisos prontos). */
export function escolherCena(estado, id) {
  estado.cenaId = id;
}

/** Guarda um aviso pronto novo (além dos que vêm da cena). */
export function adicionarAvisoPronto(estado, aviso) {
  estado.avisosProntos.push({ ...aviso });
}

// ── Elenco ──

/** Coloca um combatente na luta (respeitando os limites de 8 heróis e 6 inimigos). */
export function adicionarCombatente(estado, c) {
  const herois = estado.combatentes.filter((x) => x.lado === 'heroi').length;
  const inimigos = estado.combatentes.length - herois;
  if (c.lado === 'heroi' && herois >= MAX_HEROIS) throw new Error(`Máximo de ${MAX_HEROIS} heróis.`);
  if (c.lado !== 'heroi' && inimigos >= MAX_INIMIGOS) throw new Error(`Máximo de ${MAX_INIMIGOS} inimigos.`);
  let id = c.id;
  for (let n = 2; estado.combatentes.some((x) => x.id === id); n++) id = `${c.id}-${n}`;
  const novo = c.lado === 'heroi' ? novoHeroi({ ...c, id }) : novoInimigo({ ...c, id });
  if (novo.lado === 'heroi') novo.ordemPainel = herois;
  estado.combatentes.push(novo);
  registrarHistorico(estado, `${novo.nome} entra no elenco`);
  return novo;
}

/** Tira um combatente da luta. */
export function removerCombatente(estado, id) {
  const c = acharCombatente(estado, id);
  estado.combatentes = estado.combatentes.filter((x) => x.id !== id);
  if (estado.agindoId === id) estado.agindoId = null;
  estado.alvos = estado.alvos.filter((x) => x !== id);
  registrarHistorico(estado, `${c.nome} sai do elenco`);
}

/** Duplica ("Espectro A" → "Espectro B"). */
export function duplicarCombatente(estado, id) {
  const c = acharCombatente(estado, id);
  const copia = structuredClone(c);
  // Se o nome termina numa letra solta ("Espectro A"), a cópia pega a próxima letra livre.
  const m = c.nome.match(/^(.*) ([A-Z])$/);
  if (m) {
    let letra = m[2].charCodeAt(0);
    while (estado.combatentes.some((x) => x.nome === `${m[1]} ${String.fromCharCode(letra)}`)) letra++;
    copia.nome = `${m[1]} ${String.fromCharCode(letra)}`;
  } else {
    copia.nome = `${c.nome} 2`;
  }
  copia.id = copia.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  copia.condicoes = [];
  copia.turnosUsados = 0;
  copia.pv.atual = copia.pv.max;
  copia.posicao = null;
  return adicionarCombatente(estado, copia);
}

/** Edita campos de um combatente (nome, cor, PV máximo…). */
export function editarCombatente(estado, id, campos) {
  Object.assign(acharCombatente(estado, id), structuredClone(campos));
}

/** Troca a fileira de um herói (frente ↔ trás). Só visual. */
export function definirFileira(estado, id, fileira, posFileira) {
  const c = acharCombatente(estado, id);
  c.fileira = fileira;
  c.posFileira = posFileira;
}

/** Reordena o painel de status (lista de ids na ordem nova). */
export function reordenarPainel(estado, ids) {
  ids.forEach((id, i) => (acharCombatente(estado, id).ordemPainel = i));
}

/** Marca/desmarca "entra no fim da rodada". */
export function definirChegaNoFim(estado, id, chega) {
  acharCombatente(estado, id).chegaNoFim = chega;
}

// ── Ação completa (painel AÇÃO da mesa) ──

/**
 * Executa uma ação inteira de uma vez (é isso que o DESFAZER desfaz junto).
 * Nada de regra: o mestre informa quanto de dano, se acertou, qual condição.
 * Como o livro manda (p. 68–69 e 115): quem não é atingido não perde PV nem recebe o efeito.
 * - ACERTOU: atinge cada alvo, menos os marcados com "errou" (no ataque multi, um teste só é
 *   comparado com a Defesa de cada alvo, então dá para acertar um e errar outro).
 * - CRÍTICO: atinge todos. ERROU e FALHA CRÍTICA: erra todos.
 * @param {Estado} estado
 * @param {{quemId:string, acao:string|null, item:string|null, custoPm:number,
 *   alvos:{id:string,valor:number,errou?:boolean}[], resultado:'acertou'|'errou'|'critico'|'falha',
 *   tipo:string, condicao:Condicao|null}} a
 */
export function executarAcao(estado, a) {
  const quem = acharCombatente(estado, a.quemId);
  if (a.custoPm > 0) alterarPm(estado, quem.id, a.custoPm);
  for (const alvo of a.alvos) {
    const atingido = a.resultado === 'critico' || (a.resultado === 'acertou' && !alvo.errou);
    if (!atingido) {
      registrarEfeito(estado, alvo.id, 'texto', a.resultado === 'falha' ? 'Falha!' : 'Errou');
      continue;
    }
    if (alvo.valor > 0) {
      if (a.tipo === 'cura') aplicarCura(estado, alvo.id, alvo.valor);
      else aplicarDano(estado, alvo.id, alvo.valor);
    }
    const c = acharCombatente(estado, alvo.id);
    if (a.condicao && !c.condicoes.includes(a.condicao)) alternarCondicao(estado, alvo.id, a.condicao);
  }
  // Fita: "Nue usa Chama em Espectro A e Espectro B!" (com nomes públicos: "???" não revela ninguém).
  const nomeAcao = a.item || quem.menu?.find((m) => m.id === a.acao)?.nome || ACOES_PADRAO.find((x) => x.id === a.acao)?.nome || '';
  const alvos = a.alvos.map((x) => nomePublico(acharCombatente(estado, x.id)));
  let texto = nomeAcao ? `${nomePublico(quem)} usa ${nomeAcao}` : nomePublico(quem);
  if (alvos.length) texto += ` em ${juntarNomes(alvos)}`;
  texto += a.resultado === 'critico' ? '! Crítico!' : '!';
  estado.banner = { texto, cor: corDe(quem), estilo: 'acao' };
  estado.alvos = [];
  registrarHistorico(estado, texto);
}

/** Cor de quem age (borda da fita). */
export function corDe(c) {
  if (c.lado === 'heroi') return c.corAssinatura;
  if (!c.revelado) return '#a53030';
  return c.lado === 'vilao' ? '#752438' : '#a53030';
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
 * - Quem só "chega no fim da rodada" não aparece (nem o nome).
 * - Anotações do mestre e histórico: nunca.
 * @param {Estado} estado
 * @param {{verTudo?: boolean}} [opcoes] verTudo = prévia "VER COMO MESTRE" na mesa (nunca vai ao canal).
 */
export function estadoPublico(estado, opcoes = {}) {
  if (estado.modo === 'cortina') {
    return { versao: estado.versao, modo: 'cortina', cortina: { ...estado.cortina } };
  }
  const verTudo = !!opcoes.verTudo;
  const escondido = (c) => c.lado !== 'heroi' && !c.revelado && !verTudo;

  const campo = emCampo(estado);
  // Inimigos escondidos ganham ids neutros ("oculto-1"), senão o id ("guardiao-marco") contaria quem é.
  const idPublico = new Map();
  let ocultos = 0;
  for (const c of campo) idPublico.set(c.id, escondido(c) ? `oculto-${++ocultos}` : c.id);

  const combatentes = campo.map((c) => {
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
        menu: (c.menu ?? []).map((m) => ({ ...m })),
        submenu: structuredClone(c.submenu ?? {}),
        revelado: true,
      };
    }

    if (escondido(c)) {
      // Escondido: "inimigo" mesmo se for vilão (a moldura vinho também contaria).
      // ATENÇÃO: o sprite vai junto para desenhar a silhueta. Ver DECISOES (nome do arquivo).
      return { ...comum, nome: '???', lado: 'inimigo', revelado: false, sprite: c.sprite, porte: c.porte };
    }

    const nivel = verTudo ? 13 : (c.estudo?.nivel ?? 0);
    /** @type {Object<string, any>} */
    const cartao = {};
    for (const campoFicha of REVELADO_POR_ESTUDO[nivel] ?? []) {
      if (c.fichaInimigo?.[campoFicha] !== undefined) cartao[campoFicha] = structuredClone(c.fichaInimigo[campoFicha]);
    }
    return {
      ...comum,
      nome: c.nome, lado: c.lado, revelado: true, sprite: c.sprite, retrato: c.retrato, porte: c.porte,
      nivelEstudo: nivel,
      pvMax: nivel >= 7 ? c.pv.max : null,
      pmMax: nivel >= 7 ? c.pm.max : null,
      pvAtual: (c.mostrarPv && nivel >= 7) || verTudo ? c.pv.atual : null,
      cartao,
    };
  });

  // Caixa de diálogo: o falante vai só com nome, cor e retrato (e "???" se estiver escondido).
  let dialogo = null;
  if (estado.dialogo) {
    const f = estado.dialogo.falanteId ? estado.combatentes.find((x) => x.id === estado.dialogo.falanteId) : null;
    dialogo = {
      texto: estado.dialogo.texto,
      falante: f ? { nome: escondido(f) ? '???' : f.nome, cor: corDe(f), retrato: escondido(f) ? null : f.retrato, id: idPublico.get(f.id) ?? null } : null,
    };
  }

  return {
    versao: estado.versao,
    modo: estado.modo,
    cenario: estado.cenario,
    chao: estado.chaos[estado.cenario] ?? null,
    rodada: estado.rodada,
    ladoDaVez: estado.ladoDaVez,
    agindoId: estado.agindoId ? (idPublico.get(estado.agindoId) ?? null) : null,
    acaoDestacada: estado.acaoDestacada ? { ...estado.acaoDestacada } : null,
    alvos: estado.alvos.map((id) => idPublico.get(id)).filter(Boolean),
    banner: estado.banner ? { ...estado.banner } : null,
    dialogo,
    aviso: estado.aviso ? { ...estado.aviso } : null,
    fim: estado.fim ? { ...estado.fim } : null,
    combatentes,
    efeitos: estado.efeitos
      .filter((e) => idPublico.has(e.alvoId))
      .map((e) => ({ ...e, alvoId: idPublico.get(e.alvoId) })),
  };
}
