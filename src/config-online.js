// Configuração do serviço online (Firebase). Você copia estes valores do console do Firebase
// (Configurações do projeto → Seus apps → Configuração do SDK) e cola aqui.
//
// Estes valores NÃO são senha: eles só dizem "qual projeto do Firebase usar" e ficam visíveis
// para qualquer um que abra o site. Quem protege os dados são as REGRAS DE SEGURANÇA do servidor
// (arquivo database.rules.json), não o segredo destes valores. Ver docs/DECISOES.md.
//
// Enquanto estiver null, o app funciona só no modo local (abas do mesmo navegador).

/** @type {null | {apiKey:string, authDomain:string, databaseURL:string, projectId:string, appId:string}} */
export const firebaseConfig = null;

/**
 * Endereço do palco publicado no GitHub Pages (o link que os jogadores abrem).
 * Ex.: 'https://seu-usuario.github.io/errante-vtt/palco.html'. null = usa o endereço atual.
 */
export const urlPalcoPublicado = null;
