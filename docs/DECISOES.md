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
