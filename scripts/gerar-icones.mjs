// Gera os ícones do app instalável (public/icones/) a partir da arte da interface:
// a janela (assets/ui/janela.png, 32×32) com a pena no meio, ampliada por número inteiro.
// Redesenhou a janela ou a pena? Rode de novo:  node scripts/gerar-icones.mjs

import fs from 'node:fs';
import { lerPng, gravarPng } from './png.mjs';

const UI = 'public/assets/ui/';
const SAIDA = 'public/icones/';
const FUNDO = [9, 10, 20, 255]; // #090a14, o mesmo do fundo do palco

const janela = lerPng(`${UI}janela.png`);
const pena = lerPng(`${UI}pena.png`);

// Desenho base 32×32: a janela inteira e, por cima, a pena centralizada.
const base = { largura: 32, altura: 32, pixels: new Uint8Array(32 * 32 * 4) };
for (let i = 0; i < 32 * 32; i++) base.pixels.set(FUNDO, i * 4);
colar(base, janela, 0, 0);
colar(base, pena, Math.floor((32 - pena.largura) / 2), Math.floor((32 - pena.altura) / 2));

fs.mkdirSync(SAIDA, { recursive: true });
gerar('icone-192.png', 192, 6); // 32 × 6 = 192, ocupa tudo
gerar('icone-512.png', 512, 16); // 32 × 16 = 512
gerar('icone-180.png', 180, 5); // iPhone: 160 no meio de 180
gerar('icone-mascara-512.png', 512, 12); // Android recorta em círculo: 384 no meio, longe das bordas
console.log('Ícones gerados em', SAIDA);

/** Cola "imagem" sobre "destino" em (x, y), respeitando a transparência (pixel transparente não cobre). */
function colar(destino, imagem, x0, y0) {
  for (let y = 0; y < imagem.altura; y++) {
    for (let x = 0; x < imagem.largura; x++) {
      const o = (y * imagem.largura + x) * 4;
      if (imagem.pixels[o + 3] < 128) continue;
      const d = ((y0 + y) * destino.largura + (x0 + x)) * 4;
      destino.pixels.set([imagem.pixels[o], imagem.pixels[o + 1], imagem.pixels[o + 2], 255], d);
    }
  }
}

/** Amplia o desenho base por "escala" (pixel vira quadrado, sem borrar) e centraliza num quadro. */
function gerar(nome, tamanho, escala) {
  const img = { largura: tamanho, altura: tamanho, pixels: new Uint8Array(tamanho * tamanho * 4) };
  for (let i = 0; i < tamanho * tamanho; i++) img.pixels.set(FUNDO, i * 4);
  const margem = Math.floor((tamanho - 32 * escala) / 2);
  for (let y = 0; y < 32 * escala; y++) {
    for (let x = 0; x < 32 * escala; x++) {
      const o = (Math.floor(y / escala) * 32 + Math.floor(x / escala)) * 4;
      img.pixels.set(base.pixels.subarray(o, o + 4), ((margem + y) * tamanho + margem + x) * 4);
    }
  }
  gravarPng(`${SAIDA}${nome}`, img);
}
