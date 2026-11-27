# Tour pelo código (para estudar em janeiro)

Uma ordem de leitura do projeto, do mais simples ao mais cheio de peças. Cada parada tem perguntas para você responder **sozinho**, de preferência **escrevendo a resposta** (num caderno ou num arquivo seu), antes de seguir.

Não precisa entender cada linha. O objetivo é entender **o que cada arquivo faz, por que ele existe e como conversa com os outros**. Quando travar numa palavra, procure em [`GLOSSARIO.md`](GLOSSARIO.md); quando quiser saber "por que foi feito assim", procure em [`DECISOES.md`](DECISOES.md).

**Como estudar cada arquivo:**
1. Leia o comentário do topo.
2. Leia só os nomes das funções (as linhas com `function`).
3. Escolha **uma** função e siga o que ela faz, linha por linha.
4. **Mude algo pequeno e veja o que acontece** (`npm run dev`). Depois desfaça. Mexer é a melhor parte: o Git guarda a versão certa, e `git checkout -- arquivo` volta tudo.

---

## Parte 1 — O esqueleto (1 a 2 dias)

### 1. `package.json` e `vite.config.js`
O "documento de identidade" do projeto e a configuração da ferramenta que monta o site.
- O que acontece quando você digita `npm run dev`? E `npm run build`? Onde isso está escrito?
- Por que existem **dois** arquivos HTML de entrada (`index.html` e `palco.html`)?
- O que o `base: './'` muda? (Dica: [`DECISOES.md`](DECISOES.md), "Caminhos relativos".)

### 2. `index.html` e `palco.html`
As duas páginas: a mesa (sua) e o palco (dos jogadores).
- Quase não há conteúdo nesses arquivos. Então de onde vem tudo o que aparece na tela?
- Qual linha liga cada HTML ao seu JavaScript?

### 3. `src/paleta.js`
As cores do projeto, num lugar só.
- Por que guardar as cores num arquivo JS **e** passá-las para o CSS (`aplicarPaletaNoCss`)? O que ganharíamos e perderíamos guardando só no CSS?
- Mude o dourado para outra cor. Em quantos lugares da tela ele aparece?

---

## Parte 2 — O coração: o estado (2 a 3 dias)

### 4. `src/estado.js` ★ o arquivo mais importante
Tudo o que existe na mesa (heróis, inimigos, rodada, quem age…) é um único objeto, o **estado**. Este arquivo cria, muda e filtra esse objeto. **Não desenha nada.**
- Leia `criarEstadoExemplo`. Desenhe no papel o formato do estado (uma "árvore" com os campos).
- Escolha `executarAcao`. Que passos ela segue? Por que um ataque **crítico** acerta mesmo que o alvo esteja marcado com ✗? (Confira no livro: p. 68–69.)
- `estadoPublico` é a função de **segurança** mais importante do projeto. Liste tudo o que ela **tira** antes de mandar aos jogadores. Por que o inimigo escondido ganha um id como `oculto-1` em vez do id verdadeiro?
- Por que as funções recebem o estado e o **alteram**, mas nunca desenham? O que ganhamos separando "mudar" de "desenhar"?

### 5. `src/persistencia.js`
Salvar no navegador, salvar em arquivo, e o **desfazer**.
- Como o desfazer funciona? (Dica: "fotografias" do estado.) Por que o limite de 50?
- O que é `localStorage`? Abra o F12 → Application → Local Storage na mesa e ache o estado salvo.

### 6. `src/dados.js` e `public/dados/*.json`
Os arquivos que você edita à mão (heróis, cenas, cenários).
- Por que esses dados ficam em `.json` separados, e não dentro do código?

---

## Parte 3 — O palco: desenhar (3 a 4 dias)

### 7. `src/palco/layout.js`
Só matemática: onde ficam os pés de cada um no campo.
- Por que este arquivo não desenha nada? Como isso facilita testar?
- Mude `X_FRENTE` e veja os heróis andarem.

### 8. `src/palco/pixel.js` e `src/molduras.js`
Pixel art feita por código: setinhas, elipses, molduras recortadas de um PNG.
- O que `pixelArte` recebe e o que devolve? Desenhe um coração 7×6 com ela.
- Por que as molduras não usam `border-image` do CSS? (Dica: Firefox + zoom, em [`DECISOES.md`](DECISOES.md).)

### 9. `src/arte.js`
Procura os sprites e retratos; se não existem, o app usa o desenho provisório.
- Por que ninguém "espera" a imagem chegar? O que aconteceria com a tela se esperasse?
- Explique com suas palavras o problema do **nome do arquivo** do sprite do vilão escondido e como a silhueta resolveu.

### 10. `src/palco/palco.js` ★ o maior arquivo
Recebe um estado e desenha a tela inteira dos jogadores.
- Leia só `renderizar`. Em que ordem ele desenha as partes?
- Por que os lutadores são **guardados** num `Map` e atualizados, em vez de apagados e recriados a cada estado? (Dica: "versão esperta", em [`DECISOES.md`](DECISOES.md).)
- Ache onde a fita escreve **letra por letra**. Mude a velocidade.

### 11. `src/palco/main.js` e `src/palco/gire.js`
A página do palco: escala inteira, tela cheia, "Gire o celular", código da sala.
- Por que a escala é calculada em **pixels reais** (`devicePixelRatio`) e arredondada para baixo?
- Siga o caminho de quem abre o link **sem** `?sala=`. E de quem abre o app instalado.

### 12. Os estilos: `src/estilos/*.css`
- Por que tantas animações usam `steps(...)`? O que aconteceria sem ele numa tela de pixel art?

---

## Parte 4 — A mesa: os botões do mestre (2 a 3 dias)

### 13. `src/mesa/ui.js`
Peças pequenas e reaproveitáveis: botão, campo de texto, janela.
- O que a função `h` faz? Por que escrever `h('div', …)` em vez de HTML?

### 14. `src/mesa/main.js`
O "maestro" da mesa: liga tudo.
- Siga um clique: botão → `alterar` → função do `estado.js` → salvar → mandar ao palco → redesenhar. Escreva cada passo.
- Para que serve a fila de backup na nuvem (`agendarBackup`)? Por que não gravar a cada clique?

### 15. `src/mesa/secoes.js`, `janelas.js`, `textos-palco.js`, `posicoes.js`, `editor-cenario.js`
As partes da tela da mesa e as janelas.
- Em `posicoes.js`: como um movimento do mouse em pixels da tela vira pixels da grade do palco?
- Em `textos-palco.js`: como o clique direito descobre **qual** texto foi clicado?

---

## Parte 5 — Online e segurança (2 dias)

### 16. `src/canal.js` e `src/online.js`
Como o estado sai da mesa e chega ao celular dos jogadores.
- Qual é a diferença entre o canal **local** (BroadcastChannel) e o **online** (Firebase)? Quando cada um é usado?
- Por que a sala é gravada como **texto JSON** e não como objeto? (Dica: listas vazias.)

### 17. `src/config-online.js`, `database.rules.json` e `scripts/testar-regras.mjs` ★ segurança
- A `apiKey` está no código, à vista de todos. Por que isso **não** é um problema? Quem protege os dados de verdade?
- Leia as regras. Quem pode **ler** uma sala? Quem pode **escrever**? Quem lê o backup da mesa?
- Rode `node scripts/testar-regras.mjs` e explique cada linha do resultado.

### 18. `.github/workflows/publicar.yml`
Como o site se publica sozinho a cada envio.
- Que passos o GitHub executa? O que acontece se o `npm run build` der erro?

---

## Parte 6 — Extras (quando quiser)

- `scripts/png.mjs` e `scripts/gerar-icones.mjs`: ler e gravar PNG **sem biblioteca**, só com o zlib. Bom para entender como uma imagem é guardada (linhas, filtros, compressão).
- `public/sw.js` e `public/manifest.webmanifest`: o que torna o palco um **app instalável**.

## Desafios para depois do tour

1. Crie uma condição nova (ex.: "Confuso") do começo ao fim: estado, ícone, mesa e palco. Quantos arquivos você precisou tocar?
2. Faça o palco mostrar o número da sessão num cantinho. Onde o dado nasce, por onde passa e onde é desenhado?
3. Escreva um teste: uma função que cria um estado, executa uma ação e confere o PV do alvo.
