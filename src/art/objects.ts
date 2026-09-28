import { P, darken, lighten, mix, type Hex } from './palette';
import { Pix, rng } from './pix';
import { tileGrass, tileCobble } from './tiles';

/**
 * Objetos do mundo, mobílias e ícones — todos desenhados em código.
 * Convenção: objetos "de chão" têm origem no centro-inferior (definida na cena).
 */

// ---------------------------------------------------------------------------
// Props do ateliê e da loja
// ---------------------------------------------------------------------------

export function crate(): Pix {
  const p = new Pix(32, 32);
  p.rrect(3, 6, 26, 24, P.woodDark);
  p.rrect(4, 7, 24, 22, P.wood);
  p.rect(4, 7, 24, 2, P.woodLight);
  p.line(5, 8, 27, 28, P.woodDark);
  p.line(27, 8, 5, 28, P.woodDark);
  p.box(4, 7, 24, 22, P.woodDark);
  p.rect(6, 11, 4, 2, P.woodLight);
  p.outline(P.outline);
  return p;
}

export function cobweb(): Pix {
  const p = new Pix(32, 32);
  const c = P.grayLight;
  for (let i = 0; i < 5; i++) p.line(2, 2, 2 + i * 7, 30, c, 180);
  for (let i = 0; i < 4; i++) p.line(2, 2, 30, 2 + i * 9, c, 180);
  for (let r = 6; r < 30; r += 6) {
    p.line(2 + r, 2, 2, 2 + r, c, 150);
    p.line(2 + r, 2, 2 + r * 0.7, 2 + r * 0.7, c, 150);
    p.line(2 + r * 0.7, 2 + r * 0.7, 2, 2 + r, c, 150);
  }
  p.set(12, 12, P.grayDark); p.set(13, 12, P.grayDark); p.set(12, 13, P.grayDark);
  return p;
}

export function windowClosed(): Pix {
  const p = new Pix(32, 32);
  p.rrect(4, 4, 24, 22, P.woodDark);
  p.rect(6, 6, 20, 18, darken(P.teal, 0.5));
  p.rect(5, 9, 22, 4, P.wood); p.rect(5, 9, 22, 1, P.woodLight);
  p.rect(5, 16, 22, 4, P.wood); p.rect(5, 16, 22, 1, P.woodLight);
  p.set(7, 10, P.brownDark); p.set(24, 10, P.brownDark); p.set(7, 17, P.brownDark); p.set(24, 17, P.brownDark);
  p.outline(P.outline);
  return p;
}

export function windowOpen(): Pix {
  const p = new Pix(32, 32);
  p.rrect(4, 4, 24, 22, P.woodDark);
  p.rect(6, 6, 20, 18, P.sky);
  p.rect(6, 6, 20, 8, '#dbe8f6');
  p.rect(6, 17, 20, 7, P.sageLight);
  p.rect(15, 6, 2, 18, P.wood);
  p.rect(6, 14, 20, 2, P.wood);
  p.rect(1, 3, 3, 24, P.wood); p.rect(28, 3, 3, 24, P.wood);
  p.rect(8, 8, 3, 3, P.white);
  p.outline(P.outline);
  return p;
}

export function photo(): Pix {
  const p = new Pix(16, 16);
  p.rect(2, 3, 12, 11, P.cream);
  p.rect(3, 4, 10, 7, P.sageLight);
  p.rect(3, 4, 10, 3, P.sky);
  p.rect(5, 6, 4, 4, P.lilac);
  p.set(10, 8, P.amber);
  p.outline(P.outline);
  return p;
}

export function benchBroken(): Pix {
  const p = new Pix(64, 32);
  p.rect(4, 22, 4, 8, P.woodDark);
  p.rect(56, 24, 4, 6, P.woodDark);
  p.rect(2, 12, 40, 6, P.wood);
  p.line(42, 12, 60, 20, P.wood); p.line(42, 13, 60, 21, P.wood); p.line(42, 14, 60, 22, P.woodDark);
  p.rect(2, 12, 40, 1, P.woodLight);
  p.rect(10, 6, 6, 6, P.stoneDark); // martelo velho
  p.rect(13, 8, 1, 8, P.wood);
  p.set(20, 10, P.grayLight); p.set(21, 10, P.grayLight);
  p.rect(30, 8, 8, 4, P.grayLight); // pó
  p.outline(P.outline);
  return p;
}

export function benchOk(): Pix {
  const p = new Pix(64, 32);
  p.rect(4, 20, 4, 10, P.woodDark);
  p.rect(56, 20, 4, 10, P.woodDark);
  p.rect(2, 12, 60, 8, P.wood);
  p.rect(2, 12, 60, 1, P.woodLight);
  p.rect(2, 19, 60, 1, P.woodDark);
  p.rect(10, 6, 6, 5, P.stoneDark); p.rect(13, 8, 1, 6, P.wood); // martelo
  p.rect(28, 7, 12, 3, P.stoneLight); p.rect(26, 8, 4, 3, P.wood); // serrote
  p.rect(48, 6, 8, 6, P.woodLight); p.rect(48, 6, 8, 1, P.wood); // tábuas
  p.outline(P.outline);
  return p;
}

export function sewingBroken(): Pix {
  const p = new Pix(48, 32);
  p.rect(4, 22, 4, 8, P.woodDark); p.rect(40, 24, 4, 6, P.woodDark);
  p.rect(2, 14, 44, 6, P.wood);
  p.rect(12, 4, 16, 10, P.grayDark);
  p.rect(14, 6, 6, 6, P.gray);
  p.line(28, 6, 34, 2, P.grayLight);
  p.rect(30, 10, 10, 3, P.grayLight);
  p.set(36, 8, P.coral);
  p.outline(P.outline);
  return p;
}

export function sewingOk(): Pix {
  const p = new Pix(48, 32);
  p.rect(4, 20, 4, 10, P.woodDark); p.rect(40, 20, 4, 10, P.woodDark);
  p.rect(2, 13, 44, 7, P.wood); p.rect(2, 13, 44, 1, P.woodLight);
  p.rrect(10, 2, 18, 11, P.teal); p.rect(12, 4, 14, 2, P.tealLight);
  p.rect(24, 6, 3, 7, P.stoneLight);
  p.rect(30, 4, 6, 8, P.coral); p.rect(38, 6, 6, 6, P.lilac); // carretéis
  p.rect(32, 2, 2, 2, P.grayDark); p.rect(40, 4, 2, 2, P.grayDark);
  p.outline(P.outline);
  return p;
}

export function paintBroken(): Pix {
  const p = new Pix(48, 32);
  p.rect(4, 22, 4, 8, P.woodDark); p.rect(40, 24, 4, 6, P.woodDark);
  p.rect(2, 14, 44, 6, P.wood);
  p.rect(8, 4, 12, 10, P.grayLight); p.rect(10, 6, 8, 6, P.gray);
  p.rect(26, 8, 8, 6, P.grayDark);
  p.line(36, 4, 42, 12, P.woodDark);
  p.outline(P.outline);
  return p;
}

export function paintOk(): Pix {
  const p = new Pix(48, 32);
  p.rect(4, 20, 4, 10, P.woodDark); p.rect(40, 20, 4, 10, P.woodDark);
  p.rect(2, 13, 44, 7, P.wood); p.rect(2, 13, 44, 1, P.woodLight);
  p.rrect(6, 2, 14, 11, P.cream); // paleta
  p.set(8, 5, P.coral); p.set(11, 4, P.mustard); p.set(14, 5, P.teal); p.set(9, 9, P.lilac); p.set(13, 9, P.sage);
  p.rect(24, 4, 5, 9, P.coral); p.rect(30, 6, 5, 7, P.teal); p.rect(36, 3, 5, 10, P.lilac);
  p.rect(24, 4, 5, 1, P.grayDark); p.rect(30, 6, 5, 1, P.grayDark); p.rect(36, 3, 5, 1, P.grayDark);
  p.line(42, 2, 45, 12, P.woodDark);
  p.outline(P.outline);
  return p;
}

export function notebookStand(): Pix {
  const p = new Pix(32, 32);
  p.rect(12, 18, 8, 12, P.woodDark);
  p.rect(8, 28, 16, 3, P.wood);
  p.rrect(5, 4, 22, 16, P.lilacDark);
  p.rect(7, 6, 18, 12, P.lilac);
  p.rect(15, 6, 2, 12, P.lilacDark);
  p.rect(9, 8, 4, 2, P.amber); p.rect(19, 8, 4, 2, P.amber);
  p.rect(9, 12, 5, 1, P.lilacLight); p.rect(19, 12, 5, 1, P.lilacLight);
  p.set(16, 2, P.amber); p.set(15, 3, P.amber); p.set(17, 3, P.amber);
  p.outline(P.outline);
  return p;
}

export function shelfOld(): Pix {
  const p = new Pix(32, 32);
  p.rect(2, 8, 28, 3, P.wood); p.rect(2, 18, 28, 3, P.wood);
  p.rect(2, 8, 2, 14, P.woodDark); p.rect(28, 8, 2, 14, P.woodDark);
  p.rect(6, 3, 4, 5, P.teal); p.rect(12, 2, 3, 6, P.coralDark);
  p.rect(8, 13, 6, 5, P.grayLight);
  p.outline(P.outline);
  return p;
}

export function dustPile(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 24, 10, 4, P.grayLight, 160);
  p.ellipse(14, 23, 6, 2, P.gray, 160);
  return p;
}

export function leavesPile(seed = 1): Pix {
  const p = new Pix(32, 32);
  const r = rng(seed);
  const cols = [P.mustardDark, P.orangeDark, P.caramel, P.woodDark];
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(r() * 26) + 2;
    const y = Math.floor(r() * 20) + 8;
    const c = cols[Math.floor(r() * cols.length)];
    p.rect(x, y, 3, 2, c); p.set(x + 1, y - 1, c);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Natureza e pontos de coleta
// ---------------------------------------------------------------------------

export function tree(seed = 1): Pix {
  const p = new Pix(48, 64);
  const r = rng(seed);
  p.rect(20, 40, 8, 22, P.woodDark);
  p.rect(22, 40, 3, 22, P.wood);
  p.ellipse(24, 26, 20, 18, P.grassDark);
  p.ellipse(22, 22, 16, 14, P.grass);
  p.ellipse(18, 18, 9, 7, P.grassLight);
  for (let i = 0; i < 20; i++) p.set(6 + Math.floor(r() * 36), 10 + Math.floor(r() * 30), r() < 0.5 ? P.grassDark : P.grassLight);
  p.outline(P.outline);
  return p;
}

export function treeRound(seed = 2): Pix {
  const p = new Pix(48, 64);
  const r = rng(seed);
  p.rect(21, 44, 6, 18, P.woodDark);
  p.disc(24, 26, 17, P.sageDark);
  p.disc(22, 24, 14, P.sage);
  p.disc(18, 19, 7, P.sageLight);
  for (let i = 0; i < 8; i++) p.set(8 + Math.floor(r() * 32), 12 + Math.floor(r() * 26), P.pink);
  p.outline(P.outline);
  return p;
}

export function bush(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 20, 14, 10, P.grassDark);
  p.ellipse(14, 18, 11, 8, P.grass);
  p.ellipse(11, 15, 5, 3, P.grassLight);
  p.outline(P.outline);
  return p;
}

export function nodeWood(): Pix {
  const p = new Pix(32, 32);
  p.rect(2, 18, 28, 8, P.woodDark);
  p.rect(2, 18, 28, 3, P.wood);
  p.disc(4, 22, 4, P.woodLight); p.disc(4, 22, 2, P.wood);
  p.rect(8, 10, 18, 6, P.wood); p.rect(8, 10, 18, 2, P.woodLight);
  p.rect(14, 4, 12, 5, P.woodDark); p.rect(14, 4, 12, 2, P.wood);
  p.outline(P.outline);
  return p;
}

export function nodeStone(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 22, 13, 8, P.stoneDark);
  p.ellipse(15, 20, 11, 7, P.stone);
  p.ellipse(12, 17, 5, 3, P.stoneLight);
  p.ellipse(24, 14, 5, 4, P.stone); p.ellipse(23, 13, 3, 2, P.stoneLight);
  p.outline(P.outline);
  return p;
}

export function nodeLeaves(): Pix {
  const p = new Pix(32, 32);
  const r = rng(77);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(r() * 24) + 3;
    const y = Math.floor(r() * 18) + 8;
    const c = [P.grass, P.mustard, P.orange, P.sage][Math.floor(r() * 4)];
    p.rect(x, y, 4, 3, c); p.set(x + 1, y - 1, c); p.set(x + 2, y + 3, darken(c, 0.3));
  }
  p.outline(P.outline);
  return p;
}

export function nodeFiber(): Pix {
  const p = new Pix(32, 32);
  for (let i = 0; i < 7; i++) {
    const x = 5 + i * 3;
    p.vline(x, 28 - (i % 3) * 3 - 14, 30, i % 2 ? P.sageDark : P.sage);
    p.set(x + 1, 28 - (i % 3) * 3 - 15, P.sageLight);
  }
  p.rect(10, 12, 3, 5, P.mustard); p.rect(19, 9, 3, 5, P.mustard);
  p.outline(P.outline);
  return p;
}

export function nodeFlower(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 24, 12, 6, P.grassDark);
  const cols = [P.coral, P.pink, P.mustardLight, P.lilac, P.tealLight];
  const pos = [[8, 14], [16, 10], [24, 14], [12, 20], [21, 20]];
  pos.forEach(([x, y], i) => {
    p.vline(x, y + 2, y + 8, P.grassDark);
    p.disc(x, y, 3, cols[i]);
    p.set(x, y, P.amber);
  });
  p.outline(P.outline);
  return p;
}

export function nodeDust(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 24, 10, 5, P.lilacDark);
  p.ellipse(15, 22, 8, 4, P.lilac);
  p.ellipse(14, 20, 5, 2, P.lilacLight);
  [[8, 10], [20, 6], [26, 14], [12, 4]].forEach(([x, y]) => {
    p.set(x, y, P.amber); p.set(x - 1, y, P.amber, 140); p.set(x + 1, y, P.amber, 140); p.set(x, y - 1, P.amber, 140); p.set(x, y + 1, P.amber, 140);
  });
  p.outline(P.outline);
  return p;
}

export function nodeMoonFlower(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 25, 10, 5, P.sageDark);
  [[10, 14], [22, 12], [16, 18]].forEach(([x, y]) => {
    p.vline(x, y + 3, y + 9, P.sageDark);
    p.disc(x, y, 4, P.lilacLight);
    p.disc(x, y, 2, P.white);
    p.set(x, y, P.amber);
  });
  p.set(4, 6, P.white); p.set(27, 4, P.white); p.set(29, 20, P.white);
  p.outline(P.outline);
  return p;
}

export function fallenLog(): Pix {
  const p = new Pix(64, 32);
  p.rect(2, 10, 60, 14, P.woodDark);
  p.rect(2, 10, 60, 5, P.wood);
  p.disc(60, 17, 7, P.woodLight); p.disc(60, 17, 4, P.wood); p.disc(60, 17, 1, P.woodDark);
  p.rect(14, 6, 6, 4, P.grass); p.rect(38, 20, 8, 3, P.sage);
  p.outline(P.outline);
  return p;
}

export function shrine(): Pix {
  const p = new Pix(64, 64);
  p.ellipse(32, 52, 26, 9, P.stoneDark);
  p.ellipse(32, 50, 23, 7, P.stone);
  p.rect(22, 20, 20, 30, P.stone); p.rect(22, 20, 20, 3, P.stoneLight);
  p.rect(16, 14, 32, 7, P.stoneLight); p.rect(16, 14, 32, 2, P.white);
  p.disc(32, 34, 6, P.lilacDark); p.disc(32, 34, 4, P.lilac); p.disc(32, 34, 2, P.white);
  p.rect(26, 8, 12, 6, P.stone);
  p.rect(30, 4, 4, 5, P.amber);
  p.outline(P.outline);
  return p;
}

export function lamppost(): Pix {
  const p = new Pix(16, 64);
  p.rect(6, 14, 4, 46, P.grayDark);
  p.rect(3, 58, 10, 4, P.grayDark);
  p.rect(3, 2, 10, 12, P.grayDark);
  p.rect(5, 4, 6, 8, P.amber);
  p.rect(6, 5, 2, 3, P.white);
  p.outline(P.outline);
  return p;
}

export function fountainDry(): Pix {
  const p = new Pix(96, 96);
  p.ellipse(48, 70, 44, 20, P.stoneDark);
  p.ellipse(48, 68, 40, 17, P.stone);
  p.ellipse(48, 68, 32, 12, P.stoneDark);
  p.ellipse(48, 69, 30, 10, darken(P.dirt, 0.3));
  p.rect(40, 40, 16, 30, P.stone); p.rect(40, 40, 16, 3, P.stoneLight);
  p.ellipse(48, 40, 18, 7, P.stone); p.ellipse(48, 39, 15, 5, P.stoneDark);
  p.rect(45, 22, 6, 18, P.stone);
  p.rect(43, 18, 10, 5, P.stoneLight);
  p.rect(30, 62, 6, 3, P.grayLight); p.rect(60, 66, 4, 2, P.grayLight);
  p.line(52, 50, 58, 60, P.grayDark); // rachadura
  p.outline(P.outline);
  return p;
}

export function fountainFlow(frame: number): Pix {
  const p = new Pix(96, 96);
  p.ellipse(48, 70, 44, 20, P.stoneDark);
  p.ellipse(48, 68, 40, 17, P.stoneLight);
  p.ellipse(48, 68, 32, 12, P.stoneDark);
  p.ellipse(48, 69, 30, 10, P.water);
  const r = rng(10 + frame);
  for (let i = 0; i < 10; i++) {
    const x = 22 + Math.floor(r() * 52);
    const y = 63 + Math.floor(r() * 12);
    p.hline(x, x + 3, y, P.waterLight);
  }
  p.rect(40, 40, 16, 30, P.stone); p.rect(40, 40, 16, 3, P.stoneLight);
  p.ellipse(48, 40, 18, 7, P.stoneLight); p.ellipse(48, 39, 15, 5, P.water);
  p.rect(45, 22, 6, 18, P.stone);
  p.rect(43, 18, 10, 5, P.stoneLight);
  // jatos de água
  const h = frame % 2 === 0 ? 0 : 3;
  p.vline(48, 6 + h, 18, P.waterLight);
  p.line(48, 8 + h, 36, 36, P.water); p.line(48, 8 + h, 60, 36, P.water);
  p.line(47, 8 + h, 30, 62 - h, P.waterLight); p.line(49, 8 + h, 66, 62 - h, P.waterLight);
  p.set(48, 4 + h, P.white); p.set(47, 5 + h, P.white); p.set(49, 5 + h, P.white);
  p.disc(48, 26, 2, P.amber);
  p.outline(P.outline);
  return p;
}

export function signBroken(): Pix {
  const p = new Pix(32, 48);
  p.rect(14, 22, 4, 26, P.woodDark);
  p.rect(2, 6, 28, 16, P.wood);
  p.rect(2, 6, 28, 2, P.woodLight);
  p.line(20, 6, 24, 22, P.outline);
  p.erase(24, 8, 6, 14);
  for (let y = 8; y < 22; y++) p.erase(24 + (y % 3), y, 8, 1);
  p.rect(6, 10, 12, 2, P.woodDark); p.rect(6, 14, 8, 2, P.woodDark);
  p.outline(P.outline);
  return p;
}

export function signOk(): Pix {
  const p = new Pix(32, 48);
  p.rect(14, 22, 4, 26, P.woodDark);
  p.rrect(1, 4, 30, 18, P.woodLight);
  p.rect(2, 5, 28, 1, P.white);
  p.rect(5, 9, 22, 2, P.lilacDark); p.rect(5, 13, 16, 2, P.lilacDark); p.rect(5, 17, 20, 2, P.coral);
  p.set(28, 8, P.amber);
  p.outline(P.outline);
  return p;
}

// ---------------------------------------------------------------------------
// Fachadas
// ---------------------------------------------------------------------------

function roofTiles(p: Pix, x: number, y: number, w: number, h: number, base: Hex, seed: number, worn: boolean): void {
  p.rect(x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += 4) {
    p.hline(x, x + w - 1, yy, darken(base, 0.25));
    for (let xx = x + ((yy / 4) % 2 ? 4 : 0); xx < x + w; xx += 8) p.vline(xx, yy, yy + 3, darken(base, 0.18));
  }
  if (worn) {
    const r = rng(seed);
    for (let i = 0; i < 4; i++) {
      const hx = x + 8 + Math.floor(r() * (w - 24));
      const hy = y + 4 + Math.floor(r() * (h - 12));
      p.rect(hx, hy, 8 + Math.floor(r() * 6), 5, P.woodDark);
      p.rect(hx + 1, hy + 1, 4, 3, P.brownDark);
    }
    for (let i = 0; i < 6; i++) p.rect(x + Math.floor(r() * (w - 4)), y + Math.floor(r() * (h - 3)), 3, 2, P.sageDark); // musgo
    p.rect(x + w - 30, y + 6, 10, 3, P.wood); // tábua
  }
}

export function facadeAtelier(restored: boolean): Pix {
  // 6 × 5 tiles = 192 × 160 ; a porta fica na coluna central (tiles 2 e 3), linha inferior
  const p = new Pix(192, 160);
  const plaster = restored ? P.cream : mix(P.cream, P.gray, 0.25);
  const roof = restored ? P.lilac : mix(P.lilac, P.gray, 0.35);
  // paredes
  p.rect(16, 64, 160, 88, plaster);
  p.rect(16, 64, 160, 3, P.woodDark);
  p.rect(16, 148, 160, 4, P.woodDark);
  p.rect(16, 64, 4, 88, P.wood); p.rect(172, 64, 4, 88, P.wood);
  p.rect(92, 64, 4, 88, P.wood); // viga central
  p.rect(16, 104, 160, 3, P.wood);
  // telhado
  roofTiles(p, 4, 20, 184, 44, roof, 3, !restored);
  for (let i = 0; i < 12; i++) p.hline(4 + i * 2, 188 - i * 2, 20 - i, roof);
  p.hline(0, 191, 64, P.woodDark); p.hline(0, 191, 65, P.woodDark);
  // chaminé
  p.rect(140, 4, 14, 24, P.stoneDark); p.rect(142, 6, 10, 20, P.stone);
  // porta
  p.rect(80, 112, 32, 40, P.woodDark);
  p.rect(84, 116, 24, 36, restored ? P.wood : mix(P.wood, P.gray, 0.3));
  p.rect(84, 116, 24, 2, P.woodLight);
  p.set(103, 134, P.amber); p.set(104, 134, P.amber);
  p.rect(88, 120, 16, 8, restored ? P.amber : darken(P.amber, 0.5)); // vidro da porta (brilho âmbar)
  // janelas
  p.rect(36, 112, 28, 24, P.woodDark);
  p.rect(40, 116, 20, 16, restored ? P.amber : mix(P.amber, P.gray, 0.55));
  p.rect(49, 116, 2, 16, P.woodDark); p.rect(40, 123, 20, 2, P.woodDark);
  p.rect(128, 112, 28, 24, P.woodDark);
  if (restored) {
    p.rect(132, 116, 20, 16, P.amber);
    p.rect(141, 116, 2, 16, P.woodDark); p.rect(132, 123, 20, 2, P.woodDark);
    p.rect(126, 134, 32, 4, P.wood);
    p.rect(128, 130, 6, 4, P.coral); p.rect(136, 130, 6, 4, P.pink); p.rect(144, 130, 6, 4, P.mustard);
  } else {
    p.rect(132, 116, 20, 16, darken(P.teal, 0.5));
    p.rect(130, 118, 24, 4, P.wood); p.rect(130, 126, 24, 4, P.wood); // tábuas
  }
  // placa
  if (restored) {
    p.rrect(70, 80, 52, 18, P.woodLight);
    p.rect(74, 84, 8, 10, P.coral); p.rect(77, 84, 2, 10, P.coralLight); // carretel
    p.rect(86, 86, 10, 3, P.stoneDark); p.rect(90, 86, 2, 10, P.wood); // martelo
    p.rect(100, 84, 18, 2, P.lilacDark); p.rect(100, 90, 14, 2, P.lilacDark);
  } else {
    p.rrect(70, 80, 52, 18, mix(P.wood, P.gray, 0.3));
    p.line(96, 80, 104, 98, P.outline);
    p.rect(74, 84, 8, 10, mix(P.coral, P.gray, 0.5)); p.rect(86, 86, 10, 3, P.stoneDark); p.rect(90, 86, 2, 10, P.wood);
    p.erase(104, 84, 10, 12);
    for (let y = 80; y < 98; y++) p.erase(102 + ((y * 3) % 5), y, 20, 1);
  }
  // vegetação / bagunça
  if (!restored) {
    for (let i = 0; i < 10; i++) { const x = 20 + i * 15; p.vline(x, 140, 152, P.sageDark); p.vline(x + 2, 144, 152, P.sage); }
    p.rect(150, 138, 14, 12, P.woodDark); p.rect(151, 139, 12, 10, P.wood); // caixa
    p.rect(24, 142, 10, 8, P.coralDark); p.rect(22, 146, 6, 6, P.dirtDark); // vaso caído
    p.set(100, 100, P.amber); p.set(101, 101, P.amber); // brilho âmbar
  } else {
    p.rect(20, 140, 12, 10, P.coralDark); p.rect(22, 136, 8, 5, P.pink); p.rect(21, 134, 10, 3, P.grass);
    p.rect(160, 140, 12, 10, P.coralDark); p.rect(162, 136, 8, 5, P.lilacLight); p.rect(161, 134, 10, 3, P.grass);
    p.rect(40, 140, 20, 12, P.mustardLight); p.rect(42, 142, 16, 3, P.mustard);
  }
  p.outline(P.outline);
  return p;
}

export function facadeShop(restored: boolean): Pix {
  // 5 × 4 tiles = 160 × 128; porta no tile central (col 2)
  const p = new Pix(160, 128);
  const plaster = restored ? mix(P.cream, P.pink, 0.4) : mix(P.cream, P.gray, 0.3);
  const awning = restored ? P.coral : mix(P.coral, P.gray, 0.5);
  p.rect(12, 48, 136, 72, plaster);
  p.rect(12, 48, 136, 3, P.woodDark);
  p.rect(12, 116, 136, 4, P.woodDark);
  p.rect(12, 48, 4, 72, P.wood); p.rect(144, 48, 4, 72, P.wood);
  roofTiles(p, 4, 14, 152, 34, restored ? P.teal : mix(P.teal, P.gray, 0.4), 9, !restored);
  for (let i = 0; i < 8; i++) p.hline(4 + i * 3, 156 - i * 3, 14 - i, restored ? P.teal : mix(P.teal, P.gray, 0.4));
  // toldo listrado
  for (let x = 20; x < 140; x += 8) p.rect(x, 62, 8, 10, (x / 8) % 2 ? awning : (restored ? P.white : P.grayLight));
  p.rect(20, 72, 120, 2, darken(awning, 0.3));
  if (!restored) { p.erase(100, 62, 16, 12); p.line(100, 62, 108, 74, darken(awning, 0.3)); }
  // vitrine
  p.rect(24, 80, 40, 30, P.woodDark);
  p.rect(28, 84, 32, 22, restored ? P.sky : darken(P.teal, 0.5));
  if (restored) { p.rect(32, 96, 8, 8, P.pink); p.rect(42, 94, 10, 10, P.cream); p.rect(45, 92, 4, 3, P.coral); }
  else { p.rect(26, 88, 36, 4, P.wood); p.rect(26, 98, 36, 4, P.wood); }
  p.rect(96, 80, 40, 30, P.woodDark);
  p.rect(100, 84, 32, 22, restored ? P.amber : darken(P.teal, 0.5));
  if (restored) { p.rect(104, 88, 24, 2, P.white); p.rect(104, 96, 24, 2, P.white); }
  else { p.rect(98, 86, 36, 4, P.wood); }
  // porta (tile central: x 64..96)
  p.rect(66, 84, 28, 36, P.woodDark);
  p.rect(70, 88, 20, 32, restored ? P.pinkDark : mix(P.pinkDark, P.gray, 0.4));
  p.rect(72, 92, 16, 10, restored ? P.amber : darken(P.amber, 0.6));
  p.set(86, 106, P.amber);
  if (!restored) { p.rrect(68, 100, 24, 8, P.cream); p.rect(71, 103, 18, 2, P.grayDark); } // "fechado"
  // placa cupcake
  p.rrect(56, 52, 48, 12, restored ? P.white : P.grayLight);
  p.rect(60, 55, 6, 6, restored ? P.coral : P.gray); p.rect(61, 53, 4, 3, restored ? P.pink : P.grayLight);
  p.rect(70, 56, 30, 2, P.lilacDark); p.rect(70, 60, 22, 2, P.lilacDark);
  if (!restored) { for (let i = 0; i < 6; i++) { const x = 18 + i * 22; p.vline(x, 110, 120, P.sageDark); p.vline(x + 2, 112, 120, P.sage); } }
  else { p.rect(16, 108, 12, 10, P.coralDark); p.rect(18, 104, 8, 5, P.pink); p.rect(132, 108, 12, 10, P.coralDark); p.rect(134, 104, 8, 5, P.lilacLight); }
  p.outline(P.outline);
  return p;
}

export function houseAbandoned(seed: number): Pix {
  // 4 × 3.5 tiles = 128 × 112
  const p = new Pix(128, 112);
  const r = rng(seed);
  const roofC = [P.teal, P.mustard, P.coral, P.sage][seed % 4];
  p.rect(10, 44, 108, 64, mix(P.cream, P.gray, 0.35));
  p.rect(10, 44, 108, 3, P.woodDark); p.rect(10, 104, 108, 4, P.woodDark);
  p.rect(10, 44, 4, 64, P.wood); p.rect(114, 44, 4, 64, P.wood);
  roofTiles(p, 2, 14, 124, 30, mix(roofC, P.gray, 0.45), seed, true);
  for (let i = 0; i < 8; i++) p.hline(2 + i * 3, 126 - i * 3, 14 - i, mix(roofC, P.gray, 0.45));
  p.rect(52, 72, 24, 36, P.woodDark); p.rect(56, 76, 16, 32, mix(P.wood, P.gray, 0.4));
  p.rect(22, 60, 22, 20, P.woodDark); p.rect(26, 64, 14, 12, darken(P.teal, 0.5));
  p.rect(84, 60, 22, 20, P.woodDark); p.rect(88, 64, 14, 12, darken(P.teal, 0.5));
  if (r() < 0.6) { p.rect(20, 66, 26, 4, P.wood); p.rect(20, 74, 26, 4, P.wood); }
  if (r() < 0.6) { p.rect(82, 66, 26, 4, P.wood); }
  for (let i = 0; i < 6; i++) { const x = 14 + Math.floor(r() * 100); p.vline(x, 96, 108, P.sageDark); }
  p.outline(P.outline);
  return p;
}

export function houseRestored(seed: number): Pix {
  const p = new Pix(128, 112);
  const roofC = [P.teal, P.mustard, P.coral, P.sage][seed % 4];
  p.rect(10, 44, 108, 64, P.cream);
  p.rect(10, 44, 108, 3, P.woodDark); p.rect(10, 104, 108, 4, P.woodDark);
  p.rect(10, 44, 4, 64, P.wood); p.rect(114, 44, 4, 64, P.wood);
  roofTiles(p, 2, 14, 124, 30, roofC, seed, false);
  for (let i = 0; i < 8; i++) p.hline(2 + i * 3, 126 - i * 3, 14 - i, roofC);
  p.rect(52, 72, 24, 36, P.woodDark); p.rect(56, 76, 16, 32, P.wood);
  p.rect(22, 60, 22, 20, P.woodDark); p.rect(26, 64, 14, 12, P.amber);
  p.rect(84, 60, 22, 20, P.woodDark); p.rect(88, 64, 14, 12, P.amber);
  p.rect(20, 80, 26, 4, P.wood); p.rect(22, 76, 6, 4, P.coral); p.rect(30, 76, 6, 4, P.pink); p.rect(38, 76, 6, 4, P.mustard);
  p.outline(P.outline);
  return p;
}

// ---------------------------------------------------------------------------
// Mobílias (32 × 32, vistas de cima com leve inclinação)
// ---------------------------------------------------------------------------

export function furnBed(): Pix {
  const p = new Pix(32, 32);
  p.rrect(3, 2, 26, 28, P.woodDark);
  p.rect(5, 4, 22, 24, P.cream);
  p.rect(5, 12, 22, 16, P.lilac);
  p.rect(5, 12, 22, 2, P.lilacDark);
  p.rrect(8, 5, 16, 6, P.white);
  p.rect(9, 20, 6, 1, P.lilacLight); p.rect(17, 24, 6, 1, P.lilacLight);
  p.outline(P.outline);
  return p;
}

export function furnLamp(magic = false): Pix {
  const p = new Pix(32, 32);
  p.rect(12, 26, 8, 3, P.woodDark);
  p.rect(15, 14, 2, 12, P.wood);
  p.rect(8, 6, 16, 10, magic ? P.lilacLight : P.mustardLight);
  p.rect(8, 6, 16, 2, magic ? P.lilac : P.mustard);
  p.rect(10, 15, 12, 2, magic ? P.lilac : P.mustard);
  p.set(11, 9, P.white); p.set(12, 9, P.white);
  if (magic) { p.set(4, 4, P.amber); p.set(27, 8, P.amber); p.set(6, 20, P.amber); }
  p.outline(P.outline);
  return p;
}

export function furnChair(): Pix {
  const p = new Pix(32, 32);
  p.rect(8, 4, 16, 6, P.woodDark);
  p.rect(9, 5, 14, 3, P.wood);
  p.rrect(7, 10, 18, 14, P.wood);
  p.rrect(9, 12, 14, 10, P.coral);
  p.rect(7, 24, 3, 5, P.woodDark); p.rect(22, 24, 3, 5, P.woodDark);
  p.outline(P.outline);
  return p;
}

export function furnTable(): Pix {
  const p = new Pix(32, 32);
  p.rrect(3, 6, 26, 18, P.woodDark);
  p.rrect(4, 7, 24, 16, P.woodLight);
  p.rect(6, 9, 20, 2, P.cream);
  p.rect(5, 24, 3, 5, P.woodDark); p.rect(24, 24, 3, 5, P.woodDark);
  p.disc(16, 15, 4, P.white); p.disc(16, 15, 2, P.teal); // xícara vista de cima
  p.outline(P.outline);
  return p;
}

export function furnShelf(): Pix {
  const p = new Pix(32, 32);
  p.rect(3, 2, 26, 28, P.woodDark);
  p.rect(5, 4, 22, 24, P.wood);
  p.rect(5, 12, 22, 2, P.woodDark); p.rect(5, 20, 22, 2, P.woodDark);
  p.rect(7, 6, 4, 6, P.teal); p.rect(12, 7, 3, 5, P.coral); p.rect(17, 5, 5, 7, P.lilac);
  p.rect(8, 14, 6, 6, P.mustard); p.rect(16, 15, 8, 5, P.sage);
  p.rect(7, 23, 5, 5, P.pink); p.rect(14, 24, 4, 4, P.cream);
  p.outline(P.outline);
  return p;
}

export function furnVitrine(): Pix {
  const p = new Pix(32, 32);
  p.rect(2, 2, 28, 28, P.woodDark);
  p.rect(4, 4, 24, 24, P.sky);
  p.rect(4, 14, 24, 2, P.wood); p.rect(4, 26, 24, 2, P.wood);
  p.rect(6, 8, 6, 6, P.pink); p.rect(7, 6, 4, 2, P.coral);
  p.rect(14, 9, 6, 5, P.cream); p.rect(15, 7, 4, 2, P.mustard);
  p.rect(22, 8, 4, 6, P.lilac);
  p.rect(6, 19, 8, 7, P.coralLight); p.rect(16, 20, 10, 6, P.mustardLight);
  p.rect(5, 5, 2, 8, P.white);
  p.outline(P.outline);
  return p;
}

export function furnBench(): Pix {
  const p = new Pix(32, 32);
  p.rect(2, 10, 28, 8, P.wood); p.rect(2, 10, 28, 2, P.woodLight);
  p.rect(2, 20, 28, 5, P.wood);
  p.rect(4, 25, 3, 5, P.woodDark); p.rect(25, 25, 3, 5, P.woodDark);
  p.rect(4, 18, 3, 2, P.woodDark); p.rect(25, 18, 3, 2, P.woodDark);
  p.outline(P.outline);
  return p;
}

export function furnVase(magic = false): Pix {
  const p = new Pix(32, 32);
  p.rrect(10, 18, 12, 12, magic ? P.lilacDark : P.coralDark);
  p.rect(11, 19, 10, 3, magic ? P.lilac : P.coral);
  const cols = magic ? [P.lilacLight, P.white, P.lilacLight] : [P.coral, P.mustardLight, P.pink];
  [[9, 10], [16, 6], [23, 10]].forEach(([x, y], i) => {
    p.vline(x, y + 2, 18, P.grassDark);
    p.disc(x, y, 3, cols[i]); p.set(x, y, P.amber);
  });
  if (magic) { p.set(5, 5, P.amber); p.set(27, 3, P.amber); }
  p.outline(P.outline);
  return p;
}

export function furnRug(): Pix {
  const p = new Pix(32, 32);
  p.rrect(1, 3, 30, 26, P.coralDark);
  p.rrect(3, 5, 26, 22, P.coral);
  p.rrect(6, 8, 20, 16, P.mustardLight);
  p.rrect(9, 11, 14, 10, P.coral);
  p.rect(12, 14, 8, 4, P.cream);
  p.outline(P.outline);
  return p;
}

export function furnCushion(): Pix {
  const p = new Pix(32, 32);
  p.rrect(6, 8, 20, 18, P.tealDark);
  p.rrect(8, 10, 16, 14, P.teal);
  p.rrect(11, 13, 10, 8, P.tealLight);
  p.set(15, 16, P.white); p.set(16, 16, P.white);
  p.outline(P.outline);
  return p;
}

export function furnCurtain(): Pix {
  const p = new Pix(32, 32);
  p.rect(2, 2, 28, 3, P.woodDark);
  for (let x = 4; x < 28; x += 4) { p.rect(x, 5, 3, 24, (x / 4) % 2 ? P.sage : P.sageLight); }
  p.rect(4, 16, 24, 2, P.sageDark);
  p.rect(12, 16, 8, 3, P.mustard);
  p.outline(P.outline);
  return p;
}

export function furnPainting(): Pix {
  const p = new Pix(32, 32);
  p.rect(3, 4, 26, 24, P.mustardDark);
  p.rect(5, 6, 22, 20, P.sky);
  p.rect(5, 16, 22, 10, P.sage);
  p.rect(9, 12, 10, 10, P.lilac); p.rect(9, 10, 10, 3, P.lilacDark);
  p.disc(22, 10, 2, P.amber);
  p.rect(5, 6, 22, 1, P.mustardLight);
  p.outline(P.outline);
  return p;
}

export function furnStool(): Pix {
  const p = new Pix(32, 32);
  p.ellipse(16, 14, 9, 5, P.woodDark); p.ellipse(16, 13, 8, 4, P.woodLight);
  p.rect(9, 17, 3, 10, P.woodDark); p.rect(20, 17, 3, 10, P.woodDark); p.rect(15, 18, 2, 10, P.woodDark);
  p.outline(P.outline);
  return p;
}

// ---------------------------------------------------------------------------
// Ícones de itens (16 × 16)
// ---------------------------------------------------------------------------

export function iconMadeira(): Pix { const p = new Pix(16, 16); p.rect(2, 6, 12, 5, P.wood); p.rect(2, 6, 12, 2, P.woodLight); p.disc(13, 8, 2, P.woodLight); p.rect(3, 10, 10, 2, P.woodDark); p.outline(P.outline); return p; }
export function iconPedra(): Pix { const p = new Pix(16, 16); p.ellipse(8, 9, 6, 5, P.stone); p.ellipse(6, 7, 3, 2, P.stoneLight); p.outline(P.outline); return p; }
export function iconFolhas(): Pix { const p = new Pix(16, 16); p.ellipse(8, 8, 6, 4, P.grass); p.line(3, 11, 13, 5, P.grassDark); p.set(12, 4, P.grassLight); p.outline(P.outline); return p; }
export function iconFibra(): Pix { const p = new Pix(16, 16); for (let i = 0; i < 4; i++) p.vline(4 + i * 3, 3 + (i % 2), 13, i % 2 ? P.sage : P.sageDark); p.rect(3, 9, 10, 2, P.mustard); p.outline(P.outline); return p; }
export function iconFlor(): Pix { const p = new Pix(16, 16); p.vline(8, 9, 14, P.grassDark); p.disc(8, 6, 4, P.coral); p.disc(8, 6, 1, P.amber); p.set(4, 12, P.grass); p.outline(P.outline); return p; }
export function iconPo(): Pix { const p = new Pix(16, 16); p.rrect(4, 5, 8, 9, P.lilac); p.rect(5, 6, 6, 2, P.lilacLight); p.set(3, 3, P.amber); p.set(12, 2, P.amber); p.set(13, 6, P.amber); p.outline(P.outline); return p; }
export function iconFlorLua(): Pix { const p = new Pix(16, 16); p.vline(8, 9, 14, P.sageDark); p.disc(8, 6, 4, P.lilacLight); p.disc(8, 6, 2, P.white); p.set(8, 6, P.amber); p.set(2, 3, P.white); p.outline(P.outline); return p; }
export function iconTinta(): Pix { const p = new Pix(16, 16); p.rrect(4, 4, 8, 10, P.lilac); p.rect(5, 2, 6, 3, P.grayDark); p.rect(5, 8, 6, 4, P.lilacLight); p.set(7, 9, P.amber); p.outline(P.outline); return p; }
export function iconFragmento(): Pix { const p = new Pix(16, 16); p.triangle(8, 2, 6, P.amber); p.rect(5, 8, 6, 3, P.amber); p.triangle(8, 11, 1, P.amberDark); p.set(8, 5, P.white); p.set(1, 2, P.white); p.set(14, 4, P.white); p.set(13, 13, P.white); p.outline(P.outline); return p; }
export function iconFoto(): Pix { return photo(); }
export function iconCarta(): Pix { const p = new Pix(16, 16); p.rect(2, 4, 12, 9, P.cream); p.line(2, 4, 8, 9, P.creamDark); p.line(14, 4, 8, 9, P.creamDark); p.set(8, 10, P.coral); p.outline(P.outline); return p; }

// ---------------------------------------------------------------------------
// Ícones de UI (24 × 24)
// ---------------------------------------------------------------------------

export function uiBag(): Pix { const p = new Pix(24, 24); p.rrect(4, 8, 16, 13, P.brown); p.rect(5, 9, 14, 3, P.caramel); p.rect(9, 4, 6, 5, P.brownDark); p.erase(10, 5, 4, 3); p.rect(10, 13, 4, 3, P.amber); p.outline(P.outline); return p; }
export function uiBook(): Pix { const p = new Pix(24, 24); p.rrect(3, 4, 18, 16, P.lilacDark); p.rect(5, 6, 14, 12, P.lilac); p.rect(11, 6, 2, 12, P.lilacDark); p.rect(6, 8, 4, 2, P.amber); p.rect(14, 8, 4, 2, P.amber); p.outline(P.outline); return p; }
export function uiMap(): Pix { const p = new Pix(24, 24); p.rect(3, 4, 18, 16, P.cream); p.rect(3, 4, 6, 16, P.creamDark); p.rect(15, 4, 6, 16, P.creamDark); p.line(6, 16, 17, 7, P.coral); p.disc(17, 7, 2, P.coral); p.outline(P.outline); return p; }
export function uiHand(): Pix { const p = new Pix(24, 24); p.rrect(7, 8, 10, 12, P.fur); p.rect(7, 4, 2, 6, P.fur); p.rect(10, 3, 2, 7, P.fur); p.rect(13, 3, 2, 7, P.fur); p.rect(16, 5, 2, 5, P.fur); p.rect(4, 11, 4, 3, P.fur); p.outline(P.outline); return p; }
export function uiRun(): Pix { const p = new Pix(24, 24); p.line(4, 8, 12, 8, P.amber); p.line(3, 12, 13, 12, P.amber); p.line(5, 16, 11, 16, P.amber); p.rrect(13, 6, 8, 12, P.coral); p.outline(P.outline); return p; }
export function uiDecor(): Pix { const p = new Pix(24, 24); p.rrect(4, 10, 16, 10, P.coral); p.rect(6, 12, 12, 6, P.mustardLight); p.rect(4, 5, 4, 5, P.woodDark); p.rect(16, 5, 4, 5, P.woodDark); p.rect(4, 8, 16, 3, P.wood); p.outline(P.outline); return p; }
export function uiRotate(): Pix { const p = new Pix(24, 24); for (let a = 0; a < 270; a += 6) { const r = (a * Math.PI) / 180; p.set(Math.round(12 + 7 * Math.cos(r)), Math.round(12 + 7 * Math.sin(r)), P.white); } p.triangle(12, 2, 5, P.white); p.outline(P.outline); return p; }
export function uiClose(): Pix { const p = new Pix(24, 24); p.line(6, 6, 18, 18, P.white); p.line(7, 6, 19, 18, P.white); p.line(18, 6, 6, 18, P.white); p.line(19, 6, 7, 18, P.white); p.outline(P.outline); return p; }
export function uiPickup(): Pix { const p = new Pix(24, 24); p.rrect(6, 12, 12, 8, P.wood); p.triangle(12, 3, 5, P.white); p.rect(11, 7, 2, 5, P.white); p.outline(P.outline); return p; }
export function uiCheck(): Pix { const p = new Pix(24, 24); p.line(5, 12, 10, 17, P.green); p.line(6, 12, 11, 17, P.green); p.line(10, 17, 19, 7, P.green); p.line(11, 17, 20, 7, P.green); p.outline(P.outline); return p; }

// ---------------------------------------------------------------------------
// Marcadores e efeitos
// ---------------------------------------------------------------------------

export function markerExclaim(): Pix { const p = new Pix(16, 16); p.rect(6, 2, 4, 8, P.amber); p.rect(6, 12, 4, 3, P.amber); p.outline(P.outline); return p; }
export function sparkle(frame: number): Pix {
  const p = new Pix(12, 12);
  const r = frame === 0 ? 5 : 3;
  p.vline(6, 6 - r, 6 + r, P.white); p.hline(6 - r, 6 + r, 6, P.white);
  p.set(5, 5, P.amber); p.set(7, 7, P.amber); p.set(5, 7, P.amber); p.set(7, 5, P.amber);
  return p;
}
export function heart(): Pix { const p = new Pix(12, 12); p.disc(4, 4, 2, P.coral); p.disc(8, 4, 2, P.coral); p.triangle(6, 5, 1, P.coral); p.rect(2, 5, 8, 2, P.coral); p.rect(4, 7, 4, 2, P.coral); p.set(6, 9, P.coral); p.outline(P.outline); return p; }
export function shadow(): Pix { const p = new Pix(24, 10); p.ellipse(12, 5, 10, 4, P.black, 70); return p; }
export function cursorTile(): Pix { const p = new Pix(32, 32); p.box(0, 0, 32, 32, P.white); p.box(1, 1, 30, 30, P.amber); return p; }
export function cursorTileBad(): Pix { const p = new Pix(32, 32); p.box(0, 0, 32, 32, P.white); p.box(1, 1, 30, 30, P.red); return p; }
export function fragmentBig(): Pix { const p = new Pix(24, 32); p.triangle(12, 2, 12, P.amber); p.rect(6, 14, 12, 8, P.amber); p.triangle(12, 28, 1, P.amberDark); for (let y = 22; y < 28; y++) p.hline(6 + (y - 22), 18 - (y - 22), y, P.amber); p.rect(9, 8, 2, 10, P.white); p.outline(P.outline); return p; }
export function letter(): Pix { const p = new Pix(24, 18); p.rect(2, 3, 20, 13, P.cream); p.line(2, 3, 12, 10, P.creamDark); p.line(22, 3, 12, 10, P.creamDark); p.rect(11, 10, 3, 3, P.coral); p.outline(P.outline); return p; }

// ---------------------------------------------------------------------------
// Escritório (cinemática)
// ---------------------------------------------------------------------------

export function officeDesk(): Pix {
  const p = new Pix(64, 48);
  p.rect(2, 14, 60, 8, '#8d94a3'); p.rect(2, 14, 60, 2, '#a7aebb');
  p.rect(4, 22, 4, 24, '#6f7787'); p.rect(56, 22, 4, 24, '#6f7787');
  p.rect(20, 0, 24, 16, '#4a5060'); p.rect(22, 2, 20, 12, '#7fb2d6'); p.rect(30, 16, 4, 3, '#4a5060');
  p.rect(24, 4, 16, 2, '#bcd9ec'); p.rect(24, 8, 10, 1, '#bcd9ec'); p.rect(24, 10, 12, 1, '#bcd9ec');
  p.rect(8, 8, 10, 6, '#c9c9c9'); p.rect(48, 10, 8, 4, '#e0d8a0');
  p.outline('#2b2f3a');
  return p;
}
export function officeChair(): Pix { const p = new Pix(32, 40); p.rrect(6, 2, 20, 18, '#3c4150'); p.rect(8, 4, 16, 14, '#4d5364'); p.rect(14, 20, 4, 10, '#5b6270'); p.rect(6, 30, 20, 3, '#5b6270'); p.outline('#2b2f3a'); return p; }
export function officeWindow(): Pix {
  const p = new Pix(96, 64);
  p.rect(0, 0, 96, 64, '#5b6270');
  p.rect(4, 4, 88, 56, '#8fa3bd');
  const r = rng(5);
  for (let i = 0; i < 9; i++) { const h = 16 + Math.floor(r() * 30); const x = 6 + i * 10; p.rect(x, 60 - h, 8, h, '#5f6b80'); for (let y = 62 - h; y < 58; y += 4) p.set(x + 2 + ((y / 4) % 2) * 3, y, '#c8d4e6'); }
  p.rect(47, 4, 2, 56, '#5b6270'); p.rect(4, 31, 88, 2, '#5b6270');
  return p;
}
export function officePlant(): Pix { const p = new Pix(24, 32); p.rect(8, 22, 8, 8, '#7a7f8a'); p.ellipse(12, 14, 8, 8, '#6c7a6a'); p.ellipse(10, 10, 4, 3, '#7f8f7c'); p.outline('#2b2f3a'); return p; }
export function busSide(): Pix {
  const p = new Pix(96, 48);
  p.rrect(4, 8, 88, 30, P.mustard);
  p.rect(4, 8, 88, 12, P.mustardLight);
  for (let i = 0; i < 5; i++) p.rect(10 + i * 16, 12, 12, 10, P.sky);
  p.rect(4, 30, 88, 6, P.mustardDark);
  p.disc(20, 40, 6, P.outline); p.disc(76, 40, 6, P.outline); p.disc(20, 40, 2, P.grayLight); p.disc(76, 40, 2, P.grayLight);
  p.outline(P.outline);
  return p;
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
  furn_cama: furnBed, furn_luminaria: () => furnLamp(false), furn_luminaria_encantada: () => furnLamp(true), furn_cadeira: furnChair,
  furn_mesa_cha: furnTable, furn_prateleira: furnShelf, furn_vitrine: furnVitrine, furn_banco: furnBench,
  furn_vaso_flores: () => furnVase(false), furn_vaso_encantado: () => furnVase(true), furn_tapete: furnRug, furn_almofada: furnCushion,
  furn_cortina: furnCurtain, furn_quadro: furnPainting, furn_banquinho: furnStool,
  icon_madeira: iconMadeira, icon_pedra: iconPedra, icon_folhas: iconFolhas, icon_fibra: iconFibra, icon_flor: iconFlor, icon_po_encanto: iconPo,
  icon_flor_lua: iconFlorLua, icon_tinta: iconTinta, icon_fragmento: iconFragmento, icon_foto: iconFoto, icon_carta: iconCarta,
  ui_bag: uiBag, ui_book: uiBook, ui_map: uiMap, ui_hand: uiHand, ui_run: uiRun, ui_decor: uiDecor, ui_rotate: uiRotate, ui_close: uiClose, ui_pickup: uiPickup, ui_check: uiCheck,
  markerExclaim, sparkle0: () => sparkle(0), sparkle1: () => sparkle(1), heart, shadow, cursorTile, cursorTileBad, fragmentBig, letter,
  officeDesk, officeChair, officeWindow, officePlant, busSide,
};

/** Objetos que NÃO recebem a variante desbotada (UI, ícones, efeitos). */
export const NO_FADE_PREFIXES = ['icon_', 'ui_', 'marker', 'sparkle', 'heart', 'shadow', 'cursor', 'fragment', 'letter', 'office', 'bus', 'photo'];

/** Miniatura de praça e mapa (para a tela do mapa). */
export function mapThumb(kind: 'atelier' | 'praca' | 'floresta' | 'loja'): Pix {
  const p = new Pix(48, 40);
  if (kind === 'floresta') { p.blit(tileGrass(1), 0, 0); p.blit(tileGrass(2), 32, 0); p.blit(tileGrass(3), 0, 32); p.disc(12, 14, 7, P.grassDark); p.disc(30, 20, 8, P.grassDark); p.disc(40, 10, 5, P.grassDark); }
  else if (kind === 'praca') { p.blit(tileCobble(1), 0, 0); p.blit(tileCobble(2), 32, 0); p.blit(tileCobble(3), 0, 32); p.disc(24, 20, 9, P.stoneLight); p.disc(24, 20, 5, P.water); }
  else if (kind === 'atelier') { p.rect(0, 0, 48, 40, P.grass); p.rect(8, 12, 32, 24, P.cream); p.rect(4, 4, 40, 10, P.lilac); p.rect(20, 24, 8, 12, P.woodDark); }
  else { p.rect(0, 0, 48, 40, P.grass); p.rect(8, 12, 32, 24, mix(P.cream, P.pink, 0.4)); p.rect(4, 4, 40, 10, P.teal); p.rect(20, 24, 8, 12, P.pinkDark); p.rect(10, 16, 28, 4, P.coral); }
  p.outline(P.outline);
  return p;
}
