# Arquivos de dados (`public/dados/`)

Você edita estes arquivos à mão (no VS Code). São JSON: texto com chaves `{ }`, listas `[ ]`,
textos entre aspas e vírgula entre os itens (**sem vírgula depois do último**). Se errar uma
vírgula, a mesa avisa no console (F12) e segue com a lista vazia.

Depois de salvar um arquivo, recarregue a mesa (F5). Nada se perde: o estado fica salvo no navegador.

## `cenas.json`: uma entrada por cena

```
{
  "id": "bosque-marco",                    ← sem espaço nem acento; único
  "titulo": "Bosque do Marco Sem Nome",
  "cenario": "floresta",                   ← id em cenarios.json (escolher a cena troca o cenário)
  "descricao": "Um bosque antigo...",       ← janeiro (modo cena)
  "ambiente": ["frase 1", "frase 2"],       ← frases de ambiente (janeiro) e reserva do combate
  "tensao": ["frase quando um relógio passa da metade"],
  "combate": {
    "fases": {
      "1": ["frases de efeito da fase 1"],
      "2": ["frases da fase 2 (depois que o chefe muda)"]
    },
    "tensao": ["frases de tensão no combate"]
  },
  "avisos": [                               ← botões de AVISOS PRONTOS desta cena
    { "titulo": "Reforços!", "linha": "Mais dois Espectros no fim da rodada.", "tom": "neutro", "duracao": 4 },
    { "titulo": "Rendição", "linha": "O Guardião baixa a guarda e espera.", "tom": "dourado", "duracao": null }
  ],
  "retratoLocal": "bosque-marco",           ← janeiro
  "intervalo": 25                           ← janeiro: segundos entre frases de ambiente
}
```

- As setas `←` acima são só explicação: **não** escreva elas no arquivo de verdade.
- `tom` do aviso: `"neutro"`, `"dourado"` (algo bom), `"vermelho"` (perigo), `"vinho"` (vilão).
- `duracao`: segundos até sumir; `null` = fica até você fechar.

## `cenarios.json`

```json
{ "id": "floresta", "nome": "Floresta", "arquivo": "floresta.png", "chaoTopo": 120, "chaoBase": 192 }
```

- `arquivo`: o PNG em `public/assets/cenarios/` (480×270). `null` = faixas de cor.
- `chaoTopo` / `chaoBase`: a faixa de chão (ajuste no botão CHÃO da mesa e copie os números para cá).
- Opcionais: `heroiX`, `inimigoX` (empurram o bloco de heróis ou de inimigos para os lados).

## `herois.json`

```json
{ "id": "joshua", "nome": "Joshua", "jogador": "Edu", "corAssinatura": "#da863e",
  "pv": { "atual": 60, "max": 60 }, "pm": { "atual": 40, "max": 40 }, "pi": { "atual": 6, "max": 6 },
  "menu": [ { "id": "ataque", "nome": "Ataque" }, { "id": "provocar", "nome": "Provocar", "proprio": true } ],
  "submenu": { "feitico": ["Chama", "Gelo"] } }
```

- Sem `menu`, o herói ganha as 10 ações do livro. `"proprio": true` = comando próprio (dourado).
- Tudo isso também se edita na ficha da mesa (clique direito no herói).

## `coringas.json`

Inimigos genéricos para o botão "+ INIMIGO": `{ "id", "nome", "sprite", "pv", "pm" }`. Só nome e números; nada do bestiário.

## Arte: onde colocar cada PNG (`public/assets/`)

O app funciona sem arte nenhuma: o que faltar vira o desenho provisório. Quando um PNG aparece na pasta certa, o palco e a mesa passam a usá-lo sozinhos (basta recarregar a página). Tudo em tamanho real (1×), fundo transparente.

| O quê | Arquivo | Tamanho |
|---|---|---|
| Sprite de batalha | `assets/sprites/<id>/<pose>.png` | herói 32×48 por quadro; inimigo, o que você desenhar |
| Retrato | `assets/retratos/<id>.png` | 48×48 |
| Cenário | `assets/cenarios/<arquivo>` (nome em `cenarios.json`) | 480×270 |
| Moldura em volta do palco | `assets/ui/moldura-palco.png` | 34×34: cantos de 12, borda de 10 no meio que se repete |
| Arte da parte escura em volta | `assets/ui/fundo-palco.png` | ladrilho que se repete (32×32 hoje; qualquer tamanho serve) |

- **`<id>`** é o que você escreve nos campos SPRITE e RETRATO da ficha do combatente, na mesa (só letras sem acento, números, `-` e `_`).
- **Poses** (o nome do arquivo): `parado` (obrigatória, é a reserva de todas), `caido` (herói com 0 PV), `fase2` e `fase3` (vilão depois de trocar de fase). Pose que não existe = usa `parado`.
- **Animação:** quadros lado a lado, da esquerda para a direita. Sprite de 48 de altura: cada quadro tem 32 de largura, e o app conta sozinho. Outros tamanhos: crie `<pose>.json` ao lado, por exemplo `{ "quadros": 4, "fps": 6, "repetir": true }`. Sem `.json`: 4 quadros por segundo, em loop.
- **Cabeça (rosto 24×24 da faixa de turnos):** por padrão, o recorte do topo do sprite, no centro. Para escolher outro ponto: `"cabeca": { "x": 4, "y": 2 }` no `.json` da pose `parado`.
- **Retrato de reserva:** sem `retratos/<id>.png`, a caixa de 48×48 mostra a cabeça do sprite em 1× (nunca ampliada); sem nada, o quadrado colorido com a inicial.
- **Inimigo escondido:** o palco recebe só a **silhueta já pronta**, nunca o nome do arquivo. Pode dar ao sprite o nome que quiser (`guardiao-marco`): os jogadores não veem no F12.
