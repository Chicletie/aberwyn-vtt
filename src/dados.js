// Carrega os arquivos de dados (public/dados/*.json) que o mestre edita à mão.
// Se um arquivo faltar ou tiver erro, a mesa continua com uma lista vazia e avisa no console.

async function lerJson(nome, padrao) {
  try {
    const resposta = await fetch(`./dados/${nome}`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return await resposta.json();
  } catch (erro) {
    console.warn(`[dados] não consegui ler dados/${nome}:`, erro);
    return padrao;
  }
}

/** Carrega tudo de uma vez. */
export async function carregarDados() {
  const [herois, coringas, cenas, cenarios] = await Promise.all([
    lerJson('herois.json', []),
    lerJson('coringas.json', []),
    lerJson('cenas.json', []),
    lerJson('cenarios.json', []),
  ]);
  return { herois, coringas, cenas, cenarios };
}
