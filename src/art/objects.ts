import { P, darken, lighten, mix, type Hex } from './palette';
import { Pix, rng, shadowPix, DITHER } from './pix';
import { tileGrass, tileCobble } from './tiles';

/**
 * Objetos do mundo, mobílias e ícones — todos desenhados em código.
 * Convenção: objetos "de chão" têm origem no centro-inferior (definida na cena).
 * Luz vem de cima/esquerda: bordas superiores/esquerdas claras, inferiores/direitas escuras.
 */

export type Facing = 'south' | 'east' | 'north' | 'west';
export const FACINGS: Facing[] = ['south', 'east', 'north', 'west'];

// ---------------------------------------------------------------------------
// Utilitários de desenho
// ---------------------------------------------------------------------------

/** Tábua de madeira com veio, borda clara em cima e escura embaixo. */
function plank(p: Pix, x: number, y: number, w: number, h: number, c: Hex = P.wood, seed = 1): void {
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lighten(c, 0.2));
  p.hline(x, x + w - 1, y + h - 1, darken(c, 0.3));
  p.vline(x + w - 1, y + 1, y + h - 2, darken(c, 0.2));
  const r = rng(seed + x * 7 + y * 13);
  for (let i = 0; i < Math.max(1, Math.floor(w / 10)); i++) {
    const gx = x + 1 + Math.floor(r() * Math.max(1, w - 6));
    const gy = y + 1 + Math.floor(r() * Math.max(1, h - 2));
    p.hline(gx, gx + 2 + Math.floor(r() * 3), gy, darken(c, 0.12));
  }
}

/** Bloco de pedra com volume. */
function stoneBlock(p: Pix, x: number, y: number, w: number, h: number, c: Hex = P.stone): void {
  p.rrectR(x, y, w, h, 1, c);
  p.hline(x + 1, x + w - 2, y, lighten(c, 0.25));
  p.vline(x, y + 1, y + h - 2, lighten(c, 0.12));
  p.hline(x + 1, x + w - 2, y + h - 1, darken(c, 0.3));
  p.vline(x + w - 1, y + 1, y + h - 2, darken(c, 0.2));
}

/** Flor simples (miolo + pétalas) com haste. */
function flower(p: Pix, x: number, y: number, petal: Hex, stemTo: number, center: Hex = P.amber): void {
  p.vline(x, y + 2, stemTo, P.grassDark);
  p.set(x + 1, y + 3, P.grass);
  p.set(x - 1, y, petal); p.set(x + 1, y, petal); p.set(x, y - 1, petal); p.set(x, y + 1, petal);
  p.set(x - 1, y - 1, lighten(petal, 0.3)); p.set(x + 1, y + 1, darken(petal, 0.2));
  p.set(x, y, center);
}

/** Telhado com telhas arredondadas (fileiras deslocadas) e sombreamento por fileira. */
function roofShingles(p: Pix, x: number, y: number, w: number, h: number, c: Hex, seed: number, worn: boolean): void {
  p.rect(x, y, w, h, c);
  const rows = Math.floor(h / 4);
  for (let row = 0; row <= rows; row++) {
    const yy = y + row * 4;
    const t = row / Math.max(1, rows);
    const rowC = mix(c, darken(c, 0.35), t * 0.5);
    const off = row % 2 ? 3 : 0;
    for (let xx = x - 6 + off; xx < x + w; xx += 6) {
      for (let k = 0; k < 6; k++) {
        const px = xx + k;
        if (px < x || px >= x + w) continue;
        for (let yy2 = yy; yy2 < Math.min(yy + 4, y + h); yy2++) p.set(px, yy2, rowC);
      }
      // curva inferior da telha e sombra
      if (yy + 3 < y + h) {
        p.set(xx, yy + 3, darken(rowC, 0.35)); p.set(xx + 5, yy + 3, darken(rowC, 0.35));
        p.hline(xx + 1, xx + 4, yy + 3, darken(rowC, 0.2));
        p.hline(xx + 1, xx + 4, yy, lighten(rowC, 0.12));
      }
      if (xx >= x && xx < x + w) p.vline(xx, yy, Math.min(yy + 2, y + h - 1), darken(rowC, 0.25));
    }
  }
  if (worn) {
    const r = rng(seed);
    for (let i = 0; i < 4; i++) {
      const hx = x + 10 + Math.floor(r() * (w - 30));
      const hy = y + 4 + Math.floor(r() * (h - 12));
      const hw = 8 + Math.floor(r() * 8);
      p.rect(hx, hy, hw, 6, P.brownDark);
      p.rect(hx + 1, hy + 1, hw - 3, 3, darken(P.brownDark, 0.4));
      p.hline(hx, hx + hw - 1, hy + 6, darken(c, 0.5));
    }
    for (let i = 0; i < 8; i++) { const mx = x + Math.floor(r() * (w - 4)); const my = y + Math.floor(r() * (h - 3)); p.rect(mx, my, 3, 2, P.sageDark); p.set(mx + 1, my - 1, P.sage); }
    plank(p, x + w - 34, y + 8, 14, 3, P.wood); // tábua remendando
  }
}

/** Beiral do telhado (linha escura com sombra sobre a parede). */
function eave(p: Pix, x: number, w: number, y: number): void {
  p.hline(x, x + w - 1, y, P.woodDark);
  p.hline(x, x + w - 1, y + 1, P.brownDark);
  p.rectDither(x, y + 2, w, 3, P.brownDark, DITHER.checker, 120);
}

/** Janela com moldura, peitoril, vidro e cruzeta. */
function windowFrame(p: Pix, x: number, y: number, w: number, h: number, glass: Hex, opts: { boarded?: boolean; curtains?: boolean; flowerBox?: boolean; shutters?: Hex } = {}): void {
  p.rect(x, y, w, h, P.woodDark);
  p.hline(x, x + w - 1, y, P.wood);
  p.vline(x, y, y + h - 1, P.wood);
  p.rect(x + 3, y + 3, w - 6, h - 6, glass);
  // reflexo diagonal
  p.rectDither(x + 4, y + 4, Math.floor((w - 8) / 2), h - 8, lighten(glass, 0.25), DITHER.checker);
  p.set(x + 4, y + 4, lighten(glass, 0.5)); p.set(x + 5, y + 4, lighten(glass, 0.5)); p.set(x + 4, y + 5, lighten(glass, 0.5));
  const mx = x + Math.floor(w / 2); const my = y + Math.floor(h / 2);
  p.vline(mx, y + 3, y + h - 4, P.woodDark); p.hline(x + 3, x + w - 4, my, P.woodDark);
  if (opts.curtains) {
    const cc = P.coralLight;
    p.rect(x + 3, y + 3, 4, h - 6, cc); p.rect(x + w - 7, y + 3, 4, h - 6, cc);
    p.vline(x + 5, y + 4, y + h - 5, darken(cc, 0.2)); p.vline(x + w - 5, y + 4, y + h - 5, darken(cc, 0.2));
  }
  // peitoril
  p.rect(x - 1, y + h, w + 2, 2, P.wood); p.hline(x - 1, x + w, y + h, P.woodLight); p.hline(x - 1, x + w, y + h + 1, P.woodDark);
  if (opts.shutters) {
    const sc = opts.shutters;
    p.rect(x - 5, y + 1, 5, h - 2, sc); p.rect(x + w, y + 1, 5, h - 2, sc);
    for (let yy = y + 3; yy < y + h - 3; yy += 3) { p.hline(x - 4, x - 2, yy, darken(sc, 0.3)); p.hline(x + w + 1, x + w + 3, yy, darken(sc, 0.3)); }
    p.vline(x - 1, y + 1, y + h - 2, darken(sc, 0.35)); p.vline(x + w + 4, y + 1, y + h - 2, darken(sc, 0.35));
  }
  if (opts.boarded) {
    plank(p, x - 2, y + 4, w + 4, 4, P.wood, 3);
    plank(p, x - 2, y + h - 9, w + 4, 4, mix(P.wood, P.gray, 0.2), 4);
    p.set(x, y + 5, P.brownDark); p.set(x + w, y + 5, P.brownDark);
  }
  if (opts.flowerBox) {
    p.rect(x - 1, y + h + 2, w + 2, 5, P.caramelDark);
    p.hline(x - 1, x + w, y + h + 2, P.caramel);
    const cols = [P.coral, P.pink, P.mustardLight, P.lilacLight, P.coralLight];
    for (let i = 0; i < Math.floor(w / 4); i++) { const fx = x + 1 + i * 4; p.rect(fx, y + h - 1, 3, 2, cols[i % cols.length]); p.set(fx + 1, y + h + 1, P.grass); p.set(fx, y + h - 2, lighten(cols[i % cols.length], 0.3)); }
  }
}

/** Porta com batente, vidro âmbar opcional e maçaneta. */
function doorFrame(p: Pix, x: number, y: number, w: number, h: number, c: Hex, glass: Hex | null, arch = true): void {
  if (arch) p.rrectR(x, y, w, h + 4, 4, P.woodDark); else p.rect(x, y, w, h + 4, P.woodDark);
  p.hline(x + 2, x + w - 3, y, P.wood);
  const inner = c;
  if (arch) p.rrectR(x + 3, y + 3, w - 6, h + 4, 3, inner); else p.rect(x + 3, y + 3, w - 6, h + 4, inner);
  p.vline(x + 3, y + 4, y + h + 2, lighten(inner, 0.15));
  p.vline(x + w - 4, y + 4, y + h + 2, darken(inner, 0.25));
  // almofadas da porta
  p.box(x + 6, y + h - 12, w - 12, 9, darken(inner, 0.25));
  p.hline(x + 7, x + w - 8, y + h - 12, darken(inner, 0.15));
  if (glass) { p.rrectR(x + 6, y + 6, w - 12, 10, 2, glass); p.set(x + 7, y + 7, lighten(glass, 0.4)); p.set(x + 8, y + 7, lighten(glass, 0.4)); p.vline(x + Math.floor(w / 2), y + 6, y + 15, P.woodDark); }
  p.set(x + w - 7, y + h - 6, P.amber); p.set(x + w - 6, y + h - 6, P.amberDark);
}

/** Vaso de flores no chão junto à parede. */
function potPlant(p: Pix, x: number, y: number, c: Hex, petals: Hex[]): void {
  p.rect(x, y, 12, 10, c);
  p.hline(x - 1, x + 12, y, lighten(c, 0.3)); p.hline(x - 1, x + 12, y + 1, c);
  p.vline(x + 11, y + 2, y + 9, darken(c, 0.3)); p.hline(x + 1, x + 10, y + 9, darken(c, 0.3));
  p.rect(x + 1, y - 4, 10, 4, P.grassDark); p.rect(x + 2, y - 5, 8, 2, P.grass);
  petals.forEach((pc, i) => { p.set(x + 2 + i * 3, y - 6 + (i % 2), pc); p.set(x + 3 + i * 3, y - 5 + (i % 2), pc); });
}

// ---------------------------------------------------------------------------
// Props do ateliê e da loja
// ---------------------------------------------------------------------------

export function crate(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 13, 3, P.black, 60);
  // tampa vista de cima
  p.rrectR(3, 4, 26, 26, 2, P.woodDark);
  p.rect(5, 6, 22, 22, P.wood);
  p.hline(5, 26, 6, P.woodLight); p.vline(5, 6, 27, P.woodLight);
  p.hline(5, 26, 27, P.woodDark); p.vline(26, 6, 27, P.woodDark);
  // ripas
  p.rect(5, 6, 22, 4, mix(P.wood, P.woodLight, 0.3)); p.hline(5, 26, 9, P.woodDark);
  p.rect(5, 24, 22, 4, mix(P.wood, P.woodLight, 0.3)); p.hline(5, 26, 24, P.woodDark);
  p.line(6, 10, 25, 23, P.woodDark); p.line(7, 10, 26, 23, mix(P.wood, P.woodLight, 0.4));
  p.line(25, 10, 6, 23, P.woodDark); p.line(26, 10, 7, 23, mix(P.wood, P.woodLight, 0.4));
  // pregos
  [[7, 8], [24, 8], [7, 26], [24, 26]].forEach(([x, y]) => { p.set(x, y, P.grayLight); p.set(x + 1, y + 1, P.grayDark); });
  p.rect(9, 13, 6, 3, P.creamDark); p.rect(10, 14, 4, 1, P.brownDark); // etiqueta
  p.outline(P.outline);
  return p;
}

export function cobweb(): Pix {
  const p = new Pix(32, 32);
  const c = P.grayLight;
  const c2 = mix(P.grayLight, P.white, 0.5);
  for (let i = 0; i < 6; i++) p.line(1, 1, 1 + i * 6, 30, i % 2 ? c : c2, 190);
  for (let i = 0; i < 5; i++) p.line(1, 1, 30, 1 + i * 7, i % 2 ? c : c2, 190);
  for (let r = 5; r < 30; r += 5) {
    const bow = Math.round(r * 0.72);
    p.line(1 + r, 1, 1 + bow, 1 + bow, c, 170);
    p.line(1 + bow, 1 + bow, 1, 1 + r, c, 170);
  }
  // aranha
  p.set(12, 13, P.grayDark); p.set(13, 13, P.grayDark); p.set(12, 14, P.grayDark); p.set(13, 14, P.grayDark);
  p.set(11, 12, P.grayDark); p.set(14, 12, P.grayDark); p.set(11, 15, P.grayDark); p.set(14, 15, P.grayDark);
  p.set(12, 12, P.red);
  p.set(4, 4, P.white, 200); p.set(20, 8, P.white, 160);
  return p;
}

export function windowClosed(): Pix {
  const p = new Pix(32, 32);
  p.rect(3, 3, 26, 24, P.woodDark);
  p.hline(3, 28, 3, P.wood); p.vline(3, 3, 26, P.wood);
  p.rect(5, 5, 22, 20, darken(P.teal, 0.55));
  // venezianas fechadas
  for (let y = 6; y < 25; y += 4) { plank(p, 5, y, 22, 3, mix(P.wood, P.gray, 0.25), y); }
  p.vline(16, 5, 24, P.brownDark);
  p.set(8, 8, P.brownDark); p.set(23, 8, P.brownDark); p.set(8, 21, P.brownDark); p.set(23, 21, P.brownDark);
  p.rect(2, 27, 28, 3, P.wood); p.hline(2, 29, 27, P.woodLight); p.hline(2, 29, 29, P.woodDark);
  p.rect(9, 9, 3, 3, P.grayLight, 120); // poeira
  p.outline(P.outline);
  return p;
}

export function windowOpen(): Pix {
  const p = new Pix(32, 32);
  p.rect(3, 3, 26, 24, P.woodDark);
  p.hline(3, 28, 3, P.wood); p.vline(3, 3, 26, P.wood);
  p.rect(5, 5, 22, 20, P.sky);
  p.rect(5, 5, 22, 7, '#dbe8f6');
  p.rectDither(5, 12, 22, 2, '#dbe8f6', DITHER.checker);
  p.rect(5, 18, 22, 7, P.sageLight); p.rectDither(5, 17, 22, 1, P.sageLight, DITHER.checker);
  p.disc(11, 21, 3, P.sage); p.disc(21, 22, 4, P.sage); p.set(10, 19, P.sageLight);
  p.rect(7, 7, 4, 2, P.white); p.rect(8, 6, 2, 1, P.white); // nuvem
  p.set(23, 8, P.amber); p.set(24, 8, P.amber); p.set(23, 9, P.amber); p.set(24, 9, P.amber); // sol
  p.vline(15, 5, 24, P.wood); p.vline(16, 5, 24, P.woodDark); p.hline(5, 26, 14, P.wood); p.hline(5, 26, 15, P.woodDark);
  // batentes abertos
  p.rect(0, 2, 3, 26, P.wood); p.vline(0, 2, 27, P.woodLight); p.vline(2, 3, 26, P.woodDark);
  p.rect(29, 2, 3, 26, P.wood); p.vline(29, 2, 27, P.woodLight); p.vline(31, 3, 26, P.woodDark);
  p.rect(2, 27, 28, 3, P.wood); p.hline(2, 29, 27, P.woodLight); p.hline(2, 29, 29, P.woodDark);
  p.outline(P.outline);
  return p;
}

export function photo(): Pix {
  const p = new Pix(16, 16);
  p.rect(2, 2, 12, 12, P.cream);
  p.hline(2, 13, 13, P.creamDark); p.vline(13, 2, 13, P.creamDark);
  p.rect(3, 3, 10, 8, P.sageLight);
  p.rect(3, 3, 10, 3, P.sky);
  p.rect(5, 5, 5, 5, P.lilac); p.rect(5, 4, 5, 2, P.lilacDark);
  p.set(11, 7, P.amber); p.set(6, 7, P.amber);
  p.outline(P.outline);
  return p;
}

/** Mesa de trabalho (tampo + pernas) usada pelas três bancadas. */
function workTable(p: Pix, x: number, w: number, top: number, broken: boolean): void {
  const legH = 30 - (top + 7);
  // pernas
  p.rect(x + 2, top + 6, 4, legH + 1, P.woodDark); p.vline(x + 2, top + 6, 30, P.wood);
  p.rect(x + w - 6, top + 6 + (broken ? 2 : 0), 4, legH + 1 - (broken ? 2 : 0), P.woodDark); p.vline(x + w - 6, top + 6 + (broken ? 2 : 0), 30, P.wood);
  // sombra sob o tampo
  p.rectDither(x + 2, top + 7, w - 4, 2, P.brownDark, DITHER.checker);
  // tampo com espessura
  p.rect(x, top, w, 7, P.wood);
  p.hline(x, x + w - 1, top, P.woodLight);
  p.hline(x, x + w - 1, top + 1, mix(P.wood, P.woodLight, 0.5));
  p.hline(x, x + w - 1, top + 5, P.woodDark);
  p.hline(x, x + w - 1, top + 6, P.brownDark);
  p.vline(x + w - 1, top + 1, top + 5, P.woodDark);
  for (let gx = x + 3; gx < x + w - 4; gx += 9) p.hline(gx, gx + 3, top + 3, darken(P.wood, 0.12));
}

export function benchBroken(): Pix {
  const p = new Pix(64, 32);
  p.ellipseBlend(32, 30, 28, 3, P.black, 60);
  // metade esquerda inteira, metade direita caída
  p.rect(4, 18, 4, 12, P.woodDark); p.vline(4, 18, 30, P.wood);
  p.rect(56, 24, 4, 6, P.woodDark);
  p.rect(2, 12, 38, 7, P.wood); p.hline(2, 39, 12, P.woodLight); p.hline(2, 39, 17, P.woodDark); p.hline(2, 39, 18, P.brownDark);
  // tábua quebrada, inclinada
  for (let i = 0; i < 20; i++) { p.vline(40 + i, 13 + Math.floor(i * 0.55), 18 + Math.floor(i * 0.55), i % 6 === 5 ? P.woodDark : P.wood); p.set(40 + i, 13 + Math.floor(i * 0.55), P.woodLight); }
  p.set(40, 12, P.woodDark); p.set(41, 11, P.woodDark);
  // lascas
  p.set(44, 24, P.wood); p.set(48, 27, P.woodDark); p.set(52, 25, P.wood);
  // martelo velho e serragem
  p.rect(10, 5, 7, 5, P.stoneDark); p.hline(10, 16, 5, P.stone); p.rect(13, 9, 1, 6, P.wood);
  p.rectDither(20, 9, 12, 3, P.creamDark, DITHER.dense);
  p.rect(24, 8, 6, 2, P.grayLight); // pó
  p.outline(P.outline);
  return p;
}

export function benchOk(): Pix {
  const p = new Pix(64, 32);
  p.ellipseBlend(32, 30, 28, 3, P.black, 60);
  workTable(p, 2, 60, 12, false);
  // travessa entre as pernas
  p.rect(6, 25, 52, 2, P.wood); p.hline(6, 57, 26, P.woodDark);
  // martelo, serrote, tábuas e torno
  p.rect(9, 5, 8, 5, P.stoneDark); p.hline(9, 16, 5, P.stone); p.set(16, 6, P.stoneLight); p.rect(12, 9, 2, 5, P.wood);
  p.rect(26, 7, 14, 3, P.stoneLight); p.hline(26, 39, 9, P.stone); for (let x = 27; x < 40; x += 2) p.set(x, 10, P.stoneDark);
  p.rect(24, 6, 4, 4, P.wood); p.set(24, 6, P.woodLight);
  plank(p, 46, 4, 12, 3, P.woodLight, 8); plank(p, 47, 7, 12, 3, P.wood, 9);
  p.rect(20, 3, 3, 8, P.gray); p.set(20, 3, P.grayLight); p.rect(19, 10, 5, 2, P.grayDark); // torno
  p.outline(P.outline);
  return p;
}

export function sewingBroken(): Pix {
  const p = new Pix(48, 32);
  p.ellipseBlend(24, 30, 20, 3, P.black, 60);
  workTable(p, 2, 44, 14, true);
  // máquina de costura enferrujada
  p.rrectR(12, 4, 18, 10, 3, P.grayDark);
  p.rect(14, 6, 6, 6, P.gray); p.rect(15, 7, 4, 4, darken(P.gray, 0.2));
  p.rectDither(13, 5, 16, 8, P.caramelDark, DITHER.sparse); // ferrugem
  p.line(28, 6, 34, 1, P.grayLight); p.set(34, 0, P.grayDark);
  p.rect(30, 10, 10, 3, P.grayLight); p.hline(30, 39, 12, P.gray);
  p.rect(35, 6, 3, 4, mix(P.coral, P.gray, 0.5)); // carretel velho
  p.outline(P.outline);
  return p;
}

export function sewingOk(): Pix {
  const p = new Pix(48, 32);
  p.ellipseBlend(24, 30, 20, 3, P.black, 60);
  workTable(p, 2, 44, 13, false);
  // máquina de costura azul-petróleo
  p.rrectR(9, 2, 19, 11, 3, P.teal);
  p.hline(11, 25, 2, P.tealLight); p.vline(9, 4, 10, P.tealLight);
  p.hline(11, 25, 12, P.tealDark); p.vline(27, 4, 10, P.tealDark);
  p.rect(12, 5, 12, 2, P.tealLight, 180);
  p.rect(23, 6, 3, 7, P.stoneLight); p.vline(25, 6, 12, P.stone); // braço da agulha
  p.rect(24, 12, 1, 2, P.grayDark);
  p.disc(13, 8, 2, P.amber); p.set(13, 8, P.amberDark); // volante
  // carretéis
  p.rect(31, 5, 5, 8, P.coral); p.hline(31, 35, 5, P.coralLight); p.vline(35, 5, 12, P.coralDark); p.rect(32, 3, 3, 2, P.creamDark);
  p.rect(38, 7, 5, 6, P.lilac); p.hline(38, 42, 7, P.lilacLight); p.vline(42, 7, 12, P.lilacDark); p.rect(39, 5, 3, 2, P.creamDark);
  // tecido dobrado
  p.rect(2, 9, 7, 4, P.pink); p.hline(2, 8, 9, P.coralLight); p.hline(2, 8, 12, P.pinkDark);
  p.outline(P.outline);
  return p;
}

export function paintBroken(): Pix {
  const p = new Pix(48, 32);
  p.ellipseBlend(24, 30, 20, 3, P.black, 60);
  workTable(p, 2, 44, 14, true);
  // cavalete tombado e potes secos
  p.rect(8, 4, 12, 10, P.grayLight); p.rect(10, 6, 8, 6, P.gray); p.line(8, 4, 19, 13, P.grayDark);
  p.rect(26, 8, 8, 6, P.grayDark); p.hline(26, 33, 8, P.gray); p.rect(28, 6, 4, 2, P.gray);
  p.line(36, 4, 42, 12, P.woodDark); p.line(37, 4, 43, 12, P.wood);
  p.rectDither(22, 12, 10, 2, P.gray, DITHER.checker);
  p.outline(P.outline);
  return p;
}

export function paintOk(): Pix {
  const p = new Pix(48, 32);
  p.ellipseBlend(24, 30, 20, 3, P.black, 60);
  workTable(p, 2, 44, 13, false);
  // paleta
  p.ellipse(12, 7, 7, 5, P.cream); p.ellipse(12, 7, 7, 5, P.creamDark, 0); p.set(12, 12, P.creamDark);
  p.hline(7, 17, 12, P.creamDark);
  p.set(8, 5, P.coral); p.set(9, 5, P.coral); p.set(12, 3, P.mustard); p.set(13, 3, P.mustard); p.set(16, 5, P.teal); p.set(17, 5, P.teal); p.set(9, 9, P.lilac); p.set(10, 9, P.lilac); p.set(14, 9, P.sage); p.set(15, 9, P.sage);
  p.set(11, 7, P.creamLight);
  // potes de tinta com rótulos
  const jar = (x: number, y: number, h: number, c: Hex) => { p.rect(x, y, 6, h, c); p.vline(x, y, y + h - 1, lighten(c, 0.3)); p.vline(x + 5, y, y + h - 1, darken(c, 0.3)); p.rect(x, y - 1, 6, 2, P.grayDark); p.hline(x, x + 5, y - 1, P.grayLight); p.rect(x + 1, y + 3, 4, 2, P.cream); };
  jar(23, 5, 8, P.coral); jar(30, 7, 6, P.teal); jar(37, 4, 9, P.lilac);
  // pincel
  p.line(41, 1, 45, 11, P.woodDark); p.set(45, 12, P.amber); p.set(41, 0, P.stoneLight);
  p.outline(P.outline);
  return p;
}

export function notebookStand(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 30, 11, 3, P.black, 60);
  // pedestal
  p.rect(12, 18, 8, 11, P.woodDark); p.vline(12, 18, 28, P.wood); p.rect(8, 27, 16, 4, P.wood); p.hline(8, 23, 27, P.woodLight); p.hline(8, 23, 30, P.woodDark);
  // caderno aberto
  p.rrectR(4, 3, 24, 17, 2, P.lilacDark);
  p.rect(6, 5, 20, 13, P.lilac);
  p.hline(6, 25, 5, P.lilacLight); p.vline(6, 5, 17, P.lilacLight);
  p.rect(15, 5, 2, 13, P.lilacDark);
  // páginas
  p.rect(7, 6, 8, 11, P.cream); p.rect(17, 6, 8, 11, P.creamLight);
  p.hline(8, 13, 8, P.lilacDark); p.hline(8, 12, 10, P.lilacLight); p.hline(8, 13, 12, P.lilacLight); p.hline(8, 11, 14, P.lilacLight);
  p.hline(18, 23, 8, P.amber); p.hline(18, 22, 10, P.lilacLight); p.hline(18, 23, 12, P.lilacLight);
  // brilho mágico
  p.set(16, 1, P.amber); p.set(15, 2, P.amber); p.set(17, 2, P.amber); p.set(16, 0, P.white);
  p.set(28, 6, P.amber); p.set(3, 9, P.amber);
  p.outline(P.outline);
  return p;
}

export function shelfOld(): Pix {
  const p = new Pix(32, 32);
  p.rect(2, 4, 28, 24, darken(P.woodDark, 0.3));
  p.rect(3, 5, 26, 22, mix(P.wood, P.gray, 0.3));
  plank(p, 2, 9, 28, 3, mix(P.wood, P.gray, 0.2), 1); plank(p, 2, 18, 28, 3, mix(P.wood, P.gray, 0.2), 2); plank(p, 2, 26, 28, 3, mix(P.wood, P.gray, 0.2), 3);
  p.rect(2, 4, 2, 25, P.woodDark); p.rect(28, 4, 2, 25, P.woodDark);
  // potes e livros empoeirados
  p.rect(6, 4, 4, 5, mix(P.teal, P.gray, 0.4)); p.rect(12, 2, 3, 7, mix(P.coralDark, P.gray, 0.4)); p.rect(16, 5, 5, 4, mix(P.sage, P.gray, 0.4));
  p.rect(8, 13, 6, 5, P.grayLight); p.rect(9, 12, 4, 1, P.gray); p.rect(18, 14, 4, 4, mix(P.lilac, P.gray, 0.4));
  p.rect(6, 22, 5, 4, mix(P.mustard, P.gray, 0.5)); p.rect(14, 23, 8, 3, mix(P.cream, P.gray, 0.3));
  p.rectDither(4, 8, 24, 2, P.grayLight, DITHER.sparse);
  p.outline(P.outline);
  return p;
}

export function dustPile(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 25, 11, 4, P.gray, 130);
  p.ellipseBlend(14, 24, 7, 2, P.grayLight, 150);
  p.set(9, 22, P.grayLight, 200); p.set(21, 26, P.grayLight, 200); p.set(24, 23, P.gray, 160);
  return p;
}

export function leavesPile(seed = 1): Pix {
  const p = new Pix(32, 32);
  const r = rng(seed);
  const cols = [P.mustardDark, P.orangeDark, P.caramel, P.woodDark, P.orange];
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * 26) + 2;
    const y = Math.floor(r() * 20) + 8;
    const c = cols[Math.floor(r() * cols.length)];
    p.rect(x, y, 3, 2, c); p.set(x + 1, y - 1, c); p.set(x + 3, y + 1, darken(c, 0.3)); p.set(x, y + 2, darken(c, 0.25));
    p.set(x + 1, y, lighten(c, 0.2));
  }
  return p;
}

// ---------------------------------------------------------------------------
// Natureza e pontos de coleta
// ---------------------------------------------------------------------------

function trunk(p: Pix, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, P.woodDark);
  p.vline(x + 1, y, y + h - 1, P.wood); p.vline(x + 2, y, y + h - 1, mix(P.wood, P.woodLight, 0.4));
  p.vline(x + w - 1, y, y + h - 1, P.brownDark);
  for (let yy = y + 3; yy < y + h - 2; yy += 5) p.set(x + 3 + (yy % 2), yy, P.brownDark);
  // raízes
  p.rect(x - 2, y + h - 3, 3, 3, P.woodDark); p.rect(x + w - 1, y + h - 3, 3, 3, P.woodDark);
  p.set(x - 2, y + h - 3, P.wood); p.set(x + w + 1, y + h - 2, P.brownDark);
}

/** Copa fofa: discos sobrepostos em três tons + "bolinhas" nas bordas. */
function canopy(p: Pix, cx: number, cy: number, rx: number, ry: number, dark: Hex, mid: Hex, light: Hex, seed: number): void {
  const r = rng(seed);
  p.ellipse(cx, cy + 2, rx, ry, dark);
  for (let a = 0; a < Math.PI * 2; a += 0.55) { const bx = Math.round(cx + Math.cos(a) * rx * 0.92); const by = Math.round(cy + 2 + Math.sin(a) * ry * 0.92); p.disc(bx, by, 3 + Math.floor(r() * 2), dark); }
  p.ellipse(cx - 1, cy, rx - 3, ry - 3, mid);
  for (let a = 0; a < Math.PI * 2; a += 0.7) { const bx = Math.round(cx - 1 + Math.cos(a) * (rx - 3) * 0.9); const by = Math.round(cy + Math.sin(a) * (ry - 3) * 0.9); p.disc(bx, by, 2 + Math.floor(r() * 2), mid); }
  p.ellipse(cx - 4, cy - 4, Math.round(rx * 0.45), Math.round(ry * 0.4), light);
  p.disc(cx - 8, cy - 6, 2, lighten(light, 0.2));
  // folhas soltas: pontos de textura
  for (let i = 0; i < 26; i++) {
    const x = cx - rx + Math.floor(r() * rx * 2); const y = cy - ry + Math.floor(r() * ry * 2);
    if (!p.opaque(x, y)) continue;
    const hex = p.getHex(x, y);
    p.set(x, y, r() < 0.5 ? darken(hex, 0.15) : lighten(hex, 0.15));
  }
  // sombra da copa inferior em dithering
  p.rectDither(cx - rx, cy + ry - 4, rx * 2, 5, darken(dark, 0.2), DITHER.checker);
}

export function tree(seed = 1): Pix {
  const p = new Pix(48, 64);
  trunk(p, 20, 40, 8, 23);
  canopy(p, 24, 24, 21, 19, P.grassDark, P.grass, P.grassLight, seed);
  // frutinhas / flores ocasionais
  const r = rng(seed + 3);
  for (let i = 0; i < 3; i++) { const x = 8 + Math.floor(r() * 32); const y = 12 + Math.floor(r() * 22); if (p.opaque(x, y)) { p.set(x, y, P.coral); p.set(x + 1, y, P.coralDark); } }
  p.outline(P.outline);
  return p;
}

export function treeRound(seed = 2): Pix {
  const p = new Pix(48, 64);
  trunk(p, 21, 44, 6, 19);
  canopy(p, 24, 26, 18, 18, P.sageDark, P.sage, P.sageLight, seed);
  const r = rng(seed + 5);
  for (let i = 0; i < 9; i++) { const x = 8 + Math.floor(r() * 32); const y = 12 + Math.floor(r() * 26); if (p.opaque(x, y)) { p.set(x, y, P.pink); p.set(x + 1, y, P.pinkDark); p.set(x, y - 1, P.white); } }
  p.outline(P.outline);
  return p;
}

export function bush(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 13, 3, P.black, 60);
  p.ellipse(16, 20, 14, 9, P.grassDark);
  p.disc(5, 20, 4, P.grassDark); p.disc(27, 21, 4, P.grassDark); p.disc(10, 13, 4, P.grassDark); p.disc(22, 13, 4, P.grassDark);
  p.ellipse(15, 18, 11, 7, P.grass);
  p.disc(9, 14, 3, P.grass); p.disc(21, 14, 3, P.grass);
  p.ellipse(11, 15, 5, 3, P.grassLight); p.set(8, 13, lighten(P.grassLight, 0.2));
  p.rectDither(3, 24, 26, 4, darken(P.grassDark, 0.2), DITHER.checker);
  p.set(20, 18, P.coral); p.set(24, 22, P.coral); p.set(13, 22, P.coral);
  p.outline(P.outline);
  return p;
}

function logPiece(p: Pix, x: number, y: number, w: number, h: number, ringX: 'left' | 'right'): void {
  p.rect(x, y, w, h, P.woodDark);
  p.rect(x, y, w, Math.floor(h / 2), P.wood);
  p.hline(x, x + w - 1, y, P.woodLight);
  p.hline(x, x + w - 1, y + h - 1, P.brownDark);
  for (let gx = x + 2; gx < x + w - 2; gx += 6) p.hline(gx, gx + 2, y + Math.floor(h / 2) + 1, P.brownDark);
  const rx = ringX === 'left' ? x + 1 : x + w - 2; const ry = y + Math.floor(h / 2);
  const rr = Math.floor(h / 2);
  p.disc(rx, ry, rr, P.woodLight); p.disc(rx, ry, rr - 2, P.wood); p.disc(rx, ry, Math.max(0, rr - 4), P.woodDark);
  p.set(rx, ry, P.brownDark);
}

export function nodeWood(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 14, 3, P.black, 60);
  logPiece(p, 2, 19, 28, 9, 'left');
  logPiece(p, 8, 11, 18, 8, 'right');
  logPiece(p, 14, 4, 12, 7, 'left');
  p.set(5, 17, P.sage); p.set(6, 17, P.sage); p.set(27, 26, P.sageDark);
  p.outline(P.outline);
  return p;
}

export function nodeStone(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 14, 3, P.black, 60);
  p.ellipse(16, 22, 13, 8, P.stoneDark);
  p.ellipse(15, 20, 11, 7, P.stone);
  p.ellipse(12, 17, 5, 3, P.stoneLight);
  p.rectDither(4, 24, 24, 5, P.stoneDark, DITHER.checker);
  p.line(19, 18, 24, 24, darken(P.stoneDark, 0.3)); // fissura
  p.ellipse(24, 13, 5, 4, P.stone); p.ellipse(23, 12, 3, 2, P.stoneLight); p.set(28, 15, P.stoneDark);
  p.set(6, 26, P.sageDark); p.set(7, 26, P.sage); p.set(26, 27, P.sageDark);
  p.outline(P.outline);
  return p;
}

export function nodeLeaves(): Pix {
  const p = new Pix(32, 32);
  const r = rng(77);
  p.ellipseBlend(16, 27, 12, 3, P.black, 50);
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * 24) + 3;
    const y = Math.floor(r() * 18) + 8;
    const c = [P.grass, P.mustard, P.orange, P.sage, P.coral][Math.floor(r() * 5)];
    p.rect(x, y, 4, 3, c); p.set(x + 1, y - 1, c); p.set(x + 4, y + 1, c);
    p.set(x + 2, y + 3, darken(c, 0.3)); p.set(x + 1, y, lighten(c, 0.25)); p.set(x + 3, y + 2, darken(c, 0.2));
  }
  p.outline(P.outline);
  return p;
}

export function nodeFiber(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 11, 3, P.black, 60);
  p.ellipse(16, 27, 9, 3, P.sageDark);
  for (let i = 0; i < 9; i++) {
    const x = 4 + i * 3;
    const top = 28 - (i % 3) * 3 - 13 - (i % 2) * 2;
    p.vline(x, top, 29, i % 2 ? P.sageDark : P.sage);
    p.vline(x + 1, top + 3, 29, i % 2 ? P.sage : P.sageLight);
    p.set(x + (i % 2 ? 1 : -1), top - 1, P.sageLight);
  }
  // espigas
  p.rect(9, 10, 3, 6, P.mustard); p.vline(9, 10, 15, P.mustardLight); p.set(10, 9, P.mustardDark);
  p.rect(18, 7, 3, 6, P.mustard); p.vline(18, 7, 12, P.mustardLight); p.set(19, 6, P.mustardDark);
  p.rect(24, 12, 3, 5, P.mustard); p.vline(24, 12, 16, P.mustardLight);
  p.outline(P.outline);
  return p;
}

export function nodeFlower(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 13, 3, P.black, 60);
  p.ellipse(16, 24, 12, 6, P.grassDark);
  p.ellipse(14, 23, 9, 4, P.grass);
  p.rectDither(4, 26, 24, 4, darken(P.grassDark, 0.2), DITHER.checker);
  const cols = [P.coral, P.pink, P.mustardLight, P.lilac, P.tealLight];
  const pos = [[7, 13], [16, 8], [25, 13], [11, 19], [21, 19]];
  pos.forEach(([x, y], i) => {
    p.vline(x, y + 3, y + 9, P.grassDark); p.set(x + 1, y + 6, P.grass); p.set(x + 2, y + 5, P.grass);
    p.disc(x, y, 3, cols[i]);
    p.set(x - 2, y - 1, lighten(cols[i], 0.35)); p.set(x - 1, y - 2, lighten(cols[i], 0.35));
    p.set(x + 2, y + 1, darken(cols[i], 0.2)); p.set(x + 1, y + 2, darken(cols[i], 0.2));
    p.set(x, y, P.amber); p.set(x + 1, y, P.amberDark);
  });
  p.outline(P.outline);
  return p;
}

export function nodeDust(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 12, 3, P.black, 60);
  p.ellipse(16, 24, 11, 5, P.lilacDark);
  p.ellipse(15, 22, 9, 4, P.lilac);
  p.ellipse(13, 20, 5, 2, P.lilacLight);
  p.rectDither(6, 25, 20, 4, darken(P.lilacDark, 0.2), DITHER.checker);
  [[8, 10], [20, 6], [26, 14], [12, 4], [22, 17]].forEach(([x, y], i) => {
    const r = i % 2 ? 2 : 1;
    p.set(x, y, P.white); p.hline(x - r, x + r, y, P.amber, 200); p.vline(x, y - r, y + r, P.amber, 200); p.set(x, y, P.white);
  });
  p.set(10, 21, P.white); p.set(18, 23, P.white, 200);
  p.outline(P.outline);
  return p;
}

export function nodeMoonFlower(): Pix {
  const p = new Pix(32, 32);
  p.ellipseBlend(16, 29, 12, 3, P.black, 60);
  p.ellipse(16, 25, 11, 5, P.sageDark);
  p.rectDither(6, 26, 20, 4, darken(P.sageDark, 0.2), DITHER.checker);
  [[9, 13], [23, 11], [16, 18]].forEach(([x, y]) => {
    p.vline(x, y + 3, y + 9, P.sageDark); p.set(x + 1, y + 6, P.sage);
    p.disc(x, y, 4, P.lilacLight);
    p.set(x - 3, y - 1, P.white); p.set(x - 2, y - 2, P.white); p.set(x - 1, y - 3, P.white);
    p.set(x + 3, y + 1, P.lilac); p.set(x + 2, y + 2, P.lilac); p.set(x + 1, y + 3, P.lilac);
    p.disc(x, y, 2, P.white);
    p.set(x, y, P.amber);
  });
  p.set(4, 6, P.white); p.set(27, 4, P.white); p.set(29, 20, P.white); p.set(5, 7, P.lilacLight); p.set(28, 5, P.lilacLight);
  p.outline(P.outline);
  return p;
}

export function fallenLog(): Pix {
  const p = new Pix(64, 32);
  p.ellipseBlend(32, 27, 30, 4, P.black, 70);
  p.rect(2, 9, 60, 15, P.woodDark);
  p.rect(2, 9, 60, 6, P.wood);
  p.hline(2, 61, 9, P.woodLight); p.hline(2, 61, 10, mix(P.wood, P.woodLight, 0.5));
  p.hline(2, 61, 23, P.brownDark);
  for (let gx = 6; gx < 58; gx += 7) { p.hline(gx, gx + 3, 17 + (gx % 3), P.brownDark); p.hline(gx + 2, gx + 4, 12, darken(P.wood, 0.15)); }
  // anel
  p.disc(59, 16, 7, P.woodLight); p.disc(59, 16, 5, P.wood); p.disc(59, 16, 3, P.woodDark); p.disc(59, 16, 1, P.brownDark);
  // musgo e cogumelo
  p.rect(12, 6, 8, 4, P.grass); p.set(13, 5, P.grassLight); p.set(18, 5, P.grassLight); p.rect(36, 19, 9, 4, P.sage); p.set(38, 18, P.sageLight);
  p.rect(26, 5, 5, 3, P.coral); p.set(27, 4, P.coral); p.set(29, 4, P.coral); p.set(27, 5, P.white); p.rect(28, 8, 2, 2, P.cream);
  p.outline(P.outline);
  return p;
}

export function shrine(): Pix {
  const p = new Pix(64, 64);
  p.ellipseBlend(32, 58, 28, 6, P.black, 70);
  // base em degraus
  p.ellipse(32, 52, 26, 9, P.stoneDark); p.ellipse(32, 50, 23, 7, P.stone); p.ellipse(31, 48, 20, 5, P.stoneLight);
  p.rectDither(8, 52, 48, 6, darken(P.stoneDark, 0.2), DITHER.checker);
  // coluna
  stoneBlock(p, 22, 20, 20, 30, P.stone);
  p.rectDither(23, 21, 6, 28, P.stoneLight, DITHER.checker);
  p.rectDither(35, 21, 6, 28, P.stoneDark, DITHER.checker);
  // capitel
  stoneBlock(p, 16, 14, 32, 7, P.stoneLight);
  stoneBlock(p, 26, 8, 12, 6, P.stone);
  // gema
  p.disc(32, 34, 7, P.lilacDark); p.disc(32, 34, 5, P.lilac); p.disc(31, 33, 3, P.lilacLight); p.set(30, 32, P.white); p.set(31, 32, P.white);
  p.rrectR(30, 2, 5, 6, 1, P.amber); p.set(31, 3, P.white);
  // hera
  p.rect(20, 40, 3, 8, P.sageDark); p.set(19, 42, P.sage); p.set(23, 45, P.sage); p.rect(41, 26, 2, 10, P.sageDark); p.set(43, 30, P.sage);
  p.set(12, 46, P.lilacLight); p.set(50, 44, P.lilacLight); p.set(48, 12, P.white); p.set(14, 16, P.white);
  p.outline(P.outline);
  return p;
}

export function lamppost(): Pix {
  const p = new Pix(16, 64);
  const iron = P.grayDark;
  p.rect(6, 14, 4, 46, iron); p.vline(6, 14, 59, lighten(iron, 0.2)); p.vline(9, 14, 59, darken(iron, 0.3));
  p.rect(4, 56, 8, 3, iron); p.rect(3, 59, 10, 4, iron); p.hline(3, 12, 59, lighten(iron, 0.25)); p.hline(3, 12, 62, darken(iron, 0.3));
  p.rect(5, 12, 6, 2, iron); // anel
  // lanterna
  p.rect(3, 2, 10, 12, iron); p.hline(3, 12, 2, lighten(iron, 0.3)); p.vline(12, 2, 13, darken(iron, 0.3));
  p.rect(5, 4, 6, 8, P.amber); p.rect(6, 5, 2, 3, P.white); p.rect(5, 10, 6, 2, P.amberDark);
  p.vline(8, 4, 11, P.amberDark);
  p.triangle(8, 0, 3, iron); p.set(8, 0, P.amber);
  p.set(2, 6, P.amber, 120); p.set(13, 6, P.amber, 120); // halo
  p.outline(P.outline);
  return p;
}

function fountainBase(p: Pix, waterC: Hex | null): void {
  p.ellipseBlend(48, 84, 46, 8, P.black, 70);
  // tanque externo em blocos
  p.ellipse(48, 70, 44, 20, P.stoneDark);
  p.ellipse(48, 68, 42, 18, P.stone);
  p.ellipse(48, 66, 40, 16, P.stoneLight);
  // juntas dos blocos do tanque
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) { const x = Math.round(48 + Math.cos(a) * 41); const y = Math.round(68 + Math.sin(a) * 17); p.set(x, y, P.stoneDark); p.set(x, y + 1, P.stoneDark); }
  p.ellipse(48, 68, 34, 12, P.stoneDark);
  p.ellipse(48, 69, 32, 11, darken(P.stoneDark, 0.3));
  if (waterC) { p.ellipse(48, 70, 31, 10, waterC); p.ellipse(48, 68, 30, 8, mix(waterC, P.waterDark, 0.4)); p.ellipse(48, 69, 28, 7, waterC); }
  else { p.ellipse(48, 70, 31, 10, darken(P.dirt, 0.3)); p.ellipse(47, 70, 26, 7, mix(P.dirt, P.gray, 0.4)); }
  // borda inferior escura do tanque (volume)
  p.rectDither(6, 80, 84, 8, darken(P.stoneDark, 0.3), DITHER.checker);
}

export function fountainDry(): Pix {
  const p = new Pix(96, 96);
  fountainBase(p, null);
  // pedestal e taça rachados
  stoneBlock(p, 40, 40, 16, 30, P.stone);
  p.line(52, 48, 58, 60, darken(P.stoneDark, 0.3)); p.line(46, 55, 44, 66, darken(P.stoneDark, 0.3));
  p.ellipse(48, 40, 18, 7, P.stone); p.ellipse(48, 39, 15, 5, P.stoneDark); p.ellipse(48, 40, 13, 3, darken(P.dirt, 0.3));
  p.hline(31, 65, 40, P.stoneLight);
  p.rect(45, 22, 6, 18, P.stone); p.vline(45, 22, 39, P.stoneLight); p.vline(50, 22, 39, P.stoneDark);
  p.rect(43, 18, 10, 5, P.stoneLight); p.hline(43, 52, 22, P.stoneDark);
  // folhas secas e entulho
  p.rect(30, 62, 5, 3, P.mustardDark); p.rect(60, 66, 4, 2, P.orangeDark); p.rect(50, 70, 4, 2, P.caramel);
  p.rect(28, 68, 6, 3, P.grayLight); p.set(70, 63, P.sageDark); p.set(71, 64, P.sageDark);
  p.outline(P.outline);
  return p;
}

export function fountainFlow(frame: number): Pix {
  const p = new Pix(96, 96);
  fountainBase(p, P.water);
  const r = rng(10 + frame);
  for (let i = 0; i < 12; i++) {
    const x = 22 + Math.floor(r() * 52);
    const y = 63 + Math.floor(r() * 12);
    p.hline(x, x + 3, y, P.waterLight); p.set(x + 4, y + 1, P.waterLight);
  }
  stoneBlock(p, 40, 40, 16, 30, P.stone);
  p.ellipse(48, 40, 18, 7, P.stoneLight); p.ellipse(48, 39, 15, 5, P.water); p.ellipse(48, 39, 12, 3, P.waterLight);
  p.hline(31, 65, 40, P.white);
  p.rect(45, 22, 6, 18, P.stone); p.vline(45, 22, 39, P.stoneLight); p.vline(50, 22, 39, P.stoneDark);
  p.rect(43, 18, 10, 5, P.stoneLight); p.hline(43, 52, 22, P.stoneDark);
  // jatos de água
  const h = frame % 2 === 0 ? 0 : 3;
  p.vline(48, 6 + h, 18, P.waterLight); p.vline(47, 8 + h, 16, P.water); p.vline(49, 8 + h, 16, P.water);
  p.line(48, 8 + h, 36, 36, P.water); p.line(48, 8 + h, 60, 36, P.water);
  p.line(47, 8 + h, 30, 62 - h, P.waterLight); p.line(49, 8 + h, 66, 62 - h, P.waterLight);
  p.line(46, 10 + h, 34, 38, P.waterLight); p.line(50, 10 + h, 62, 38, P.waterLight);
  p.set(48, 4 + h, P.white); p.set(47, 5 + h, P.white); p.set(49, 5 + h, P.white);
  // gotas
  p.set(34, 44 + h, P.white); p.set(62, 46 - h, P.white); p.set(28, 58 + h, P.waterLight); p.set(68, 56 - h, P.waterLight);
  p.disc(48, 26, 2, P.amber); p.set(47, 25, P.white);
  // borda molhada que transborda
  p.rectDither(20, 60, 56, 2, P.waterLight, DITHER.sparse);
  p.outline(P.outline);
  return p;
}

function signPost(p: Pix, x: number, y: number, h: number): void {
  p.rect(x, y, 4, h, P.woodDark); p.vline(x, y, y + h - 1, P.wood); p.vline(x + 1, y, y + h - 1, mix(P.wood, P.woodDark, 0.4));
  p.ellipseBlend(x + 2, y + h - 1, 6, 2, P.black, 70);
}

export function signBroken(): Pix {
  const p = new Pix(32, 48);
  signPost(p, 14, 22, 26);
  plank(p, 2, 6, 28, 16, mix(P.wood, P.gray, 0.25), 2);
  p.rect(2, 6, 28, 2, mix(P.woodLight, P.gray, 0.3));
  p.line(20, 6, 24, 22, P.outline);
  p.erase(24, 8, 6, 14);
  for (let y = 8; y < 22; y++) p.erase(24 + (y % 3), y, 8, 1);
  p.rect(6, 10, 12, 2, P.woodDark); p.rect(6, 14, 8, 2, P.woodDark); p.set(7, 17, P.woodDark); p.set(8, 17, P.woodDark);
  p.set(4, 8, P.brownDark); p.set(4, 19, P.brownDark);
  p.rect(10, 20, 4, 2, P.sageDark); // musgo
  p.outline(P.outline);
  return p;
}

export function signOk(): Pix {
  const p = new Pix(32, 48);
  signPost(p, 14, 22, 26);
  p.rrectR(1, 3, 30, 19, 2, P.woodDark);
  p.rrectR(2, 4, 28, 17, 2, P.woodLight);
  p.hline(3, 28, 4, P.white); p.hline(3, 28, 20, P.wood); p.vline(29, 5, 19, P.wood);
  p.rect(5, 8, 22, 2, P.lilacDark); p.rect(5, 12, 16, 2, P.lilacDark); p.rect(5, 16, 20, 2, P.coral);
  p.set(27, 7, P.amber); p.set(26, 8, P.amber); p.set(28, 8, P.amber); p.set(27, 9, P.amber); p.set(27, 8, P.white);
  p.set(3, 5, P.brownDark); p.set(28, 5, P.brownDark); p.set(3, 19, P.brownDark); p.set(28, 19, P.brownDark);
  p.outline(P.outline);
  return p;
}

// ---------------------------------------------------------------------------
// Fachadas
// ---------------------------------------------------------------------------

function wallWithBase(p: Pix, x: number, y: number, w: number, h: number, plaster: Hex, restored: boolean, seed: number): void {
  p.rect(x, y, w, h, plaster);
  const r = rng(seed);
  for (let i = 0; i < w * h * 0.02; i++) p.set(x + Math.floor(r() * w), y + Math.floor(r() * h), r() < 0.5 ? darken(plaster, 0.06) : lighten(plaster, 0.06));
  // base de pedra
  const bh = 8;
  for (let bx = x; bx < x + w; bx += 10) stoneBlock(p, bx, y + h - bh, Math.min(10, x + w - bx), bh, restored ? P.stone : mix(P.stone, P.gray, 0.3));
  for (let bx = x + 5; bx < x + w; bx += 10) stoneBlock(p, bx, y + h - bh - 4, Math.min(10, x + w - bx), 4, restored ? P.stoneLight : mix(P.stoneLight, P.gray, 0.3));
  // vigas verticais (enxaimel)
  p.rect(x, y, 4, h - bh - 4, P.woodDark); p.vline(x + 1, y, y + h - bh - 5, P.wood);
  p.rect(x + w - 4, y, 4, h - bh - 4, P.woodDark); p.vline(x + w - 3, y, y + h - bh - 5, P.wood);
  if (!restored) {
    // rachaduras e manchas
    for (let i = 0; i < 3; i++) { const cx = x + 10 + Math.floor(r() * (w - 20)); const cy = y + 6 + Math.floor(r() * (h - 24)); p.line(cx, cy, cx + 2, cy + 6, darken(plaster, 0.3)); p.line(cx + 2, cy + 6, cx + 1, cy + 11, darken(plaster, 0.3)); }
    p.rectDither(x + 4, y + h - bh - 12, w - 8, 8, darken(plaster, 0.12), DITHER.sparse);
  }
}

export function facadeAtelier(restored: boolean): Pix {
  // 6 × 5 tiles = 192 × 160 ; a porta fica na coluna central (tiles 2 e 3), linha inferior
  const p = new Pix(192, 160);
  const plaster = restored ? P.cream : mix(P.cream, P.gray, 0.25);
  const roof = restored ? P.lilac : mix(P.lilac, P.gray, 0.35);
  p.rectBlend(12, 152, 172, 6, P.black, 60);
  wallWithBase(p, 16, 62, 160, 92, plaster, restored, 3);
  p.rect(92, 62, 4, 80, P.woodDark); p.vline(93, 62, 141, P.wood); // viga central
  p.rect(16, 104, 160, 3, P.woodDark); p.hline(16, 175, 104, P.wood);
  // telhado com beiral
  roofShingles(p, 4, 20, 184, 42, roof, 3, !restored);
  for (let i = 0; i < 12; i++) p.hline(4 + i * 2, 188 - i * 2, 20 - i, i < 2 ? darken(roof, 0.2) : roof);
  p.hline(4, 187, 62, darken(roof, 0.4));
  eave(p, 0, 192, 63);
  // chaminé com fumaça
  stoneBlock(p, 140, 4, 14, 24, restored ? P.stone : mix(P.stone, P.gray, 0.3));
  p.rect(138, 2, 18, 4, P.stoneDark); p.hline(138, 155, 2, P.stoneLight);
  if (restored) { p.set(147, 0, P.grayLight, 160); p.set(148, 1, P.grayLight, 120); }
  // porta
  doorFrame(p, 78, 108, 36, 40, restored ? P.wood : mix(P.wood, P.gray, 0.3), restored ? P.amber : darken(P.amber, 0.5));
  // janelas
  windowFrame(p, 34, 110, 30, 24, restored ? P.amber : mix(P.amber, P.gray, 0.55), { curtains: restored, flowerBox: restored, shutters: restored ? P.lilacDark : undefined });
  windowFrame(p, 128, 110, 30, 24, restored ? P.amber : darken(P.teal, 0.5), { boarded: !restored, curtains: restored, flowerBox: restored, shutters: restored ? P.lilacDark : undefined });
  // placa pendurada por correntes
  p.vline(76, 68, 78, P.grayDark); p.vline(116, 68, 78, P.grayDark);
  if (restored) {
    p.rrectR(68, 78, 56, 20, 3, P.woodDark);
    p.rrectR(70, 80, 52, 16, 2, P.woodLight); p.hline(71, 121, 80, P.white);
    p.rect(74, 83, 8, 10, P.coral); p.rect(77, 83, 2, 10, P.coralLight); p.rect(75, 81, 6, 2, P.creamDark); // carretel
    p.rect(86, 86, 10, 3, P.stoneDark); p.hline(86, 95, 86, P.stone); p.rect(90, 86, 2, 9, P.wood); // martelo
    p.rect(100, 84, 18, 2, P.lilacDark); p.rect(100, 88, 14, 2, P.lilacDark); p.rect(100, 92, 16, 2, P.coral);
  } else {
    p.rrectR(68, 78, 56, 20, 3, darken(mix(P.wood, P.gray, 0.3), 0.3));
    p.rrectR(70, 80, 52, 16, 2, mix(P.wood, P.gray, 0.3));
    p.line(96, 80, 104, 98, P.outline);
    p.rect(74, 83, 8, 10, mix(P.coral, P.gray, 0.5)); p.rect(86, 86, 10, 3, P.stoneDark); p.rect(90, 86, 2, 9, P.wood);
    p.erase(104, 82, 12, 16);
    for (let y = 78; y < 98; y++) p.erase(102 + ((y * 3) % 5), y, 22, 1);
    // placa pende torta: corrente direita solta
    p.erase(116, 68, 1, 10); p.line(116, 68, 120, 76, P.grayDark);
  }
  // vegetação / bagunça
  if (!restored) {
    for (let i = 0; i < 12; i++) { const x = 20 + i * 13; p.vline(x, 138, 152, P.sageDark); p.vline(x + 2, 142, 152, P.sage); p.set(x + 1, 137, P.sageDark); }
    p.rect(150, 136, 14, 14, P.woodDark); p.rect(151, 137, 12, 12, mix(P.wood, P.gray, 0.3)); p.line(152, 138, 162, 148, P.woodDark); // caixa
    p.rect(24, 142, 10, 8, P.coralDark); p.rect(22, 146, 6, 6, P.dirtDark); p.set(30, 140, P.coral); // vaso caído
    p.set(100, 100, P.amber); p.set(101, 101, P.amber); p.set(99, 101, P.amber, 140); // brilho âmbar
    // teia no canto do beiral
    for (let i = 0; i < 5; i++) p.line(20, 66, 20 + i * 4, 84, P.grayLight, 150);
    for (let i = 0; i < 4; i++) p.line(20, 66, 40, 66 + i * 5, P.grayLight, 150);
  } else {
    potPlant(p, 20, 140, P.coralDark, [P.pink, P.coral, P.mustardLight]);
    potPlant(p, 160, 140, P.coralDark, [P.lilacLight, P.white, P.pink]);
    // capacho
    p.rrectR(40, 140, 20, 12, 2, P.mustard); p.rect(42, 142, 16, 3, P.mustardLight); p.hline(42, 57, 149, P.mustardDark);
    p.set(88, 0, P.white); // brilho
  }
  p.outline(P.outline);
  return p;
}

export function facadeShop(restored: boolean): Pix {
  // 5 × 4 tiles = 160 × 128; porta no tile central (col 2)
  const p = new Pix(160, 128);
  const plaster = restored ? mix(P.cream, P.pink, 0.4) : mix(P.cream, P.gray, 0.3);
  const awning = restored ? P.coral : mix(P.coral, P.gray, 0.5);
  const roofC = restored ? P.teal : mix(P.teal, P.gray, 0.4);
  p.rectBlend(8, 120, 144, 6, P.black, 60);
  wallWithBase(p, 12, 46, 136, 76, plaster, restored, 9);
  roofShingles(p, 4, 14, 152, 32, roofC, 9, !restored);
  for (let i = 0; i < 8; i++) p.hline(4 + i * 3, 156 - i * 3, 14 - i, i < 2 ? darken(roofC, 0.2) : roofC);
  eave(p, 0, 160, 46);
  // toldo listrado com babado
  for (let x = 18; x < 142; x += 8) { const c = (x / 8) % 2 ? awning : (restored ? P.white : P.grayLight); p.rect(x, 60, 8, 12, c); p.hline(x, x + 7, 60, lighten(c, 0.2)); p.set(x + 3, 72, c); p.set(x + 4, 72, c); p.set(x + 2, 72, darken(c, 0.2)); p.set(x + 5, 72, darken(c, 0.2)); }
  p.rect(18, 70, 124, 2, darken(awning, 0.3));
  p.rectDither(18, 73, 124, 3, P.brownDark, DITHER.checker, 100); // sombra do toldo
  if (!restored) { p.erase(100, 60, 16, 13); p.line(100, 60, 108, 73, darken(awning, 0.3)); p.line(108, 73, 115, 62, darken(awning, 0.3)); }
  // vitrines
  windowFrame(p, 22, 80, 42, 30, restored ? P.sky : darken(P.teal, 0.5), { boarded: !restored });
  if (restored) { p.rect(30, 98, 8, 8, P.pink); p.rect(31, 96, 6, 2, P.coral); p.rect(42, 96, 10, 10, P.cream); p.rect(45, 93, 4, 3, P.coral); p.rect(54, 99, 6, 7, P.mustardLight); p.hline(30, 60, 106, P.woodLight); }
  windowFrame(p, 96, 80, 42, 30, restored ? P.amber : darken(P.teal, 0.5), { boarded: !restored, curtains: restored });
  if (restored) { p.rect(106, 88, 20, 2, P.white); p.rect(106, 96, 20, 2, P.white); }
  // porta (tile central: x 64..96)
  doorFrame(p, 66, 82, 28, 36, restored ? P.pinkDark : mix(P.pinkDark, P.gray, 0.4), restored ? P.amber : darken(P.amber, 0.6));
  if (!restored) { p.rrectR(68, 100, 24, 8, 1, P.cream); p.rect(71, 103, 18, 2, P.grayDark); } // "fechado"
  // placa cupcake
  p.rrectR(54, 50, 52, 13, 3, restored ? P.white : P.grayLight);
  p.hline(56, 103, 50, restored ? P.creamLight : P.white); p.hline(56, 103, 62, restored ? P.creamDark : P.gray);
  p.rect(60, 55, 6, 6, restored ? P.coral : P.gray); p.rect(61, 53, 4, 3, restored ? P.pink : P.grayLight); p.set(62, 52, restored ? P.red : P.gray);
  p.rect(70, 55, 30, 2, P.lilacDark); p.rect(70, 59, 22, 2, P.lilacDark);
  if (!restored) { for (let i = 0; i < 7; i++) { const x = 18 + i * 19; p.vline(x, 108, 120, P.sageDark); p.vline(x + 2, 111, 120, P.sage); } }
  else { potPlant(p, 16, 108, P.coralDark, [P.pink, P.coral, P.white]); potPlant(p, 132, 108, P.coralDark, [P.lilacLight, P.pink, P.mustardLight]); }
  p.outline(P.outline);
  return p;
}

function house(seed: number, restored: boolean): Pix {
  // 4 × 3.5 tiles = 128 × 112
  const p = new Pix(128, 112);
  const r = rng(seed);
  const roofC0 = [P.teal, P.mustard, P.coral, P.sage][seed % 4];
  const roofC = restored ? roofC0 : mix(roofC0, P.gray, 0.45);
  const plaster = restored ? P.cream : mix(P.cream, P.gray, 0.35);
  p.rectBlend(6, 104, 116, 6, P.black, 60);
  wallWithBase(p, 10, 44, 108, 64, plaster, restored, seed);
  roofShingles(p, 2, 14, 124, 30, roofC, seed, !restored);
  for (let i = 0; i < 8; i++) p.hline(2 + i * 3, 126 - i * 3, 14 - i, i < 2 ? darken(roofC, 0.2) : roofC);
  eave(p, 0, 128, 44);
  doorFrame(p, 52, 70, 24, 34, restored ? P.wood : mix(P.wood, P.gray, 0.4), restored ? P.amber : null);
  const glass = restored ? P.amber : darken(P.teal, 0.5);
  windowFrame(p, 20, 58, 24, 18, glass, { boarded: !restored && r() < 0.6, flowerBox: restored, curtains: restored, shutters: restored ? darken(roofC0, 0.2) : undefined });
  windowFrame(p, 84, 58, 24, 18, glass, { boarded: !restored && r() < 0.6, curtains: restored, shutters: restored ? darken(roofC0, 0.2) : undefined });
  if (!restored) for (let i = 0; i < 6; i++) { const x = 14 + Math.floor(r() * 100); p.vline(x, 96, 108, P.sageDark); p.vline(x + 1, 99, 108, P.sage); }
  else { potPlant(p, 14, 92, P.caramelDark, [P.coral, P.mustardLight, P.pink]); }
  p.outline(P.outline);
  return p;
}

export function houseAbandoned(seed: number): Pix { return house(seed, false); }
export function houseRestored(seed: number): Pix { return house(seed, true); }

// ---------------------------------------------------------------------------
// Mobílias (32 × 32, vistas de cima com leve inclinação) — 4 orientações
// ---------------------------------------------------------------------------
// Cada gerador recebe a orientação (para onde a "frente" do móvel aponta) e
// desenha o objeto visto daquele ângulo. Móveis de parede (prateleira, vitrine,
// cortina, quadro) ficam sempre encostados na parede norte, então só há duas
// variantes: sul/norte (arranjo normal) e leste/oeste (arranjo dos objetos
// invertido). Tapete e almofada são simétricos: sul/norte e leste/oeste
// diferem só pela direção do padrão.

function furnShadow(p: Pix, cx: number, cy: number, rx: number, ry: number): void { p.ellipseBlend(cx, cy, rx, ry, P.black, 55); }

export function furnBed(f: Facing): Pix {
  const p = new Pix(32, 32);
  const frame = P.woodDark; const frameL = P.wood; const sheet = P.cream; const quilt = P.lilac; const quiltD = P.lilacDark; const quiltL = P.lilacLight;
  if (f === 'south' || f === 'north') {
    furnShadow(p, 16, 29, 13, 3);
    p.rrectR(3, 2, 26, 28, 2, frame);
    p.hline(4, 27, 2, frameL); p.vline(3, 3, 28, frameL);
    p.rect(5, 4, 22, 24, sheet);
    const pillowTop = f === 'south';
    const qy = pillowTop ? 12 : 4; const qh = pillowTop ? 16 : 16;
    p.rect(5, qy, 22, qh, quilt);
    p.hline(5, 26, pillowTop ? qy : qy + qh - 1, quiltD);
    for (let y = qy + 3; y < qy + qh - 1; y += 4) p.hline(7, 24, y, quiltL, 160);
    for (let x = 9; x < 26; x += 5) p.vline(x, qy + 1, qy + qh - 2, quiltL, 110);
    p.vline(26, qy + 1, qy + qh - 2, quiltD);
    if (pillowTop) { p.rrectR(8, 5, 16, 6, 2, P.white); p.hline(9, 22, 10, P.creamDark); p.set(9, 6, lighten(P.white, 0.1)); p.rect(3, 0, 26, 3, frame); p.hline(4, 27, 0, frameL); }
    else { p.rrectR(8, 21, 16, 6, 2, P.white); p.hline(9, 22, 26, P.creamDark); p.rect(3, 28, 26, 4, frame); p.hline(4, 27, 28, frameL); p.hline(4, 27, 31, P.brownDark); }
  } else {
    furnShadow(p, 16, 28, 14, 3);
    p.rrectR(1, 5, 30, 22, 2, frame);
    p.hline(2, 29, 5, frameL); p.vline(1, 6, 25, frameL);
    p.rect(3, 7, 26, 18, sheet);
    const pillowLeft = f === 'east';
    const qx = pillowLeft ? 12 : 3; const qw = 17;
    p.rect(qx, 7, qw, 18, quilt);
    p.vline(pillowLeft ? qx : qx + qw - 1, 7, 24, quiltD);
    for (let x = qx + 3; x < qx + qw - 1; x += 4) p.vline(x, 9, 22, quiltL, 160);
    for (let y = 11; y < 24; y += 5) p.hline(qx + 1, qx + qw - 2, y, quiltL, 110);
    p.hline(qx + 1, qx + qw - 2, 24, quiltD);
    if (pillowLeft) { p.rrectR(4, 9, 6, 14, 2, P.white); p.vline(9, 10, 21, P.creamDark); p.rect(0, 5, 3, 22, frame); p.vline(0, 6, 25, frameL); }
    else { p.rrectR(22, 9, 6, 14, 2, P.white); p.vline(27, 10, 21, P.creamDark); p.rect(29, 5, 3, 22, frame); p.vline(31, 6, 25, P.brownDark); }
  }
  p.outline(P.outline);
  return p;
}

export function furnLamp(magic: boolean, f: Facing): Pix {
  const p = new Pix(32, 32);
  const shade = magic ? P.lilacLight : P.mustardLight; const shadeD = magic ? P.lilac : P.mustard; const shadeDD = magic ? P.lilacDark : P.mustardDark;
  furnShadow(p, 16, 29, 8, 2);
  p.ellipse(16, 27, 6, 2, P.woodDark); p.ellipse(16, 26, 5, 1, P.wood);
  p.rect(15, 14, 2, 12, P.wood); p.vline(15, 14, 25, P.woodLight); p.vline(16, 14, 25, P.woodDark);
  // cúpula com volume
  p.rect(8, 6, 16, 10, shade);
  p.rect(8, 4, 16, 3, shadeD); p.hline(9, 22, 4, lighten(shadeD, 0.2));
  p.rectDither(19, 7, 5, 9, shadeD, DITHER.checker);
  p.vline(23, 7, 15, shadeD);
  p.rect(9, 15, 14, 2, shadeDD);
  p.set(10, 8, P.white); p.set(11, 8, P.white); p.set(10, 9, P.white, 160);
  // cordinha do interruptor muda de lado conforme a orientação
  const cordX = f === 'east' ? 24 : f === 'west' ? 7 : f === 'north' ? 16 : 19;
  const cordY = f === 'north' ? 17 : 17;
  p.vline(cordX, cordY, cordY + 4, P.grayDark); p.set(cordX, cordY + 5, magic ? P.amber : P.brownDark);
  // brilho
  p.rectBlend(6, 10, 20, 12, shade, 40);
  if (magic) { p.set(4, 4, P.amber); p.set(27, 8, P.amber); p.set(6, 20, P.amber); p.set(26, 18, P.white); }
  p.outline(P.outline);
  return p;
}

export function furnChair(f: Facing): Pix {
  const p = new Pix(32, 32);
  const wood = P.wood; const woodD = P.woodDark; const woodL = P.woodLight; const cushion = P.coral;
  furnShadow(p, 16, 29, 9, 2);
  const seat = (x: number, y: number, w: number, h: number) => {
    p.rrectR(x, y, w, h, 2, wood); p.hline(x + 1, x + w - 2, y, woodL); p.vline(x + w - 1, y + 1, y + h - 2, woodD); p.hline(x + 1, x + w - 2, y + h - 1, woodD);
    p.rrectR(x + 2, y + 2, w - 4, h - 4, 2, cushion); p.hline(x + 3, x + w - 4, y + 2, P.coralLight); p.vline(x + w - 3, y + 3, y + h - 4, P.coralDark); p.hline(x + 3, x + w - 4, y + h - 3, P.coralDark);
    p.set(x + Math.floor(w / 2), y + Math.floor(h / 2), P.coralDark);
  };
  const legs = (pts: number[][]) => pts.forEach(([x, y, h]) => { p.rect(x, y, 3, h, woodD); p.vline(x, y, y + h - 1, wood); });
  if (f === 'south') {
    // encosto atrás (em cima), assento à frente
    p.rrectR(8, 3, 16, 8, 2, woodD); p.rect(9, 4, 14, 5, wood); p.hline(9, 22, 4, woodL); p.vline(12, 5, 8, woodD); p.vline(19, 5, 8, woodD);
    p.rect(8, 10, 2, 4, woodD); p.rect(22, 10, 2, 4, woodD);
    seat(7, 12, 18, 12);
    legs([[8, 24, 5], [21, 24, 5]]);
  } else if (f === 'north') {
    // costas do encosto na frente (cobre parte do assento)
    seat(7, 6, 18, 11);
    legs([[8, 17, 4], [21, 17, 4]]);
    p.rect(8, 14, 2, 4, woodD); p.rect(22, 14, 2, 4, woodD);
    p.rrectR(7, 17, 18, 11, 2, woodD); p.rect(8, 18, 16, 8, wood); p.hline(8, 23, 18, woodL); p.hline(8, 23, 26, woodD);
    p.vline(12, 19, 25, woodD); p.vline(19, 19, 25, woodD); p.vline(15, 19, 25, woodD);
  } else {
    const east = f === 'east';
    // encosto na lateral de trás; assento à frente
    const bx = east ? 6 : 20;
    p.rrectR(bx, 4, 6, 18, 2, woodD); p.rect(bx + 1, 5, 4, 16, wood); p.vline(bx + 1, 5, 20, woodL); p.hline(bx + 2, bx + 4, 10, woodD); p.hline(bx + 2, bx + 4, 15, woodD);
    seat(east ? 10 : 7, 12, 15, 11);
    legs(east ? [[11, 23, 6], [20, 23, 5]] : [[8, 23, 5], [17, 23, 6]]);
  }
  p.outline(P.outline);
  return p;
}

export function furnTable(f: Facing): Pix {
  const p = new Pix(32, 32);
  furnShadow(p, 16, 29, 12, 3);
  // tampo redondo com espessura
  p.ellipse(16, 15, 13, 8, P.woodDark);
  p.ellipse(16, 13, 13, 8, P.wood);
  p.ellipse(16, 12, 11, 6, P.woodLight);
  p.ellipse(15, 11, 7, 3, lighten(P.woodLight, 0.15));
  p.rrectR(9, 9, 14, 8, 3, P.cream); p.hline(10, 21, 9, P.creamLight); p.hline(10, 21, 16, P.creamDark); // toalhinha
  // pernas
  [[6, 19], [24, 19], [15, 21]].forEach(([x, y]) => { p.rect(x, y, 3, 8, P.woodDark); p.vline(x, y, y + 7, P.wood); });
  // xícara e pires + bule: posição gira com a orientação
  const pos = { south: [16, 13, 11, 10], east: [20, 12, 12, 13], north: [16, 11, 21, 14], west: [12, 12, 20, 11] }[f];
  const [cx, cy, tx, ty] = pos;
  p.disc(cx, cy, 3, P.white); p.disc(cx, cy, 2, P.teal); p.set(cx - 1, cy - 1, P.tealLight); p.set(cx + 3, cy, P.white);
  p.rrectR(tx - 2, ty - 2, 5, 4, 1, P.pink); p.set(tx, ty - 3, P.pinkDark); p.set(tx + 3, ty - 1, P.pinkDark); p.set(tx - 1, ty - 1, P.coralLight);
  p.outline(P.outline);
  return p;
}

export function furnShelf(f: Facing): Pix {
  const p = new Pix(32, 32);
  const flip = f === 'east' || f === 'west';
  p.rect(2, 2, 28, 28, P.woodDark);
  p.rect(4, 4, 24, 24, P.wood); p.vline(4, 4, 27, P.woodLight);
  plank(p, 3, 11, 26, 3, P.wood, 1); plank(p, 3, 19, 26, 3, P.wood, 2); plank(p, 3, 27, 26, 3, P.wood, 3);
  p.rectDither(5, 14, 22, 2, P.brownDark, DITHER.checker, 120); p.rectDither(5, 22, 22, 2, P.brownDark, DITHER.checker, 120);
  const items = (x0: number, dir: number) => {
    const at = (x: number) => (dir > 0 ? x0 + x : x0 - x);
    p.rect(at(0), 5, 4, 6, P.teal); p.vline(at(0), 5, 10, P.tealLight); p.rect(at(1), 4, 2, 1, P.tealDark);
    p.rect(at(5), 6, 3, 5, P.coral); p.rect(at(9), 4, 5, 7, P.lilac); p.vline(at(9), 4, 10, P.lilacLight); p.rect(at(10), 6, 3, 1, P.amber);
    p.rect(at(15), 5, 4, 6, P.sage); p.rect(at(16), 4, 2, 1, P.sageDark);
    p.rect(at(1), 13, 6, 6, P.mustard); p.hline(at(1), at(6), 13, P.mustardLight); p.rect(at(2), 12, 4, 1, P.mustardDark);
    p.rect(at(9), 14, 8, 5, P.sage); p.rect(at(10), 15, 6, 1, P.sageLight);
    p.rect(at(19), 15, 4, 4, P.cream); p.set(at(20), 16, P.coral);
    p.rect(at(2), 21, 5, 6, P.pink); p.rect(at(8), 22, 4, 5, P.cream); p.rect(at(13), 23, 6, 4, P.lilacLight); p.rect(at(20), 21, 3, 6, P.coralDark);
  };
  items(flip ? 22 : 6, flip ? -1 : 1);
  p.outline(P.outline);
  return p;
}

export function furnVitrine(f: Facing): Pix {
  const p = new Pix(32, 32);
  const flip = f === 'east' || f === 'west';
  p.rect(1, 1, 30, 30, P.woodDark); p.hline(2, 29, 1, P.wood);
  p.rect(3, 3, 26, 26, P.sky);
  p.rectDither(3, 3, 8, 26, lighten(P.sky, 0.3), DITHER.checker); p.vline(4, 4, 27, P.white); p.vline(5, 4, 20, P.white, 160);
  plank(p, 3, 14, 26, 2, P.wood, 4); plank(p, 3, 26, 26, 3, P.wood, 5);
  const at = (x: number) => (flip ? 29 - x : x);
  const cake = (x: number, y: number, c: Hex, top: Hex) => { p.rect(at(x) - (flip ? 5 : 0), y, 6, 5, c); p.hline(at(x) - (flip ? 5 : 0), at(x) + (flip ? 0 : 5), y, lighten(c, 0.3)); p.rect(at(x) + (flip ? -4 : 1), y - 2, 4, 2, top); p.set(at(x) + (flip ? -2 : 3), y - 3, P.red); };
  cake(5, 9, P.pink, P.coral); cake(13, 10, P.cream, P.mustard); cake(21, 9, P.lilac, P.lilacLight);
  p.rect(at(flip ? 12 : 5), 20, 8, 6, P.coralLight); p.hline(at(flip ? 12 : 5), at(flip ? 12 : 5) + 7, 20, P.white); p.rect(at(flip ? 25 : 15), 21, 10, 5, P.mustardLight); p.set(at(flip ? 21 : 19), 22, P.coral);
  p.rect(at(flip ? 27 : 2), 24, 3, 2, P.creamDark); // etiqueta de preço
  p.outline(P.outline);
  return p;
}

export function furnBench(f: Facing): Pix {
  const p = new Pix(32, 32);
  furnShadow(p, 16, 29, 14, 3);
  const slat = (x: number, y: number, w: number, h: number, c: Hex = P.wood) => { p.rect(x, y, w, h, c); p.hline(x, x + w - 1, y, lighten(c, 0.25)); p.hline(x, x + w - 1, y + h - 1, darken(c, 0.3)); };
  if (f === 'south') {
    slat(2, 6, 28, 4); slat(2, 11, 28, 3); // encosto
    p.rect(4, 14, 3, 3, P.woodDark); p.rect(25, 14, 3, 3, P.woodDark);
    slat(2, 17, 28, 4, P.woodLight); slat(2, 21, 28, 4);
    p.rect(3, 25, 3, 5, P.woodDark); p.vline(3, 25, 29, P.wood); p.rect(26, 25, 3, 5, P.woodDark); p.vline(26, 25, 29, P.wood);
  } else if (f === 'north') {
    slat(2, 8, 28, 4, P.woodLight); slat(2, 12, 28, 3);
    p.rect(3, 15, 3, 3, P.woodDark); p.rect(26, 15, 3, 3, P.woodDark);
    slat(2, 18, 28, 4); slat(2, 23, 28, 4, P.woodDark); // encosto por trás cobrindo
    p.rect(3, 27, 3, 3, P.woodDark); p.rect(26, 27, 3, 3, P.woodDark);
  } else {
    const east = f === 'east';
    const bx = east ? 6 : 22;
    p.rect(bx, 3, 4, 24, P.woodDark); p.vline(bx + (east ? 0 : 3), 3, 26, P.wood); p.vline(bx + (east ? 1 : 2), 4, 25, P.woodLight);
    for (let y = 6; y < 26; y += 5) p.hline(bx, bx + 3, y, P.brownDark);
    const sx = east ? 11 : 8;
    p.rect(sx, 5, 13, 22, P.wood); p.vline(sx, 5, 26, P.woodLight); p.vline(sx + 12, 5, 26, P.woodDark);
    for (let y = 9; y < 26; y += 6) p.hline(sx + 1, sx + 11, y, P.woodDark);
    p.rect(sx + 1, 27, 3, 3, P.woodDark); p.rect(sx + 9, 27, 3, 3, P.woodDark);
  }
  p.outline(P.outline);
  return p;
}

export function furnVase(magic: boolean, f: Facing): Pix {
  const p = new Pix(32, 32);
  furnShadow(p, 16, 30, 7, 2);
  const pot = magic ? P.lilacDark : P.coralDark; const potL = magic ? P.lilac : P.coral;
  p.rrectR(10, 18, 12, 12, 3, pot);
  p.rect(9, 17, 14, 3, potL); p.hline(9, 22, 17, lighten(potL, 0.3));
  p.vline(11, 21, 27, lighten(pot, 0.2)); p.vline(20, 21, 28, darken(pot, 0.3)); p.hline(12, 20, 29, darken(pot, 0.3));
  p.rect(13, 23, 6, 2, magic ? P.lilacLight : P.mustardLight); // faixa decorativa
  const cols = magic ? [P.lilacLight, P.white, P.lilacLight] : [P.coral, P.mustardLight, P.pink];
  const arr: Record<Facing, number[][]> = { south: [[9, 10], [16, 6], [23, 10]], east: [[11, 8], [18, 5], [23, 12]], north: [[10, 7], [16, 11], [22, 7]], west: [[9, 12], [14, 5], [21, 8]] };
  arr[f].forEach(([x, y], i) => flower(p, x, y, cols[i], 18, magic ? P.white : P.amber));
  p.set(15, 15, P.grass); p.set(17, 14, P.grassDark);
  if (magic) { p.set(5, 5, P.amber); p.set(27, 3, P.amber); p.set(26, 15, P.white); }
  p.outline(P.outline);
  return p;
}

export function furnRug(f: Facing): Pix {
  const p = new Pix(32, 32);
  const vert = f === 'east' || f === 'west';
  const draw = (q: Pix) => {
    q.rrectR(1, 3, 30, 26, 3, P.coralDark);
    q.rrectR(3, 5, 26, 22, 2, P.coral);
    q.rrectR(6, 8, 20, 16, 2, P.mustardLight);
    q.rrectR(9, 11, 14, 10, 2, P.coral);
    q.rect(12, 14, 8, 4, P.cream); q.set(15, 15, P.coralDark); q.set(16, 16, P.coralDark);
    for (let x = 4; x < 28; x += 3) { q.set(x, 6, P.coralLight); q.set(x + 1, 25, P.coralLight); }
    for (let y = 7; y < 25; y += 3) { q.set(4, y, P.coralLight); q.set(27, y + 1, P.coralLight); }
    // franjas
    for (let x = 3; x < 29; x += 2) { q.set(x, 2, P.cream); q.set(x, 29, P.cream); }
  };
  if (!vert) draw(p); else { const t = new Pix(32, 32); draw(t); p.blit(t.rotated(1), 0, 0); }
  p.outline(P.outline);
  return p;
}

export function furnCushion(f: Facing): Pix {
  const p = new Pix(32, 32);
  furnShadow(p, 16, 27, 10, 2);
  const c = P.teal; const cL = P.tealLight; const cD = P.tealDark;
  p.rrectR(6, 7, 20, 18, 5, cD);
  p.rrectR(7, 8, 18, 15, 4, c);
  p.rrectR(9, 10, 14, 10, 3, cL);
  p.rectDither(9, 10, 14, 10, c, DITHER.sparse);
  // pregas apontam conforme a orientação
  const folds = f === 'south' || f === 'north' ? [[16, 11, 16, 14], [12, 13, 14, 15], [20, 13, 18, 15]] : [[11, 15, 14, 15], [13, 12, 15, 14], [13, 18, 15, 16]];
  folds.forEach(([x0, y0, x1, y1]) => p.line(x0, y0, x1, y1, cD));
  p.set(16, 15, P.white); p.set(17, 15, P.white); p.set(16, 16, P.creamDark);
  // borlas
  [[6, 7], [25, 7], [6, 24], [25, 24]].forEach(([x, y]) => { p.set(x, y, P.mustardLight); p.set(x, y + (y < 16 ? -1 : 1), P.mustard); });
  p.outline(P.outline);
  return p;
}

export function furnCurtain(f: Facing): Pix {
  const p = new Pix(32, 32);
  const flip = f === 'east' || f === 'west';
  p.rect(1, 1, 30, 4, P.woodDark); p.hline(2, 29, 1, P.wood); p.set(1, 2, P.woodLight); p.set(30, 2, P.woodLight);
  for (let x = 3; x < 29; x += 4) {
    const c = ((x - 3) / 4) % 2 ? P.sage : P.sageLight;
    p.rect(x, 5, 4, 24, c); p.vline(x, 5, 28, lighten(c, 0.15)); p.vline(x + 3, 5, 28, darken(c, 0.2));
    p.set(x + 1, 28, darken(c, 0.25)); p.set(x + 2, 29, darken(c, 0.25));
  }
  // abraçadeira e laço (lado muda com a orientação)
  const tx = flip ? 19 : 9;
  p.rect(3, 16, 26, 2, P.sageDark);
  p.rect(tx, 15, 6, 4, P.mustard); p.hline(tx, tx + 5, 15, P.mustardLight); p.set(tx + 2, 19, P.mustardDark); p.set(tx + 3, 19, P.mustardDark);
  p.outline(P.outline);
  return p;
}

export function furnPainting(f: Facing): Pix {
  const p = new Pix(32, 32);
  const flip = f === 'east' || f === 'west';
  p.rect(3, 4, 26, 24, P.mustardDark);
  p.hline(3, 28, 4, P.mustardLight); p.vline(3, 4, 27, P.mustardLight); p.hline(3, 28, 27, darken(P.mustardDark, 0.3)); p.vline(28, 4, 27, darken(P.mustardDark, 0.3));
  for (let i = 5; i < 27; i += 4) { p.set(i, 5, P.mustard); p.set(i, 26, P.mustard); }
  p.rect(6, 7, 20, 18, P.sky);
  p.rectDither(6, 12, 20, 3, P.sageLight, DITHER.checker); p.rect(6, 15, 20, 10, P.sage);
  const hx = flip ? 15 : 9;
  p.rect(hx, 12, 9, 10, P.lilac); p.rect(hx - 1, 9, 11, 4, P.lilacDark); p.set(hx + 4, 8, P.lilacDark); p.rect(hx + 3, 17, 3, 5, P.woodDark); p.set(hx + 1, 15, P.amber);
  p.disc(flip ? 10 : 22, 10, 2, P.amber); p.set(flip ? 9 : 21, 9, P.white);
  p.set(flip ? 22 : 8, 20, P.coral); p.set(flip ? 24 : 10, 22, P.pink);
  p.outline(P.outline);
  return p;
}

export function furnStool(f: Facing): Pix {
  const p = new Pix(32, 32);
  furnShadow(p, 16, 29, 8, 2);
  p.ellipse(16, 15, 9, 5, P.woodDark);
  p.ellipse(16, 13, 9, 5, P.woodLight);
  p.ellipse(15, 12, 6, 3, lighten(P.woodLight, 0.15));
  p.hline(9, 22, 17, darken(P.woodDark, 0.2));
  const side = f === 'east' || f === 'west';
  const legs = side ? [[10, 18, 9], [20, 18, 9], [15, 19, 8]] : [[9, 17, 10], [20, 17, 10], [15, 18, 9]];
  legs.forEach(([x, y, h]) => { p.rect(x, y, 3, h, P.woodDark); p.vline(x, y, y + h - 1, P.wood); });
  p.hline(12, 19, 24, P.woodDark); // travessa
  p.outline(P.outline);
  return p;
}

// ---------------------------------------------------------------------------
// Ícones de itens (16 × 16)
// ---------------------------------------------------------------------------

export function iconMadeira(): Pix { const p = new Pix(16, 16); p.rect(2, 5, 11, 6, P.wood); p.hline(2, 12, 5, P.woodLight); p.hline(2, 12, 10, P.woodDark); p.disc(13, 8, 3, P.woodLight); p.disc(13, 8, 2, P.wood); p.set(13, 8, P.woodDark); p.hline(4, 6, 8, P.woodDark); p.outline(P.outline); return p; }
export function iconPedra(): Pix { const p = new Pix(16, 16); p.ellipse(8, 9, 6, 5, P.stoneDark); p.ellipse(7, 8, 5, 4, P.stone); p.ellipse(6, 6, 2, 1, P.stoneLight); p.set(11, 10, P.stoneDark); p.outline(P.outline); return p; }
export function iconFolhas(): Pix { const p = new Pix(16, 16); p.ellipse(8, 8, 6, 4, P.grass); p.line(3, 11, 13, 5, P.grassDark); p.set(6, 6, P.grassLight); p.set(7, 5, P.grassLight); p.set(10, 10, P.grassDark); p.line(3, 11, 1, 13, P.woodDark); p.outline(P.outline); return p; }
export function iconFibra(): Pix { const p = new Pix(16, 16); for (let i = 0; i < 5; i++) { const x = 3 + i * 2.5; p.vline(Math.round(x), 2 + (i % 2), 13, i % 2 ? P.sage : P.sageDark); p.set(Math.round(x) + 1, 3 + (i % 2), P.sageLight); } p.rect(3, 8, 10, 3, P.mustard); p.hline(3, 12, 8, P.mustardLight); p.hline(3, 12, 10, P.mustardDark); p.outline(P.outline); return p; }
export function iconFlor(): Pix { const p = new Pix(16, 16); p.vline(8, 9, 14, P.grassDark); p.set(6, 12, P.grass); p.set(5, 12, P.grass); p.disc(8, 6, 4, P.coral); p.set(6, 4, P.coralLight); p.set(5, 5, P.coralLight); p.set(10, 8, P.coralDark); p.disc(8, 6, 1, P.amber); p.outline(P.outline); return p; }
export function iconPo(): Pix { const p = new Pix(16, 16); p.rrectR(4, 5, 8, 9, 2, P.lilac); p.rect(5, 6, 6, 2, P.lilacLight); p.vline(11, 7, 12, P.lilacDark); p.rect(5, 3, 6, 2, P.brownDark); p.set(3, 3, P.amber); p.set(12, 2, P.amber); p.set(13, 6, P.amber); p.set(7, 9, P.white); p.outline(P.outline); return p; }
export function iconFlorLua(): Pix { const p = new Pix(16, 16); p.vline(8, 9, 14, P.sageDark); p.disc(8, 6, 4, P.lilacLight); p.set(5, 4, P.white); p.set(6, 3, P.white); p.disc(8, 6, 2, P.white); p.set(8, 6, P.amber); p.set(2, 3, P.white); p.set(14, 10, P.white); p.outline(P.outline); return p; }
export function iconTinta(): Pix { const p = new Pix(16, 16); p.rrectR(4, 4, 8, 10, 2, P.lilac); p.vline(4, 5, 12, P.lilacLight); p.vline(11, 5, 12, P.lilacDark); p.rect(5, 2, 6, 3, P.grayDark); p.hline(5, 10, 2, P.grayLight); p.rect(5, 8, 6, 4, P.cream); p.set(7, 9, P.amber); p.set(8, 10, P.coral); p.outline(P.outline); return p; }
export function iconFragmento(): Pix { const p = new Pix(16, 16); p.triangle(8, 2, 6, P.amber); p.rect(5, 8, 6, 3, P.amber); p.triangle(8, 11, 1, P.amberDark); p.vline(6, 4, 9, P.white); p.vline(10, 5, 10, P.amberDark); p.set(1, 2, P.white); p.set(14, 4, P.white); p.set(13, 13, P.white); p.outline(P.outline); return p; }
export function iconFoto(): Pix { return photo(); }
export function iconCarta(): Pix { const p = new Pix(16, 16); p.rect(2, 4, 12, 9, P.cream); p.hline(2, 13, 4, P.creamLight); p.hline(2, 13, 12, P.creamDark); p.line(2, 4, 8, 9, P.creamDark); p.line(14, 4, 8, 9, P.creamDark); p.set(8, 10, P.coral); p.set(7, 10, P.coral); p.set(8, 11, P.coralDark); p.outline(P.outline); return p; }

// ---------------------------------------------------------------------------
// Ícones de UI (24 × 24)
// ---------------------------------------------------------------------------

export function uiBag(): Pix { const p = new Pix(24, 24); p.rrectR(4, 8, 16, 13, 3, P.brown); p.hline(5, 18, 8, P.caramel); p.vline(19, 10, 19, P.brownDark); p.rect(5, 9, 14, 4, P.caramel); p.hline(5, 18, 12, P.brownDark); p.rrectR(9, 3, 6, 6, 2, P.brownDark); p.erase(10, 4, 4, 3); p.rrectR(10, 13, 4, 4, 1, P.amber); p.set(11, 14, P.white); p.outline(P.outline); return p; }
export function uiBook(): Pix { const p = new Pix(24, 24); p.rrectR(3, 4, 18, 16, 2, P.lilacDark); p.rect(5, 6, 14, 12, P.lilac); p.hline(5, 18, 6, P.lilacLight); p.rect(11, 5, 2, 14, P.lilacDark); p.rect(6, 8, 4, 2, P.amber); p.rect(14, 8, 4, 2, P.amber); p.hline(6, 9, 12, P.lilacLight); p.hline(14, 17, 12, P.lilacLight); p.hline(6, 9, 15, P.lilacLight); p.set(12, 2, P.amber); p.outline(P.outline); return p; }
export function uiMap(): Pix { const p = new Pix(24, 24); p.rect(3, 4, 18, 16, P.cream); p.rect(3, 4, 6, 16, P.creamDark); p.rect(15, 4, 6, 16, P.creamDark); p.hline(3, 20, 4, P.creamLight); p.line(6, 16, 17, 7, P.coral); p.line(6, 15, 17, 6, P.coralDark); p.disc(17, 7, 2, P.coral); p.set(17, 7, P.white); p.set(8, 10, P.sage); p.set(9, 10, P.sage); p.outline(P.outline); return p; }
export function uiHand(): Pix { const p = new Pix(24, 24); p.rrectR(7, 8, 10, 12, 3, P.fur); p.rrectR(7, 4, 2, 6, 1, P.fur); p.rrectR(10, 3, 2, 7, 1, P.fur); p.rrectR(13, 3, 2, 7, 1, P.fur); p.rrectR(16, 5, 2, 5, 1, P.fur); p.rrectR(4, 11, 4, 3, 1, P.fur); p.hline(8, 15, 19, P.furShade); p.vline(16, 10, 18, P.furShade); p.outline(P.outline); return p; }
export function uiRun(): Pix { const p = new Pix(24, 24); p.hline(3, 11, 8, P.amber); p.hline(2, 12, 12, P.amber); p.hline(4, 10, 16, P.amber); p.rrectR(13, 6, 8, 12, 3, P.coral); p.vline(13, 8, 15, P.coralLight); p.vline(20, 8, 15, P.coralDark); p.outline(P.outline); return p; }
export function uiDecor(): Pix { const p = new Pix(24, 24); p.rrectR(4, 10, 16, 10, 2, P.coral); p.rect(6, 12, 12, 6, P.mustardLight); p.hline(6, 17, 12, P.white); p.rect(4, 5, 4, 5, P.woodDark); p.rect(16, 5, 4, 5, P.woodDark); p.rect(4, 8, 16, 3, P.wood); p.hline(4, 19, 8, P.woodLight); p.set(4, 20, P.woodDark); p.set(19, 20, P.woodDark); p.outline(P.outline); return p; }
export function uiRotate(): Pix { const p = new Pix(24, 24); for (let a = 0; a < 270; a += 5) { const r = (a * Math.PI) / 180; p.set(Math.round(12 + 7 * Math.cos(r)), Math.round(12 + 7 * Math.sin(r)), P.white); p.set(Math.round(12 + 6 * Math.cos(r)), Math.round(12 + 6 * Math.sin(r)), P.white); } p.triangle(12, 1, 6, P.white); p.outline(P.outline); return p; }
export function uiClose(): Pix { const p = new Pix(24, 24); p.line(6, 6, 18, 18, P.white); p.line(7, 6, 19, 18, P.white); p.line(6, 7, 18, 19, P.white); p.line(18, 6, 6, 18, P.white); p.line(19, 6, 7, 18, P.white); p.line(18, 7, 6, 19, P.white); p.outline(P.outline); return p; }
export function uiPickup(): Pix { const p = new Pix(24, 24); p.rrectR(6, 12, 12, 8, 2, P.wood); p.hline(7, 16, 12, P.woodLight); p.triangle(12, 2, 6, P.white); p.rect(11, 7, 2, 6, P.white); p.outline(P.outline); return p; }
export function uiCheck(): Pix { const p = new Pix(24, 24); p.line(5, 12, 10, 17, P.green); p.line(6, 12, 11, 17, P.green); p.line(5, 13, 10, 18, P.green); p.line(10, 17, 19, 7, P.green); p.line(11, 17, 20, 7, P.green); p.line(10, 18, 19, 8, P.green); p.outline(P.outline); return p; }

// ---------------------------------------------------------------------------
// Marcadores e efeitos
// ---------------------------------------------------------------------------

export function markerExclaim(): Pix { const p = new Pix(16, 16); p.rrectR(6, 1, 4, 9, 1, P.amber); p.vline(6, 2, 8, P.mustardLight); p.rrectR(6, 12, 4, 3, 1, P.amber); p.outline(P.outline); return p; }
export function sparkle(frame: number): Pix {
  const p = new Pix(12, 12);
  const r = frame === 0 ? 5 : 3;
  p.vline(6, 6 - r, 6 + r, P.white); p.hline(6 - r, 6 + r, 6, P.white);
  p.set(5, 5, P.amber); p.set(7, 7, P.amber); p.set(5, 7, P.amber); p.set(7, 5, P.amber);
  if (frame === 0) { p.set(6, 6 - r, P.amber, 180); p.set(6, 6 + r, P.amber, 180); p.set(6 - r, 6, P.amber, 180); p.set(6 + r, 6, P.amber, 180); }
  return p;
}
export function heart(): Pix { const p = new Pix(12, 12); p.disc(4, 4, 2, P.coral); p.disc(8, 4, 2, P.coral); p.triangle(6, 5, 1, P.coral); p.rect(2, 5, 8, 2, P.coral); p.rect(4, 7, 4, 2, P.coral); p.set(6, 9, P.coral); p.set(3, 3, P.coralLight); p.outline(P.outline); return p; }
export function shadow(): Pix { return shadowPix(32, 12, 110); }
export function cursorTile(): Pix { const p = new Pix(32, 32); p.rrectOutline(0, 0, 32, 32, 3, P.white); p.rrectOutline(1, 1, 30, 30, 3, P.amber); [[0, 0], [28, 0], [0, 28], [28, 28]].forEach(([x, y]) => p.rect(x, y, 4, 4, P.amber)); return p; }
export function cursorTileBad(): Pix { const p = new Pix(32, 32); p.rrectOutline(0, 0, 32, 32, 3, P.white); p.rrectOutline(1, 1, 30, 30, 3, P.red); [[0, 0], [28, 0], [0, 28], [28, 28]].forEach(([x, y]) => p.rect(x, y, 4, 4, P.red)); return p; }
export function fragmentBig(): Pix { const p = new Pix(24, 32); p.triangle(12, 2, 12, P.amber); p.rect(6, 14, 12, 8, P.amber); for (let y = 22; y < 28; y++) p.hline(6 + (y - 22), 18 - (y - 22), y, P.amber); p.vline(9, 6, 20, P.white); p.vline(10, 8, 18, P.mustardLight); p.vline(15, 8, 22, P.amberDark); p.vline(16, 12, 20, P.amberDark); p.set(12, 2, P.white); p.outline(P.outline); return p; }
export function letter(): Pix { const p = new Pix(24, 18); p.rect(2, 3, 20, 13, P.cream); p.hline(2, 21, 3, P.creamLight); p.hline(2, 21, 15, P.creamDark); p.line(2, 3, 12, 10, P.creamDark); p.line(22, 3, 12, 10, P.creamDark); p.rect(10, 9, 5, 4, P.coral); p.set(12, 9, P.coralLight); p.hline(10, 14, 12, P.coralDark); p.outline(P.outline); return p; }

/** Partículas ambientais: folha, pétala, vaga-lume, poeira e feixe de luz da janela. */
export function leaf(kind: number): Pix {
  const p = new Pix(8, 8);
  const c = [P.mustardDark, P.orangeDark, P.caramel][kind % 3];
  p.rect(2, 3, 4, 2, c); p.set(1, 4, c); p.set(6, 3, c); p.set(3, 2, lighten(c, 0.25)); p.set(4, 5, darken(c, 0.2)); p.set(5, 2, darken(c, 0.3));
  return p;
}
export function petal(kind: number): Pix {
  const p = new Pix(6, 6);
  const c = [P.pink, P.coralLight, P.white][kind % 3];
  p.rect(2, 1, 2, 4, c); p.rect(1, 2, 4, 2, c); p.set(2, 2, lighten(c, 0.3)); p.set(3, 3, darken(c, 0.15));
  return p;
}
export function firefly(): Pix {
  const p = new Pix(8, 8);
  p.disc(4, 4, 3, P.amber, 60); p.disc(4, 4, 2, P.amber, 140); p.set(4, 4, P.white); p.set(3, 4, P.mustardLight); p.set(4, 3, P.mustardLight);
  return p;
}
export function dustPuff(): Pix {
  const p = new Pix(10, 8);
  p.ellipseBlend(5, 4, 4, 3, P.creamDark, 150); p.ellipseBlend(4, 3, 2, 1, P.cream, 170);
  return p;
}
export function lightBeam(): Pix {
  // feixe inclinado que entra pela janela e cai no chão (alpha decrescente)
  const p = new Pix(96, 128);
  for (let y = 0; y < p.h; y++) {
    const t = y / p.h;
    const half = 12 + t * 34;
    const cx = 30 + t * 30;
    const a = Math.round(150 * (1 - t) * (1 - t) + 10);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const edge = Math.abs(x - cx) / half;
      const aa = Math.round(a * (1 - edge * 0.6));
      if (aa < 6) continue;
      if (edge > 0.8 && !DITHER.checker(x, y)) continue;
      p.set(x, y, '#fff2c8', aa);
    }
  }
  return p;
}
export function mote(): Pix { const p = new Pix(3, 3); p.set(1, 1, P.white, 220); p.set(0, 1, P.cream, 120); p.set(2, 1, P.cream, 120); p.set(1, 0, P.cream, 120); p.set(1, 2, P.cream, 120); return p; }
export function cloud(seed: number): Pix {
  const p = new Pix(64, 28);
  const r = rng(seed);
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) { const x = 10 + Math.floor(r() * 44); const y = 14 + Math.floor(r() * 6); const rad = 5 + Math.floor(r() * 6); p.disc(x, y, rad, P.white); }
  p.rect(8, 18, 48, 6, P.white);
  for (let i = 0; i < n; i++) { const x = 10 + Math.floor(r() * 44); const rad = 3 + Math.floor(r() * 4); p.disc(x, 20, rad, '#dbe8f6'); }
  p.rectDither(6, 20, 52, 6, '#dbe8f6', DITHER.checker);
  return p;
}

// ---------------------------------------------------------------------------
// Escritório (cinemática)
// ---------------------------------------------------------------------------

export function officeDesk(): Pix {
  const p = new Pix(64, 48);
  p.rect(2, 14, 60, 8, '#8d94a3'); p.rect(2, 14, 60, 2, '#a7aebb'); p.hline(2, 61, 21, '#6f7787');
  p.rect(4, 22, 4, 24, '#6f7787'); p.rect(56, 22, 4, 24, '#6f7787'); p.vline(4, 22, 45, '#7c8595'); p.vline(56, 22, 45, '#7c8595');
  p.rrectR(20, 0, 24, 16, 2, '#4a5060'); p.rect(22, 2, 20, 12, '#7fb2d6'); p.rect(30, 16, 4, 3, '#4a5060'); p.rect(27, 19, 10, 1, '#4a5060');
  p.rect(24, 4, 16, 2, '#bcd9ec'); p.rect(24, 8, 10, 1, '#bcd9ec'); p.rect(24, 10, 12, 1, '#bcd9ec'); p.rect(24, 12, 6, 1, '#e8b9b9');
  p.rect(8, 8, 10, 6, '#c9c9c9'); p.hline(8, 17, 8, '#e0e0e0'); p.rect(48, 10, 8, 4, '#e0d8a0'); p.hline(48, 55, 10, '#f0e8b8');
  p.rect(10, 4, 6, 4, '#d8d8d8'); // papel
  p.outline('#2b2f3a');
  return p;
}
export function officeChair(): Pix { const p = new Pix(32, 40); p.rrectR(6, 2, 20, 18, 3, '#3c4150'); p.rect(8, 4, 16, 14, '#4d5364'); p.hline(8, 23, 4, '#5b6270'); p.rect(14, 20, 4, 10, '#5b6270'); p.rect(6, 30, 20, 3, '#5b6270'); p.hline(6, 25, 30, '#6a7282'); p.outline('#2b2f3a'); return p; }
export function officeWindow(): Pix {
  const p = new Pix(96, 64);
  p.rect(0, 0, 96, 64, '#5b6270');
  p.rect(4, 4, 88, 56, '#8fa3bd');
  p.rectDither(4, 4, 88, 20, '#a3b4ca', DITHER.checker);
  const r = rng(5);
  for (let i = 0; i < 9; i++) { const h = 16 + Math.floor(r() * 30); const x = 6 + i * 10; p.rect(x, 60 - h, 8, h, '#5f6b80'); p.vline(x, 60 - h, 59, '#6a768c'); for (let y = 62 - h; y < 58; y += 4) p.set(x + 2 + ((y / 4) % 2) * 3, y, r() < 0.7 ? '#c8d4e6' : '#e8c890'); }
  p.rect(47, 4, 2, 56, '#5b6270'); p.rect(4, 31, 88, 2, '#5b6270');
  p.hline(0, 95, 0, '#6a7282'); p.vline(0, 0, 63, '#6a7282');
  return p;
}
export function officePlant(): Pix { const p = new Pix(24, 32); p.rect(8, 22, 8, 8, '#7a7f8a'); p.hline(8, 15, 22, '#8a8f9a'); p.ellipse(12, 14, 8, 8, '#6c7a6a'); p.ellipse(10, 10, 4, 3, '#7f8f7c'); p.set(16, 16, '#5c6a5a'); p.outline('#2b2f3a'); return p; }
export function busSide(): Pix {
  const p = new Pix(96, 48);
  p.rrectR(4, 8, 88, 30, 4, P.mustard);
  p.rect(4, 8, 88, 12, P.mustardLight); p.hline(6, 89, 8, lighten(P.mustardLight, 0.3));
  for (let i = 0; i < 5; i++) { p.rect(10 + i * 16, 12, 12, 10, P.sky); p.rectDither(10 + i * 16, 12, 5, 10, '#dbe8f6', DITHER.checker); p.vline(21 + i * 16, 12, 21, darken(P.sky, 0.2)); }
  p.rect(4, 30, 88, 6, P.mustardDark); p.hline(4, 91, 36, darken(P.mustardDark, 0.3));
  p.rect(84, 24, 6, 4, P.amber); p.rect(6, 24, 6, 4, P.red);
  p.disc(20, 40, 6, P.outline); p.disc(76, 40, 6, P.outline); p.disc(20, 40, 3, P.grayLight); p.disc(76, 40, 3, P.grayLight); p.set(20, 40, P.grayDark); p.set(76, 40, P.grayDark);
  p.outline(P.outline);
  return p;
}

/** Geradores de mobília por id (recebem a orientação). */
export const FURNITURE_GENERATORS: Record<string, (f: Facing) => Pix> = {
  furn_cama: furnBed,
  furn_luminaria: (f) => furnLamp(false, f),
  furn_luminaria_encantada: (f) => furnLamp(true, f),
  furn_cadeira: furnChair,
  furn_mesa_cha: furnTable,
  furn_prateleira: furnShelf,
  furn_vitrine: furnVitrine,
  furn_banco: furnBench,
  furn_vaso_flores: (f) => furnVase(false, f),
  furn_vaso_encantado: (f) => furnVase(true, f),
  furn_tapete: furnRug,
  furn_almofada: furnCushion,
  furn_cortina: furnCurtain,
  furn_quadro: furnPainting,
  furn_banquinho: furnStool,
};

const furnitureEntries: Record<string, () => Pix> = {};
for (const [id, gen] of Object.entries(FURNITURE_GENERATORS)) {
  furnitureEntries[id] = () => gen('south'); // chave base = vista sul (ícones, receitas, caderno)
  for (const f of FACINGS) furnitureEntries[`${id}_${f}`] = () => gen(f);
}

export const OBJECT_GENERATORS: Record<string, () => Pix> = {
  crate, cobweb, windowClosed, windowOpen, photo, benchBroken, benchOk, sewingBroken, sewingOk, paintBroken, paintOk,
  notebookStand, shelfOld, dustPile,
  leavesPile: () => leavesPile(1), leavesPile2: () => leavesPile(2),
  tree: () => tree(1), tree2: () => tree(2), treeRound: () => treeRound(3), bush,
  nodeWood: nodeWood, nodeStone: nodeStone, nodeLeaves: nodeLeaves, nodeFiber: nodeFiber, nodeFlower: nodeFlower, nodeDust: nodeDust, nodeMoonFlower: nodeMoonFlower,
  fallenLog, shrine, lamppost,
  fountainDry, fountainFlow0: () => fountainFlow(0), fountainFlow1: () => fountainFlow(1),
  signBroken, signOk,
  facadeAtelierOld: () => facadeAtelier(false), facadeAtelierNew: () => facadeAtelier(true),
  facadeShopOld: () => facadeShop(false), facadeShopNew: () => facadeShop(true),
  houseA: () => houseAbandoned(1), houseB: () => houseAbandoned(2), houseC: () => houseAbandoned(3),
  houseANew: () => houseRestored(1), houseBNew: () => houseRestored(2), houseCNew: () => houseRestored(3),
  ...furnitureEntries,
  icon_madeira: iconMadeira, icon_pedra: iconPedra, icon_folhas: iconFolhas, icon_fibra: iconFibra, icon_flor: iconFlor, icon_po_encanto: iconPo,
  icon_flor_lua: iconFlorLua, icon_tinta: iconTinta, icon_fragmento: iconFragmento, icon_foto: iconFoto, icon_carta: iconCarta,
  ui_bag: uiBag, ui_book: uiBook, ui_map: uiMap, ui_hand: uiHand, ui_run: uiRun, ui_decor: uiDecor, ui_rotate: uiRotate, ui_close: uiClose, ui_pickup: uiPickup, ui_check: uiCheck,
  markerExclaim, sparkle0: () => sparkle(0), sparkle1: () => sparkle(1), heart, shadow, cursorTile, cursorTileBad, fragmentBig, letter,
  officeDesk, officeChair, officeWindow, officePlant, busSide,
  fx_leaf0: () => leaf(0), fx_leaf1: () => leaf(1), fx_leaf2: () => leaf(2),
  fx_petal0: () => petal(0), fx_petal1: () => petal(1), fx_petal2: () => petal(2),
  fx_firefly: firefly, fx_puff: dustPuff, fx_beam: lightBeam, fx_mote: mote,
  fx_cloud0: () => cloud(1), fx_cloud1: () => cloud(2), fx_cloud2: () => cloud(3),
};

/** Objetos que NÃO recebem a variante desbotada (UI, ícones, efeitos). */
export const NO_FADE_PREFIXES = ['icon_', 'ui_', 'fx_', 'marker', 'sparkle', 'heart', 'shadow', 'cursor', 'fragment', 'letter', 'office', 'bus', 'photo'];

/** Miniatura de praça e mapa (para a tela do mapa). */
export function mapThumb(kind: 'atelier' | 'praca' | 'floresta' | 'loja'): Pix {
  const p = new Pix(48, 40);
  if (kind === 'floresta') { p.blit(tileGrass(1), 0, 0); p.blit(tileGrass(2), 32, 0); p.blit(tileGrass(3), 0, 32); p.blit(tileGrass(4), 32, 32); p.disc(12, 14, 7, P.grassDark); p.disc(11, 12, 5, P.grass); p.disc(30, 20, 8, P.grassDark); p.disc(29, 18, 6, P.grass); p.disc(40, 10, 5, P.grassDark); p.disc(39, 9, 3, P.grass); p.ellipse(24, 32, 8, 4, P.water); }
  else if (kind === 'praca') { p.blit(tileCobble(1), 0, 0); p.blit(tileCobble(2), 32, 0); p.blit(tileCobble(3), 0, 32); p.blit(tileCobble(4), 32, 32); p.disc(24, 20, 10, P.stoneDark); p.disc(24, 19, 9, P.stoneLight); p.disc(24, 20, 6, P.water); p.disc(23, 19, 2, P.waterLight); }
  else if (kind === 'atelier') { p.rect(0, 0, 48, 40, P.grass); p.rect(8, 14, 32, 22, P.cream); p.rect(8, 14, 32, 2, P.woodDark); roofShingles(p, 4, 4, 40, 10, P.lilac, 1, false); p.rect(20, 24, 8, 12, P.woodDark); p.rect(22, 26, 4, 10, P.wood); p.rect(11, 22, 6, 6, P.amber); p.rect(31, 22, 6, 6, P.amber); }
  else { p.rect(0, 0, 48, 40, P.grass); p.rect(8, 14, 32, 22, mix(P.cream, P.pink, 0.4)); roofShingles(p, 4, 4, 40, 10, P.teal, 2, false); p.rect(20, 24, 8, 12, P.pinkDark); for (let x = 10; x < 38; x += 4) p.rect(x, 16, 4, 4, (x / 4) % 2 ? P.coral : P.white); p.rect(11, 24, 6, 6, P.sky); p.rect(31, 24, 6, 6, P.amber); }
  p.outline(P.outline);
  return p;
}
