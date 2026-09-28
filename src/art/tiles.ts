import { P, darken, lighten, mix, shade, type Hex } from './palette';
import { Pix, rng, DITHER } from './pix';
import { TILE } from '../config';

/**
 * Tiles de 32 px usados nos mapas. Cada função devolve um Pix.
 * Os tiles de terreno são desenhados com `wrap = true`: manchas e tufos que
 * atravessam a borda continuam do outro lado, então não há emendas na grade.
 * Sombras usam `shade()` (desvio para azul) e luzes puxam para amarelo.
 */

const T = TILE;
const GRASS_MID = shade(P.grass, -0.16);
const GRASS_HI = shade(P.grass, 0.18);
const DIRT_MID = shade(P.dirt, -0.14);
const WATER_MID = shade(P.water, -0.18);

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
  } else if (kind === 2) {
    // pequeno "v"
    p.set(x - 1, y - 1, dark); p.set(x + 1, y - 1, dark); p.set(x, y, dark); p.set(x, y - 2, light, 200);
  } else if (kind === 3) {
    // pincelada curta em arco (folha de capim deitada)
    p.set(x, y, dark); p.set(x + 1, y - 1, dark); p.set(x + 2, y - 1, dark); p.set(x + 3, y - 2, light);
  } else {
    // pincelada curta invertida
    p.set(x, y, dark); p.set(x - 1, y - 1, dark); p.set(x - 2, y - 1, dark); p.set(x - 3, y - 2, light);
  }
}

// ---------------------------------------------------------------------------
// Terreno externo
// ---------------------------------------------------------------------------

export function tileGrass(seed = 1): Pix {
  const p = base(P.grass);
  const r = rng(seed);
  // manchas grandes e suaves (variação de relevo) + manchas claras menores
  blobs(p, r, 2, 5, 9, GRASS_MID);
  blobs(p, r, 2, 2, 4, GRASS_HI);
  blobs(p, r, 1, 2, 3, shade(P.grass, -0.3));
  speckle(p, seed + 1, [GRASS_MID, GRASS_HI, P.grassDark], 0.03);
  // pinceladas de capim: muitas escuras curtas, poucas claras (como na referência)
  for (let i = 0; i < 11; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    const dark = r() < 0.75 ? P.grassDark : shade(P.grass, -0.4);
    const light = r() < 0.5 ? P.grassLight : GRASS_HI;
    tuft(p, x, y, dark, light, Math.floor(r() * 5));
  }
  // um detalhe raro: florzinha, trevo ou pedrinha
  const d = r();
  const x = Math.floor(r() * T); const y = Math.floor(r() * T);
  if (d < 0.3) { p.set(x, y, r() < 0.5 ? P.white : P.pink); p.set(x + 1, y, r() < 0.5 ? P.mustardLight : P.coralLight); p.set(x, y + 1, P.grassDark); }
  else if (d < 0.5) { p.set(x, y, P.grassLight); p.set(x + 1, y, P.grassLight); p.set(x, y + 1, P.grassLight); p.set(x + 1, y + 1, P.grassDark); } // trevo
  else if (d < 0.65) { p.set(x, y, P.stoneLight); p.set(x + 1, y, P.stone); p.set(x, y + 1, shade(P.grass, -0.35)); p.set(x + 1, y + 1, shade(P.grass, -0.35)); }
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
  blobs(p, r, 3, 4, 7, DIRT_MID);
  blobs(p, r, 2, 2, 4, mix(P.dirt, P.dirtLight, 0.6));
  blobs(p, r, 1, 2, 3, shade(P.dirt, -0.26));
  speckle(p, seed + 1, [P.dirtDark, P.dirtLight, DIRT_MID], 0.04);
  // pedrinhas com volume (luz em cima/esquerda, sombra deslocada para o azul embaixo)
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    const big = r() < 0.3;
    const c = r() < 0.5 ? P.dirtLight : mix(P.stoneLight, P.dirtLight, 0.5);
    if (big) { p.rect(x, y, 3, 2, c); p.set(x, y, lighten(c, 0.3)); p.set(x + 2, y + 1, shade(c, -0.3)); p.hline(x, x + 2, y + 2, shade(P.dirt, -0.4)); }
    else { p.rect(x, y, 2, 2, c); p.set(x, y, lighten(c, 0.25)); p.set(x + 1, y + 1, shade(c, -0.3)); p.set(x, y + 2, shade(P.dirt, -0.4)); p.set(x + 1, y + 2, shade(P.dirt, -0.4)); }
  }
  // rachaduras curtas e um graveto
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(r() * T); const y = Math.floor(r() * T);
    p.set(x, y, P.dirtDark); p.set(x + 1, y + 1, P.dirtDark); p.set(x + 2, y + 1, P.dirtDark); p.set(x + 3, y + 2, P.dirtDark);
  }
  if (r() < 0.4) { const x = Math.floor(r() * T); const y = Math.floor(r() * T); p.hline(x, x + 4, y, P.woodDark); p.set(x + 2, y - 1, P.woodDark); p.hline(x, x + 4, y + 1, shade(P.dirt, -0.3)); }
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
  // profundidade: manchas suaves e grandes (contraste baixo para a repetição do tile não aparecer)
  blobs(p, r, 2, 6, 10, shade(P.water, -0.1));
  blobs(p, r, 1, 4, 6, WATER_MID);
  blobs(p, r, 2, 2, 4, mix(P.water, P.waterLight, 0.3));
  // ondulações: cristas claras finas com ponta branca e um leve tom mais escuro por baixo
  const r2 = rng(seed + 50);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r2() * T) + frame * 2;
    const y = Math.floor(r2() * T) + (frame % 2);
    const len = 3 + Math.floor(r2() * 5);
    p.hline(x, x + len, y, P.waterLight);
    p.set(x, y, P.white);
    p.set(x - 1, y + 1, P.waterLight); p.set(x + len + 1, y + 1, P.waterLight);
    p.hline(x + 1, x + len, y + 1, WATER_MID);
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
  const dark = shade(P.stoneDark, -0.25);
  // pedra grande com faces (luz de cima/esquerda) e uma pedra menor ao lado
  p.ellipseBlend(15, 24, 13, 5, P.black, 80);
  p.ellipse(15, 18, 12, 8, dark);
  p.ellipse(14, 16, 11, 7, P.stone);
  p.ellipse(12, 13, 7, 4, P.stoneLight);
  p.set(9, 11, lighten(P.stoneLight, 0.4)); p.set(10, 11, lighten(P.stoneLight, 0.4));
  p.rectDither(4, 19, 22, 5, dark, DITHER.checker);
  p.line(18, 12, 23, 18, P.stoneDark); p.line(23, 18, 21, 22, dark); // aresta
  p.ellipse(26, 22, 5, 4, dark); p.ellipse(25, 21, 4, 3, P.stone); p.set(24, 19, P.stoneLight);
  // musgo e capim junto à base
  p.rect(6, 20, 4, 2, P.sageDark); p.set(7, 19, P.sage); p.set(19, 24, P.sageDark); p.set(20, 23, P.sage);
  tuft(p, 4, 26, P.grassDark, P.grassLight, 0); tuft(p, 28, 27, P.grassDark, P.grassLight, 1);
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

/**
 * Canto externo arredondado (quando os dois lados do canto são de outro terreno):
 * a grama "engole" o canto do tile com um quarto de círculo.
 */
export function capOuter(kind: 'water' | 'path', corner: 'NE' | 'NW' | 'SE' | 'SW'): Pix {
  const p = new Pix(T, T);
  const R = 9;
  const cx = corner.includes('E') ? T - 1 : 0;
  const cy = corner.includes('S') ? T - 1 : 0;
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const dx = Math.abs(x - cx); const dy = Math.abs(y - cy);
      if (dx > R + 3 || dy > R + 3) continue;
      // distância ao centro do arco (que fica a R px do canto, dentro do tile)
      const ax = cx + (corner.includes('E') ? -R : R); const ay = cy + (corner.includes('S') ? -R : R);
      const inArcQuadrant = (corner.includes('E') ? x > ax : x < ax) && (corner.includes('S') ? y > ay : y < ay);
      if (!inArcQuadrant) continue;
      const d = Math.hypot(x - ax, y - ay);
      if (kind === 'water') {
        if (d > R + 1.5) p.set(x, y, P.grassDark);
        else if (d > R - 0.5) p.set(x, y, corner.startsWith('N') ? P.dirtDark : mix(P.grassDark, P.dirtDark, 0.5));
        else if (d > R - 2.5) p.set(x, y, corner.startsWith('N') ? P.waterDark : P.water);
        else if (d > R - 3.5 && DITHER.checker(x, y)) p.set(x, y, corner.startsWith('N') ? P.waterDark : P.waterLight);
      } else {
        if (d > R + 1) p.set(x, y, (x + y) % 5 === 0 ? P.grassDark : P.grass);
        else if (d > R - 0.5) p.set(x, y, corner.startsWith('N') ? P.dirtDark : mix(P.dirt, P.dirtLight, 0.5));
      }
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
  // tábuas mais claras e quentes que a madeira dos móveis, para eles se destacarem
  const base = mix(P.wood, P.caramel, 0.5);
  const tones = [base, shade(base, 0.05), shade(base, -0.05), base];
  const seam = shade(base, -0.32);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    // tábuas longas: só metade das fileiras tem emenda vertical dentro do tile
    const hasSplit = r() < 0.5;
    const split = hasSplit ? 6 + Math.floor(r() * 20) : T;
    const c1 = tones[Math.floor(r() * tones.length)];
    const c2 = tones[Math.floor(r() * tones.length)];
    p.rect(0, y, split, 8, c1);
    if (hasSplit) p.rect(split, y, T - split, 8, c2);
    p.hline(0, T - 1, y, shade(c1, 0.12));
    p.hline(0, T - 1, y + 7, seam);
    if (hasSplit) { p.vline(split - 1, y, y + 6, seam); p.vline(split, y + 1, y + 5, shade(c2, 0.1)); }
    // veios longos e suaves
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(r() * 24);
      const yy = y + 2 + Math.floor(r() * 3);
      p.hline(x, x + 4 + Math.floor(r() * 6), yy, shade(r() < 0.5 ? c1 : c2, -0.07));
    }
    if (r() < 0.35) { const kx = 2 + Math.floor(r() * 26); p.set(kx, y + 3, shade(c1, -0.2)); p.set(kx + 1, y + 3, shade(c1, -0.2)); p.set(kx, y + 4, shade(c1, -0.12)); } // nó da madeira
  }
  return p;
}

export function tileFloorShop(seed = 21): Pix {
  const p = new Pix(T, T);
  const cream = mix(P.cream, P.creamLight, 0.4); const pink = mix(P.pink, P.cream, 0.35);
  const cell = (x: number, y: number, c: Hex) => {
    p.rect(x, y, 16, 16, c);
    p.hline(x, x + 15, y, shade(c, 0.3));
    p.vline(x, y, y + 15, shade(c, 0.2));
    p.hline(x, x + 15, y + 15, shade(c, -0.16));
    p.vline(x + 15, y, y + 15, shade(c, -0.12));
    p.set(x + 3, y + 3, shade(c, 0.45)); p.set(x + 4, y + 3, shade(c, 0.45)); // reflexo do azulejo
  };
  cell(0, 0, cream); cell(16, 0, pink); cell(0, 16, pink); cell(16, 16, cream);
  const r = rng(seed);
  for (let i = 0; i < 4; i++) p.set(1 + Math.floor(r() * 30), 1 + Math.floor(r() * 30), r() < 0.5 ? P.creamLight : P.white, 140);
  return p;
}

export function tileWallTop(): Pix {
  const p = new Pix(T, T);
  const c = shade(darken(P.woodDark, 0.4), -0.15);
  p.rect(0, 0, T, T, c);
  for (let x = 0; x < T; x += 8) { p.vline(x, 0, T - 1, darken(c, 0.3)); p.vline(x + 1, 0, T - 1, lighten(c, 0.08)); }
  p.hline(0, T - 1, T - 1, P.outline);
  p.hline(0, T - 1, T - 2, darken(c, 0.3));
  return p;
}

function plaster(p: Pix, seed: number, color: Hex): void {
  p.rect(0, 0, T, T, color);
  speckle(p, seed, [shade(color, -0.05), shade(color, 0.07)], 0.05);
}

/** Papel de parede: listras verticais suaves com um pontilhado discreto. */
function wallpaper(p: Pix, y0: number, y1: number, a: Hex, b: Hex, dots: Hex | null, seed: number): void {
  for (let x = 0; x < T; x += 4) p.rect(x, y0, 4, y1 - y0 + 1, (x / 4) % 2 ? a : b);
  if (dots) { const r = rng(seed); for (let i = 0; i < 5; i++) { const x = Math.floor(r() * T); const y = y0 + Math.floor(r() * (y1 - y0)); p.set(x, y, dots); } }
}

/**
 * Metade de cima da parede de fundo (fileira 'W' com '#' logo abaixo): viga do teto com sombra
 * projetada em degradê + papel de parede. Faz o cômodo parecer mais alto.
 */
export function tileWallUpper(seed = 33, shop = false): Pix {
  const p = new Pix(T, T);
  const paper = shop ? mix(P.cream, P.pink, 0.22) : P.cream;
  plaster(p, seed, paper);
  if (shop) wallpaper(p, 8, T - 1, mix(P.cream, P.pink, 0.4), mix(P.cream, P.pink, 0.18), P.pink, seed);
  else wallpaper(p, 8, T - 1, shade(P.cream, 0.05), shade(P.cream, -0.04), null, seed);
  // viga do teto com volume e sombra em degradê (dithering em três passos)
  p.rect(0, 0, T, 5, P.woodDark);
  p.hline(0, T - 1, 0, P.woodLight); p.hline(0, T - 1, 1, P.wood);
  for (let x = 0; x < T; x += 11) p.vline(x, 1, 4, P.brownDark);
  p.hline(0, T - 1, 5, shade(P.brownDark, -0.2));
  p.rect(0, 6, T, 2, shade(paper, -0.3));
  p.rectDither(0, 8, T, 2, shade(paper, -0.3), DITHER.checker);
  p.rectDither(0, 10, T, 2, shade(paper, -0.18), DITHER.sparse);
  return p;
}

export function tileWall(seed = 30): Pix {
  const p = new Pix(T, T);
  plaster(p, seed, P.cream);
  wallpaper(p, 0, 20, shade(P.cream, 0.05), shade(P.cream, -0.04), null, seed);
  // lambri inferior com painéis e rodapé
  p.hline(0, T - 1, 20, shade(P.cream, -0.2));
  p.rect(0, 21, T, 11, P.wood);
  p.hline(0, T - 1, 21, P.woodLight);
  for (let x = 0; x < T; x += 16) { p.box(x + 2, 23, 12, 6, P.woodDark); p.hline(x + 3, x + 12, 23, shade(P.wood, 0.25)); p.vline(x + 2, 24, 27, shade(P.wood, 0.25)); }
  p.rect(0, 29, T, 3, shade(P.woodDark, -0.1));
  p.hline(0, T - 1, 29, P.wood);
  p.hline(0, T - 1, 31, shade(P.brownDark, -0.25));
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
  const p = new Pix(T, T);
  const paper = mix(P.cream, P.pink, 0.22);
  plaster(p, seed, paper);
  wallpaper(p, 0, 12, mix(P.cream, P.pink, 0.4), mix(P.cream, P.pink, 0.18), P.pink, seed);
  // friso com barrado floral
  p.rect(0, 13, T, 3, P.pinkDark); p.hline(0, T - 1, 13, P.pink);
  for (let x = 2; x < T; x += 8) { p.set(x, 14, P.white); p.set(x + 4, 14, P.coralLight); }
  // lambri branco com painéis e rodapé
  const wain = mix(P.creamLight, P.white, 0.5);
  p.rect(0, 16, T, 16, wain);
  p.hline(0, T - 1, 16, P.white);
  for (let x = 0; x < T; x += 16) { p.box(x + 2, 19, 12, 7, shade(wain, -0.22)); p.hline(x + 3, x + 12, 19, P.white); }
  p.rect(0, 28, T, 4, shade(wain, -0.12));
  p.hline(0, T - 1, 28, P.white);
  p.hline(0, T - 1, 31, shade(wain, -0.4));
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
  wallUpper: () => tileWallUpper(33, false),
  wallUpperShop: () => tileWallUpper(34, true),
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
  capWaterNE: () => capOuter('water', 'NE'), capWaterNW: () => capOuter('water', 'NW'), capWaterSE: () => capOuter('water', 'SE'), capWaterSW: () => capOuter('water', 'SW'),
  capPathNE: () => capOuter('path', 'NE'), capPathNW: () => capOuter('path', 'NW'), capPathSE: () => capOuter('path', 'SE'), capPathSW: () => capOuter('path', 'SW'),
  edgeCobbleN: () => edgeCobble('N'), edgeCobbleS: () => edgeCobble('S'), edgeCobbleE: () => edgeCobble('E'), edgeCobbleW: () => edgeCobble('W'),
};
