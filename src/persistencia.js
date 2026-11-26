// Persistência da mesa: o que garante que um F5 (ou o navegador fechando) não perde nada.
//
// - Salvamento automático no localStorage (a "gaveta" do navegador, que fica no seu computador)
//   a cada alteração.
// - Exportar / importar JSON: um arquivo de backup, e o jeito de preparar combates antes.
// - Pilha do DESFAZER: uma cópia do estado antes de cada alteração.

import { migrar } from './estado.js';

const CHAVE = 'aberwyn-vtt:estado';
// Nome antigo do projeto (errante-vtt): lido uma vez e mudado para o novo, para não perder nada.
const CHAVE_ANTIGA = 'errante-vtt:estado';
const MAX_DESFAZER = 50;

/** Salva o estado no navegador. */
export function salvarLocal(estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (erro) {
    // Pode falhar se o navegador estiver sem espaço ou em modo privado; a mesa continua funcionando.
    console.warn('[mesa] não consegui salvar no navegador:', erro);
  }
}

/** Lê o estado salvo (ou null se não houver). */
export function carregarLocal() {
  if (!localStorage.getItem(CHAVE) && localStorage.getItem(CHAVE_ANTIGA)) {
    localStorage.setItem(CHAVE, localStorage.getItem(CHAVE_ANTIGA));
    localStorage.removeItem(CHAVE_ANTIGA);
  }
  const texto = localStorage.getItem(CHAVE);
  if (!texto) return null;
  try {
    return migrar(JSON.parse(texto));
  } catch (erro) {
    console.warn('[mesa] estado salvo ilegível; começando do zero.', erro);
    return null;
  }
}

/** Baixa o estado como arquivo .json (backup ou combate preparado). */
export function exportarJson(estado, nomeArquivo) {
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Abre a janela de escolher arquivo e devolve o estado lido (ou null se cancelar). */
export function importarJson() {
  return new Promise((resolver, rejeitar) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = '.json,application/json';
    entrada.onchange = async () => {
      const arquivo = entrada.files?.[0];
      if (!arquivo) return resolver(null);
      try {
        resolver(migrar(JSON.parse(await arquivo.text())));
      } catch (erro) {
        rejeitar(new Error('Esse arquivo não parece um combate salvo pela mesa.'));
      }
    };
    entrada.click();
  });
}

/**
 * Pilha do DESFAZER. Guarda cópias inteiras do estado (simples e à prova de erro:
 * desfazer = voltar para a cópia anterior, seja qual for a ação).
 */
export function criarPilhaDesfazer() {
  /** @type {string[]} */
  const pilha = [];
  return {
    /** Guarda o estado ANTES de uma alteração. */
    guardar(estado) {
      pilha.push(JSON.stringify(estado));
      if (pilha.length > MAX_DESFAZER) pilha.shift();
    },
    /** Devolve o estado anterior (ou null se não houver). */
    voltar() {
      const texto = pilha.pop();
      return texto ? JSON.parse(texto) : null;
    },
    get tamanho() {
      return pilha.length;
    },
  };
}
