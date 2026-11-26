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
