# Pôr o aberwyn-vtt online — passo a passo do mestre

Você faz só o que precisa da **sua conta** (criar, entrar, copiar). O resto já está pronto no código.
Em cada passo: **onde clicar** e **o que deve aparecer**. Travou? Me mande um print da tela.

> **Nunca me mande a sua senha.** Ela fica só com você. O que eu peço (o `firebaseConfig` e o seu UID) não é segredo.

---

## Parte 1 — Criar o projeto no Firebase (≈ 10 min)

### 1. Entrar no console
- Abra **https://console.firebase.google.com** e entre com a sua conta Google.
- ✅ Aparece "Bem-vindo ao Firebase" com um botão para criar projeto.

### 2. Criar o projeto
- Clique em **Criar um projeto** (às vezes "Adicionar projeto" ou "Começar").
- Nome: **`aberwyn-vtt`**. O Firebase pode pôr umas letras no fim (ex.: `aberwyn-vtt-3f2a1`); tudo bem.
- Se perguntar sobre **Gemini** ou **Google Analytics**: pode **desativar** os dois.
- Clique em **Criar projeto** e espere.
- ✅ Aparece "Seu novo projeto está pronto". Clique em **Continuar**.

### 3. Registrar o app da web → **me mande o resultado**
- Na página inicial do projeto, clique no ícone **`</>`** (Web).
- Apelido do app: **`aberwyn-vtt`**. **Não** marque "Firebase Hosting".
- Clique em **Registrar app**.
- ✅ Aparece um bloco de código parecido com este:
  ```
  const firebaseConfig = {
    apiKey: "AIza…",
    authDomain: "aberwyn-vtt-….firebaseapp.com",
    projectId: "aberwyn-vtt-…",
    …
  };
  ```
- 📋 **Copie esse bloco inteiro e me mande no chat.** Depois clique em **Continuar no console**.

### 4. Criar o banco de dados
- No menu da esquerda: **Criação** (ou "Build") → **Realtime Database** → **Criar banco de dados**.
- Local do banco: **Estados Unidos (us-central1)** → **Próxima**.
- Regras: escolha **"Iniciar no modo bloqueado"** → **Ativar**.
- ✅ Aparece um endereço tipo `https://aberwyn-vtt-…-default-rtdb.firebaseio.com/` com `null` embaixo.
- 📋 Se o bloco do passo 3 **não** tinha uma linha `databaseURL`, **me mande também esse endereço**.

### 5. Ligar o login e criar a SUA conta de mestre
- Menu da esquerda: **Criação** → **Authentication** → **Vamos começar**.
- Aba **Método de login** → clique em **E-mail/senha** → ative a **primeira** chave ("E-mail/senha"; deixe desligada a de "link por e-mail") → **Salvar**.
- Aba **Usuários** → **Adicionar usuário**:
  - E-mail: o seu (ou um só para a mesa).
  - Senha: **uma senha forte que só você sabe.** Anote num lugar seguro. **Não me mande.**
  - → **Adicionar usuário**.
- ✅ Você aparece na lista. Na coluna **"UID do usuário"** tem um código longo (ex.: `k3J9xQ…`).
- 📋 **Copie o UID e me mande** (é só um número de identificação, não é senha).

### 6. Colar as regras de segurança
- Volte em **Realtime Database** → aba **Regras**.
- Apague **tudo** o que estiver no editor e cole exatamente isto:

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "mestres": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": false
      }
    },

    "salas": {
      "$sala": {
        ".read": true,
        ".write": "auth != null && root.child('mestres').child(auth.uid).val() === true",
        ".validate": "$sala.matches(/^[A-Z0-9]{4,8}$/)",
        "publico": {
          ".validate": "newData.hasChildren(['json', 'em']) && newData.child('json').isString() && newData.child('json').val().length < 200000"
        }
      }
    },

    "mesas": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid && root.child('mestres').child(auth.uid).val() === true",
        ".write": "auth != null && auth.uid === $uid && root.child('mestres').child(auth.uid).val() === true",
        "backup": {
          ".validate": "newData.hasChildren(['json', 'em']) && newData.child('json').isString() && newData.child('json').val().length < 2000000"
        }
      }
    },

    "donos": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('mestres').child(auth.uid).val() === true)",
        ".write": "auth != null && root.child('mestres').child(auth.uid).val() === true"
      }
    },

    "fichas": {
      "$heroiId": {
        ".read": "auth != null && (root.child('mestres').child(auth.uid).val() === true || root.child('donos').child(auth.uid).val() === $heroiId)",
        ".write": "auth != null && (root.child('mestres').child(auth.uid).val() === true || root.child('donos').child(auth.uid).val() === $heroiId)"
      }
    }
  }
}
```

- Clique em **Publicar**.
- ✅ Aparece "Regras publicadas" (ou some o aviso de alterações não publicadas), sem erro em vermelho.

**O que essas regras dizem, em português:**
- **Salas:** qualquer um com o link **lê** (os jogadores precisam); só a conta marcada como mestre **escreve**.
- **Backup da mesa** (`mesas`): só a **própria** conta do mestre lê e escreve. Ninguém mais vê os seus segredos.
- **Fichas** (Marco 5): só o mestre e o dono de cada ficha.
- **Todo o resto:** ninguém.

### 7. Marcar você como mestre
- Em **Realtime Database** → aba **Dados**.
- Passe o mouse sobre o endereço do banco (a primeira linha) e clique no **+**.
- Em **Chave**, escreva `mestres`. **Não** preencha o valor; em vez disso, clique no **+** que aparece ao lado dessa linha nova.
- Na linha de dentro: **Chave** = o seu **UID** (o do passo 5) · **Valor** = `true` (sem aspas).
- Clique em **Adicionar**.
- ✅ Fica assim: `mestres` › `seu-UID: true`.

**Pronto, a Parte 1 acabou.** Me avise aqui.

---

## Parte 2 — Eu ligo o código, você testa a mesa (≈ 5 min)

1. Eu colo o `firebaseConfig` em `src/config-online.js` e rodo o **teste sem login** (`node scripts/testar-regras.mjs`). Ele tenta, sem conta nenhuma, ler e escrever no seu banco pela internet:
   - ler a sala → **PERMITIDO**;
   - escrever na sala, ler ou escrever fichas, backups, donos, mestres, raiz → **NEGADO**.
2. Você abre a mesa (a que está rodando aí, `http://localhost:5173/`), aperta **F5** e clica no botão **ENTRAR** da barra de cima.
3. Digite **o e-mail e a senha do passo 5** (direto na mesa, não aqui no chat) → **ENTRAR**.
   - ✅ O botão vira **SALA XXXXX** com um ponto **verde**.
4. Clique em **SALA XXXXX** → aparece a janela ONLINE com:
   - **CONEXÃO: TRANSMITINDO**;
   - **BACKUP: NA NUVEM · (data e hora)**, depois de uns segundos;
   - o **link dos jogadores** e o botão **COPIAR LINK**.

### Como o backup na nuvem funciona
- Com você logado, a mesa guarda **sozinha** o estado completo na nuvem (no máximo a cada 3 segundos).
- Se você limpar o navegador, trocar de navegador ou abrir a mesa em outro computador: ao **ENTRAR**, a mesa avisa **"A nuvem tem uma mesa mais nova"** e oferece **RECUPERAR DA NUVEM**.
- O botão **? → SALVAR ARQUIVO** continua existindo, como segunda cópia (bom fazer depois de cada sessão).

---

## Parte 3 — Testar as regras com contas (Rules Playground, ≈ 5 min)

Em **Realtime Database → Regras**, clique em **Rules Playground** (pode estar como "Simulador de regras" ou "Playground de regras"). Para cada linha, escolha o tipo, escreva o local, ligue/desligue "Autenticado" e clique em **Executar**:

| Tipo | Local | Autenticado? | UID | Tem que dar |
|---|---|---|---|---|
| set (gravar) | `/salas/TESTE/publico` | não | — | **Negado** |
| set | `/salas/TESTE/publico` | sim | `jogador-teste` | **Negado** |
| get (ler) | `/mesas/SEU-UID/backup` | sim | `jogador-teste` | **Negado** |
| get | `/fichas/joshua` | sim | `jogador-teste` | **Negado** |
| get | `/mesas/SEU-UID/backup` | sim | o **seu** UID | **Permitido** |
| get | `/fichas/joshua` | sim | o **seu** UID | **Permitido** |

Me mande um print dos resultados (ou só "deu tudo como na tabela").
(O teste "um jogador não lê a ficha do outro", com contas de jogador de verdade, se completa no Marco 5.)

---

## Parte 4 — Publicar o palco no GitHub Pages (≈ 5 min)

1. Antes de enviar, eu troco o e-mail dos commits pelo **e-mail privado do GitHub** (`…@users.noreply.github.com`), para o seu Gmail não ficar público.
2. Com a sua autorização, eu crio o repositório **`aberwyn-vtt`** (público) na sua conta do GitHub e envio o projeto.
3. Você abre **https://github.com/chicletie/aberwyn-vtt** → **Settings** → menu da esquerda **Pages** → em **Source**, escolha **GitHub Actions**.
4. Aba **Actions**: aparece "Publicar no GitHub Pages" rodando. Espere ficar com ✅ verde (uns 2 minutos).
5. ✅ O palco fica em **https://chicletie.github.io/aberwyn-vtt/palco.html**. Eu ponho esse endereço na mesa, e o **COPIAR LINK** passa a gerar o link certo para mandar no Discord.

---

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| Botão **SEM PERMISSÃO** (vermelho) na mesa | O passo 7 (mestres › seu UID: true) não está certo, ou as regras do passo 6 não foram publicadas. |
| "E-mail ou senha errados" | Confira no Authentication → Usuários; dá para redefinir a senha lá (menu ⋮ do usuário). |
| Palco dos jogadores mostra só "Aguardando a mesa…" | A mesa precisa estar aberta e **logada** pelo menos uma vez; o último estado fica guardado na sala. |
| **RECONECTANDO…** no palco | A internet de quem vê caiu; volta sozinho. |
