# Prompt para o Claude Code: VTT para Fabula Ultima, etapa 1

> Cole tudo abaixo no Claude Code, numa pasta vazia. No passo 0 ele salva este texto como `docs/SPEC.md` no repositório.

---

## Quem sou e como vamos trabalhar

Sou o Cadu. Mestro Fabula Ultima para um grupo de amigos (voz no Discord) e quero meu próprio VTT (mesa virtual) com tela no estilo JRPG clássico (Final Fantasy VI, Chrono Trigger) e pixel art desenhada por mim. Vou cursar Ciência da Computação, então o projeto também é portfólio.

**Meu nível: zero.** Nunca programei. Já fiz um site com o Claude Code, mas sem entender o código.

**Modo de trabalho: "construção agora, aula depois".** Quero uma primeira versão usável na mesa em dezembro. Então, neste momento:
- **Você constrói**, rápido e bem feito. Eu testo, aprovo e faço o que só eu posso fazer (instalar programas, criar contas, fazer login, clicar em painéis).
- **A aula fica para janeiro**, mas o terreno tem que ficar pronto para ela:
  1. Código limpo, organizado e com comentários em português explicando o porquê.
  2. `docs/DECISOES.md`: cada decisão técnica com o motivo, em linguagem de iniciante, atualizado a cada marco.
  3. `docs/GLOSSARIO.md`: cada termo técnico que apareceu, explicado em 1–2 frases.
  4. Commits pequenos, com mensagens claras em português (ex.: `palco: barras de PV e PM`).
  5. No fim, `docs/TOUR.md`: um roteiro de leitura do meu próprio código, em ordem, para eu estudar em janeiro.
- **Explicação curta, sempre:** ao começar algo, 2–3 linhas do que vai fazer; ao terminar, 3–5 linhas do que mudou e como eu testo. Sem mini-aula agora.
- **Comigo, passo a passo e sem jargão** sempre que EU precisar agir: o que digitar, onde, e o que deve aparecer se deu certo. Eu nunca abri um terminal de verdade.
- **Código:** simples por padrão. Se a versão simples prejudicar o funcionamento (bug, lentidão, fragilidade), use a mais esperta e registre em `DECISOES.md` por que, para eu estudar depois.
- **Dependências:** só o necessário, cada uma justificada em uma frase no `DECISOES.md`. Previstas: Vite (dev e build) e o SDK do serviço de tempo real.
- **Pergunte quando a especificação não cobrir algo.** Não invente regra de jogo. Pode discordar da especificação; eu prefiro.
- **Pare e me mostre** ao fim de cada marco (lista no fim), para eu testar antes de seguir.

### Conteúdo dos livros e licença
O projeto segue a Fabula Ultima Third-Party Tabletop License 1.0 (need.games/fabula-ultima), que permite VTTs.
- Termos de jogo (PV, PM, nomes de ações e condições) podem ser rótulos.
- Texto completo só das categorias que a licença libera (classes, Habilidades Heroicas, armas/armaduras/escudos básicos, itens de inventário padrão, qualidades de itens raros, feitiços de NPC). Nada disso entra agora.
- Arte, logo oficial, diagramação e o resto do texto do livro (inclusive monstros): não.
- O nome do projeto NÃO pode conter "Fabula". Nome provisório: `errante-vtt`.
- O README precisa ter: aviso de não afiliação com a Need Games / Rooster Games, aviso de que requer o livro básico de Fabula Ultima, link para a licença, e aviso de que o código foi feito com ajuda de IA (a licença exige declarar conteúdo gerado por IA).

## O que é

Uma **tela de jogo estilo JRPG, controlada só pelo mestre, que cada jogador abre no próprio navegador.** Os jogadores só assistem nesta etapa. **Sem regras do jogo embutidas**: eu decido tudo e digito os números; o app só mostra bonito.

**Contexto importante:** no Brasil, o compartilhamento de tela e o vídeo do Discord estão suspensos desde agosto de 2026, sem previsão de volta. Por isso o palco PRECISA estar na web.

Duas partes:
- **Mesa do mestre** (`index.html`): painel de controle. Roda no meu computador. Só eu vejo.
- **Palco** (`palco.html`): a tela em pixel art, hospedada na web. Cada jogador abre pelo link com um código de sala. **Nada que mude o jogo.** Só desenha o que a mesa mandar. O jogador pode clicar/tocar apenas para **consultar** (abrir o nome de um relógio, a lista de relógios, a ficha estudada de um inimigo); isso é estado local da tela dele, nunca vai para a sala.

A campanha não depende deste app. Se ele quebrar no meio da sessão, a gente segue no teatro da mente pela call de voz. Então: simples, robusto, poucas peças.

## Escopo

**Dezembro (fazer agora):** modo **cortina** + modo **combate** completo, online, com link para os jogadores, funcionando sem arte e já aceitando meus PNGs.

**Janeiro (NÃO fazer agora, mas não fechar a porta):** modo **cena** (fora de combate, com relógios de progresso), palco instalável como app (PWA), validação da cor-assinatura, fonte pixel final, **escudo do mestre** num painel decorado da mesa. Depois disso: jogadores interagindo (eles pedem, o mestre aprova), cutscenes.

Para não fechar a porta: o estado já tem o campo `modo` com espaço para `"cena"`, e campos reservados comentados (veja "Formato dos dados").

## Arquitetura (decidida)

| Decisão | Por quê |
|---|---|
| HTML + CSS + JavaScript puro, com módulos ES | Fundamentos legíveis para eu estudar em janeiro. Sem React, sem TypeScript nesta etapa (JSDoc para documentar formatos). |
| Vite para dev e build | Módulos ES precisam de servidor; o Vite resolve e gera a pasta estática para publicar. |
| **Fluxo de mão única: Estado → Canal → Palco** | Um único objeto `estado` é a verdade. Só a mesa altera, sempre por funções pequenas e nomeadas (`aplicarDano`, `encerrarTurno`...). Depois de cada alteração, o estado público vai ao palco, que redesenha tudo (`renderizar(estado)`). O palco nunca muda nada. |
| **`estadoPublico(estado)`**, função pura em `src/estado.js` | Remove o que os jogadores não podem ver: nome, sprite e PV de inimigo não revelado (vira `"???"` e silhueta), tudo da ficha do inimigo acima do nível de Estudo alcançado, PV atual de inimigo se a opção estiver desligada, anotações do mestre. No modo cortina, o público é só a cortina. O canal NUNCA envia o estado completo: o palco roda no navegador dos jogadores e qualquer um abre o F12. |
| **`canal.js` isolado** com `enviarEstado` / `aoReceberEstado` | Única peça que sabe como o estado viaja. Local: BroadcastChannel entre abas (para eu testar sem internet). Online: serviço de tempo real. Mesa e palco não mudam na troca. Pode deixar os dois modos disponíveis (ex.: `?local=1`). |
| Serviço de tempo real gerenciado: **proposta Firebase Realtime Database** | Sem servidor para manter ligado. A mesa grava o estado público em `salas/{codigo}`; o palco escuta e redesenha. Regras: leitura pública por sala, escrita só da conta do mestre logado (proteção no servidor, não só no front). Antes de configurar, me diga em 5 linhas se há algo melhor hoje e confira o plano grátis; se não houver motivo forte, siga com Firebase. |
| Palco no **GitHub Pages** | Grátis, estático, e o link vira vitrine de portfólio. A mesa pode rodar local. |
| Persistência da mesa em **localStorage** + exportar/importar JSON | F5 não perde nada; JSON serve de backup e para preparar combates antes. |
| Palco em **DOM**, não Canvas | Mais simples de manter e de eu entender depois. |
| Resolução virtual **480×270**, escala inteira | × 4 = 1920×1080 exato (a tela mais comum dos jogadores), × 8 = 4K. Personagens ficam grandes na tela, com cara de JRPG clássico. Em 1366×768 ou 720p fica × 2 com borda. Pixel art nunca em escala quebrada. |

### Escala pixel perfeita (importante, a arte depende disso)
- `div#palco` de 480×270 px "de pixel art"; tudo dentro posicionado nessa grade.
- Escala calculada **em pixels reais da tela**: `dpr = window.devicePixelRatio`; `escalaReal = max(1, floor(min(largura * dpr / 480, altura * dpr / 270)))`; aplicar `transform: scale(escalaReal / dpr)`, centralizado, sobra vira faixa escura. Recalcular ao redimensionar ou mudar zoom. Motivo: Windows com zoom 125%/150% e celulares têm `dpr` ≠ 1 e borram com escala inteira em pixel CSS.
- `image-rendering: pixelated` em tudo.
- Tela menor que 480×270 pixels reais (celular): reduz fracionado para caber + aviso "gire o celular" na vertical.
- Tecla `D` no palco: mostra escala real e `dpr` num canto (debug).

## Identidade visual "Pena e Fio" (decidida com prévias; o código precisa respeitar)

Conceito: o jogo é sobre histórias (Fabula) e conexões (Laços). Daí dois motivos que se repetem em toda a interface: **a pena** (quem escreve a história) e **o fio** (o que liga as pessoas). Continua sendo uma janela de JRPG clássico, mas com assinatura própria.

**Tipografia (todas SIL Open Font License; arquivos em `assets/fontes/`, que eu vou te entregar num zip junto com o `OFL.txt`; creditar no README):**
| Nível | Arquivo / família | Tamanho exato | Uso |
|---|---|---|---|
| Título | `jersey-15-pf.woff2` ("Jersey 15 PF") | **27 px** | nome do local, avisos ("Vitória!"), números de dano/cura, número da rodada |
| Corpo | `jersey-10-pf.woff2` ("Jersey 10 PF") | **18.6667 px** (= 1400/75) | mensagens, menu, nomes, números de PV, descrições |
| Rótulo | `silkscreen.woff2` | 8 px, maiúsculas | "PV", "PM", "RODADA", "GRUPO", legendas pequenas |
- **Os tamanhos não são arredondáveis.** Cada fonte pixel tem um tamanho "nativo" em que 1 pixel do desenho da letra = 1 pixel da grade de 480×270. Em qualquer outro tamanho as letras ficam tortas e irregulares (testado). No palco escalado, multiplique pela escala inteira: corpo = `18.6667 * escala` px.
- As duas Jersey são versões minhas, derivadas da Jersey original (OFL): só o **til** de ã, õ, Ã, Õ foi redesenhado (o original tinha uns "espinhos" que pareciam tortos). Por isso foram renomeadas com "PF". Use estes arquivos, não o pacote do npm.
- **Altura real das linhas (medido; vale para todo layout):** na Jersey 10 a 18,667 px, contando do topo da caixa do texto, há 5 px vazios, as maiúsculas vão de 5 a 14, **os acentos das maiúsculas sobem até a linha 2 e a cedilha desce até a 18**. Então: espaçamento entre linhas de corpo **15 px ideal, 14 px no mínimo** (menus de 4 itens); um rótulo (Silkscreen) embaixo de uma linha de corpo começa **pelo menos 16 px abaixo do topo dessa linha**; molduras de seleção começam 2 px acima do topo do texto. Testar sempre com "Poção", "Éter", "Feitiço" e "Ação" (a prévia antiga deixava o ç de "Poção" invadir o "RECUPERA" da linha de baixo).
- Sem suavização (`-webkit-font-smoothing: none`; `font-smooth: never`). Primeiro teste do Marco 0: uma frase com "Anciã, Guardião, Põe, Ação, Coração" no navegador, para conferir que o til saiu igual à prévia.
- O corpo no tamanho nativo é um pouco maior do que nas primeiras prévias: menu com espaçamento de 12 px mostra **4 itens visíveis** + indicador ▼ para rolar; status com 8 heróis usa linhas de 14 px.
- Cores de texto: título em dourado `#e8c170` (ou branco em mensagens), corpo em `#ebede9`, secundário/frases de ambiente em `#a8b5b2`, rótulos em `#a8b5b2`.

**Janela (todas as caixas grandes: painel, menu, submenu, status, aviso, caixa da cena):** de fora para dentro, 1 px `#090a14`, 1 px `#c7cfcc`, fundo `#253a5e`. Chanfro de 1 px: claro `#3c5e8b` em cima/esquerda, escuro `#172038` embaixo/direita. **Costura**: linha tracejada (2 px ligado, 2 desligado) em `#577277`, 4 px para dentro da borda. **Nós** dourados 5×5 (`#e8c170`, desenho de losango vazado) nos quatro cantos, por cima da borda.
- Variante **plaquinha** (sem costura e sem nós): etiquetas de nome, botão "GRUPO", blocos da faixa de turnos.
- Implementação sugerida: uma imagem de moldura 9-slice (`assets/ui/janela.png`, `assets/ui/plaquinha.png`) usada com `border-image`, gerada no início por código a partir desta especificação, para eu poder redesenhar à mão depois sem mexer no código.

**Fita (caixa de mensagem e nome do local):** comporta-se como uma fita de verdade, não como caixa. A faixa da frente tem borda só **em cima e embaixo** (1 px `#090a14` + 1 px na cor de quem age: vilão `#752438`, inimigo `#a53030`, herói = cor-assinatura, neutro `#c7cfcc`) e as pontas **dobram para trás**: cada cauda fica 5 px mais baixa, atrás da faixa, num tom 25% mais escuro, com corte em V na ponta e um triangulozinho escuro `#0d1424` na dobra. Altura 18 px com o corpo, 26 px com o título. Largura automática pelo texto, centralizada. Implementar como 3 peças (cauda esquerda, faixa esticável, cauda direita), de preferência imagens em `assets/ui/` para eu poder redesenhar.
- Ao **escolher alvo**, a fita mostra a ação e o alvo do momento: `Ataque  »  Espectro B`, e atualiza conforme o cursor muda de alvo.

**Barras e status (cada linha de herói):** faixinha da cor-assinatura · nome · rótulo **PV** + barra de PV (4 px) + número de PV · embaixo, rótulo **PM** + barra de PM (3 px) · à direita, rótulo **PI** com o número de Pontos de Inventário embaixo, em branco.
- **Rótulos PV/PM/PI numa mini-fonte própria de 3×5 px** (não a Silkscreen: ela é larga demais e encostava no contorno da barra): letras de 3 px com 1 px de espaço, alinhadas pelo topo com o contorno da barra e com **2 px de folga** antes dela. Cores ligadas às barras: PV `#b9d98a` (verde claro), PM `#a4dddb` (azul claro), PI `#e8c170`. Desenhos: P `###/#.#/###/#../#..` · V `#.#/#.#/#.#/#.#/.#.` · M `#.#/###/###/#.#/#.#` · I `###/.#./.#./.#./###`. Pode ser um PNG em `assets/ui/rotulos.png`. Barras com contorno 1 px `#090a14`, vazio `#172038`, brilho de 1 px em cima e sombra embaixo. PV verde `#75a743`/`#a8ca58`/`#468232`; em crise `#cf573c`/`#da863e`/`#a53030`; PM `#73bed3`/`#a4dddb`/`#4f8fba`. **Marquinha dourada** de 2 px no meio da barra de PV (ponto de crise). **Rastro de dano**: o pedaço perdido fica branco `#ebede9` e encolhe em ~400 ms. Caído: nome em cinza, barras vazias e "CAÍDO" em vermelho sobre elas. Linha de 16 px (até 3 por coluna) ou 14 px (4 por coluna).
- **Clique na barra mostra o número:** o jogador clica na barra de PM (ou PV) do **próprio** personagem e aparece um balãozinho com ponteiro, ex.: `PM 16 / 40`, que some ao clicar fora ou depois de 3 s. O mestre vê esse balão em qualquer personagem.

**Cursor: pena** (14×14, desenho a 45°): pluma branca com sombra cinza e haste `#819796` em cima à esquerda; **bico dourado** `#e8c170` com fenda `#ad7757` embaixo à direita; **ponta preta** no último pixel. **É a ponta que seleciona**: ela encosta no começo do item (menus), na borda do alvo (combate). Animação "escrevendo": 4 quadros em loop (~160 ms cada) em que o bico faz um laçinho de 1 px. O desenho vai em `assets/ui/pena.png` (folha com os 4 quadros) para eu poder redesenhar à mão.

**Avisos sob demanda (caixinhas centrais):** a mesma janela grande com título (fonte de título) + divisor + uma linha de corpo, largura automática, o campo escurece por trás. **O texto é sempre escrito por mim na mesa** (nada de "Segunda Fase" automático; virada de chefe é só um aviso que eu escrevo, ex.: "O Marco desperta / O chão treme sob vocês."). Quatro tons de borda: **neutro** (claro), **dourado** (algo bom/especial: rendição, Ponto de Fabula), **vermelho** `#a53030` (perigo), **vinho** `#752438` (vilão). Na mesa: botão "Aviso" com campos título, linha, tom, e "some sozinho em N s" ou "até eu fechar". Guardar avisos prontos por cena em `cenas.json` para disparar com um clique.

**Carregamento (transições com cutscene):** caixa central com "CAPÍTULO N" em rótulo, nome em título, divisor e "Preparando a cena"; embaixo, a **pena escreve uma linha de tinta dourada ondulada** que cresce com o progresso.

**Divisor:** linha 1 px `#577277` com um losango dourado no centro (entre descrição e frase de ambiente, e no aviso central).

**Números flutuantes:** fonte de título com contorno de 1 px `#090a14`; dano branco, cura verde `#a8ca58`; nome de condição em corpo cinza.

**Faixa de turnos:** fundo `#172038`, linha inferior `#394a50` + 1 px `#090a14`. À esquerda, rótulo "RODADA" e o número em título dourado. Rostos com um sublinhado de 1 px na cor-assinatura (inimigo `#a53030`, vilão `#752438`). Seta dourada com contorno escuro.

**Relógio (ícone):** aro escuro 1 px, borda clara, fundo `#172038`, seções preenchidas `#cf573c`, divisões em `#090a14`, um pontinho dourado no topo.

## Telas e peças decididas em 25/11 (prévias aprovadas para refinar)

### Condições no palco
- As 6 condições do livro (Lento, Confuso, Fraco, Abalado, Enfurecido, Envenenado) aparecem como **ícones de 7×7** (5×5 de desenho + contorno) no **canto superior esquerdo do rosto** de cada um na faixa de turnos, até 3; mais que isso vira "+". Inimigos também. O canto inferior direito é do contador de PF.
- Desenhos provisórios (o Cadu vai redesenhar; ficam em `assets/ui/condicoes/<nome>.png`): ampulheta azul-clara (Lento), interrogação rosa (Confuso), seta para baixo azul (Fraco), tremor cinza (Abalado), veia de raiva vermelha (Enfurecido), gota verde (Envenenado).

### Ficha do jogador (janela sobre o palco)
- Abre ao clicar no **sprite, no rosto da faixa de turnos ou na linha do status** de um herói. O jogador abre a do próprio personagem (e vê as dos outros só no resumo, se eu permitir); eu abro todas, pela mesa ou pelo palco.
- **Abas:** RESUMO · INVENTÁRIO · REGISTRO (desligada, "em breve": é onde as rolagens vão aparecer quando o VTT tiver dados) · FICHA COMPLETA (desligada, futuro).
- **Cabeçalho:** retrato 48×48 em janela, nome do personagem em título dourado, linha de rótulo com jogador · nível · classes, e os **Pontos de Fabula como losangos** dourados. Botão FECHAR (plaquinha).
- **RESUMO:** RECURSOS (PV, PM, PI com barra e "atual / máximo"), ATRIBUTOS (DES, AST, VIG, VON como chips com o dado: d6, d8…), DEFESA (DEF, D.MÁG, INIC.), CONDIÇÕES (as 6 listadas; as ativas com ícone e nome em branco, as outras apagadas; **clicáveis para marcar**: o jogador marca as dele, eu marco tudo; é o "tracking"), TRAÇOS (Identidade, Tema, Origem), LAÇOS (alvo com a faixinha da cor dele, emoções em rótulo e força em 3 quadradinhos).
- **INVENTÁRIO:** itens (nome, efeito em rótulo, custo em PI) com o selecionado destacado; EQUIPAMENTO (mão principal, secundária, armadura, acessório); ZENIT.
- Dados em `dados/herois.json` (por herói); a mesa edita tudo.

### Cortina (sessão fechada) — em revisão
- O que qualquer pessoa vê ao abrir o link quando eu não abri a sessão: fundo escuro com pontinhos que cintilam devagar, janela central com o **nome da campanha** (provisório "Errantes"; vai virar um **logotipo** desenhado por mim, então deixe um espaço de imagem no lugar do texto), divisor, uma **linha que eu escrevo a cada sessão** (fala de NPC, de jogador, hype; o que eu quiser), com **rótulo opcional** em cima e **"— quem disse" opcional** embaixo, a próxima sessão (data, hora e quanto falta, vindos da mesa), os **rostos do grupo**, que **acendem quando cada jogador se conecta** ("N DE 5 JÁ CHEGARAM"), e a **pena escrevendo uma linha de tinta sem fim**. Quando eu abro, a cortina sai com a transição normal. **Som só começa depois de um clique** (regra dos navegadores): a cortina tem que ter um botão "Entrar" que libera o áudio.

### Gire o celular
- Celular em pé (retrato) vê uma tela própria, no estilo: janela com um **celular em pixel art desenhado em quadros** (nunca girado por código: rotação gera serrilhado). Quadros: em pé (20×36) → giro (deitado com o contorno de onde estava como rastro) → deitado (36×20) com a telinha **acendendo um mini palco** (céu, chão, dois heróis e um inimigo). Acima, um **meio-círculo dourado de 2 px** centrado no celular, rasterizado limpo, com um brilho correndo da esquerda para a direita e uma **ponta de seta 8 px** apontando para baixo na extremidade direita. Loop de ~2,8 s; "Gire o celular" em título, divisor, e o texto: "A plataforma é projetada para uso horizontal, como numa tela de JRPG." Deitou, o palco aparece.

### Espaço reservado para os dados (futuro)
- Não implementar rolagens agora. Reservar: a aba **REGISTRO** na ficha e a seção **DADOS** na mesa. Quando chegar a hora, uma rolagem vira um momento no palco no mesmo padrão de entrada animada das caixas.

### Mesa do mestre (tela de computador, só minha; prévias `mesa-combate.png`, `mesa-encerrar.png`, `mesa-cena.png`)
Grade de 960×540 mostrada em 2× (mesma identidade, com plaquinhas no lugar das janelas ornamentadas). Princípios: **uma jogada comum em 3–4 cliques**; o palco ao vivo sempre à vista; **o que é raro mora na ficha ou num clique direito**, não na tela. A mesa vai encolhendo conforme os jogadores ganham controle (fase interativa).

**Barra de cima (os dois modos):** "Mesa" · SESSÃO N · conectados (ponto verde, "5 DE 5") · CORTINA · [CENA | COMBATE] · (combate) RODADA N · VEZ: HERÓIS/INIMIGOS (alterna) · FIM DA RODADA · **ENCERRAR COMBATE** (vermelho) / (cena) **INICIAR COMBATE** · à direita: ÉPICA (chave) · AVISO · DESFAZER · **?** (abre os atalhos).
- **ENCERRAR COMBATE** abre um menu "Como esta luta termina?": Vitória (inimigos viram luz, pose de vitória) · Inimigos fogem (saem pela borda) · Acordo (a luta para sem vencedor) · Rendição do grupo (o mundo perde a cor) · Personalizado (texto meu). Cada item tem a descrição curta embaixo.
- **Quem começa:** ao iniciar o combate, a mesa pergunta qual lado venceu a iniciativa (p. 61) e marca a VEZ inicial; não fica na barra.

**MESA DE COMBATE (`mesa-combate.png`)**
- **Esquerda, HERÓIS:** linha por herói com rosto + faixinha da cor, nome do personagem, jogador ("· AGIU" quando já agiu; quem age tem fundo escuro e borda na cor), as 6 condições como quadradinhos clicáveis, PV e PM em campos "atual/máximo" com − e +. **PI, PF e fileira saíram da linha**: clicar no herói abre a ficha (onde ficam). Depois, INIMIGOS: nome, PV com −, ESTUDO [− | 7+ | 10+ | 13+], VER PV (regra da casa); o vilão mostra os PU em losangos e o botão **FASE 1 › 2** (troca sprite/pose, aviso de virada e frases de efeito da fase). + CHEGA NO FIM DA RODADA, FORMAÇÃO. Embaixo, **SOM** (ver abaixo).
- **Centro em cima:** "O QUE OS JOGADORES VEEM" + **VER COMO [MESTRE ▾]**: troca a prévia para a visão de um jogador específico (para conferir segredos e a ficha que ele vê).
- **Centro embaixo, AÇÃO:** QUEM · AÇÃO › subação · **CUSTO em PM, descontado sozinho** ao executar · **ALVOS com dano próprio cada um** ([Espectro A] DANO 18 [Espectro B] DANO 24 [+]) · RESULTADO [ACERTOU | ERROU | CRÍTICO | FALHA CRÍTICA] · TIPO [fogo… | **CURA**] (cura sobe PV e mostra número verde) · CONDIÇÃO nos alvos marcados · **EXECUTAR** (Enter). FABULA: EVOCAR TRAÇO, EVOCAR LAÇO, MUDAR A HISTÓRIA, USAR PODER. Para inimigo, QUEM = o inimigo; o vilão gasta PU nos mesmos botões.
- **Direita:** RELÓGIOS (nome, "4/6", − e +, + NOVO) · MENSAGENS, **recolhível** (frase da rodada em ciclo com ENVIAR, PRÓXIMA, PAUSAR; campo de mensagem livre) · AVISOS PRONTOS · PENDENTES (original em vermelho, sugestão em verde; APROVAR, Aa, EDITAR, RECUSAR). A antiga seção "fiscalizar" virou **clique direito em qualquer texto do palco** (editar, Aa, Título, Espaços). Atalhos saíram da tela e foram para o botão "?".

**MESA DE CENA (`mesa-cena.png`)**
- **Esquerda:** LOCAL (cenário, nome na tela, LUZ E CLIMA [DIA | ENTARDECER | NOITE] e [CHUVA | NEBLINA | APAGAMENTO]) · QUEM ESTÁ EM CENA (NPCs com EM CENA/FORA e FALA; + NPC; MOSTRAR O GRUPO) · SOM · **CORTINA** (próxima sessão; rótulo opcional; a linha da sessão; quem disse, opcional; VER A CORTINA; ABRIR A SESSÃO).
- **Centro:** palco ao vivo + VER COMO; embaixo, CAIXA DO LOCAL (descrição e frase de ambiente em ciclo; ATUALIZAR CAIXA, PRÓXIMA FRASE) · FALA (quem + texto; FALAR, NARRADOR sem retrato, MENSAGEM RÁPIDA na fita) · FABULA (os 4 botões).
- **Direita:** RELÓGIOS · AVISOS PRONTOS · PENDENTES · **PRÓXIMO COMBATE** (o combate preparado para a cena, com INICIAR ESTE COMBATE).

**DESFAZER desfaz a última ação executada inteira** (dano, cura, condição, PM, PF), porque erro de clique na mesa não pode virar erro no palco.

### Som pelo site (janeiro)
- Toca **no navegador de cada um**, disparado pelo mesmo canal das animações (o efeito sonoro sai junto com o visual). Web Audio API; arquivos `.ogg` (com `.mp3` de reserva) em `assets/som/`.
- **Liberação:** navegadores só tocam som depois de um clique. A cortina tem o botão **Entrar**; o clique libera o áudio.
- **Volume por pessoa** (engrenagem no canto do palco: música e efeitos separados, e mudo). Na mesa: música atual (TOCAR, TROCAR), volume geral e EFEITOS AUTOMÁTICOS [SIM/NÃO].
- **Música:** faixas em loop sem emenda, troca com crossfade (~1 s); por cena/combate/chefe, escolhida na mesa. Quem entra no meio recebe a faixa atual já tocando.
- **Efeitos automáticos** ligados a eventos (cursor, confirmar, abrir caixa, acerto, crítico, cura, condição, caído, vitória, PF: pena, laço, vilão entra, épico).
- iPhone com a chave de silencioso ligada não toca som de site: mostrar uma dica na primeira vez.
- Licenças: só packs com licença que permita (CC0 ou equivalente), creditados no README.

## Textos
**Todo texto de exemplo nas prévias e nos dados de exemplo é provisório** (lista em `TEXTOS-PROVISORIOS.md`). Não "melhore" nem invente textos de jogo: deixe marcadores visíveis como `[texto do mestre]` onde faltar texto meu.

## Pontos de Fabula no palco (JANEIRO; prévias animadas aprovadas para refinar)

Os efeitos dos heróis são **iguais para todos** (é o coletivo). Cada efeito dura 1,5 a 3 s, não trava nada, aparece no palco de todo mundo e é disparado com **um clique** na mesa. Tudo em passos de pixel inteiro, a ~25 quadros/s.

- **Regra de cor dos brilhos (decidida em 25/11):** **cada herói brilha sempre na própria cor-assinatura, com o símbolo dele** (`brilhoPF` em `herois.json`; sem símbolo, faíscas simples na cor dele), inclusive quando o grupo inteiro ganha PF. **O dourado especial (`#e8c170` + `#ebede9`)** aparece no nó onde dois fios do Laço se encontram, na tinta da pena (a Fabula em si) e, raramente, no **modo épico**: uma chave na mesa ("luta épica") que, no ganho de PF de todos, faz um clarão branco no fim e deixa todos dourados juntos (o momento em que eles se sentem um de verdade). Fora disso, nunca dourado coletivo.
- **Contador de PF:** numerozinho dourado numa caixinha **encostada no canto inferior direito** do rosto de cada herói na faixa de turnos (divide a borda preta com o rosto). Ao mudar, o número "pula" 1 px e pisca branco.
- **Motor de escrita da pena** (usado em vários efeitos): o texto é revelado coluna a coluna, ~3 px por quadro; a **ponta** da pena acompanha a frente da escrita, subindo e descendo dentro da letra daquela coluna (parece um traço sendo feito). A tinta recém-escrita é branca e "esfria" para dourado depois de ~3 quadros. No fim, a pena sobe e sai, e um brilho branco varre o texto da esquerda para a direita.
- **Evocar Traço:** a pena escreve o Traço **na faixa de HUD** (y≈38, onde nenhum sprite entra), centralizado no x do herói (sem sair da tela), em **fonte de corpo** (Jersey 10, menor e mais harmônica), **dourado metálico** (faixa clara em cima `#ebede9`, `#e8c170`, sombra `#da863e` embaixo e reflexo `#e8c170` na última linha) com **contorno preto uniforme de 1 px** (8 vizinhos) e cintilas que piscam em 3 pontos; o brilho varre; a palavra **se recolhe para o centro** (as bordas viram faíscas correndo para dentro) e vira um **orbe de luz** com rastro, que desce em arco e **entra no peito do herói**. Impacto: o sprite pisca branco (2 quadros, depois meio a meio), **8 raios de luz** saem do peito e se soltam para fora, **dois anéis** pequenos se abrem no chão, a **silhueta do herói ganha contorno dourado que esfria** (branco → dourado → laranja → some), cintilas piscam em volta e brasas sobem. Depois a fita mostra "<Herói> evoca <Traço> e rola de novo".
- **Evocar Laço** (versão elegante e discreta, 25/11): primeiro **os dois acendem** (silhueta na própria cor-assinatura, anel nos pés e faíscas subindo, que vão parando aos poucos): mostra que um PF foi gasto e que o Laço está se formando. Então **um fio sai de cada um ao mesmo tempo**, nascendo de uma **estrela de luz no peito** de cada um (núcleo branco 3×3, anel claro e anel na cor-assinatura, halo pontilhado em volta e raios em cruz que crescem e encolhem como cintilação; abre com um estalo de 4 raios diagonais, pulsa enquanto o fio existe e apaga quando ele se recolhe), cada um na sua cor-assinatura, finos (1 px, com 1 px de sombra `#172038` embaixo), quase retos e ondulando de leve, com uma estrela na ponta. Eles se encontram no meio e **se enlaçam ali** (a ondulação aumenta perto do meio e um passa por cima e por baixo do outro, o de trás mais escuro). No encontro, o nó vira uma **flor de luz** (núcleo branco, 4 raios em X que crescem e se soltam, 4 cintilas girando em volta); uma luz corre do nó para os dois; quando ela chega, **a silhueta de cada um acende na própria cor-assinatura** e esfria, e um anel com profundidade se abre nos pés de cada um; a fita mostra "Laço com <alvo>: <emoções> +<força>". No fim os fios se recolhem das pontas para o nó, e o nó sobe como uma luzinha e some. Alvo fora de cena (nação, alguém ausente): o fio sai pela borda até uma plaquinha com o nome.
- **Mudar a história:** o campo escurece, um aviso dourado abre de cima para baixo com o rótulo "A HISTÓRIA MUDA · <jogador>", e a pena escreve o fato no corpo do texto. **O texto é sempre digitado por mim na mesa** (o jogador fala, eu escrevo e confirmo): só então ele é escrito no palco.
- **Usar poder:** fita dourada com o nome do poder e um brilho curto.
- **Efeitos nunca passam por cima dos colegas:** contornos de silhueta, anéis no chão e faíscas de um personagem não são desenhados sobre os pixels dos sprites de outros personagens que estão na frente dele (para o personagem de quem age: de nenhum outro). Na prática, cada efeito usa uma máscara com os sprites dos outros.
- **A seta de quem age sai de cena durante os efeitos de PF:** quando o efeito começa ela recua 1–3 px enquanto apaga (~4 quadros) e some; volta do mesmo jeito quando o efeito acaba. Assim ela não atrapalha nada que sai do lado do herói.
- **Ordem de desenho:** tudo que recola o sprite (anéis com metade de trás) é desenhado **antes** dos efeitos aéreos (fios, raios, orbes); senão o sprite recolado cobre o fio e ele "pula" para a frente depois.
- **Profundidade dos efeitos:** todo anel ou elipse no chão é centrado nos **pés** do personagem (o mesmo centro do anel de quem age) e é desenhado em duas metades: a **de trás antes do sprite** e a **da frente depois**, para o anel passar por trás das pernas. Efeitos do peito saem do centro do sprite.
- **Nenhuma caixa aparece seca** (vale para todo o VTT, não só PF):
  - **Fita:** a faixa se estica a partir do centro (já com as bordas e uma cintila em cada ponta, ~0,3 s), as caudas saem de trás dela e o corte em V se forma (~0,2 s), e o texto entra **letra por letra**: cada letra nasce branca 1 px abaixo, sobe para o lugar e assenta na cor final (~2 letras por quadro).
  - **Aviso central** (caixa de 62 px de altura: título com o topo das letras a 11 px da borda de cima, divisor a 34 px, linha de baixo terminando a 11 px da borda de baixo; tudo centralizado): nasce como uma linha dourada no centro que se estica para os lados com cintilas nas pontas; a caixa abre na vertical a partir dessa linha (com uma linha dourada acompanhando as bordas enquanto abre); o título entra letra por letra; o divisor cresce do centro para os lados; a linha de baixo entra letra por letra (nascendo dourada e assentando em branco).
  - **Aviso de "+1 Ponto de Fabula"** começa ~0,25 s depois do último herói acender. **O brilho continua enquanto o aviso abre**: as faíscas vão nascendo cada vez menos até parar (as que já nasceram terminam a vida), e o contorno dourado só começa a esfriar depois que o aviso abriu, apagando devagar (dourado → laranja → marrom → some, ~1 s). Nada some de súbito.
- **Vilão entra em cena (+1 PF para cada herói, p. 102):** o vilão aparece com fade; o mundo **desbota** (cenário e inimigos perdem a cor, ~0,5 s) **menos os heróis**, que ficam com a cor original; um a um, cada herói acende com **o seu brilho próprio**: contorno na silhueta e partículas subindo, na **cor-assinatura dele e com o símbolo dele** (ex.: estrelas para um, sombras para outro), definidos em `herois.json` (`brilhoPF: { cor, simbolo: "assets/ui/simbolos/<id>.png" }`, que eu desenho), e o contador de PF dele sobe. Cada um segue na própria cor até o brilho se apagar.
- **Modo épico** (chave "luta épica" na mesa; animação própria, ~4,5 s, prévia `pf-vilao-epico.gif`): depois que todos acendem na própria cor,
  1. **Sobem:** de cada cabeça sai um cometa na cor-assinatura (núcleo branco, rastro que clareia), em arco até um ponto de encontro na faixa de HUD acima do grupo; o contorno próprio de cada um se apaga enquanto a cor "sobe".
  2. **Fundem:** as cinco luzes giram em volta do ponto deixando rastros curvos, fechando a espiral; viram um **sol dourado** (núcleo branco, anel dourado, halo pontilhado) que estoura em 8 raios longos.
  3. **Descem:** do sol sai um **feixe dourado** (2–3 px, ponta branca) até a cabeça de cada herói, do mais perto ao mais longe, com 2 quadros de intervalo; no impacto o contorno pisca branco e um anel dourado se abre nos pés (com profundidade).
  4. **Ficam dourados, sem deixar de ser quem são:** contorno dourado com **dois brilhos que correm em volta da silhueta na cor-assinatura de cada um** (pixels ordenados pelo ângulo em volta do corpo; ~10 px de cor com a ponta clareada), faíscas douradas misturadas com faíscas na cor de cada um; o aviso abre ("+1 Ponto de Fabula / Cada Fabula queima mais forte ao lado das outras.") e depois tudo se apaga devagar.
  - **Por quê (importante, não "simplificar" para tudo dourado):** o vilão central (Cassian) quer que "todos se tornem um" apagando as diferenças. O momento épico dos heróis precisa mostrar o contrário: **união, não uniformidade**. Dourado juntos, cada um com a própria cor viva dentro. aviso dourado "+1 Ponto de Fabula / A Fabula de vocês queima mais forte." Para a mesa: o desbote é revertido quando eu clicar em "seguir".
- **Vilões têm efeitos próprios** (decisão minha): cada vilão terá a sua entrada, o seu jeito de gastar Pontos de Ultima (Fuga, Evocar Traço, Recuperação) e talvez a sua variação do desbote. Vão ser planejados vilão a vilão. Deixar o sistema pronto para isso: um vilão pode apontar, no seu `.json`, para um efeito próprio (`efeitos/<id>.js`); se não tiver, usa o efeito genérico de vilão (o traço vinho que **risca** a tela, o oposto da pena que escreve).

## Direção de arte (o código precisa respeitar)

### Tamanhos e arquivos
- **Sprite de batalha:** 32×48 px por quadro. Dois conceitos separados (não confundir):
  - **Pose (estado/take):** *qual* imagem o personagem mostra: `parado`, `ferido` (em crise, ajoelhado), `caido` (PV 0). No futuro: `ataque`, `magia`, `defesa`, `vitoria`, `entrada`.
  - **Quadros:** a *animação* de uma pose. Cada arquivo de pose é uma tira horizontal de quadros 32×48 (1 quadro = 32×48; 2 quadros = 64×48).
  - Arquivos: `assets/sprites/<id>/<pose>.png` (ex.: `assets/sprites/jonaz/parado.png`). Opcional: `assets/sprites/<id>/<pose>.json` com `{ "fps": 4, "repetir": true }`. Sem `.json`: 1 quadro = imagem parada; vários quadros = 4 fps em loop.
  - Escolha da pose: automática pelo PV (crise → `ferido`, 0 → `caido`, senão `parado`), e a mesa pode forçar outra. Pose que não existe → usa `parado` com efeito (crise: leve tremor parado; caído: desbotado e inclinado 90°).
  - Agora: tocar a animação de quadros se o arquivo tiver mais de um quadro (é barato: troca de `background-position` em passos).
- **Âncora do sprite:** centro da borda de baixo (pés). O app desenha uma sombra oval escura; o sprite não traz chão.
- **Retrato:** 48×48 px, fundo chapado na cor-assinatura, sempre em **1×** (mesma escala de pixel do sprite). Nunca ampliar nem reduzir.
- **Zona do rosto:** quadrado 24×24 que começa em x=12, y=12 do retrato (olhos, nariz e boca ficam aí). A fila de turnos mostra esse **recorte** (via `object-position`/`background-position`), nunca o retrato reduzido.
- **Fallbacks (o app TEM que funcionar sem arte):** sem retrato → recorte 24×24 do topo do sprite (a cabeça); sem sprite → retângulo na cor-assinatura com a inicial; sem cenário → faixas de cor (céu, horizonte, chão).
- **Pastas e nomes:** `assets/sprites/<id>/<pose>.png`, `assets/retratos/<id>.png`, `assets/cenarios/<id>.png` (+ dados em `dados/cenarios.json`), `assets/icones/<nome>.png`. O `<id>` é o mesmo do combatente. PNG em tamanho real (1×), fundo transparente. Se o arquivo não existir, cai no fallback sem erro.

### Paleta própria do projeto (base Apollo + extras)
Base: **Apollo**, de AdamCYounis (Lospec), 46 cores, + 13 cores extras: 8 tiradas das referências de estilo e 5 de tons de pele (para ter rampas próprias de pele clara a retinta). Total 59. É a paleta própria do Cadu e **vai mudar com o tempo**: ele vai ajustar cores enquanto desenha. Guardar em `src/paleta.js` como lista ordenada com versão (ex.: `versao: 1`), mantendo a ORDEM fixa (ajustar valor sim; reordenar ou apagar não), porque a ordem é o que a troca de paleta futura vai usar. Separar `base` e `extras` ( **todas as cores do app saem de `paleta.js` e de variáveis CSS geradas dele**, para trocar num lugar só).
```
apollo:
#172038 #253a5e #3c5e8b #4f8fba #73bed3 #a4dddb #19332d #25562e
#468232 #75a743 #a8ca58 #d0da91 #4d2b32 #7a4841 #ad7757 #c09473
#d7b594 #e7d5b3 #341c27 #602c2c #884b2b #be772b #de9e41 #e8c170
#241527 #411d31 #752438 #a53030 #cf573c #da863e #1e1d39 #402751
#7a367b #a23e8c #c65197 #df84a5 #090a14 #10141f #151d28 #202e37
#394a50 #577277 #819796 #a8b5b2 #c7cfcc #ebede9
extras (referências):
#e38a6a #b42f43 #c9a962 #b29b8e #897d6e #7e5f52 #9fad57 #827d55
extras (pele):
#5c3426 #8a573b #b98058 #e0aa80 #f3cba8
```
Creditar a Apollo (AdamCYounis) no README.

| Uso | Hex |
|---|---|
| Fundo das caixas de UI (azul de janela de JRPG) | `#253a5e` |
| Borda das caixas | `#c7cfcc` |
| Fundo vazio das barras / fundo de caixa interna | `#172038` |
| Faixa de letterbox | `#090a14` |
| Texto principal / secundário | `#ebede9` / `#a8b5b2` |
| Barra de PV | `#75a743` |
| Barra de PV em crise (PV ≤ metade do máximo) | `#cf573c` |
| Barra de PM | `#73bed3` |
| Moldura de inimigo / de vilão | `#a53030` / `#752438` |
| "Já agiu nesta rodada" / desbotado | `#577277` (+ opacidade reduzida) |
| Sombra oval sob os sprites | `#19332d` (ou a cor mais escura do chão do cenário) |

### Cor-assinatura dos heróis
- Guardada como **hex** no personagem (`corAssinatura: "#f9c22b"`). Eu escolho quando desenho cada personagem.
- Usada em: fundo e moldura do retrato, **faixinha colorida de 2–4 px ao lado do nome** (o nome em si fica no texto principal, para ser sempre legível sobre o azul da caixa), marcador de turno, banner de ação. **Nunca** nas barras de PV/PM.
- Sem arte ainda: uma das 8 reserva `#da863e #e8c170 #a8ca58 #4f8fba #a4dddb #df84a5 #c65197 #ad7757`.
- Validação de cor: janeiro.

### Fonte
Pixel, com acentos do português, com altura de letra de ~7–9 px na grade de 480×270 (algo como m6x11; nada menor que isso, para ser confortável de ler). O espaço da interface se resolve com layout bem organizado, não com letra minúscula. Teste: **"Ação! Poção, Ímpeto, Coração, Atordoado, Ênfase"** sem caractere faltando. Candidatas: m6x11 (Daniel Linssen), Pixel Operator. Me mostre a licença antes de incluir. Tamanho em múltiplo inteiro do tamanho nativo, sem suavização. Se nenhuma passar rápido, use a melhor provisória e anote; a final é em janeiro.

## O palco: modo combate

```
y=0   ┌────────────────────────────────────────────────────────┐
      │ R2 · HERÓIS  [rosto][rosto][rosto][?][rosto]…          │  faixa de turnos (0–32)
y=32  ├────────────────────────────────────────────────────────┤
      │            [banner de ação: "Jonaz usa Feitiço"]       │
      │  HERÓIS (lado esquerdo)          INIMIGOS (lado direito)│  campo (32–200)
      │  2 colunas escalonadas × 4       formação livre        │
y=200 ├───────┬──────────┬─────────────────────────────────────┤
      │retrato│ menu JRPG│ status do grupo: 2 colunas × 4      │  painel (200–270)
      │ 48×48 │ ▶Feitiço │ ▌Nome  PV ▓▓▓░ 45/60               │
y=270 └───────┴──────────┴─────────────────────────────────────┘
```
Medidas em pixels da grade de 480×270; ajuste fino é permitido se melhorar a leitura, mas registre em DECISOES. Ao ajustar, priorize: barras e nomes legíveis > fila de turnos > menu.

### Regras de layout (testadas em prévia com 1, 3, 5 e 8 heróis; o app precisa ficar bonito em QUALQUER quantidade)
**Princípio:** nunca desenhar vaga vazia. Tudo que é grupo (heróis, inimigos, status, relógios) se centraliza pela quantidade que existe.

**Faixas fixas (grade 480×270)**
- 0–32: fila de turnos.
- 32–58: **faixa de HUD** dentro do campo: caixa de mensagem **centralizada** em x=240 (largura máx. 300 px, ou seja x≈90–390) e ícones de relógio no canto direito (x≈404–476). Nenhum sprite de 48 px invade essa faixa: pé nunca acima de y=106.
- 58–200: personagens.
- 200–270: painel.

**Chão por cenário** (os cenários vêm de packs diferentes; sem isso, os personagens flutuam num e afundam no outro):
- Cada cenário define uma **faixa de chão** com duas linhas horizontais: `chaoTopo` (onde ficam os pés de quem está mais ao fundo) e `chaoBase` (os pés de quem está mais à frente da tela). Padrão: 106 e 194. Limites: `chaoTopo ≥ 106` (para não invadir o HUD) e `chaoBase ≤ 196`.
- Opcional: `heroiX` e `inimigoX` para deslocar o bloco de heróis ou de inimigos na horizontal (ex.: uma árvore no meio do caminho).
- Ficam em `dados/cenarios.json`: `{ "id": "floresta", "arquivo": "floresta.png", "chaoTopo": 120, "chaoBase": 192 }`.
- **Editor de cenário na mesa:** mostra a imagem do cenário com as duas linhas arrastáveis e uma prévia com 8 heróis e 6 inimigos placeholder; botão salvar. É assim que eu ajusto cada cenário novo em meio minuto.
- Todas as formações (heróis e inimigos) usam essa faixa em vez de números fixos.

**Heróis (lado esquerdo): duas fileiras, FRENTE e TRÁS** (como em Final Fantasy IV e Suikoden; testado em prévia para cada quantidade de 1 a 8 e para todas as divisões possíveis).
- Cada herói tem `fileira: "frente" | "tras"`, que a mesa troca com um clique. É **só visual** (Fabula Ultima não tem regra de fileira); serve para mostrar quem segura a linha e quem fica atrás.
- Se nenhuma fileira foi escolhida, divisão padrão por quantidade: 1→1/0 · 2→1/1 · 3→2/1 · 4→2/2 · 5→3/2 · 6→3/3 · 7→4/3 · 8→4/4 (frente/trás). Máximo de 4 por fileira; se o mestre puser 5 numa, o quinto vai para a outra.
- Fileira da frente em x≈128, de trás em x≈62 (pés). Cada fileira é uma linha levemente inclinada **para trás**: cada herói fica 14 px mais à **esquerda** que o de cima (diagonal oposta ao passo de quem age; assim, ao dar o passo, ele se afasta do colega de baixo em vez de cair em cima dele — testado em prévia). A linha é centralizada na horizontal em torno do x da fileira.
- Espaçamento vertical dentro da fileira: `passo = min(32, altura / (k − 1))`, onde `altura = chaoBase − chaoTopo` do cenário (padrão 194 − 106 = 88), bloco centralizado no meio da faixa de chão. Se o passo ficar abaixo de 20 px, a mesa avisa que o chão daquele cenário está apertado demais para tanta gente.
- Quando as duas fileiras têm a mesma quantidade (2/2, 3/3, 4/4), a de trás fica **meio passo abaixo**, para ninguém ficar exatamente atrás de outro; nesse caso `passo = min(32, 88 / (k − 0,5))`, para o bloco inteiro caber.
- **Ordem dentro da fileira**: campo `posFileira` de cada herói (0 = em cima). A mesa tem um editor de formação com ▲/▼ (ou arrastar) que muda **só** `fileira` e `posFileira`.
- **O painel de status NÃO segue a formação.** Ele tem ordem própria, `ordemPainel`: por padrão a ordem em que os heróis entraram, e **o mestre pode reordenar à mão** num editor do painel (▲/▼ ou arrastar), separado do editor de formação. Trocar alguém de fileira ou de posição nunca mexe na barra. Motivo: os jogadores aprendem onde está a própria barra; se ela pular de lugar sozinha, a interface confunde. Herói com PV 0 mantém a vaga.
- O mestre decide só **fileira e ordem**; o app calcula os pixels (espaçamento, inclinação, centralização). Heróis não têm posição livre, para a formação ficar sempre arrumada. (Inimigos continuam podendo ter `posicao` manual.)
- Desenhar de cima para baixo (pé mais alto primeiro).

**Entradas e movimentos (nada de teleporte):**
- Trocar de fileira ou de posição: o sprite **desliza** até o lugar novo (~200 ms, passos de pixel inteiro).
- **Entrada em batalha:** ao iniciar o combate, os heróis entram deslizando pela borda esquerda, um atrás do outro (~80 ms de atraso entre eles); inimigos aparecem com fade. A cortina só abre depois que a entrada termina.
- **Chegada no meio da luta** (os personagens especiais da mesa aparecem assim): pela regra do livro (p. 60), novos participantes entram **no fim da rodada**. A mesa tem "entra no fim da rodada": eu marco o herói (ou inimigo) e, quando a rodada fecha, ele entra com a sua entrada e aparece "<Nome> chegou!".
- **Cada combatente tem um tipo de entrada** (`entrada`). Três genéricas, que funcionam sem arte nova: `"desliza"` (padrão de herói), `"fade"` (padrão de inimigo) e `"surge"` (começa em silhueta e ganha cor). E `"pose"`, para **qualquer exceção**: toca a pose `entrada` do personagem. A mesa escolhe por personagem; se ele estiver em `"pose"` mas não tiver a pose desenhada, usa a genérica do lado dele.
- **Entradas especiais (cair do penhasco, pousar voando, vilão chegando com aura) são sempre pose**, nunca movimento genérico: sem animação desenhada, um sprite parado caindo do céu fica cômico. O `.json` da pose `entrada` diz o caminho junto com a animação, por exemplo `{ "fps": 8, "repetir": false, "caminho": "de-cima" }` (caminhos: `"no-lugar"`, `"de-cima"`, `"da-borda"`); o código só move o sprite enquanto os quadros desenhados fazem o resto.
- **Espaço para entradas próprias no futuro:** acrescentar a pose `entrada` de um personagem (PNG + `.json`) tem que bastar para ele ganhar entrada própria, sem mexer no código. Caminho novo = uma função pequena num lugar só. Não implementar editor de animação agora.

**Destaque de quem está agindo** (testado em prévia com 8 heróis; sem ele, quem age se perde no grupo):
- Dá um passo de **~12 px para a direita**, saindo da linha, **com animação** (nada de corte seco): `transition` de ~160 ms no `transform`, avançando em passos de pixel inteiro (`steps(12)`), para continuar nítido em pixel art. Volta para a linha com a mesma animação quando o turno acaba.
- É desenhado **por último, por cima de todos** (camada mais alta), mesmo estando numa fileira de trás.
- **Anel no chão** sob os pés, na cor-assinatura, no lugar da sombra comum.
- **Seta ► atrás de quem age** (decidida em 25/11; sobre a cabeça ela caía no herói de cima, e na frente parecia um obstáculo): fica à **esquerda** do herói, na altura do peito, com a ponta encostando nas costas dele, **como se o empurrasse para a frente**. Desenho 7×11 em pixel art **com volume**, na cor-assinatura: borda de cima e lado de trás mais claros (mistura com branco), borda de baixo mais escura, contorno `#090a14`. Animação: vai e volta 0→3 px na horizontal, na direção do herói (~8 passos, pixel inteiro), e um brilho branco que corre pela borda de cima de vez em quando. Fade curto ao aparecer (~120 ms). Inimigo agindo: espelhada, à direita dele.
- **A linha dele no painel de status fica destacada** (fundo `#172038` + borda na cor-assinatura).
- Mais o que já existe: ▼ na fila de turnos, retrato na caixa de quem age, banner na cor dele.
- Inimigo agindo: no campo, passo ~12 px para a esquerda, por cima dos outros e um clarão rápido no sprite (como inimigo de JRPG piscando antes de atacar). **No painel não aparece nada do inimigo** (veja "Painel na vez dos inimigos").
- **Alvo:** quando eu escolho alvos na Ação rápida, cada alvo ganha um cursor ▶ claro ao lado, até eu aplicar ou limpar.
- **Regra para quando houver animação (etapa futura):** quem age fica sempre na camada mais alta durante toda a animação (inclusive ao avançar até o inimigo); os demais nunca o cobrem. Camadas: normalmente pela altura do pé; quem age, sempre por cima.

**Inimigos (lado direito):**
- Inimigo "grande" (largura ≥ 56 px, ex.: chefe/vilão) ocupa o fundo à direita (x≈420), centralizado na vertical; se houver dois grandes, um acima do outro.
- Os demais, em colunas com a mesma regra de centralização: até 3 → 1 coluna (x≈330); 4–6 → 2 colunas (x≈300, 350); 7–8 → 3 colunas. Se houver grande, as colunas recuam ~30 px para a esquerda.
- A posição manual da mesa (`posicao`) sempre vence a automática.
- Inimigo revelado com "mostrar PV": barra fina e nome curto logo abaixo dos pés.

**Faixa de turnos em dois lados** (o livro, p. 58–62, não tem ordem individual: os lados se alternam turno a turno, o lado que venceu a iniciativa começa toda rodada, e dentro do lado o grupo escolhe quem age; o lado em maior número joga os turnos que sobrarem no fim):
- Fundo `#172038`. À esquerda "R3" (rodada) e o **bloco dos heróis** (recortes 24×24, 27 px por pessoa); à direita, alinhado à direita, o **bloco dos inimigos** (mesma medida; "?" quando não revelado; moldura `#a53030`, vilão `#752438`).
- **Sem ordem dentro do bloco** (é só quem está na luta). Quem já agiu na rodada fica apagado. Quem age agora tem ▼ em cima.
- O **bloco do lado da vez** ganha fundo `#253a5e` e moldura clara; uma seta dourada aponta para ele. A seta fica **sempre centralizada no espaço entre o fim do bloco dos heróis e o começo do bloco dos inimigos**: quando entra ou sai alguém de qualquer lado, ela desliza (~200 ms, pixel inteiro) até o novo centro.
- Combatente com mais de um turno por rodada (elite/campeão) mostra pontinhos embaixo do recorte, um por turno, apagando conforme usa.
- **Limites:** até 8 heróis e **até 6 inimigos** em campo (a mesa não deixa passar disso; decisão do Cadu pela fluidez). Com esses limites tudo cabe sem "+N".

**Relógios no combate** (canto direito da faixa de HUD): **só o ícone** (círculo de ~18 px dividido em seções, com as preenchidas em `#cf573c`), sem caixa nem texto, para sobrar espaço para o banner. Até 4 ícones; depois disso, um "+N" discreto em texto cinza (`#a8b5b2`), sem caixa.
- Clicar/tocar num ícone (no palco de qualquer jogador): abre um balãozinho com o nome e "4/6 seções"; fecha ao clicar fora.
- Clicar no "+N": abre a janela "Relógios da cena" com todos os relógios visíveis (ícone, nome, progresso) em duas colunas; botão ×.
- Quando a mesa avança um relógio, o ícone dá um pulso e o nome aparece sozinho por ~2 s ao lado, para ninguém perder o avanço sem precisar clicar.
- Na mesa (no meu lado), os relógios aparecem sempre com nome.

**Menu JRPG (de cada herói):**
- As 10 ações do livro (p. 66–67: Ataque, Poder, Feitiço, Estudo, Guarda, Impedimento, Objetivo, Inventário, Equipamento, Outro) são a base, mas **cada herói tem o próprio menu**, como os comandos únicos dos Final Fantasy: em `dados/herois.json`, `menu` lista as entradas na ordem que eu quiser, e posso incluir **comandos próprios** com nome (ex.: o poder "Provocar" do Jonaz aparece como entrada própria, em dourado `#e8c170`).
- **Submenu:** Feitiço, Poder e Inventário podem ter itens com nome (`submenu.feitico: ["Chama", "Gelo", "Purificar"]`). Quando a mesa destaca "Feitiço → Chama", o palco abre a janelinha do submenu ao lado com o cursor em "Chama". Só nomes, escritos por mim; nada de texto do livro.
- Janela de 5 linhas com rolagem (▲/▼) e cursor ▶.
- A mesa escolhe ação (e item do submenu); o banner usa o nome escolhido ("Jonaz usa Chama!").

**Status do grupo (painel), por quantidade:**
- `n ≤ 4`: **uma coluna larga**, centralizada na vertical do painel: faixinha de cor + nome, barra de PV com `atual/máx`, barra de PM com `atual/máx`, até 6 ícones de condição.
- `n = 5–8`: **duas colunas** (a primeira com `ceil(n/2)` linhas), centralizadas na vertical: faixinha + nome, barras mais curtas, só o PV em número, até 3 ícones de condição + "+N".
- Linha de 16 px por herói. Nomes com mais de 8 letras são cortados.
- Herói com PV 0: linha desbotada.
- Reservar a ideia (não fazer agora): Pontos de Fabula por herói no futuro; no modo de uma coluna há espaço, no de duas será preciso trocar o número de PV por um mostrador alternável.

1. **Cenário** 480×270 escolhido pela mesa (fallback: faixas da paleta).
2. **Faixa de turnos:** em dois lados, conforme "Faixa de turnos em dois lados".
3. **Campo:** **heróis à esquerda, inimigos à direita** (decisão do Cadu). Heróis em duas fileiras (frente e trás), conforme as regras de layout. Inimigos em formação automática ou posição definida pela mesa. Quem age dá um passo (~12 px) em direção ao centro e ganha o destaque descrito em "Destaque de quem está agindo". PV 0 → desbotado. Sprites de herói são desenhados olhando para a direita e os de inimigo para a esquerda; **não espelhar por código** (inverteria a luz, que vem sempre do alto à esquerda). Se faltar a versão virada, use o sprite como está.
4. **Inimigo não revelado:** silhueta (sprite com `filter: brightness(0)` e leve opacidade) + nome "???". Os dados reais nem chegam ao palco.
5. **Ficha de inimigo por nível de Estudo** (segue a regra do livro, p. 319: teste aberto de AST + AST, idealmente pela ação Estudo):
   - A mesa registra, por inimigo, o melhor resultado de Estudo do grupo e quem estudou: nenhum, 7+, 10+ ou 13+.
   - **7+:** patente, espécie, PV máximos e PM máximos. **10+:** também Traços, Atributos, Defesa, Def. Mágica e Afinidades. **13+:** também ataques básicos e feitiços (nomes e um resumo que EU escrevo na mesa; nada copiado do livro).
   - No palco, clicar/tocar no inimigo abre o cartão com o que o grupo já sabe; o que falta aparece como "???" com o nível necessário.
   - O livro só manda revelar os PV **máximos**. Mostrar a barra de PV **atual** dos inimigos é regra da casa: opção na mesa, **desligada por padrão**; quando ligada, barra fina sob o sprite dos inimigos estudados.
   - Só o que foi revelado entra no `estadoPublico`.
6. **Painel inferior (vez dos heróis):** retrato 48×48 de quem age, numa caixa emoldurada | **menu do herói** com cursor ▶ e submenu (veja "Menu JRPG") | **status do grupo** 2×4: faixinha na cor-assinatura + nome, barra de PV com `atual/máx`, barra de PM, ícones de condição.
6b. **Painel na vez dos inimigos:** como nos JRPGs, o jogador nunca vê menu de inimigo. Retrato e menu somem (fade); fica **só o status do grupo**, centralizado e mais largo. A troca é **animada**: retrato e menu saem com fade (~150 ms) enquanto a janela de status desliza e se alarga até o centro (~200 ms, passos de pixel inteiro); na volta da vez dos heróis, o inverso. Nada de pulo seco. O que o inimigo fez aparece apenas no banner ("Amorfo usa Investida em Edu!").
7. **Barras** proporcionais; PV muda para a cor de crise quando PV ≤ metade.
8. **Condições** (ícone 8×8, placeholder = letra numa caixinha): Abalado, Atordoado, Enfurecido, Envenenado, Fraco, Lento.
9. **Caixa de mensagem (banner):** **só existe quando há mensagem.** Surge com fade/abertura rápida (~120 ms) e some do mesmo jeito.
   - **Tamanho automático:** largura = texto + 8 px de margem de cada lado, **sempre centralizada** em x=240; máx. 300 px. Passou disso, quebra em até 2 linhas e a altura cresce (cabe na faixa de HUD). "Jonaz usa Feitiço!" fica curta; "Vilão usa Sopro Amaldiçoado em Edu, Pedro e Feitan!" fica larga.
   - **Mensagem de ação:** borda na cor de quem age (inimigo: `#a53030`, vilão: `#752438`). Fica até a mesa limpar ou o turno acabar.
   - **Frase de efeito:** estilo apagado (fundo `#172038`, borda `#394a50`, texto `#a8b5b2`), fica ~5 s e some (veja "Frases de efeito no combate").
10. **Números flutuantes:** dano (branco com contorno escuro), cura (verde), PM (azul), sobem uns pixels e somem em ~1,5 s.
11. **Caixa de diálogo:** estilo JRPG, retrato 48×48 à esquerda e texto à direita; falante = qualquer combatente ou "Narrador". Uso opcional e raro (as falas acontecem na call de voz); nada na tela pode exigir que o mestre fique operando durante a cena. O nome do falante fica em texto claro com uma faixinha na cor dele (vilão: `#752438`), igual aos nomes do status; cor escura como texto some no azul da caixa. Setinha ▼ piscando no canto quando a fala está completa.
12d. **Mudança de fase do chefe** (o livro prevê batalhas em fases, p. 300): botão na mesa "Próxima fase". Sequência: clarão branco, o chefe troca de sprite/pose (`fase2`, `fase3` se existirem), aviso central com o texto que eu escrever ("O Guardião do Marco desperta!"), e o seletor de fase das frases de efeito avança junto. PV/PM novos eu ajusto na mesa.
12e. **Fim do combate** (botão "Encerrar combate" na mesa, com o tipo de fim e uma frase de resultado opcional que eu escrevo):
   - **Vitória:** os inimigos que restam se desfazem em **partículas de luz** (o padrão do jogo é sem sangue; quem cai vira luz), os heróis de pé fazem a pose `vitoria` (se não existir, um pulinho de 2 px), aviso central dourado "Vitória!" e, embaixo, a frase de resultado ("O caminho para Vila Musgo está livre."). Painel só com o status.
   - **Inimigos fogem:** os inimigos saem deslizando pela direita; aviso "Eles fugiram!" (ou meu texto).
   - **Acordo:** nada some; luz volta ao normal; aviso em estilo neutro com meu texto ("Trégua.").
   - **Rendição do grupo** (regra de rendição, p. 89): o cenário e os sprites perdem a cor e escurecem, aviso em estilo sombrio (fundo `#090a14`, texto `#c7cfcc`) com meu texto ("O grupo se rende..." / "Mas a história não termina aqui.").
   - **Personalizado:** meu texto + escolha de estilo (dourado, neutro, sombrio).
   - O palco **não tem botão**: quem segue é a mesa ("Continuar"), que dispara a transição de saída (fade) para a cortina (dezembro) ou para a cena (janeiro).
12c. **Frases de efeito no combate:** NÃO ficam o tempo todo. Aparecem na caixa de mensagem, no estilo apagado, por ~5 s:
   - **no começo de cada rodada** (junto com "Rodada N."), e
   - **quando um turno fica parado** sem nenhuma mensagem nova por mais de 40 s (ajustável na mesa).
   - O sorteio usa o conjunto da **fase atual do chefe** (a mesa tem um seletor de fase 1/2/3, um clique quando o chefe muda de fase) e, quando algum relógio visível passa da metade, inclui as frases de tensão. Sem frases de combate na cena, usa as de ambiente.
12b. **Aviso central:** caixa centralizada no campo (fundo `#172038`, borda e texto dourados `#e8c170`) para eventos importantes: "Vocês ganham 1 Ponto de Fabula!", "Emboscada!", "Vitória!". Aparece com fade, fica ~2,5 s (ou até a mesa fechar) e some. É diferente do banner (ação do turno) e da caixa de diálogo (falas).
10b. **Texto flutuante de condição:** quando a mesa aplica uma condição, o nome dela sobe sobre o alvo como os números (cinza-claro `#a8b5b2`), ex.: "Lento".
12. **Modo cortina:** tela de espera com texto configurável ("Preparando o combate…").
13. **"Reconectando…"** discreto se o palco perder a conexão; volta sozinho.

## Ambiente da cena (frases que ciclam sozinhas)

O mestre prepara as cenas antes da sessão; durante o jogo, a tela trabalha sozinha. Nada aqui exige operação contínua.

- Arquivo `dados/cenas.json`, uma entrada por cena:
```json
{ "id": "bosque-marco", "titulo": "Bosque do Marco Sem Nome", "cenario": "floresta",
  "descricao": "Um bosque antigo engolindo uma estrada de pedra. A luz chega verde e cansada; ninguém passa por aqui há muito tempo.",
  "ambiente": [
    "Um sabiá canta e para no meio, como se tivesse esquecido o resto.",
    "O musgo cobre um marco de pedra. O nome entalhado já não se lê.",
    "Ao longe, um zumbido metálico que não pertence à floresta."
  ],
  "tensao": ["As folhas param de cair, todas ao mesmo tempo."],
  "combate": {
    "fases": {
      "1": ["O vento muda de direção.", "Algo grande se mexe entre as árvores."],
      "2": ["As cores ao redor do vilão começam a desbotar.", "O chão esquece a forma das pegadas."]
    },
    "tensao": ["A ponte range. Mais uma vez."]
  },
  "retratoLocal": "bosque-marco",
  "intervalo": 25 }
```
- **Ciclo:** a cada `intervalo` segundos (padrão 25), troca a frase com fade de ~1 s, em ordem embaralhada sem repetir até passar por todas. Pontinhos discretos indicam qual frase está na tela.
- **Tensão (automático):** quando algum relógio visível passa da metade, as frases de `tensao` entram no sorteio. Não exige ação do mestre.
- **Na mesa:** escolher a cena carrega título, cenário, descrição e frases. Botões opcionais: pausar o ciclo e "próxima frase".
- **Onde aparece:** no combate (dezembro), como frase de efeito pontual (veja 12c). No modo cena (janeiro), na caixa de baixo, que ganha um **retrato do local** (48×48) à esquerda, igual à caixa de diálogo: descrição fixa em cima, frase de ambiente embaixo, em cinza-claro.
- **Nome do local** (modo cena): caixa do tamanho do texto, centralizada no topo, como a de mensagem.
- **Retrato do local:** `assets/locais/<id>.png` (48×48). Sem arquivo, usa um recorte 48×48 do próprio cenário, num ponto escolhido no editor de cenário (`recorteLocal: {x, y}`); sem ponto escolhido, o centro.
- Editor de cenas na mesa: janeiro. Em dezembro, eu edito o JSON à mão (me explique o formato).

## Transições entre telas (dezembro)

Nada troca de tela com corte seco.
- **Entrar em combate** (da cortina ou, em janeiro, da cena): transição clássica de JRPG, um clarão branco rápido seguido de um "redemoinho" ou "estilhaçar" da tela anterior (~600 ms), e então a entrada dos combatentes.
- **Sair do combate:** fade para preto e abertura da próxima tela (~500 ms).
- **Trocar de cena/cenário:** fade para preto (~400 ms).
- **Carregamento:** durante a transição, o palco pré-carrega todas as imagens da próxima tela (cenário, sprites, retratos e, no futuro, as poses de cutscene). Se ainda não terminou quando a animação acaba, segura numa tela de carregamento curta (fundo escuro, nome do local ou da luta, um indicador animado em pixel art) até tudo estar pronto. Assim nenhuma imagem "pisca" chegando depois, e as cutscenes futuras começam inteiras.
- Cada palco carrega no seu tempo, mas a transição começa para todos no mesmo instante (a mesa manda a hora de início).

## Modo cena (janeiro; NÃO fazer agora, mas a estrutura deve permitir)

Decidido com o Cadu, para não precisar redesenhar depois:
- **Fundo:** cenário + **filtro de clima/hora** escolhido na preparação da cena: `nenhum`, `entardecer`, `noite`, `chuva` (partículas de 1 px, inclinadas), `neblina`, `apagamento` (dessatura e puxa para o cinza-violeta; é o tema da campanha). O filtro afeta só o cenário, não a interface nem os retratos.
- **Nome do local:** caixa do tamanho do texto, centralizada no topo.
- **Relógios:** só ícones no canto superior direito, com o mesmo clique de consulta do combate.
- **Presentes:** **retratos** 48×48 dos NPCs na cena (não sprites), numa fileira centralizada logo acima da caixa de baixo, moldura na cor do NPC e plaquinha com o nome. Entram e saem com fade/deslize. Sem vaga vazia: a fileira se centraliza pela quantidade.
- **Caixa de baixo:** retrato do local (48×48) à esquerda, descrição fixa em cima, frase de ambiente embaixo (ciclando; veja "Ambiente da cena").
- **Status do grupo:** não aparece. No lugar, um botão discreto "Grupo" no canto superior esquerdo que, clicado, abre uma janela com as barras de todos (consulta local, como os relógios).
- **Aviso central** funciona igual ao combate.

## A mesa do mestre

Interface normal de site, clara e rápida. Poucos cliques para o que é frequente.

1. **Topo:** "Abrir palco", modo (Cortina / Combate; Cena desabilitado com "em breve"), cenário, código da sala + "copiar link", indicador de conexão.
2. **Elenco:** nome, lado (herói/inimigo/vilão), fileira (frente/trás, heróis; botão de troca rápida), cor-assinatura (hex, com seletor das cores da paleta), sprite, retrato, PV atual/máx, PM atual/máx, turnos por rodada (padrão 1), revelado, mostrar PV, condições. Botões: adicionar herói (de `dados/herois.json`), adicionar inimigo (de `dados/coringas.json` ou do zero), duplicar ("Amorfo A", "Amorfo B"), remover.
3. **Turnos** (estrutura, não regra): "Iniciar combate" escolhendo qual lado venceu a iniciativa; clicar num combatente → agindo agora; "Encerrar turno" gasta um turno dele e **sugere** o outro lado (se um lado não tem mais ninguém, sugere o mesmo); eu sempre posso escolher outro; "Nova rodada"; "Desfazer" (pelo menos a última ação).
4. **Ação rápida:** alvo(s) + número + "Dano PV" / "Cura PV" / "Gastar PM" / "Recuperar PM"; Enter repete a última operação; trava em 0 e no máximo; gera número flutuante.
5. **Menu e banner:** ação destacada; texto do banner com "Mostrar" / "Limpar".
6. **Diálogo:** falante + texto + "Mostrar" / "Fechar".
6b. **Aviso central:** texto + "Mostrar" (com atalhos prontos: "Vocês ganham 1 Ponto de Fabula!", "Vitória!", "Emboscada!").
6c. **Histórico (só na mesa):** lista das últimas ações e mensagens (dano, cura, condições, banners, avisos), para eu conferir o que aconteceu. Não aparece no palco nesta etapa.
7. **Salvar:** autosave local; "Exportar JSON" / "Importar JSON"; "Novo combate" (confirma antes).

## O mestre fiscaliza tudo

Tudo que um jogador puder escrever ou configurar (hoje só eu edito; na etapa em que os jogadores interagirem, eles vão poder sugerir nomes de comandos, itens de submenu, nomes de personagem etc.) passa pela mesa:
- Na mesa, **qualquer texto que aparece no palco é editável por mim a qualquer momento**: nomes, comandos do menu, itens de submenu, frases, avisos. Editou, o palco atualiza na hora.
- Correções rápidas de um clique: "primeira letra maiúscula", "Título Em Cada Palavra", "remover espaços sobrando", e um aviso quando o texto passa do tamanho que cabe na caixa.
- Na etapa interativa: o que vier de jogador entra como **pendente** e só vai para o palco depois que eu aprovo (ou corrijo e aprovo). Deixar a estrutura pronta para isso: cada texto vindo de fora tem `origem` e `aprovado`.

## Formato dos dados (proposta; pode ajustar e registrar em DECISOES)

```js
/** Estado completo da mesa. O palco recebe só estadoPublico(estado). */
const estado = {
  versao: 1,
  modo: "cortina",                  // "cortina" | "combate" | (janeiro: "cena")
  cortina: { texto: "Preparando…" },
  cenario: "floresta",              // id em dados/cenarios.json (traz a faixa de chão)
  rodada: 0,                        // 0 = combate não iniciado
  ladoDaVez: "herois",              // "herois" | "inimigos"
  agindoId: null,
  acaoDestacada: null,
  banner: null,                     // { texto, cor } ou null
  dialogo: null,                    // { falanteId | null, texto } ou null
  aviso: null,                      // { texto, ate } ou null (aviso central)
  combatentes: [
    {
      id: "jonaz", nome: "Jonaz", lado: "heroi",   // "heroi" | "inimigo" | "vilao"
      corAssinatura: "#f9c22b",
      sprite: "jonaz", retrato: "jonaz",
      pv: { atual: 45, max: 60 }, pm: { atual: 20, max: 50 },
      turnosPorRodada: 1, turnosUsados: 0,
      condicoes: ["lento"],
      fileira: "frente",            // "frente" | "tras" (só visual; heróis)
      entrada: "desliza",           // "desliza" | "fade" | "surge" | "pose" (exceções com animação própria)
      pose: null,                   // null = automática pelo PV; ou forçar "ferido", "caido"...
      posFileira: 0,                // ordem dentro da fileira (0 = em cima). Não afeta o status.
      ordemPainel: 0,               // posição da barra no painel de status (editável à mão; independente da formação)
      revelado: true, mostrarPv: false, // mostrarPv = PV atual (regra da casa)
      estudo: null,                 // null | { nivel: 7 | 10 | 13, por: "feitan", info: { tracos, afinidades, ataques... } } (inimigos)
      posicao: null                 // {x, y} ou null = formação automática
    }
  ],
  efeitos: []                       // números flutuantes: { id, alvoId, tipo, valor }
  // Reservado (NÃO implementar agora):
  // cena: { lugar, presentes, relogios } → janeiro
  // pedidos: [] → jogadores pedem ações, mestre aprova
  // cutscene: null → { id, iniciadaEm }, tocada em sincronia
};
```

`dados/coringas.json`: amorfo, espírito, besta, voador, planta, construto magitec, humanoide armado, aldeão, nobre (só nome, sprite e PV/PM editáveis; nada do bestiário).

## Estrutura de pastas sugerida

```
errante-vtt/
  index.html  palco.html  package.json  README.md
  docs/  SPEC.md  DECISOES.md  GLOSSARIO.md  TOUR.md (no fim)
  src/
    estado.js  canal.js  persistencia.js  paleta.js
    mesa/  palco/  estilos/
  dados/  acoes.json  coringas.json  herois.json
  assets/  cenarios/  sprites/  retratos/  icones/  fontes/
```

## Marcos (pare ao fim de cada um para eu testar)

**Marco 0 — Preparação.** Me guie para instalar Node, Git e VS Code (Windows, como quem nunca abriu um terminal). Criar o projeto com Vite, git, `.gitignore`, README com os avisos da licença, `docs/` com SPEC, DECISOES e GLOSSARIO. Me mostre o "olá" rodando no navegador.

**Marco 1 — Palco local.** Palco completo do modo combate com um estado falso (3 heróis, 2 inimigos, um não revelado), placeholders, escala pixel perfeita com `dpr`, modo debug `D`. `estado.js`, `renderizar(estado)`, `estadoPublico`, `canal.js` local (BroadcastChannel) e uma mesa mínima que muda PV. Me mostre no console do palco que o nome do inimigo não revelado não chegou.

**Marco 2 — Mesa completa (local).** Cenas com frases de ambiente (`dados/cenas.json`), elenco, editor de formação, editor do painel, editor de cenário (faixa de chão), ação rápida, turnos com sugestão de alternância, desfazer, menu, banner, diálogo, condições, revelar inimigo, mostrar PV, cortina, autosave, exportar/importar.

**Marco 3 — Online.** Serviço de tempo real (eu crio a conta e faço login; você me guia clique a clique), código de sala, regras de segurança testadas (mostre que um navegador sem login NÃO consegue escrever), palco publicado no GitHub Pages, reconexão.

**Marco 4 — Arte e ensaio.** Carregar meus PNGs de `assets/` com fallbacks; fonte provisória com acentos. Roteiro de ensaio que eu sigo sozinho: uma luta com 5 heróis × 4 inimigos e um vilão com 2 turnos por rodada, com o palco aberto no celular e em outro computador. Lista de bugs encontrados e corrigidos. README com link e prints. Por fim, `docs/TOUR.md`: ordem de leitura do código para eu estudar em janeiro, com perguntas para eu responder sozinho a cada arquivo.

## Pronto para a mesa quando

- Monto um combate com 8 heróis e 6 inimigos e rodo 3 rodadas sem tocar no código.
- F5 em qualquer janela não perde nada.
- Um jogador abre o link num monitor 1080p, num notebook com zoom 125% e no celular deitado, e lê as barras; no debug, a escala real é inteira nas telas grandes.
- Nenhum dado de inimigo não revelado aparece no palco nem nos dados do serviço.
- Ninguém além da minha conta altera a sala.
- Se a internet do jogador cair e voltar, o palco se recupera sozinho.
- Funciona sem nenhuma arte desenhada.

## Fora do escopo agora

Modo cena e relógios, PWA, validação de cor, escudo do mestre, jogadores interagindo, cutscenes, fichas, dados, cálculo de regras, Pontos de Fabula/Ultima, animação de sprite, troca de paleta por código, som, mapas, servidor próprio.

## Primeira tarefa

Leia tudo e me diga em até 10 linhas o que parece problemático, arriscado para o prazo de dezembro, ou ambíguo. Depois, comece o **Marco 0**.
