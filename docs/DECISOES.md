# Decisões técnicas

Cada decisão com o motivo, em linguagem simples. Atualizado a cada marco.

## Marco 0 — Preparação

### Dependências
- **Vite** (única dependência até agora): roda o site no seu computador enquanto a gente constrói, recarrega a página sozinho quando um arquivo muda, e gera a pasta `dist/` pronta para publicar.

### Duas páginas no mesmo projeto
- `index.html` é a **mesa** e `palco.html` é o **palco**. O `vite.config.js` avisa o Vite para publicar as duas (por padrão ele só publicaria uma).

### Pasta `public/` para arte, fontes e dados
- Tudo que fica em `public/` é copiado **do jeito que está** para o site publicado. Coloquei lá `assets/` (fontes, sprites, retratos…) e `dados/` (os `.json`).
- **Por quê:** o palco vai procurar imagens pelo nome na hora (ex.: `assets/sprites/jonaz/parado.png`). Se a imagem passasse pelo Vite, ele mudaria o nome do arquivo, e o código não acharia. Também deixa você trocar um PNG sem mexer no código.
- Por isso os caminhos ficam `public/assets/...` no seu computador, mas `assets/...` no site.

### Caminhos relativos (`base: './'`)
- O GitHub Pages publica o site numa subpasta (`usuario.github.io/aberwyn-vtt/`). Com caminhos relativos, o site funciona lá sem configurar o endereço.

### Escala pixel perfeita já no Marco 0
- O teste das fontes só vale se a escala estiver certa, então a ampliação inteira com `devicePixelRatio` já entrou agora (`src/palco/main.js`). No teste deste computador: zoom do Windows de 125% (`dpr 1,25`) e escala real 2×, exatamente o caso que a especificação previu.
- Tecla `D` no palco mostra a escala e o `dpr`.

### Ampliar com `zoom`, não com `transform: scale` (discordando da SPEC)
- A SPEC sugeria `transform: scale(escalaReal / dpr)`. No teste do Cadu, as **letras** ficavam certas, mas as **bordas de 1 px** não: com zoom de 125%, a borda saía com 1 pixel real (deveria ter 3, na escala 3×), e com zoom out ficava grossa demais.
- **Motivo:** o navegador arredonda as bordas para pixels reais *antes* de aplicar o `transform`. Com o `zoom`, ele amplia primeiro e arredonda depois, então 1 px da grade vira exatamente `escalaReal` pixels reais, para letras e bordas.
- O palco fica dentro de um `#suporte`, que só cuida de centralizar; o `#palco` recebe o `zoom`.
- Medido depois da troca, com `dpr` 1,25: borda de 3 pixels reais na escala 3× e de 2 na escala 2×.

### Tamanho das fontes por variável CSS
- Os tamanhos nativos (27 px, 18,6667 px, 8 px) ficam num lugar só (`src/estilos/fontes.css`), para ninguém arredondar sem querer.

### `font-display: block`
- O navegador espera a fonte pixel carregar em vez de mostrar uma fonte comum por um instante (evita o "pisca" de letra trocando).

## Marco 1 — Palco local

### Arquivos e papéis
- `src/estado.js`: o estado (a verdade da mesa), as funções que o alteram (`aplicarDano`, `encerrarTurno`…) e o filtro `estadoPublico`. Nenhuma regra de jogo: o mestre decide, o app guarda.
- `src/canal.js`: única peça que sabe como o estado viaja. Agora é local (BroadcastChannel, entre abas do mesmo navegador); no Marco 3 ganha o modo online com as mesmas funções.
- `src/paleta.js`: a paleta (Apollo + extras, ordem fixa, `versao: 1`) e os **nomes de uso** (`janela`, `pv`, `inimigo`…). O CSS só usa variáveis geradas daqui (`--cor-janela`…).
- `src/palco/layout.js`: só matemática da formação (onde ficam os pés de cada um).
- `src/palco/palco.js` (era `renderizar.js` no Marco 1): desenha o palco a partir do estado público.
- `src/palco/pixel.js`: cria pixel art por código (setas, elipses, rótulos 3×5) e recolore imagens.
- `src/mesa/main.js`: mesa **mínima**, só para testar. A mesa de verdade é o Marco 2.

### `estadoPublico`: o que nunca sai da mesa
- Inimigo não revelado vira `{ id: "oculto-1", nome: "???", lado: "inimigo" }`: sem nome, sem PV, sem ficha. O **id também é trocado**, porque `guardiao-marco` já contaria quem é. E o lado vira "inimigo" mesmo se for vilão (a moldura vinho também contaria).
- PV e PM **máximos** só com Estudo 7+; PV **atual** só com "mostrar PV" ligado (regra da casa) e Estudo 7+. O cartão de Estudo só leva os campos do nível alcançado.
- Anotações do mestre nunca vão.
- **Risco anotado (decidir no Marco 4):** para desenhar a silhueta, o palco precisa do sprite do inimigo escondido, e o **nome do arquivo** do sprite aparece no F12 (ex.: `assets/sprites/guardiao-marco/parado.png`). Opções: dar nomes neutros às pastas de sprite de inimigos secretos, ou gerar a silhueta como imagem própria. Por enquanto nenhum inimigo tem arte, então não vaza nada.

### Palco: atualizar em vez de recriar (a versão "esperta")
- O jeito mais simples seria apagar o palco e recriar tudo a cada estado. Mas aí nenhuma animação funciona: o passo de quem age, o rastro branco do dano e a fita abrindo precisam que **o mesmo elemento** continue na tela entre um estado e o outro.
- Por isso o palco guarda cada lutador e cada linha de status por id e só atualiza o que mudou. Peças que não animam (os rostos da faixa de turnos, o menu) são recriadas a cada vez, que é mais simples.

### Medidas das fontes (medidas no navegador)
- `line-height` igual à soma de "subida + descida" da fonte, senão a letra cai em meio pixel e borra: **título 30 px**, **rótulo 9 px**. O corpo usa 19 px (dá 1 px inteiro de diferença, sem meio pixel).
- Com essas alturas, a tinta começa em: corpo, maiúsculas da linha 4 à 15 da caixa (acentos sobem até a 0, cedilha desce até a 19); título, da 6 à 24; rótulo, da 1 à 7.

### Molduras com `border-image` (9-slice)
- As janelas e plaquinhas usam `assets/ui/janela.png` e `assets/ui/plaquinha.png` (os modelos que o Cadu já desenhou), cortados em 9 pedaços pelo CSS. Redesenhar o PNG muda todas as janelas sem mexer no código.
- As caudas da fita são recortadas de `assets/ui/fita.png` e repintadas na cor de quem age. A seta de quem age é `assets/ui/seta.png` (em cinzas) repintada na cor-assinatura. Os rótulos PV/PM/PI vêm de `assets/ui/rotulos.png`.

### Animações em passos de pixel inteiro
- Transições usam `steps(n)` (pulam de pixel em pixel, sem borrar), mas o número de passos é aproximado: em deslocamentos que não são múltiplos exatos, um ou outro quadro do meio da animação pode cair entre pixels. Só dura um instante; ajustar no Marco 4 se incomodar.
- A animação das letras da fita usa trechos fixos (0, 1) em vez de interpolar: interpolar deixava letras presas em meia transparência.

### Desenhos provisórios (sem arte)
- Herói sem sprite: retângulo 32×48 na cor-assinatura com a inicial. Inimigo: 32×32 (ou 64×64 se `porte: "grande"`) em vermelho, ou vinho para vilão. **`porte` é um campo novo**: sem arte não há como saber o tamanho do inimigo; quando houver PNG, o tamanho real da imagem decide.
- Rosto na faixa de turnos: quadrado 24×24 na cor com a inicial.

### Coisas que ajustei da SPEC (registrar para o Cadu decidir)
- **Fita mais larga (pedido do Cadu):** a SPEC limita a 300 px para sobrar o canto dos ícones de relógio. Como os relógios só chegam em janeiro, a fita agora vai até **440 px** (x 20–460) antes de quebrar a linha. Quando houver relógio visível, volta a 300 (constante `LARGURA_MAX_FITA` em `palco.js`).
- **Fita com 2 linhas** passa da faixa de HUD (32–58): uma linha já ocupa 19 px, duas ocupam 34. Fica por cima do campo nesses casos. Com 440 px, isso quase não acontece.
- **Fita some animada:** as caudas recolhem e a faixa fecha para o centro (~0,2 s). Se vier outra mensagem, a nova só abre depois que a antiga fechou.
- **Status na coluna larga** mostra `atual/máx` só do PV; o PM aparece pela barra (o número do PM vem com o balão de clique, no Marco 2).
- **Números flutuantes** nascem ao lado do peito do alvo, para não cobrir a fita.

## Marco 2 — Mesa completa (local)

### A mesa é pixel art também (grade de 960×540)
- Igual às prévias: a mesa é uma grade de 960×540 ampliada por número inteiro, com as mesmas fontes nos tamanhos nativos.
- **Diferente do palco:** a escala segue só a **largura** da janela. Num monitor 1080p com a barra do navegador, a altura não cabe em 2×, e cair para 1× deixaria a mesa pequena demais. Então fica em 2× e a página rola um pouco na vertical. Com F11 (tela cheia) cabe inteira.

### O palco ao vivo dentro da mesa é o MESMO código do palco
- `src/palco/palco.js` virou `criarPalco(elemento)`: monta um palco em qualquer `<div>`. A página do jogador e a prévia "O QUE OS JOGADORES VEEM" usam a mesma função, então o mestre vê exatamente o que o jogador vê.
- **VER COMO [JOGADORES | MESTRE]:** "mestre" desenha com tudo revelado (nomes, PV) **só na tela da mesa**; isso nunca vai para o canal. Ver como um jogador específico depende das fichas (Marco 5).
- A prévia é criada uma vez e nunca sai da tela, senão as animações reiniciariam a cada clique.

### Clique na linha = quem age; clique direito ou ✎ = ficha
- A prévia dizia "clique num herói: ficha". Mas escolher quem age é a jogada mais comum, e a SPEC pede "uma jogada comum em 3–4 cliques" e "o raro mora na ficha ou num clique direito". Então: **clique = quem age**, **clique direito (ou ✎) = ficha**. Fácil de inverter se preferir.

### DESFAZER guarda cópias inteiras do estado
- Antes de cada ação, a mesa guarda uma cópia do estado inteiro (até 50). Desfazer = voltar para a cópia anterior. Simples, e desfaz a ação **inteira** (dano em 2 alvos + PM + condição de uma vez), como a SPEC pede.
- Pré-visualização (alvos marcados, menu destacado) e coisas automáticas (frase de efeito, aviso que some sozinho) **não** entram no DESFAZER, senão o Ctrl+Z ficaria "comendo" cliques que não mudaram o jogo.

### Salvamento
- **Automático** no navegador (localStorage) a cada alteração: F5 na mesa não perde nada.
- **Arquivo .json** (botão "?" → SALVAR ARQUIVO / ABRIR ARQUIVO): backup e combates preparados antes.
- `estado.versao` subiu para 2; `migrar()` atualiza estados salvos de versões antigas, para nada se perder.

### Acerto e erro (conferido no Livro Base, p. 68–69 e 115)
- Quem não é atingido não perde PV nem recebe a condição; aparece "Errou" / "Falha!" sobre ele. **CRÍTICO** atinge todos os alvos; **FALHA CRÍTICA** e **ERROU** erram todos. Nenhum número é calculado: o mestre digita o dano de cada alvo (inclusive dobrar/dividir por afinidade).
- **Ataque multi:** um teste só é comparado com a Defesa de **cada** alvo, então dá para acertar um e errar outro. Por isso cada alvo tem o botão **✗** ("este alvo esquivou"), que vale quando o resultado é ACERTOU.
- Feitiço sem teste (cura, por exemplo): marque ACERTOU.
- **ENCERRAR TURNO** gasta um turno de quem age e passa a vez para o lado sugerido (o outro lado, se ainda tiver alguém com turno; senão o mesmo; se ninguém tiver, FIM DA RODADA fica dourado). O mestre sempre pode trocar no botão "VEZ".
- **FIM DA RODADA:** todos voltam a ter turnos, o lado que venceu a iniciativa começa (p. 61), quem estava marcado "chega no fim da rodada" entra com o aviso "<Nome> chegou!" (p. 60), e sai a frase "Rodada N." com uma frase de efeito.

### Frases de efeito (12c)
- Saem sozinhas no começo de cada rodada e quando o turno fica parado (sem nenhuma ação na mesa) por 40 s (ajustável). Ficam ~5 s na fita apagada.
- Vêm de `dados/cenas.json`: as da **fase atual** do chefe (F1/F2/F3 na linha do vilão); sem frases de combate, usa as de ambiente. Ordem embaralhada sem repetir. As de **tensão** entram quando houver relógios (janeiro).

### Cenário e faixa de chão
- O editor (botão CHÃO) guarda o ajuste **na mesa** (`estado.chaos`), porque um site não pode gravar arquivos no seu computador. Para fixar no arquivo, copie os números para `dados/cenarios.json`.
- Cenário sem arquivo (ou com arquivo que ainda não existe) mostra as faixas de cor.

### Cortina
- Nome da campanha, rótulo opcional, a linha da sessão, "— quem disse" opcional e a próxima sessão, editados no painel CORTINA (aparece no lugar da AÇÃO). Os rostos que acendem quando cada jogador chega e o botão "Entrar" (som) dependem do modo online e do som (Marco 3 / janeiro).

### O que ficou para depois (de propósito)
- **Relógios, som, pendentes, Pontos de Fabula, ÉPICA:** janeiro (aparecem desligados na mesa).
- **Clique direito em texto do palco para editar:** a correção de textos está nos campos da mesa (botões Aa, Tt, ␣ e o aviso "NÃO CABE"). O clique direito no palco ao vivo fica para o Marco 4.
- **Posição manual de inimigo** (`posicao`): o formato existe, mas ainda não há editor (arrastar no palco). Marco 4, se fizer falta.
- **Status com 5 a 8 heróis** não mostra ícones de condição (não sobra espaço sem esmagar a barra); nesses casos as condições aparecem nos rostos da faixa de turnos.

### Tela "Gire o celular" (feita depois do Marco 2, a pedido do Cadu)
- Aparece no palco quando a tela está **em pé e é de toque** (celular/tablet). Num computador com a janela estreita ela não aparece; para testar no computador, abra `palco.html?gire=1`.
- O celular é desenhado **quadro a quadro** num canvas de 96×64 (nunca girado por código, que serrilharia): em pé → deitado com o contorno de onde estava sumindo → telinha acendendo um mini palco. Arco dourado de 2 px com um brilho correndo e ponta de seta de 8 px. 28 quadros a 10 por segundo = 2,8 s.
- Segue a SPEC nova, não o GIF antigo (`gire-celular.gif`, de arco pontilhado e celular girado).
- Os desenhos estão em `src/palco/gire.js` como código (provisórios). Se o Cadu quiser desenhar à mão, dá para trocar por uma folha de quadros em `assets/ui/`.
- Grade própria de 200×320 em pé, com escala inteira em pixels reais, como o palco.

## Auditoria visual (26/11, com o painel do navegador visível e lupa de 2× a 5×)

### Restos de pintura com o `zoom` (os "quadradinhos pontilhados" do print do Cadu)
- Com o palco ampliado por `zoom`, o Chrome às vezes **não repinta** um pedaço da tela depois de uma animação: sobravam pedaços da moldura pontilhada da janela de status (quando ela deslizava e alargava na vez dos inimigos) e letras "sumidas" em falas longas.
- **Status:** não anima mais `left`/`width`. A janela vai direto para o tamanho final (a moldura é pintada uma vez só) e um recorte (`clip-path`) abre do retângulo antigo até o novo, em passos.
- **Letras (fita, aviso, diálogo):** a entrada usa `visibility` e `top` em vez de `opacity` e `transform`. Opacity/transform viram camadas separadas no navegador, e era aí que a repintura falhava.
- Testado ao vivo na escala do Cadu (2× com zoom de 125% do Windows), várias vezes: sem restos e sem letras faltando.

### Outras correções da auditoria
- **Status com 5+ heróis:** o nome ganhou 6 px e, se ainda não couber, perde letras inteiras do fim (antes era cortado no meio da letra e encostava no rótulo PV).
- **Caixa de diálogo** cresce para cima conforme o número de linhas (antes, 3 linhas encostavam na borda de baixo).
- **Inimigos** com 8 px de vão entre eles (antes ficavam colados).
- **Mesa:** a borda de quem age agora sai na cor do herói (a cor não era aplicada); campos 2 px mais altos (as letras eram cortadas embaixo); listas suspensas com setinha pixel art; ✎ do inimigo na segunda linha (caía sozinho numa terceira); linha da AÇÃO cabe numa linha só.
- **Lupa de depuração:** `inspecionar(x, y, escala)` no console (F12) do palco e da mesa amplia um pedaço da tela para conferir pixel por pixel.

### Conferido e certo
- Fita (abre do centro, caudas, letra por letra, fecha para o centro), aviso central (linha dourada, abre na vertical, título, divisor, linha), entrada em combate (clarão, heróis deslizando um atrás do outro, inimigos com fade), barra de cima e colunas da mesa.

### Ainda diferente da SPEC (pequeno, anotado para o Marco 4)
- As **cintilas** nas pontas da fita e da linha dourada do aviso ainda não existem.
- Na coluna de inimigos da mesa em escala 1× (janela estreita), a barra de rolagem pode empurrar o ✎ para uma terceira linha; em 2× (o normal no 1080p) cabe.

### Molduras sem `border-image` (o problema real do Firefox, print do Cadu de 26/11)
- No Firefox, com a página ampliada por `zoom`, o `border-image` recortava a `janela.png` errado: em vez de **uma** moldura pontilhada em volta da caixa, apareciam **várias caixinhas pontilhadas lado a lado**. O Chrome (e o painel em que eu testo) desenhava certo, por isso não aparecia para mim.
- Agora `src/molduras.js` recorta a própria `janela.png` (e a `plaquinha.png`) em pedaços: 4 cantos e um pedacinho de cada borda (4 px, um ciclo da costura). Cada pedaço vira uma variável CSS, e o CSS monta a moldura com fundos comuns (cantos por cima, bordas repetidas, cor de fundo). Fundos comuns o Firefox desenha certo com zoom.
- **O PNG continua sendo a fonte:** redesenhar `assets/ui/janela.png` à mão muda todas as janelas, como antes.
- Os tons do aviso (dourado, vermelho, vinho) recortam a mesma imagem trocando a cor da borda clara.
- Cuidado ao estilizar uma janela: usar `background-color`, nunca o atalho `background`, que apagaria a moldura.

### Fita: recorte das caudas ("segunda rebarba" e borda de baixo faltando, prints do Cadu de 26/11)
- **Erro meu, não do Firefox:** o recorte das caudas em `fita.png` estava 3 linhas acima e 1 coluna à esquerda do lugar certo. Ele cortava a borda de baixo da cauda (por isso só aparecia a de cima) e pegava um pedaço da faixa (a "segunda rebarba"). A cauda direita também estava 1 px para fora.
- Agora: a faixa da `fita.png` ocupa as linhas 3–21 e as colunas 30–82; cada cauda, as linhas 8–26. O recorte segue isso, e os pixels da ponta da faixa que vêm junto são apagados (`recolorir(…, apagar)`). Conferido montando a fita pixel a pixel e no navegador.
- Todas as imagens pequenas do palco (caudas, setas, ícones, pena, rótulos) têm `background-size: 100% 100%`, para nenhum navegador escalar a imagem diferente da caixa.

## Marco 3 — Online

### Firebase continua a escolha (conferido em 26/11/2026)
- Plano grátis (Spark) do Realtime Database: até 100 conexões simultâneas por banco (a mesa usa ~7). Passando disso, novas conexões são recusadas; quem já está conectado continua.
- Alternativa mais comum, Supabase: no plano grátis o projeto **pausa após 7 dias com pouca atividade**, um risco real com sessões semanais. Sem motivo forte para trocar.

### Como o estado viaja
- `src/online.js` é o único arquivo que conhece o Firebase. `src/canal.js` usa ele e continua com as mesmas funções (`enviarEstado`, `aoReceberEstado`): mesa e palco não mudaram de jeito de falar.
- **Dependência nova:** `firebase` (o kit oficial do Google para o navegador): sem ele, falar com o serviço exigiria reescrever o protocolo de tempo real na mão.
- A mesa grava `salas/{codigo}/publico` = `{ json, em }`. O estado vai como **texto JSON**, porque o Firebase apaga listas vazias ao gravar (o palco receberia um herói sem `condicoes` e quebraria).
- **Freio de gravação:** no máximo 10 gravações por segundo, sempre com o estado mais recente (nada se perde, só se junta).
- O canal local (abas do mesmo navegador) continua funcionando junto, para testes e para a prévia.
- **Só o estado público vai para o serviço:** o banco nunca vê nome, PV nem anotações de inimigo escondido.

### Sala e link
- Código de 5 letras/números sem os que se confundem (O/0, I/1, L), guardado no navegador da mesa (não no estado).
- O palco lê a sala do endereço: `palco.html?sala=XXXXX`. Sem `?sala`, ele escuta só a mesa local.
- **NOVA SALA** troca o código (o link antigo para de receber), útil se o link vazar.

### Login e regras (a proteção de verdade)
- Os valores de `src/config-online.js` não são segredo: qualquer site com Firebase os expõe. Quem protege são as **regras do servidor** (`database.rules.json`):
  - `salas/*`: qualquer um lê (os jogadores precisam); só quem está em `mestres/{uid}: true` escreve.
  - `fichas/{heroiId}` (Marco 5): só o mestre ou a conta ligada ao herói em `donos/{uid}`.
  - `donos` e `mestres`: ninguém além do mestre escreve; `mestres` só se marca pelo console.
  - Tudo o mais: negado. Também não dá para listar as salas (`/salas` inteiro é negado; só uma sala pelo código).
- O mestre entra na mesa com e-mail e senha criados por ele no console (a senha nunca passa por mim).
- **Teste sem login** (`node scripts/testar-regras.mjs`): tenta ler e escrever pela internet como um jogador mal-intencionado. **Teste com contas:** Rules Playground do console (o simulador local do Firebase exige um Java mais novo que o instalado; ver docs/ONLINE.md).

### Reconexão
- O Firebase reconecta sozinho e, ao voltar, entrega o estado mais recente. O palco mostra "RECONECTANDO…" (discreto, piscando) só se a conexão cair depois de ter conectado; a mesa mostra o mesmo na barra de cima.

### Ficou para depois
- **Rostos que acendem na cortina quando cada jogador chega:** exige saber quem é cada jogador, o que só existe com os logins do Marco 5. (Contar conexões anônimas exigiria deixar qualquer um escrever na sala.)

### Nome do projeto: aberwyn-vtt (26/11)
- O projeto passou de `errante-vtt` (nome provisório da SPEC) para **`aberwyn-vtt`**, por tematização. Continua sem "Fabula" no nome, como a licença pede.
- O nome da **campanha** na cortina ("Errantes") é outra coisa: é um texto editável na mesa (painel CORTINA) e não depende do nome do projeto.
- Os salvamentos do navegador mudaram de nome (`aberwyn-vtt:estado`, `aberwyn-vtt:sala`); na primeira vez, a mesa lê os antigos (`errante-vtt:…`) e muda para os novos, então nada se perde.
- A pasta no computador continua `errante-vtt` por enquanto (renomear agora quebraria o servidor que está rodando); dá para renomear depois sem mudar nada no código.

### Backup da mesa na nuvem (pedido do Cadu, 26/11)
- **Onde mora a verdade:** o estado da mesa fica no navegador do mestre (localStorage). O Firebase só tinha a cópia **pública** da sala. O risco real de perda era o navegador (limpar dados, janela anônima, outro computador).
- Agora, com o mestre logado, a mesa guarda o estado **completo** em `mesas/{uid}/backup` (texto JSON), no máximo a cada 3 s. As regras só deixam a **própria conta do mestre** ler e escrever ali.
- Ao entrar, a mesa compara o backup com o deste navegador. Se a nuvem for mais nova, pergunta: **RECUPERAR DA NUVEM** (dá para desfazer) ou **MANTER A DESTE NAVEGADOR** (que vira o novo backup). Fechar a janela sem escolher = manter (o mais seguro).
- O arquivo `.json` (? → SALVAR ARQUIVO) continua como segunda cópia.
- O plano grátis do Firebase não pausa por falta de uso; passando dos limites, desliga até o mês seguinte, mas não apaga. Ele não tem backup automático do banco: por isso a segunda cópia em arquivo.

### Publicação (26/11)
- Repositório público: **https://github.com/Chicletie/aberwyn-vtt**. Palco: **https://chicletie.github.io/aberwyn-vtt/palco.html?sala=CÓDIGO** (a mesa também fica publicada, em `.../aberwyn-vtt/`, para o mestre usar de qualquer computador; sem a conta dele, ninguém escreve na sala).
- Publicação automática pelo GitHub Actions (`.github/workflows/publicar.yml`): cada envio para `main` gera o site e publica em ~1 minuto.
- **Privacidade:** os commits deste projeto usam o e-mail privado do GitHub (`…@users.noreply.github.com`), configurado só neste repositório. O histórico foi reescrito antes do primeiro envio para tirar o Gmail. A configuração geral do Git do computador não mudou.
- O GitHub pediu a permissão "workflow" para enviar o arquivo de publicação; o Cadu autorizou no próprio GitHub (`gh auth login … --scopes workflow`).

### Testes do Marco 3 (26/11)
- **Sem login** (`node scripts/testar-regras.mjs`, pela internet): ler a sala PERMITIDO; escrever na sala, ler/escrever fichas, backups, donos, mestres e raiz NEGADO.
- **Com conta que não é do mestre** (Rules Playground, feito pelo Cadu, UID `jogador-teste`): gravar na sala NEGADO; ler o backup da mesa NEGADO.
- **Ponta a ponta:** a mesa do Cadu, logada, grava a sala `5UUD8`; o palco publicado no GitHub Pages, aberto pela internet, mostra a mesa ao vivo (o vilão escondido chega como "???", sem nome nem PV).
- **Reconexão:** o aviso RECONECTANDO… está ligado ao estado de conexão do Firebase, mas não simulei uma queda de internet de verdade; fica para o ensaio do Marco 4 (desligar o Wi-Fi do celular no meio da sessão).

### Alerta do GitHub sobre a "Google API Key" (26/11)
- O GitHub avisou que `src/config-online.js` tem uma chave do Google. É a `apiKey` do Firebase para sites: ela **não é senha**, só diz qual projeto usar, e todo site com Firebase a mostra para qualquer visitante. Quem protege os dados são as regras do servidor (testadas no Marco 3).
- Mesmo assim, duas travas extras (feitas pelo Cadu, no console): **restringir a chave aos endereços do projeto** (GitHub Pages e localhost) e **desligar o cadastro aberto** no Firebase Auth (as contas são criadas só pelo mestre, como pede a SPEC). Depois, o alerta é fechado no GitHub como "Won't fix", com o motivo.

### Pedidos do Cadu depois do teste no celular (26/11)
- **App instalável (PWA)** sai de "janeiro" e entra no Marco 4: abre deitado e em tela cheia, então o palco ganha um degrau de escala (3× → 4× num celular comum). O mestre pede para os jogadores instalarem.
- **Moldura em volta do palco:** Marco 4 (arte).
- **Entrada dos jogadores (Marco 5):** tela inicial com nome + chave **antes** de ver a mesa → código da sala (lembrado nas próximas vezes) → cortina com os retratos de quem já entrou acendendo ("aguardando os jogadores"). A surpresa fica para quando a mesa abre. A "presença" (quem está conectado) usa o recurso do Firebase que percebe quando alguém sai ou cai.

## Marco 4 — Arte e ensaio

### Arte com reserva (`src/arte.js`)
- Ninguém espera imagem: quem desenha pergunta "já tem a arte?" e recebe a resposta na hora. Se ainda não tem, o arquivo é procurado em segundo plano e, quando chega, a mesa e o palco se redesenham. Arquivo que não existe é anotado e não é procurado de novo.
- O tamanho de cada lutador no campo passa a ser o do sprite real (o da folha de quadros); sem sprite, continua o provisório.
- **Vazamento do nome do sprite (risco anotado no Marco 2): resolvido.** Para inimigo escondido, a mesa desenha a silhueta (todo pixel visível vira preto) e manda **a imagem pronta**, sem o nome do arquivo. Conferido no F12 do palco: nenhum "guardiao"/nome de pasta chega, e a silhueta tem ~1 KB.

### Moldura, tela cheia e app instalável (pedidos do Cadu depois do teste no celular)
- **Moldura:** uma janela de 6 px por fora do palco, na mesma escala, atrás dele. Onde a tela não tem sobra (celular em tela cheia, de cima a baixo), ela fica fora da vista sozinha: o palco nunca encolhe por causa dela.
- **Tela cheia:** botão de quatro cantinhos no canto de cima à direita, só em tela de toque, fora da tela cheia e fora do app instalado. Tamanho mínimo de ~34 px para o dedo. No iPhone o Safari não deixa site entrar em tela cheia, então lá o botão não aparece (a saída é instalar).
- **App instalável (PWA):** `public/manifest.webmanifest` (abre `palco.html`, deitado, em tela cheia, fundo `#090a14`), ícones gerados por `scripts/gerar-icones.mjs` a partir da janela e da pena (ampliação inteira, sem borrar) e `public/sw.js`, que não guarda nada: só mostra "Sem internet" se o app abrir offline.
- **O palco lembra a última sala** (`aberwyn-vtt:sala-jogador`): o app instalado abre sem código no endereço e volta direto para a sala. Se ela estiver vazia, aparece a caixa de código.
- Bug achado no teste: o aviso "arte chegou" usava `requestAnimationFrame`, que **para quando a aba fica em segundo plano**. Com a mesa numa aba de fundo, a silhueta nunca era mandada. Trocado por `setTimeout`.

### Cintilas, textos do palco e posição manual
- **Cintilas:** uma cruzinha 5×5 (5 quadros desenhados por código) nasce no centro e corre até cada ponta junto com a faixa da fita (~0,3 s) e com a linha dourada do aviso (~0,15 s); ao chegar, estoura e some. As do aviso ficam ao lado da linha, não dentro: o recorte (`clip-path`) da linha as esconderia.
- **Clique direito num texto da prévia** (fita, aviso, diálogo, textos da cortina): menu com EDITAR…, Aa, TÍTULO, ESPAÇOS. Sem clique direito: botão **✎ TEXTOS** em cima da prévia abre todos os textos. Corrigir o aviso não reinicia o tempo dele.
- **Posição manual:** arrastar um inimigo na prévia grava `posicao` (os pés); duplo clique volta à formação automática. Os pés ficam presos dentro do campo.
- **Bug achado:** as camadas do palco cobrem a tela inteira, e a de transição (a de cima) roubava todos os cliques, inclusive o toque no inimigo para abrir o cartão no palco dos jogadores. Agora só o que está dentro de cada camada recebe clique.
- A prévia da mesa ganhou `isolation: isolate`: sem isso, as camadas do palco (z-index altos) cobriam o menu do clique direito.

### Publicação: etapas do GitHub atualizadas (27/11)
- A publicação começou a falhar com "nenhum pacote github-pages encontrado". As etapas `upload-pages-artifact` (v3 → v5) e `deploy-pages` (v4 → v5) foram atualizadas para as versões atuais. Depois disso, o GitHub ainda recusou uma vez ("tente mais tarde", falha do lado dele) e passou na nova tentativa. Se acontecer de novo: **Actions → a execução que falhou → Re-run jobs**.

### Moldura do palco, versão 2 (pedido do Cadu: "como nos jogos de RPG Maker")
- A primeira versão era só um filete da janela. O Cadu queria o que os jogos de RPG Maker fazem: **arte temática na parte escura** em volta e uma **moldura encorpada** fazendo a divisão.
- **`assets/ui/moldura-palco.png`** (34×34): cantos de 12 e um trecho de borda de 10 que se repete. Por que 10: 480 e 270 são múltiplos de 10, então os losangos fecham certinho nos quatro lados, sem pedaço cortado. Desenho: ouro com brilho no alto à esquerda, faixa azul-noite com losangos e um broche em cada canto.
- **`assets/ui/fundo-palco.png`** (32×32): tapeçaria repetida na tela toda, na mesma escala do palco, alinhada para o losango do ladrilho cair no centro do palco (fica simétrica dos dois lados). Treliça apagada, losango no cruzamento e estrelinhas: os mesmos motivos do divisor e das cintilas.
- Os dois PNGs foram gerados por `scripts/gerar-moldura-palco.mjs` como **versão provisória**: o Cadu pode redesenhar à mão. Depois disso, não rodar o script de novo (sobrescreveria o desenho).

### Moldura do palco, versão 3: "Pena e Fio" + manuscrito + luz da Fabula
- A versão 2 (losangos geométricos) ficou "genérica, sem sabor" (Cadu). Ele escolheu juntar **Pena e Fio** e o **manuscrito apagado**, com **a luz da Fabula, as estrelas**.
- **A moldura é o fio:** um fio dourado trançado (voltas inclinadas a cada 5 px) com um **nó** em cada canto e uma estrela de luz no nó.
- **A pena** (`ornamento-pena.png`), no alto à esquerda, com o bico encostando no fio, como quem o escreve; da ponta sobem **luzinhas douradas**.
- **O novelo** (`ornamento-novelo.png`), embaixo à direita, de onde o fio sai. Pena em cima e novelo embaixo formam uma diagonal: a composição não fica espelhada (simétrica demais parece genérico).
- **O fundo é uma página de manuscrito apagado** (`fundo-palco.png`): linhas de escrita ilegível na cor da tinta, com palavras faltando (o tema do apagamento).
- **O céu é desenhado pelo código, não pelo ladrilho** (`src/palco/ceu.js`): estrelas em lugares únicos, constelações ligadas por **fios** pontilhados (os Laços) e algumas estrelas que **piscam** devagar. No ladrilho, a constelação se repetia em grade e denunciava a repetição. O sorteio é repetível: o mesmo tamanho de tela dá sempre o mesmo céu.
- **Escala:** o palco continua usando a maior escala inteira que cabe. Numa tela 16:9 em tela cheia (ex.: 1920×1080 com F11), ele ocupa tudo e a moldura não aparece; numa janela comum do navegador, ela aparece inteira. Diminuir o palco só para mostrar a moldura deixaria o texto menor, e a leitura vem antes da decoração.
- Todas as peças são PNGs provisórios em `public/assets/ui/` para o Cadu redesenhar.

### Moldura do palco, versão 4: o mapa celeste sobre a mesa, e a tinta que apaga
- Retorno do Cadu sobre a v3: as estrelas ficaram ótimas; o novelo não se entendia (e a posição ajudava pouco), as "palavras" do fundo ficaram esquisitas, a pena estava mal posicionada. Pediu **um mapa celeste, como se estivesse sobre uma mesa**, com mais coesão, e o **apagamento** como **um tinteiro tombado** cuja tinta escorre **apagando as estrelas**, crescendo **ao longo dos arcos**.
- **Mapa:** o papel é azul-noite (`fundo-palco.png`, só textura). O código desenha anéis pontilhados e meridianos **centrados no palco** (o palco é o centro do mapa), uma régua de graus como de astrolábio (marcas douradas a cada 30°), estrelas e constelações ligadas por fios (os Laços).
- **Sem novelo e sem palavras.** O fio continua sendo a moldura.
- **Tinteiro tombado** (`ornamento-tinteiro.png`) à esquerda, embaixo, com a boca virada para o palco, e a **pena caída** apoiada logo acima (`ornamento-pena.png`, bico sujo de tinta).
- **A tinta:** sai da boca do tinteiro e escorre (mais para baixo que para cima, com "dedos" escorrendo), por baixo da moldura e do palco. **Onde ela passa, as estrelas viram um vulto apagado**, os fios e os anéis somem, e nenhuma estrela pisca.
- **Progressão:** novo campo `tinta` no estado (0 a 5, padrão 1) e o controle **TINTA** na mesa (direita, CENA E CENÁRIO). Ele vai para os jogadores (não é segredo) também na cortina. Mudar o nível faz a mancha crescer ou encolher aos poucos (~1 s).
- O papel foi clareado para azul-noite porque a tinta preta sobre o fundo quase preto não aparecia.

### Moldura do palco, versão 5: a mesa com objetos
- Retorno do Cadu: sentiu falta do **novelo**; o tinteiro pedia **mais detalhe, perspectiva e tamanho** (na escala da pena, para não parecer minúsculo num mapa enorme); a tinta ficou boa; e pediu **mais objetos de mesa** (mapas, papéis jogados).
- **Novelo de volta, e agora claro:** embaixo à direita, com o fio saindo dele e entrando **no nó do canto da moldura**. Assim se lê que a moldura é o fio desenrolado do novelo.
- **Tinteiro novo** (60×46): vidro quadrado deitado na diagonal, mostrando a **face de cima** (perspectiva), rótulo com a estrela da Fabula, gargalo dourado, boca aberta para o palco, sombra na mesa e a **rolha** que pulou.
- **Objetos novos:** uma **folha de mapa** jogada (litoral, rota pontilhada e um X vermelho), metida debaixo do canto de cima à esquerda, e um **compasso de navegação** em cima à direita.
- **Profundidade:** os objetos ficam **por baixo da moldura**: o que encosta nela parece metido debaixo do fio. As sombras na mesa não têm contorno, para lerem como sombra e não como objeto.
- No celular deitado em tela cheia só sobram as laterais (~60 px da grade): os objetos cabem quase inteiros; o tinteiro pode perder uns pixels da ponta.

### Moldura do palco, versão 6: os objetos vão para os cantos da tela
- Retorno do Cadu: concentrar os objetos perto da moldura deixava **os cantos vazios**; o certo é **aproveitar o espaço**, com objetos maiores e **saindo da tela** de propósito (dinamismo). Também pediu: novelo mais detalhado e com **ligação pensada com o nó** e **fio orgânico**; tinteiro **mais quadrado** e **sem sombra** (a sombra cobria a tinta de um jeito estranho); **pena melhor e mergulhada na tinta** (para explicar o bico melado); compasso maior, com **esquadro e lápis**; **mapa maior**, só um pedaço para dentro.
- **Objetos presos aos cantos da TELA**, não do palco (`OBJETOS_DA_MESA` em `src/palco/main.js`): mapa no canto de cima à esquerda, novelo no de cima à direita, instrumentos (esquadro, compasso e lápis) no de baixo à direita, tinteiro e pena no de baixo à esquerda. Ficam por baixo da moldura e do palco; em tela estreita, o palco cobre parte deles, como objetos debaixo de um livro.
- **O fio do novelo é desenhado pelo código** (`desenharFio` em `ceu.js`): uma curva com barriga e uma ondulação leve, do novelo até o nó do canto de cima à direita da moldura. Ele se adapta a qualquer tamanho de tela.
- **Tinteiro virado** para a beirada da tela: a poça escorre para onde dá para ver (e um pouco para fora da tela), e a **pena fica com o bico dentro da poça**. A poça mínima (tinta 0) já é grande o bastante para cobrir o bico.
- Os PNGs da pena e do tinteiro são desenhados com a luz do alto à esquerda e **espelhados** no fim do script (`espelhar`); os pontos de encaixe já estão espelhados nos comentários.

### Moldura do palco, versão 7: mesa espalhada e os objetos dos personagens
- Retorno do Cadu: a perspectiva do tinteiro estava errada (**a mesa é vista de cima**); levar tudo para os cantos **não** era a resposta: é para **espalhar, com pouca simetria, como uma mesa de verdade**; e **a tinta escorre para dentro**, então o tinteiro fica **virado para o palco**.
- **Tinteiro visto de cima** (64×40): a face de cima com o rótulo, uma faixinha da lateral embaixo (a espessura), a tinta lá dentro escurecendo o lado de baixo do vidro, gargalo e boca para a direita (para o palco). A rolha caída virou um disco de cortiça. Sem sombra.
- **Layout espalhado** (`OBJETOS_DA_MESA` em `src/palco/main.js`): as posições contam a partir do canto do palco, em alturas diferentes, uns debaixo da moldura e outros saindo da tela. Em telas largas, os objetos se afastam um pouco do palco (a "folga"), para ocupar a mesa toda.
  - **Esquerda:** mapa saindo pelo alto, pena e tinteiro no meio (a tinta escorre para dentro, por baixo do palco) e instrumentos embaixo.
  - **Direita:** pincel saindo pelo alto, novelo no meio (o fio desce solto até o nó do canto de baixo) e baralho embaixo.
- **Um objeto por personagem (PJ)** (decisão do Cadu):
  - **Wesley:** um baralho, com o monte, cartas espalhadas e uma virada (estrela vermelha).
  - **Nue:** um pincel molhado de tinta **vermelho-sangue**, com a pincelada que ele deixou. Reforça a ideia de que quem está nessa mesa "produz" o mapa do centro.
  - **Joshua, Drake e Hilda:** a definir depois da sessão 0. O lado direito tem menos objetos e espera por eles.

### Ajustes de escala e de traço (versão 8)
- **Baralho** fora de escala (pequeno demais): a carta passou de 18×26 para 30×44, na escala da pena e do tinteiro. A carta virada ficou menos torta, para a estrela não parecer um X.
- **Pincel da Nue** agora é um **pincel japonês de caligrafia**: cabo de bambu longo e fino, com nós; virola preta; cerdas brancas afinando até a ponta fina, molhada de vermelho-sangue; um cordãozinho vermelho no fim do cabo.
- **A pincelada** é caligráfica: começa apoiada (larga e mais escura), corre e afina, e termina em **fiapos secos** (cada fio de cerda falha num ponto diferente). É tinta no papel, então não tem contorno: é desenhada por baixo do pincel, só nos pixels vazios.
- **Rolha** do tamanho da boca do tinteiro: um cilindrinho de cortiça caído de lado, não um disco.
- **O fio do novelo** não podia ser uma curva lisa: um novelo que cai e rola deixa o fio solto. Agora ele passa por pontos espalhados dos dois lados do caminho (ondas desiguais), dá uma **laçada** no meio e chega ao nó por uma curva suave que passa por todos esses pontos (Catmull-Rom).
- Aprendizado do teste: o servidor de desenvolvimento (Vite) às vezes não percebe arquivos alterados por script e continua servindo a versão antiga. Se a tela não mudar depois de uma alteração, **reinicie o `npm run dev`**.
