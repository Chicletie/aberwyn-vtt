# Glossário

Termos técnicos que apareceram no projeto, em 1–2 frases.

- **Terminal:** janela onde você digita comandos de texto para o computador, em vez de clicar. No Windows, o "PowerShell" é um terminal.
- **Node.js:** programa que roda JavaScript fora do navegador. Aqui ele serve para rodar as ferramentas do projeto (como o Vite).
- **npm:** a "loja" de pacotes do Node. `npm install` baixa o que o projeto precisa; `npm run dev` roda um comando definido no `package.json`.
- **Pacote / dependência:** código de outra pessoa que o projeto usa. Fica na pasta `node_modules/` (que não vai para o Git, porque dá para baixar de novo).
- **`package.json`:** ficha de identidade do projeto: nome, comandos disponíveis e lista de dependências.
- **Vite:** ferramenta que serve o site no seu computador enquanto você desenvolve e gera a versão final para publicar.
- **Servidor de desenvolvimento (`localhost`):** um "site" que só existe no seu computador. `localhost:5173` quer dizer "este computador, porta 5173".
- **Build:** gerar a versão final do site (a pasta `dist/`), pronta para subir na internet.
- **Git:** programa que guarda o histórico de todas as mudanças do projeto, como "pontos de salvamento" de um jogo.
- **Commit:** um ponto de salvamento no Git, com uma mensagem dizendo o que mudou.
- **`.gitignore`:** lista de arquivos que o Git deve ignorar (pacotes baixados, arquivos gerados, senhas).
- **Repositório:** a pasta do projeto junto com todo o histórico do Git.
- **HTML / CSS / JavaScript:** HTML diz *o que* tem na página; CSS diz *como* fica (cores, tamanhos, posição); JavaScript diz *o que acontece* (cliques, cálculos, animações).
- **Módulo ES:** arquivo JavaScript que pode usar partes de outros arquivos com `import`. Ajuda a dividir o código em pedaços pequenos.
- **`devicePixelRatio` (dpr):** quantos pixels reais da tela existem para cada "pixel" que o site enxerga. Com zoom do Windows em 125%, o dpr é 1,25.
- **Escala inteira:** ampliar a pixel art só por 2×, 3×, 4×…; ampliar por 2,5× deixa uns pixels maiores que outros e borra.
- **`transform: scale`:** comando de CSS que amplia ou reduz uma parte da página sem mudar o layout de dentro.
- **woff2:** formato de arquivo de fonte feito para sites (pequeno e rápido de carregar).
- **`@font-face`:** comando de CSS que ensina o navegador a usar um arquivo de fonte.
- **Variável CSS (`--nome`):** um valor com nome, definido num lugar só e usado em vários (ex.: `--tam-corpo`).
- **Pasta `public/`:** pasta do Vite cujos arquivos vão para o site exatamente como estão, sem mudar nome.
- **GitHub Pages:** serviço grátis do GitHub que publica um site estático a partir de um repositório.

## Marco 1
- **Estado:** um objeto JavaScript com tudo o que a mesa sabe (quem luta, PV, de quem é a vez). É "a verdade".
- **Estado público:** a cópia do estado sem os segredos, que é a única coisa que vai para os jogadores.
- **Função pura:** função que só calcula e devolve um resultado, sem mudar nada fora dela. `estadoPublico` é pura: não mexe no estado original.
- **BroadcastChannel:** recurso do navegador para abas do mesmo site conversarem entre si. É o "canal local" do Marco 1.
- **Renderizar:** desenhar a tela a partir dos dados.
- **DOM:** a árvore de elementos da página (cada `<div>`) que o JavaScript cria e muda.
- **JSDoc:** comentários num formato especial (`@typedef`, `@property`) que documentam o formato dos dados; o VS Code usa isso para dar dicas.
- **`import` / `export`:** como um arquivo JavaScript usa funções de outro.
- **9-slice (`border-image`):** técnica de cortar uma imagem de moldura em 9 pedaços (4 cantos, 4 lados, meio) para ela servir em caixas de qualquer tamanho.
- **Canvas:** uma "tela de pintura" do navegador onde o código desenha pixel por pixel. Usado para recolorir a seta e a fita.
- **Data URL:** uma imagem guardada dentro de um texto (`data:image/png;base64,…`), sem arquivo.
- **`z-index`:** quem fica por cima de quem na tela.
- **Transição / animação CSS:** mudança suave de uma propriedade (posição, largura). `steps(n)` faz a mudança em n pulos, como quadros de pixel art.
- **Console (F12):** painel do navegador onde aparecem mensagens do código (`console.log`). Também é onde qualquer jogador veria os dados que chegam, por isso os segredos nem são enviados.
- **HMR (recarregar ao salvar):** o Vite recarrega a página sozinho quando um arquivo muda. Na mesa mínima isso zera o estado, porque ela ainda não salva (o salvamento é o Marco 2).
