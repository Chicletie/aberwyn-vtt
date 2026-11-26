// Testa, de fora, as regras de segurança do Firebase (do jeito que um jogador mal-intencionado
// tentaria, abrindo o F12): SEM LOGIN nenhum, tenta ler e escrever no banco pela internet.
//
// Como rodar (na pasta do projeto):  node scripts/testar-regras.mjs
//
// O que DEVE acontecer:
//   ler a sala ............ permitido (os jogadores precisam ler)
//   escrever na sala ...... NEGADO
//   ler/escrever ficha .... NEGADO
//   ler donos/mestres ..... NEGADO
//   ler/escrever backup ... NEGADO
//   escrever na raiz ...... NEGADO
// O teste com contas (mestre e jogador) é feito no "Rules Playground" do console (docs/ONLINE.md).

import { firebaseConfig } from '../src/config-online.js';

if (!firebaseConfig?.databaseURL) {
  console.log('Preencha src/config-online.js primeiro (falta o databaseURL).');
  process.exit(1);
}

const base = firebaseConfig.databaseURL.replace(/\/$/, '');
const testes = [
  ['ler uma sala', 'GET', '/salas/TESTE/publico.json', true],
  ['escrever numa sala', 'PUT', '/salas/TESTE/publico.json', false, { json: '{"hack":true}', em: 1 }],
  ['ler uma ficha', 'GET', '/fichas/joshua.json', false],
  ['escrever numa ficha', 'PUT', '/fichas/joshua/pv.json', false, { atual: 1, max: 1 }],
  ['ler a lista de donos', 'GET', '/donos.json', false],
  ['ler a lista de mestres', 'GET', '/mestres.json', false],
  ['ler o backup de uma mesa', 'GET', '/mesas/qualquer-uid/backup.json', false],
  ['escrever num backup', 'PUT', '/mesas/qualquer-uid/backup.json', false, { json: '{}', em: 1 }],
  ['escrever na raiz do banco', 'PATCH', '/.json', false, { invasao: true }],
];

let falhas = 0;
let bloqueadoDemais = 0; // negou o que deveria permitir (ex.: ainda no "modo bloqueado")
for (const [nome, metodo, caminho, deveriaPermitir, corpo] of testes) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const permitiu = resposta.ok;
  const certo = permitiu === deveriaPermitir;
  if (!certo) falhas++;
  if (!certo && deveriaPermitir) bloqueadoDemais++;
  console.log(`${certo ? 'OK   ' : 'FALHA'}  sem login, ${nome}: ${permitiu ? 'PERMITIDO' : 'NEGADO'} (HTTP ${resposta.status})`);
}
if (!falhas) console.log('\nTudo certo: sem login, os jogadores leem a sala e ninguém escreve nada.');
else if (falhas === bloqueadoDemais) console.log('\nSeguro, mas bloqueado demais: os jogadores não conseguiriam ler a sala. As regras do projeto ainda não foram publicadas (o banco está no "modo bloqueado").');
else console.log(`\n${falhas - bloqueadoDemais} teste(s) com problema: as regras NÃO estão protegendo!`);
process.exit(falhas ? 1 : 0);
