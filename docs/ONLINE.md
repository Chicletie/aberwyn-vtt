# Pôr o VTT online (Marco 3)

Passo a passo para o mestre. Cada passo diz **onde clicar** e **o que deve aparecer**.
Você faz os passos que exigem a sua conta (criar, entrar, copiar); o resto já está pronto no código.

---

## Parte 1 — Criar o projeto no Firebase

1. Abra **https://console.firebase.google.com** e entre com a sua conta Google.
2. Clique em **"Criar um projeto"** (ou "Adicionar projeto").
   - Nome: `aberwyn-vtt` (pode ser outro; o Firebase pode acrescentar umas letras no fim).
   - Gemini / Google Analytics: pode **desativar** os dois. Não precisamos.
   - Clique em **Criar projeto** e espere. Deve aparecer "Seu novo projeto está pronto". **Continuar**.
3. **Registrar o app da web:** na página inicial do projeto, clique no ícone **`</>`** ("Web").
   - Apelido: `aberwyn-vtt`. **Não** marque "Firebase Hosting". Clique em **Registrar app**.
   - Aparece um bloco de código com `const firebaseConfig = { apiKey: "...", ... }`.
   - **Copie esse bloco inteiro e me mande aqui no chat.** (Não é senha: esses valores ficam visíveis no site de qualquer jeito. Quem protege os dados são as regras do passo 6.)
4. **Banco de dados:** no menu da esquerda, **Criação → Realtime Database** → **Criar banco de dados**.
   - Local: **Estados Unidos (us-central1)**.
   - Regras de segurança: escolha **"Iniciar no modo bloqueado"**. → **Ativar**.
   - Deve aparecer uma página com um endereço tipo `https://aberwyn-vtt-xxxx-default-rtdb.firebaseio.com/` e `null` embaixo.
5. **Login:** menu da esquerda, **Criação → Authentication** → **Vamos começar**.
   - Em "Provedores de login", clique em **E-mail/senha**, ative a **primeira** chave (não a de "link por e-mail") e **Salvar**.
   - Vá na aba **Usuários** → **Adicionar usuário**: o e-mail e a senha que **você** vai usar para entrar na mesa. **A senha fica só com você; não me mande.**
   - Na lista de usuários, copie o **UID do usuário** (uma sequência longa de letras e números) e **me mande** (o UID não é segredo).
6. **Regras de segurança:** volte em **Realtime Database** → aba **Regras**.
   - Apague tudo o que estiver lá e cole o conteúdo do arquivo `database.rules.json` do projeto (eu te mando o texto no chat).
   - Clique em **Publicar**.
7. **Marcar você como mestre:** em **Realtime Database** → aba **Dados**:
   - Passe o mouse no endereço do banco (a primeira linha) e clique no **+**.
   - Chave: `mestres` → clique no **+** dela de novo → Chave: **o seu UID** · Valor: `true` → **Adicionar**.
   - Deve ficar: `mestres` › `seu-UID: true`.

## Parte 2 — Eu ligo o código (você só confere)

- Eu colo o `firebaseConfig` em `src/config-online.js` e rodo o teste das regras **sem login** (`node scripts/testar-regras.mjs`): ler a sala tem que dar PERMITIDO; escrever qualquer coisa tem que dar NEGADO.
- Você abre a mesa, clica no botão **ENTRAR** (barra de cima), entra com o e-mail e a senha do passo 5, e o botão vira **SALA XXXXX** com ponto verde.

## Parte 3 — Testar as regras com contas (Rules Playground)

Em **Realtime Database → Regras**, clique em **Rules Playground** (ou "Simulador de regras"):

| Tipo | Local | Autenticado? | UID | Resultado esperado |
|---|---|---|---|---|
| set (gravar) | `/salas/TESTE/publico` | não | — | **Negado** |
| set | `/salas/TESTE/publico` | sim | o seu UID | **Permitido** (pode dar erro de validação no conteúdo; o que importa é não ser "negado por permissão") |
| set | `/salas/TESTE/publico` | sim | `jogador-teste` | **Negado** |
| get (ler) | `/fichas/joshua` | sim | `jogador-teste` | **Negado** (ele não é dono de nenhuma ficha) |
| get | `/fichas/joshua` | sim | o seu UID | **Permitido** |

(O teste "um jogador não lê a ficha de outro" com contas de jogador de verdade fica completo no Marco 5, quando as contas dos jogadores existirem.)

## Parte 4 — Publicar o palco (GitHub Pages)

Eu crio o repositório `aberwyn-vtt` na sua conta do GitHub e envio o projeto (com a sua autorização).
Depois, no GitHub: **Settings → Pages → Source: GitHub Actions**. Em uns 2 minutos o palco fica em
`https://<seu-usuario>.github.io/aberwyn-vtt/palco.html`, e o botão COPIAR LINK da mesa já usa esse endereço.
