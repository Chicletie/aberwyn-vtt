// Configuração do serviço online (Firebase). Você copia estes valores do console do Firebase
// (Configurações do projeto → Seus apps → Configuração do SDK) e cola aqui.
//
// Estes valores NÃO são senha: eles só dizem "qual projeto do Firebase usar" e ficam visíveis
// para qualquer um que abra o site. Quem protege os dados são as REGRAS DE SEGURANÇA do servidor
// (arquivo database.rules.json), não o segredo destes valores. Ver docs/DECISOES.md.
//
// Enquanto estiver null, o app funciona só no modo local (abas do mesmo navegador).

/** @type {null | {apiKey:string, authDomain:string, databaseURL:string, projectId:string, appId:string}} */
export const firebaseConfig = {
  apiKey: 'AIzaSyC4QFp-ASiq2AypGQbXXEsNphgxuHkn0ns',
  authDomain: 'aberyn-vtt.firebaseapp.com',
  // Endereço do Realtime Database (aparece no console, em Realtime Database → Dados).
  databaseURL: 'https://aberyn-vtt-default-rtdb.firebaseio.com',
  projectId: 'aberyn-vtt',
  storageBucket: 'aberyn-vtt.firebasestorage.app',
  messagingSenderId: '548057019391',
  appId: '1:548057019391:web:cbef1bf08499c66388edca',
};

/**
 * Endereço do palco publicado no GitHub Pages (o link que os jogadores abrem).
 * Ex.: 'https://seu-usuario.github.io/aberwyn-vtt/palco.html'. null = usa o endereço atual.
 */
export const urlPalcoPublicado = 'https://chicletie.github.io/aberwyn-vtt/palco.html';
