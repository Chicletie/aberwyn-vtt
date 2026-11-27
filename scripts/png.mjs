// PNG mínimo (ler e gravar), sem instalar nada: usa só o zlib que já vem com o Node.
// Serve para os scripts que geram imagens (ícones do app). Só RGBA de 8 bits.

import zlib from 'node:zlib';
import fs from 'node:fs';

const ASSINATURA = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pedaco(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const tipoEDados = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipoEDados));
  return Buffer.concat([tamanho, tipoEDados, crc]);
}

/** Grava uma imagem { largura, altura, pixels: Uint8Array RGBA } como PNG. */
export function gravarPng(caminho, { largura, altura, pixels }) {
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8; // 8 bits por canal
  cabecalho[9] = 6; // RGBA
  const linhas = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) {
    linhas[y * (largura * 4 + 1)] = 0; // sem filtro
    Buffer.from(pixels.buffer, pixels.byteOffset + y * largura * 4, largura * 4).copy(linhas, y * (largura * 4 + 1) + 1);
  }
  fs.writeFileSync(caminho, Buffer.concat([
    ASSINATURA,
    pedaco('IHDR', cabecalho),
    pedaco('IDAT', zlib.deflateSync(linhas, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]));
}

/** Lê um PNG RGBA (ou RGB) de 8 bits, sem entrelaçamento. Devolve { largura, altura, pixels }. */
export function lerPng(caminho) {
  const buf = fs.readFileSync(caminho);
  let pos = 8;
  let largura = 0, altura = 0, tipoCor = 6;
  let paleta = null, transparencia = null;
  const dados = [];
  while (pos < buf.length) {
    const tamanho = buf.readUInt32BE(pos);
    const tipo = buf.toString('ascii', pos + 4, pos + 8);
    const corpo = buf.subarray(pos + 8, pos + 8 + tamanho);
    if (tipo === 'IHDR') {
      largura = corpo.readUInt32BE(0);
      altura = corpo.readUInt32BE(4);
      if (corpo[8] !== 8 || corpo[12] !== 0) throw new Error(`${caminho}: só PNG de 8 bits sem entrelaçamento`);
      tipoCor = corpo[9];
    } else if (tipo === 'PLTE') paleta = corpo;
    else if (tipo === 'tRNS') transparencia = corpo;
    else if (tipo === 'IDAT') dados.push(corpo);
    pos += 12 + tamanho;
  }
  const canais = { 6: 4, 2: 3, 3: 1, 4: 2, 0: 1 }[tipoCor];
  const bruto = zlib.inflateSync(Buffer.concat(dados));
  const porLinha = largura * canais;
  const linhas = Buffer.alloc(porLinha * altura);
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[y * (porLinha + 1)];
    for (let x = 0; x < porLinha; x++) {
      const v = bruto[y * (porLinha + 1) + 1 + x];
      const a = x >= canais ? linhas[y * porLinha + x - canais] : 0;
      const b = y > 0 ? linhas[(y - 1) * porLinha + x] : 0;
      const c = x >= canais && y > 0 ? linhas[(y - 1) * porLinha + x - canais] : 0;
      let r = v;
      if (filtro === 1) r = v + a;
      else if (filtro === 2) r = v + b;
      else if (filtro === 3) r = v + ((a + b) >> 1);
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      linhas[y * porLinha + x] = r & 0xff;
    }
  }
  const pixels = new Uint8Array(largura * altura * 4);
  for (let i = 0; i < largura * altura; i++) {
    if (tipoCor === 6) linhas.copy(Buffer.from(pixels.buffer), i * 4, i * 4, i * 4 + 4);
    else if (tipoCor === 2) {
      pixels.set([linhas[i * 3], linhas[i * 3 + 1], linhas[i * 3 + 2], 255], i * 4);
    } else if (tipoCor === 3) {
      const k = linhas[i];
      pixels.set([paleta[k * 3], paleta[k * 3 + 1], paleta[k * 3 + 2], transparencia && k < transparencia.length ? transparencia[k] : 255], i * 4);
    } else if (tipoCor === 4) {
      pixels.set([linhas[i * 2], linhas[i * 2], linhas[i * 2], linhas[i * 2 + 1]], i * 4);
    } else {
      pixels.set([linhas[i], linhas[i], linhas[i], 255], i * 4);
    }
  }
  return { largura, altura, pixels };
}
