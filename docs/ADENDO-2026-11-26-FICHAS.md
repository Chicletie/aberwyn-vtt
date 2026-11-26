# Adendo de 26/11: fichas dos jogadores (cole isto para o Claude Code)

O `PROMPT-CLAUDE-CODE.md` foi atualizado ao longo do dia. **Releia o prompt inteiro** e me diga em até 8 linhas o que conflita com o que você já fez, antes de mudar qualquer coisa. Resumo do que mudou:

1. **"Confuso" não existe:** a condição do livro é **Atordoado** (p. 94). Troque em dados, ícone (`atordoado.png`) e textos.
2. **Fichas dos jogadores entram no projeto** (seção "Fichas dos jogadores" e **Marco 5**). Não implemente agora, mas **o formato de dados (Marco 1) e as regras do Firebase (Marco 3) já nascem pensados para elas**:
   - ficam fora da sala, em `fichas/{heroiId}`; cada jogador lê e escreve só a própria, o mestre todas (`donos/{uid}`);
   - login **nome + chave** via e-mail/senha do Firebase Auth (e-mail fictício), conferido pelas regras do servidor;
   - gravação campo a campo; a mesa lê e escreve PV/PM/PI/PF/condições na ficha.
3. **Seis abas com prévias próprias** em `previas/ficha-*.png` (dados reais de uma jogadora): BÁSICO, AÇÕES (+ nível alto), INFORMAÇÕES (+ nível alto), INVENTÁRIO, DIÁRIO, REGISTRO (desligada). Mais: janela de detalhe (`ficha-janela-laco.png`, modelo para todas), legenda de afinidade e PF, rastreadores de peculiaridade, e dois GIFs do letreiro.
4. **Sistema de layout da ficha** (está no prompt, siga à risca): grade de 3 colunas de 134 px com vão de 12; hierarquia tipográfica de 4 níveis; título de seção com régua; **listas com passo inteiro e igual, ancoradas numa linha de base comum** (nunca passo fracionado, nunca esticar a última linha); alinhamento vertical pela tinta medida das fontes.
5. **Regras novas de jogo na ficha:** força do laço = número de emoções (p. 56), sem quadradinhos de força; afinidades VU/RE/IM/AB (p. 322); itens padrão do livro (p. 104: Remédio, Elixir, Tônico, Fragmento elemental, Barraca mágica); **repor PI = botão com confirmação, liberado só pela chave COMÉRCIO da mesa** (10 z por PI).
6. **Ignore `previas/ficha-resumo.png`**: é a versão antiga, substituída por `ficha-basico.png`.

Todo texto de interface novo é provisório (lista em `TEXTOS-PROVISORIOS.md`).
