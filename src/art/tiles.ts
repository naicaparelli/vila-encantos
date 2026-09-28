import { P, darken, lighten, mix } from './palette';
import { Pix, rng } from './pix';
import { TILE } from '../config';

/** Desenha os tiles de 32 px usados nos mapas. Cada função devolve um Pix. */

function speckle(p: Pix, seed: number, colors: string[], density: number): void {
  const r = rng(seed);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++)
      if (r() < density) p.set(x, y, colors[Math.floor(r() * colors.length)]);
}

export function tileGrass(seed = 1): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.grass);
  speckle(p, seed, [P.grassDark, P.grassLight, P.grassDark], 0.09);
  const r = rng(seed + 7);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * 30);
    const y = Math.floor(r() * 28) + 2;
    p.set(x, y, P.grassDark); p.set(x + 1, y - 1, P.grassDark); p.set(x + 2, y, P.grassDark);
  }
  return p;
}

export function tileTallGrass(seed = 2): Pix {
  const p = tileGrass(seed);
  const r = rng(seed + 99);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * 30) + 1;
    const y = Math.floor(r() * 22) + 8;
    p.vline(x, y - 5, y, P.grassDark);
    p.vline(x + 1, y - 3, y, P.grassLight);
    p.set(x, y - 6, P.sageDark);
  }
  return p;
}

export function tileFlowers(seed = 3): Pix {
  const p = tileGrass(seed);
  const r = rng(seed + 31);
  const cols = [P.coral, P.pink, P.mustardLight, P.lilacLight, P.white];
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * 28) + 2;
    const y = Math.floor(r() * 28) + 2;
    const c = cols[Math.floor(r() * cols.length)];
    p.set(x, y, c); p.set(x + 1, y, c); p.set(x, y + 1, c); p.set(x + 1, y + 1, c);
    p.set(x + 1, y + 2, P.grassDark);
  }
  return p;
}

export function tilePath(seed = 4): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.dirt);
  speckle(p, seed, [P.dirtDark, P.dirtLight], 0.08);
  const r = rng(seed + 5);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * 28) + 1;
    const y = Math.floor(r() * 28) + 1;
    p.rect(x, y, 3, 2, P.dirtDark);
    p.rect(x, y, 2, 1, P.dirtLight);
  }
  return p;
}

export function tileCobble(seed = 5): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.stoneDark);
  const r = rng(seed);
  for (let gy = 0; gy < 4; gy++) {
    const off = gy % 2 === 0 ? 0 : 4;
    for (let gx = -1; gx < 5; gx++) {
      const x = gx * 8 + off;
      const y = gy * 8;
      const c = r() < 0.3 ? P.stoneLight : P.stone;
      p.rrect(x + 1, y + 1, 7, 7, c);
      p.set(x + 2, y + 2, lighten(c, 0.3));
    }
  }
  return p;
}

export function tileWater(frame = 0, seed = 6): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.water);
  const r = rng(seed);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * 24);
    const y = (Math.floor(r() * 28) + frame * 3) % 32;
    p.hline(x, x + 5, y, P.waterLight);
    p.hline(x + 2, x + 8, y + 1, P.waterDark);
  }
  return p;
}

export function tileVoid(): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.black);
  return p;
}

export function tileFenceH(): Pix {
  const p = tileGrass(11);
  p.rect(0, 12, TILE, 3, P.woodLight);
  p.rect(0, 20, TILE, 3, P.woodLight);
  p.rect(0, 15, TILE, 1, P.woodDark);
  p.rect(0, 23, TILE, 1, P.woodDark);
  p.rect(6, 8, 4, 18, P.wood);
  p.rect(22, 8, 4, 18, P.wood);
  p.rect(6, 8, 4, 1, P.woodLight);
  p.rect(22, 8, 4, 1, P.woodLight);
  p.rect(6, 25, 4, 1, P.woodDark);
  p.rect(22, 25, 4, 1, P.woodDark);
  return p;
}

export function tileFenceV(): Pix {
  const p = tileGrass(12);
  p.rect(13, 0, 3, TILE, P.woodLight);
  p.rect(16, 0, 1, TILE, P.woodDark);
  p.rect(11, 4, 8, 4, P.wood);
  p.rect(11, 20, 8, 4, P.wood);
  return p;
}

export function tileFloorWood(seed = 20): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.wood);
  const r = rng(seed);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    p.hline(0, TILE - 1, y, P.woodDark);
    const split = Math.floor(r() * 24) + 4;
    p.vline(split, y, y + 7, P.woodDark);
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 30);
      p.hline(x, x + 3, y + 2 + Math.floor(r() * 5), P.woodLight);
    }
  }
  return p;
}

export function tileFloorShop(seed = 21): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.cream);
  p.rect(16, 0, 16, 16, P.pink);
  p.rect(0, 16, 16, 16, P.pink);
  p.hline(0, 31, 0, P.creamDark);
  p.vline(0, 0, 31, P.creamDark);
  p.hline(0, 31, 16, P.creamDark);
  p.vline(16, 0, 31, P.creamDark);
  const r = rng(seed);
  for (let i = 0; i < 4; i++) p.set(Math.floor(r() * 32), Math.floor(r() * 32), P.creamLight);
  return p;
}

export function tileWallTop(): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, darken(P.woodDark, 0.5));
  p.hline(0, 31, 31, P.outline);
  return p;
}

export function tileWall(seed = 30): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, P.cream);
  speckle(p, seed, [P.creamDark, P.creamLight], 0.05);
  p.rect(0, 0, TILE, 3, P.woodDark);
  p.rect(0, 3, TILE, 1, P.wood);
  p.rect(0, 27, TILE, 5, P.wood);
  p.rect(0, 27, TILE, 1, P.woodLight);
  p.rect(0, 31, TILE, 1, P.woodDark);
  return p;
}

export function tileWallShop(seed = 31): Pix {
  const p = tileWall(seed);
  p.rect(0, 4, TILE, 23, mix(P.cream, P.pink, 0.35));
  const r = rng(seed);
  for (let i = 0; i < 5; i++) p.set(Math.floor(r() * 32), 4 + Math.floor(r() * 22), P.pink);
  p.rect(0, 14, TILE, 2, P.pinkDark);
  return p;
}

export function tileRock(seed = 40): Pix {
  const p = tileGrass(seed);
  p.ellipse(16, 18, 11, 8, P.stoneDark);
  p.ellipse(15, 16, 10, 7, P.stone);
  p.ellipse(13, 14, 5, 3, P.stoneLight);
  return p;
}

export function tileOffice(seed = 50): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, '#6f7787');
  p.hline(0, 31, 0, '#5b6270');
  p.vline(0, 0, 31, '#5b6270');
  speckle(p, seed, ['#7a8292', '#656c7a'], 0.05);
  return p;
}

export function tileOfficeWall(): Pix {
  const p = new Pix(TILE, TILE);
  p.rect(0, 0, TILE, TILE, '#9aa3b2');
  p.rect(0, 0, TILE, 4, '#7c8595');
  p.rect(0, 26, TILE, 6, '#7c8595');
  return p;
}

export function tileDoorMat(base: Pix): Pix {
  const p = new Pix(TILE, TILE);
  p.blit(base, 0, 0);
  p.rrect(4, 6, 24, 20, P.coralDark);
  p.rrect(6, 8, 20, 16, P.coral);
  p.hline(9, 22, 12, P.coralLight);
  p.hline(9, 22, 19, P.coralLight);
  return p;
}

/** Catálogo: id → gerador. Alguns tiles têm variantes (frames) para animação. */
export const TILE_GENERATORS: Record<string, () => Pix> = {
  grass: () => tileGrass(1),
  grass2: () => tileGrass(2),
  grass3: () => tileGrass(3),
  tallgrass: () => tileTallGrass(4),
  flowers: () => tileFlowers(5),
  path: () => tilePath(6),
  path2: () => tilePath(7),
  cobble: () => tileCobble(8),
  water0: () => tileWater(0),
  water1: () => tileWater(1),
  water2: () => tileWater(2),
  void: () => tileVoid(),
  fenceH: () => tileFenceH(),
  fenceV: () => tileFenceV(),
  floor: () => tileFloorWood(20),
  floor2: () => tileFloorWood(21),
  floorShop: () => tileFloorShop(),
  wallTop: () => tileWallTop(),
  wall: () => tileWall(30),
  wallShop: () => tileWallShop(31),
  rock: () => tileRock(40),
  office: () => tileOffice(),
  officeWall: () => tileOfficeWall(),
  matWood: () => tileDoorMat(tileFloorWood(22)),
  matShop: () => tileDoorMat(tileFloorShop(23)),
  matPath: () => tileDoorMat(tilePath(9)),
};
