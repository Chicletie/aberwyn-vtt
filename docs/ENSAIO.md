# Roteiro de ensaio (Marco 4)

Um ensaio de luta completo, para você seguir **sozinho**, antes de usar a mesa com os jogadores de verdade. Leva uns 30 minutos.

**Você vai precisar de:**
- o **computador** com a mesa;
- o **celular**, fazendo papel de jogador;
- se der, um **segundo computador** (ou o notebook de alguém) com o palco aberto.

Marque cada item com `[x]` quando funcionar. Se algo der errado, anote embaixo, em **Problemas encontrados** (o que fez, o que esperava, o que aconteceu), e me mande.

## 1. Preparar (no computador)

- [ ] Abra a mesa publicada: https://chicletie.github.io/aberwyn-vtt/ e entre com a sua conta (**ENTRAR**, no topo). A bolinha fica verde e aparece **SALA XXXXX**.
- [ ] Clique em **SALA** → **COPIAR LINK** e mande o link para o seu celular (WhatsApp, e-mail, o que for).
- [ ] Monte a luta: **5 heróis** e **4 inimigos + 1 vilão**. O exemplo já tem 5 heróis e 3 espectros; adicione **+ INIMIGO** e escolha um coringa. No vilão, abra a ficha (✎) e ponha **TURNOS/RODADA = 2**.
- [ ] Deixe o vilão **escondido** (não revelado).

## 2. O celular como jogador

- [ ] Abra o link no celular, **deitado**. Em pé, deve aparecer "Gire o celular".
- [ ] Toque no **botão de tela cheia** (os quatro cantinhos, no canto de cima). O palco deve crescer. *No iPhone o botão não aparece; pule para o próximo item.*
- [ ] **Instale o app:**
  - **Android (Chrome):** menu ⋮ → **Adicionar à tela inicial** / **Instalar app**.
  - **iPhone (Safari):** botão de compartilhar → **Adicionar à Tela de Início**.
- [ ] Abra pelo ícone novo (a janelinha com a pena). Deve abrir deitado, sem barras do navegador, e **direto na sala**, sem pedir código.
- [ ] Teste o código manual: no navegador do celular, abra `https://chicletie.github.io/aberwyn-vtt/palco.html?sala=ERRADO`. Deve aparecer "Sala ERRADO vazia" e a caixa de código. Digite o código certo → ENTRAR.

## 3. Segundo computador (se tiver)

- [ ] Abra o mesmo link. Aperte **D**: no canto aparece a escala. Num monitor comum deve ser um número inteiro (2X, 3X…).
- [ ] Com zoom do navegador em 125% (Ctrl +), a pixel art continua nítida.

## 4. A luta (na mesa; olhe o celular a cada passo)

- [ ] **COMBATE**: a cortina sai com transição e os heróis entram deslizando.
- [ ] Rodada 1, vez dos heróis: escolha quem age, monte uma ação com alvo, resultado **ACERTOU**, **EXECUTAR**. O dano aparece no palco, com o rastro branco na barra.
- [ ] Ação com **2 alvos**, um deles marcado com ✗ (errou): só o outro sofre dano.
- [ ] A **fita** abre com as **cintilas** correndo para as pontas.
- [ ] Vez dos inimigos: o **vilão age duas vezes** na rodada (dois pontinhos no rosto dele, na faixa de cima).
- [ ] No celular: o vilão aparece como **silhueta** e "???". Toque nele: o cartão diz NÃO REVELADO.
- [ ] **Estudo 7+** num espectro: no celular, o cartão passa a mostrar os PV máximos.
- [ ] Revele o vilão (o botão **?** ao lado do nome dele vira **◉**): nome e moldura vinho aparecem.
- [ ] **Arraste um inimigo** na prévia da mesa para outro lugar. No celular, ele vai para lá. Duplo clique → volta para a formação.
- [ ] **Aviso central** (AVISO, ou um aviso pronto): abre com a linha dourada e as cintilas. **Clique direito no título** do aviso, na prévia → **TÍTULO**: o texto se corrige no celular.
- [ ] **Fala** de um personagem (FALA → FALAR): a caixa de diálogo aparece embaixo.
- [ ] **Fase 2** do vilão (F2): aviso de virada.
- [ ] Um herói chega a **0 PV**: fica caído (cinza, deitado) e a linha dele diz CAÍDO.
- [ ] **ENCERRAR COMBATE → Vitória**: animação de fim.

## 5. Internet caindo (reconexão)

- [ ] No meio da luta, **desligue o Wi-Fi e os dados do celular**. Depois de uns segundos, aparece **RECONECTANDO…** piscando.
- [ ] Enquanto ele está sem internet, faça 2 ou 3 ações na mesa.
- [ ] Ligue a internet de novo: o aviso some e o palco **pula direto para o estado atual** (as ações que ele perdeu já aparecem feitas).

## 6. Guardar e recuperar

- [ ] Feche a aba da mesa e abra de novo: tudo continua como estava.
- [ ] **? → SALVAR ARQUIVO**: baixa um `.json` (a segunda cópia de segurança).

---

## Problemas encontrados

| # | O que eu fiz | O que eu esperava | O que aconteceu | Celular/navegador |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Bugs que eu (Claude) achei e corrigi durante o Marco 4

| Bug | Causa | Correção |
|---|---|---|
| Celular ficava em "Aguardando a mesa…" para sempre | Link aberto sem `?sala=` | O palco explica o que falta e tem a caixa para digitar o código |
| Silhueta do inimigo escondido não chegava aos jogadores | O aviso "arte chegou" usava um temporizador que o navegador pausa em aba de fundo | Temporizador comum (`setTimeout`), que continua rodando |
| Tocar num inimigo no palco não abria o cartão; arrastar na mesa não pegava | A camada de transição (vazia, por cima de tudo) roubava os cliques | Camadas vazias deixam o clique passar |
| Menu do clique direito sumia atrás da prévia | As camadas do palco tinham prioridade maior que o menu | A prévia isola as próprias camadas |
| Botão de tela cheia minúsculo no celular | Tamanho seguia a escala do palco | Tamanho mínimo pensado para o dedo |
| Publicação no GitHub falhou uma vez | Falha momentânea do próprio GitHub | Publicação refeita |
