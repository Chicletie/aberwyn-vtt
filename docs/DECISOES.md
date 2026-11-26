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
- O GitHub Pages publica o site numa subpasta (`usuario.github.io/errante-vtt/`). Com caminhos relativos, o site funciona lá sem configurar o endereço.

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
