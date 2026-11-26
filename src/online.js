// Conexão com o Firebase (serviço de tempo real + login).
// Só este arquivo e o canal.js conhecem o Firebase; o resto do app não sabe que ele existe.

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, serverTimestamp } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from './config-online.js';

let app = null;

/** O modo online está configurado? (config-online.js preenchido) */
export function onlineConfigurado() {
  return !!firebaseConfig;
}

function iniciar() {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/** Banco de dados em tempo real. */
export function banco() {
  return getDatabase(iniciar());
}

// ───────────── Login (só o mestre, nesta etapa) ─────────────

/** Entra com e-mail e senha (a conta é criada por você no console do Firebase). */
export function entrar(email, senha) {
  return signInWithEmailAndPassword(getAuth(iniciar()), email, senha);
}

export function sair() {
  return signOut(getAuth(iniciar()));
}

/** Avisa sempre que o login muda (entrou, saiu, ou a página abriu já logada). */
export function aoMudarLogin(funcao) {
  return onAuthStateChanged(getAuth(iniciar()), funcao);
}

// ───────────── Sala ─────────────

/**
 * Grava o estado público na sala.
 * Por que como TEXTO (JSON) e não como objeto? O Firebase apaga listas vazias e valores
 * vazios ao gravar; o palco receberia, por exemplo, um herói sem a lista "condicoes" e
 * quebraria. Guardando o texto inteiro, chega exatamente o que a mesa mandou.
 */
export function gravarSala(sala, estadoPublico) {
  return set(ref(banco(), `salas/${sala}/publico`), {
    json: JSON.stringify(estadoPublico),
    em: serverTimestamp(),
  });
}

/** Escuta a sala: chama a função com o estado público sempre que ele mudar. */
export function escutarSala(sala, funcao) {
  return onValue(ref(banco(), `salas/${sala}/publico`), (foto) => {
    const valor = foto.val();
    if (valor?.json) funcao(JSON.parse(valor.json));
  });
}

// ───────────── Backup da mesa na nuvem ─────────────
// O estado COMPLETO da mesa (com segredos e anotações) fica em mesas/{uid}, que as regras do
// servidor só deixam a própria conta do mestre ler e escrever. Os jogadores nunca alcançam.

/** Id da conta logada (ou null). */
function uidAtual() {
  return getAuth(iniciar()).currentUser?.uid ?? null;
}

/** Guarda o estado completo na nuvem (texto JSON, pelo mesmo motivo da sala). */
export function gravarBackup(estado) {
  const uid = uidAtual();
  if (!uid) return Promise.resolve();
  return set(ref(banco(), `mesas/${uid}/backup`), { json: JSON.stringify(estado), em: Date.now() });
}

/** Lê o backup da nuvem: { estado, em } ou null se não houver. */
export async function lerBackup() {
  const uid = uidAtual();
  if (!uid) return null;
  const foto = await get(ref(banco(), `mesas/${uid}/backup`));
  const valor = foto.val();
  return valor?.json ? { estado: JSON.parse(valor.json), em: valor.em } : null;
}

/** Avisa quando a conexão com o servidor cai ou volta (true = conectado). */
export function aoMudarConexao(funcao) {
  return onValue(ref(banco(), '.info/connected'), (foto) => funcao(foto.val() === true));
}
