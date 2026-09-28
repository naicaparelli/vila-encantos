import { P, darken, lighten, mix, type Hex } from './palette';
import { Pix, rng, DITHER } from './pix';
import { TILE } from '../config';

/**
 * Tiles de 32 px usados nos mapas. Cada função devolve um Pix.
 * Os tiles de terreno são desenhados com `wrap = true`: manchas e tufos que
 * atravessam a borda continuam do outro lado, então não há emendas na grade.
 */

const T = TILE;
const GRASS_MID = mix(P.grass, P.grassDark, 0.45);
const GRASS_HI = mix(P.grass, P.grassLight, 0.55);
const DIRT_MID = mix(P.dirt, P.dirtDark, 0.45);
const WATER_MID = mix(P.water, P.waterDark, 0.5);

function base(color: Hex): Pix {
  const p = new Pix(T, T);
  p.wrap = true;
  p.rect(0, 0, T, T, color);
  return p;
}

function speckle(p: Pix, seed: number, colors: string[], density: number): void {
  const r = rng(seed);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++)
      if (r() < density) p.set(x, y, colors[Math.floor(r() * colors.length)]);
}

/** Manchas orgânicas com borda em dithering (atravessam a borda do tile). */
function blobs(p: Pix, r: () => number, n: number, rMin: number, rMax: number, color: Hex): void {
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(r() * T);
    const cy = Math.floor(r() * T);
    const rad = rMin + Math.floor(r() * (rMax - rMin + 1));
    p.discSoft(cx, cy, rad, color);
  }
}

function tuft(p: Pix, x: number, y: number, dark: Hex, light: Hex, kind: number): void {
  if (kind === 0) {
    // três folhas
    p.set(x, y, dark); p.set(x, y - 1, dark); p.set(x - 1, y - 2, dark); p.set(x + 1, y - 2, dark); p.set(x, y - 2, light);
  } else if (kind === 1) {
    // duas folhas inclinadas
    p.set(x, y, dark); p.set(x + 1, y - 1, dark); p.set(x + 2, y - 2, light); p.set(x - 1, y - 1, dark);
  } else {
    // pequeno "v"
    p.set(x - 1, y - 1, dark); p.set(x + 1, y - 1, dark); p.set(x, y, dark); p.set(x, y - 2, light, 200);
  }
}

// ---------------------------------------------------------------------------
// Terreno externo
// ---------------------------------------------------------------------------

export function tileGrass(seed = 1): Pix {
  const p = base(P.grass);
  const r = rng(seed);
  blobs(p, r, 3, 3, 6, GRASS_MID);
  blobs(p, r, 2, 2, 4, GRASS_HI);
  speckle(p, seed + 1, [GRASS_MID, GRASS_HI, P.grassDark], 0.035);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    tuft(p, x, y, r() < 0.7 ? P.grassDark : GRASS_MID, r() < 0.5 ? P.grassLight : GRASS_HI, Math.floor(r() * 3));
  }
  // um detalhe raro: florzinha ou pedrinha
  if (r() < 0.5) {
    const x = Math.floor(r() * T); const y = Math.floor(r() * T);
    if (r() < 0.6) { p.set(x, y, r() < 0.5 ? P.white : P.pink); p.set(x, y + 1, P.grassDark); }
    else { p.set(x, y, P.stoneLight); p.set(x + 1, y, P.stone); p.set(x, y + 1, P.grassDark); p.set(x + 1, y + 1, P.grassDark); }
  }
  return p;
}

export function tileTallGrass(seed = 2): Pix {
  const p = tileGrass(seed);
  const r = rng(seed + 99);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    const h = 4 + Math.floor(r() * 4);
    const c = r() < 0.4 ? P.grassDark : GRASS_MID;
    p.vline(x, y - h, y, c);
    p.vline(x + 1, y - h + 2, y, r() < 0.5 ? P.grassLight : GRASS_HI);
    p.set(x + (r() < 0.5 ? -1 : 2), y - h + 1, c);
    p.set(x, y - h - 1, P.sageDark);
    if (r() < 0.3) p.set(x + 1, y - h, P.mustardLight); // espiga
  }
  return p;
}

export function tileFlowers(seed = 3): Pix {
  const p = tileGrass(seed);
  const r = rng(seed + 31);
  const cols = [P.coral, P.pink, P.mustardLight, P.lilacLight, P.white, P.coralLight];
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    const c = cols[Math.floor(r() * cols.length)];
    if (r() < 0.6) {
      // flor em cruz com miolo
      p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c);
      p.set(x, y, P.amber);
      p.set(x, y + 2, P.grassDark); p.set(x + 1, y + 2, P.grassDark);
    } else {
      p.set(x, y, c); p.set(x + 1, y, lighten(c, 0.3)); p.set(x, y + 1, darken(c, 0.15)); p.set(x + 1, y + 1, c);
      p.set(x, y + 2, P.grassDark);
    }
  }
  return p;
}

export function tilePath(seed = 4): Pix {
  const p = base(P.dirt);
  const r = rng(seed);
  blobs(p, r, 3, 3, 6, DIRT_MID);
  blobs(p, r, 2, 2, 4, mix(P.dirt, P.dirtLight, 0.6));
  speckle(p, seed + 1, [P.dirtDark, P.dirtLight, DIRT_MID], 0.045);
  // pedrinhas com volume
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    const c = r() < 0.5 ? P.dirtLight : mix(P.stoneLight, P.dirtLight, 0.5);
    p.rect(x, y, 2, 2, c);
    p.set(x + 1, y + 1, darken(c, 0.25));
    p.set(x, y + 2, P.dirtDark); p.set(x + 1, y + 2, P.dirtDark);
  }
  // rachaduras curtas
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(r() * T); const y = Math.floor(r() * T);
    p.set(x, y, P.dirtDark); p.set(x + 1, y + 1, P.dirtDark); p.set(x + 2, y + 1, P.dirtDark); p.set(x + 3, y + 2, P.dirtDark);
  }
  return p;
}

export function tileCobble(seed = 5): Pix {
  const grout = darken(P.stoneDark, 0.25);
  const p = base(grout);
  const r = rng(seed);
  const tones = [P.stone, P.stone, mix(P.stone, P.stoneLight, 0.5), mix(P.stone, P.lilac, 0.12), mix(P.stone, P.stoneDark, 0.3)];
  for (let gy = 0; gy < 4; gy++) {
    const off = gy % 2 === 0 ? 0 : 4;
    for (let gx = 0; gx < 4; gx++) {
      const x = gx * 8 + off;
      const y = gy * 8;
      const c = tones[Math.floor(r() * tones.length)];
      const w = 7; const h = 7;
      p.rrectR(x, y, w, h, 2, c);
      p.hline(x + 1, x + w - 2, y, lighten(c, 0.25));
      p.vline(x, y + 1, y + h - 2, lighten(c, 0.15));
      p.hline(x + 1, x + w - 2, y + h - 1, darken(c, 0.25));
      p.vline(x + w - 1, y + 1, y + h - 2, darken(c, 0.18));
      if (r() < 0.2) p.set(x + 2 + Math.floor(r() * 3), y + 2 + Math.floor(r() * 3), P.sageDark); // musgo
      if (r() < 0.15) p.set(x + 1 + Math.floor(r() * 4), y + 1 + Math.floor(r() * 4), darken(c, 0.2)); // lasca
    }
  }
  return p;
}

export function tileWater(frame = 0, seed = 6): Pix {
  const p = base(P.water);
  const r = rng(seed);
  blobs(p, r, 3, 4, 7, WATER_MID);
  blobs(p, r, 2, 2, 4, mix(P.water, P.waterLight, 0.35));
  // ondulações: arcos claros com sombra por baixo, deslocando por frame
  const r2 = rng(seed + 50);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r2() * T) + frame * 2;
    const y = Math.floor(r2() * T) + (frame % 2);
    const len = 3 + Math.floor(r2() * 4);
    p.hline(x, x + len, y, P.waterLight);
    p.set(x - 1, y + 1, P.waterLight); p.set(x + len + 1, y + 1, P.waterLight);
    p.hline(x, x + len, y + 1, WATER_MID);
  }
  // reflexos brilhantes que piscam
  const r3 = rng(seed + 100 + frame);
  for (let i = 0; i < 3; i++) { const x = Math.floor(r3() * T); const y = Math.floor(r3() * T); p.set(x, y, P.white); p.set(x + 1, y, P.waterLight); }
  return p;
}

export function tileVoid(): Pix {
  const p = new Pix(T, T);
  p.rect(0, 0, T, T, P.black);
  return p;
}

function post(p: Pix, x: number, y: number, w: number, h: number): void {
  p.rect(x, y, w, h, P.wood);
  p.vline(x, y, y + h - 1, P.woodLight);
  p.vline(x + w - 1, y, y + h - 1, P.woodDark);
  p.hline(x, x + w - 1, y, P.woodLight);
  p.hline(x + 1, x + w - 1, y + h - 1, P.brownDark);
  p.hline(x, x + w - 1, y + h, P.grassDark); // sombra no chão
}

function rail(p: Pix, x0: number, x1: number, y: number): void {
  p.hline(x0, x1, y, P.woodLight);
  p.hline(x0, x1, y + 1, P.wood);
  p.hline(x0, x1, y + 2, P.woodDark);
  p.hline(x0, x1, y + 3, P.grassDark, 160);
}

export function tileFenceH(): Pix {
  const p = tileGrass(11);
  p.wrap = false;
  rail(p, 0, T - 1, 11);
  rail(p, 0, T - 1, 19);
  post(p, 5, 6, 5, 20);
  post(p, 22, 6, 5, 20);
  return p;
}

export function tileFenceV(): Pix {
  const p = tileGrass(12);
  p.wrap = false;
  p.rect(13, 0, 3, T, P.wood);
  p.vline(13, 0, T - 1, P.woodLight);
  p.vline(15, 0, T - 1, P.woodDark);
  p.vline(16, 0, T - 1, P.grassDark, 160);
  post(p, 11, 3, 7, 5);
  post(p, 11, 19, 7, 5);
  return p;
}

export function tileRock(seed = 40): Pix {
  const p = tileGrass(seed);
  p.wrap = false;
  p.ellipseBlend(16, 22, 13, 5, P.black, 70);
  p.ellipse(16, 18, 12, 8, P.stoneDark);
  p.ellipse(15, 16, 11, 7, P.stone);
  p.ellipse(13, 13, 6, 3, P.stoneLight);
  p.rectDither(6, 18, 20, 5, P.stoneDark, DITHER.checker);
  p.set(21, 15, P.stoneDark); p.set(22, 16, P.stoneDark);
  p.set(9, 19, P.sageDark); p.set(10, 20, P.sageDark);
  return p;
}

// ---------------------------------------------------------------------------
// Bordas entre terrenos (overlays por lado; N = vizinho ao norte é de outro tipo)
// ---------------------------------------------------------------------------

/** Espessura irregular da "orelha" de grama, periódica em 32 px para não gerar emendas. */
const LIP = [1, 1, 2, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 2, 1, 1];

/**
 * Margem da água (o lago fica "afundado"): orelha de grama, parede de terra e sombra
 * na água no lado norte; apenas um rebordo fino no lado sul.
 */
export function edgeWater(side: 'N' | 'S' | 'E' | 'W'): Pix {
  const p = new Pix(T, T);
  const lip = P.grassDark;
  const wall = P.dirtDark;
  const wallLit = mix(P.dirtDark, P.dirt, 0.4);
  const shade = P.waterDark;
  if (side === 'N') {
    for (let x = 0; x < T; x++) {
      const l = LIP[x];
      p.vline(x, 0, l - 1, lip);
      p.set(x, l, wallLit);
      p.vline(x, l + 1, l + 2, wall);
      p.vline(x, l + 3, l + 4, shade);
      if (DITHER.checker(x, 0)) p.set(x, l + 5, shade);
      if (DITHER.sparse(x, 0)) p.set(x, l + 6, shade);
    }
  } else if (side === 'S') {
    for (let x = 0; x < T; x++) {
      const l = LIP[(x + 9) % T];
      p.vline(x, T - l, T - 1, lip);
      p.set(x, T - l - 1, mix(P.grassDark, P.dirtDark, 0.5));
      if (DITHER.checker(x, 1)) p.set(x, T - l - 2, P.waterLight);
    }
  } else {
    for (let y = 0; y < T; y++) {
      const l = LIP[(y + 17) % T];
      const x0 = side === 'W' ? 0 : T - 1;
      const dir = side === 'W' ? 1 : -1;
      for (let i = 0; i < l; i++) p.set(x0 + dir * i, y, lip);
      p.set(x0 + dir * l, y, wall);
      p.set(x0 + dir * (l + 1), y, shade);
      if (DITHER.checker(0, y)) p.set(x0 + dir * (l + 2), y, shade);
    }
  }
  return p;
}

/** Canto interno da água (grama só na diagonal). */
export function cornerWater(corner: 'NE' | 'NW' | 'SE' | 'SW'): Pix {
  const p = new Pix(T, T);
  const size = 4;
  const ox = corner.includes('E') ? T - size : 0;
  const oy = corner.includes('S') ? T - size : 0;
  const cx = corner.includes('E') ? T - 1 : 0;
  const cy = corner.includes('S') ? T - 1 : 0;
  for (let y = oy; y < oy + size + 2; y++)
    for (let x = ox; x < ox + size + 2; x++) {
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      if (d <= 1) p.set(x, y, P.grassDark);
      else if (d === 2) p.set(x, y, P.dirtDark);
      else if (d === 3) p.set(x, y, P.waterDark);
      else if (d === 4 && DITHER.checker(x, y)) p.set(x, y, P.waterDark);
    }
  return p;
}

/** Grama avançando sobre o caminho (caminho levemente mais baixo que a grama). */
export function edgePath(side: 'N' | 'S' | 'E' | 'W'): Pix {
  const p = new Pix(T, T);
  const r = rng(side.charCodeAt(0));
  const draw = (x: number, y: number, l: number, dx: number, dy: number) => {
    for (let i = 0; i < l; i++) p.set(x + dx * i, y + dy * i, i === l - 1 && r() < 0.35 ? P.grassDark : P.grass);
    p.set(x + dx * l, y + dy * l, side === 'S' || side === 'E' ? mix(P.dirt, P.dirtLight, 0.5) : P.dirtDark);
  };
  for (let i = 0; i < T; i++) {
    const l = LIP[i] + (LIP[(i + 5) % T] === 2 ? 1 : 0);
    if (side === 'N') draw(i, 0, l, 0, 1);
    else if (side === 'S') draw(i, T - 1, l, 0, -1);
    else if (side === 'W') draw(0, i, l, 1, 0);
    else draw(T - 1, i, l, -1, 0);
  }
  return p;
}

export function cornerPath(corner: 'NE' | 'NW' | 'SE' | 'SW'): Pix {
  const p = new Pix(T, T);
  const cx = corner.includes('E') ? T - 1 : 0;
  const cy = corner.includes('S') ? T - 1 : 0;
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (d <= 2) p.set(x, y, P.grass);
      else if (d === 3) p.set(x, y, corner.startsWith('N') ? P.dirtDark : mix(P.dirt, P.dirtLight, 0.5));
    }
  return p;
}

/** Meio-fio de pedra ao redor do calçamento da praça. */
export function edgeCobble(side: 'N' | 'S' | 'E' | 'W'): Pix {
  const p = new Pix(T, T);
  const rows: Hex[] = side === 'S'
    ? [darken(P.stoneDark, 0.2), P.stoneDark, P.stone, P.stoneLight]
    : [P.stoneLight, P.stone, P.stoneDark, darken(P.stoneDark, 0.3)];
  for (let i = 0; i < T; i++) {
    rows.forEach((c, k) => {
      if (side === 'N') p.set(i, k, c);
      else if (side === 'S') p.set(i, T - 4 + k, c);
      else if (side === 'W') p.set(k, i, [P.stoneLight, P.stone, P.stoneDark, darken(P.stoneDark, 0.3)][k]);
      else p.set(T - 1 - k, i, [P.stone, P.stoneLight, P.stoneDark, darken(P.stoneDark, 0.3)][k]);
    });
    // juntas das pedras do meio-fio
    if (i % 8 === 3) {
      if (side === 'N') p.vline(i, 0, 2, P.stoneDark);
      else if (side === 'S') p.vline(i, T - 3, T - 1, P.stoneDark);
      else if (side === 'W') p.hline(0, 2, i, P.stoneDark);
      else p.hline(T - 3, T - 1, i, P.stoneDark);
    }
  }
  return p;
}

// ---------------------------------------------------------------------------
// Interiores
// ---------------------------------------------------------------------------

export function tileFloorWood(seed = 20): Pix {
  const p = new Pix(T, T);
  const r = rng(seed);
  const tones = [P.wood, mix(P.wood, P.woodLight, 0.18), mix(P.wood, P.woodDark, 0.18), P.wood];
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    const split = 6 + Math.floor(r() * 20);
    const c1 = tones[Math.floor(r() * tones.length)];
    const c2 = tones[Math.floor(r() * tones.length)];
    p.rect(0, y, split, 8, c1);
    p.rect(split, y, T - split, 8, c2);
    p.hline(0, T - 1, y, lighten(c1, 0.12));
    p.hline(0, T - 1, y + 7, P.woodDark);
    p.vline(split - 1, y, y + 7, P.woodDark);
    p.vline(split, y + 1, y + 6, lighten(c2, 0.12));
    // veios
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 28);
      const yy = y + 2 + Math.floor(r() * 4);
      p.hline(x, x + 2 + Math.floor(r() * 4), yy, darken(r() < 0.5 ? c1 : c2, 0.12));
    }
    // pregos junto às juntas
    p.set(split - 3, y + 3, P.brownDark); p.set(split + 2, y + 4, P.brownDark);
  }
  return p;
}

export function tileFloorShop(seed = 21): Pix {
  const p = new Pix(T, T);
  const cream = P.cream; const pink = mix(P.pink, P.cream, 0.25);
  const cell = (x: number, y: number, c: Hex) => {
    p.rect(x, y, 16, 16, c);
    p.hline(x, x + 15, y, lighten(c, 0.35));
    p.vline(x, y, y + 15, lighten(c, 0.25));
    p.hline(x, x + 15, y + 15, darken(c, 0.18));
    p.vline(x + 15, y, y + 15, darken(c, 0.14));
  };
  cell(0, 0, cream); cell(16, 0, pink); cell(0, 16, pink); cell(16, 16, cream);
  const r = rng(seed);
  for (let i = 0; i < 5; i++) p.set(1 + Math.floor(r() * 30), 1 + Math.floor(r() * 30), r() < 0.5 ? P.creamLight : P.white, 160);
  return p;
}

export function tileWallTop(): Pix {
  const p = new Pix(T, T);
  const c = darken(P.woodDark, 0.45);
  p.rect(0, 0, T, T, c);
  for (let x = 0; x < T; x += 8) { p.vline(x, 0, T - 1, darken(c, 0.3)); p.vline(x + 1, 0, T - 1, lighten(c, 0.08)); }
  p.hline(0, T - 1, T - 1, P.outline);
  p.hline(0, T - 1, T - 2, darken(c, 0.3));
  return p;
}

function plaster(p: Pix, seed: number, color: Hex): void {
  p.rect(0, 0, T, T, color);
  speckle(p, seed, [darken(color, 0.06), lighten(color, 0.08)], 0.06);
}

export function tileWall(seed = 30): Pix {
  const p = new Pix(T, T);
  plaster(p, seed, P.cream);
  // viga superior com volume
  p.rect(0, 0, T, 4, P.woodDark);
  p.hline(0, T - 1, 0, P.wood);
  p.hline(0, T - 1, 4, P.brownDark);
  p.rectDither(0, 5, T, 2, P.creamDark, DITHER.checker); // sombra sob a viga
  // lambri inferior
  p.rect(0, 24, T, 8, P.wood);
  p.hline(0, T - 1, 24, P.woodLight);
  for (let x = 0; x < T; x += 8) { p.vline(x, 25, 30, P.woodDark); p.vline(x + 1, 25, 30, P.woodLight); }
  p.hline(0, T - 1, 31, P.brownDark);
  p.hline(0, T - 1, 23, P.creamDark);
  return p;
}

/** Lateral da parede (colunas esquerda/direita dos interiores): madeira escura com tábuas verticais. */
export function tileWallSide(seed = 32): Pix {
  const p = new Pix(T, T);
  const c = mix(P.woodDark, P.brownDark, 0.35);
  p.rect(0, 0, T, T, c);
  const r = rng(seed);
  for (let x = 0; x < T; x += 8) {
    p.vline(x, 0, T - 1, darken(c, 0.35));
    p.vline(x + 1, 0, T - 1, lighten(c, 0.1));
    for (let i = 0; i < 2; i++) p.set(x + 3 + Math.floor(r() * 3), Math.floor(r() * T), darken(c, 0.2));
  }
  return p;
}

export function tileWallShop(seed = 31): Pix {
  const p = tileWall(seed);
  const a = mix(P.cream, P.pink, 0.4);
  const b = mix(P.cream, P.pink, 0.18);
  for (let x = 0; x < T; x += 4) p.rect(x, 5, 4, 18, (x / 4) % 2 ? a : b);
  const r = rng(seed);
  for (let i = 0; i < 6; i++) { const x = Math.floor(r() * T); const y = 6 + Math.floor(r() * 15); p.set(x, y, P.pink); p.set(x + 1, y, P.pinkDark, 120); }
  p.rectDither(0, 5, T, 2, P.pinkDark, DITHER.checker);
  p.rect(0, 14, T, 2, P.pinkDark);
  p.hline(0, T - 1, 14, P.pink);
  return p;
}

export function tileOffice(seed = 50): Pix {
  const p = new Pix(T, T);
  p.rect(0, 0, T, T, '#6f7787');
  const r = rng(seed);
  for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 4) if (r() < 0.5) p.rect(x, y, 4, 4, '#6a7282');
  p.hline(0, 31, 0, '#5b6270');
  p.vline(0, 0, 31, '#5b6270');
  speckle(p, seed, ['#7a8292', '#656c7a'], 0.05);
  return p;
}

export function tileOfficeWall(): Pix {
  const p = new Pix(T, T);
  p.rect(0, 0, T, T, '#9aa3b2');
  p.rect(0, 0, T, 4, '#7c8595');
  p.hline(0, T - 1, 4, '#6a7282');
  p.rect(0, 26, T, 6, '#7c8595');
  p.hline(0, T - 1, 26, '#aab3c2');
  return p;
}

export function tileDoorMat(baseTile: Pix): Pix {
  const p = new Pix(T, T);
  p.blit(baseTile, 0, 0);
  p.ellipseBlend(16, 17, 13, 10, P.black, 50);
  p.rrectR(4, 6, 24, 20, 3, P.coralDark);
  p.rrectR(6, 8, 20, 16, 2, P.coral);
  p.hline(8, 23, 10, P.coralLight); p.hline(8, 23, 21, P.coralLight);
  p.vline(8, 10, 21, P.coralLight); p.vline(23, 10, 21, P.coralLight);
  p.rectDither(9, 11, 14, 10, P.coralLight, DITHER.sparse);
  p.set(15, 15, P.cream); p.set(16, 15, P.cream); p.set(15, 16, P.cream); p.set(16, 16, P.cream);
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
  wallSide: () => tileWallSide(32),
  wallShop: () => tileWallShop(31),
  rock: () => tileRock(40),
  office: () => tileOffice(),
  officeWall: () => tileOfficeWall(),
  matWood: () => tileDoorMat(tileFloorWood(22)),
  matShop: () => tileDoorMat(tileFloorShop(23)),
  matPath: () => tileDoorMat(tilePath(9)),
  edgeWaterN: () => edgeWater('N'), edgeWaterS: () => edgeWater('S'), edgeWaterE: () => edgeWater('E'), edgeWaterW: () => edgeWater('W'),
  cornerWaterNE: () => cornerWater('NE'), cornerWaterNW: () => cornerWater('NW'), cornerWaterSE: () => cornerWater('SE'), cornerWaterSW: () => cornerWater('SW'),
  edgePathN: () => edgePath('N'), edgePathS: () => edgePath('S'), edgePathE: () => edgePath('E'), edgePathW: () => edgePath('W'),
  cornerPathNE: () => cornerPath('NE'), cornerPathNW: () => cornerPath('NW'), cornerPathSE: () => cornerPath('SE'), cornerPathSW: () => cornerPath('SW'),
  edgeCobbleN: () => edgeCobble('N'), edgeCobbleS: () => edgeCobble('S'), edgeCobbleE: () => edgeCobble('E'), edgeCobbleW: () => edgeCobble('W'),
};
