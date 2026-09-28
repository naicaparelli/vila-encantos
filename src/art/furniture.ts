import { P, mix, shade, type Hex } from './palette';
import { Pix, DITHER } from './pix';

/**
 * Mobílias em vista 3/4 (topo comprimido + face frontal visível), no estilo das referências:
 * mais altas que o footprint, pernas visíveis, 3–4 tons por material com sombra deslocada
 * para o azul, contorno escuro e sombra projetada no chão.
 *
 * Convenção: o sprite é ancorado no canto inferior esquerdo do footprint (origem (0, 1) na cena),
 * então a largura do sprite = largura do footprint em px e a altura pode ser maior (encosto,
 * cabeceira, cúpula) — o excesso sobe.
 */

export type Facing = 'south' | 'east' | 'north' | 'west';
export const FACINGS: Facing[] = ['south', 'east', 'north', 'west'];

const OUT = P.outline;

// ---------------------------------------------------------------------------
// Helpers de desenho
// ---------------------------------------------------------------------------

/** Sombra elíptica no chão. */
function ground(p: Pix, cx: number, cy: number, rx: number, ry: number, a = 70): void {
  p.ellipseBlend(cx, cy, rx, ry, P.black, a);
}

/** Face frontal de madeira: fundo, aresta de luz em cima/esquerda, sombra embaixo/direita e veios. */
function woodFace(p: Pix, x: number, y: number, w: number, h: number, c: Hex = P.wood, grain = true): void {
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, shade(c, 0.28));
  p.vline(x, y, y + h - 1, shade(c, 0.14));
  p.hline(x, x + w - 1, y + h - 1, shade(c, -0.4));
  p.vline(x + w - 1, y, y + h - 1, shade(c, -0.28));
  if (grain && w > 6 && h > 4) {
    for (let gy = y + 2; gy < y + h - 2; gy += 3) {
      const gx = x + 2 + ((gy * 7) % Math.max(1, w - 8));
      p.hline(gx, Math.min(x + w - 3, gx + 3 + ((gy * 3) % 4)), gy, shade(c, -0.1));
    }
  }
}

/** Superfície superior (tampo) de madeira, mais clara, com brilho na borda de trás. */
function woodTop(p: Pix, x: number, y: number, w: number, h: number, c: Hex = P.wood): void {
  const t = shade(c, 0.2);
  p.rect(x, y, w, h, t);
  p.hline(x, x + w - 1, y, shade(c, 0.45));
  p.hline(x, x + w - 1, y + h - 1, shade(c, -0.05));
  p.vline(x, y, y + h - 1, shade(c, 0.3));
  p.vline(x + w - 1, y, y + h - 1, shade(c, -0.12));
  for (let gx = x + 3; gx < x + w - 3; gx += 7) p.hline(gx, gx + 2, y + 1 + ((gx / 7) % Math.max(1, h - 2)), shade(t, -0.08));
}

/** Pernas: barras verticais com luz à esquerda e pé escuro. */
function legs(p: Pix, pts: Array<[number, number, number]>, w = 3, c: Hex = P.woodDark): void {
  for (const [x, y, h] of pts) {
    p.rect(x, y, w, h, c);
    p.vline(x, y, y + h - 1, shade(c, 0.22));
    p.hline(x, x + w - 1, y + h - 1, shade(c, -0.35));
  }
}

/** Almofada/estofado: bloco arredondado com luz em cima/esquerda, sombra embaixo/direita. */
function cushion(p: Pix, x: number, y: number, w: number, h: number, r: number, c: Hex): void {
  p.rrectR(x, y, w, h, r, shade(c, -0.32));
  p.rrectR(x, y, w - 1, h - 1, r, c);
  p.rrectR(x + 1, y + 1, Math.max(2, w - 4), Math.max(2, Math.floor(h / 2)), Math.max(1, r - 1), shade(c, 0.2));
  p.rrectR(x + 2, y + 2, Math.max(1, Math.floor(w / 3)), 2, 1, shade(c, 0.4));
}

/** Lombada de livro. */
function book(p: Pix, x: number, y: number, w: number, h: number, c: Hex): void {
  p.rect(x, y, w, h, c);
  p.vline(x, y, y + h - 1, shade(c, 0.3));
  p.vline(x + w - 1, y, y + h - 1, shade(c, -0.3));
  p.hline(x, x + w - 1, y, shade(c, 0.35));
  if (h > 8) { p.hline(x + 1, x + w - 2, y + 2, shade(c, 0.5)); p.hline(x + 1, x + w - 2, y + h - 3, shade(c, 0.5)); }
}

/** Cacho de folhas com luz de cima/esquerda. */
function leaves(p: Pix, cx: number, cy: number, r: number, dark: Hex, mid: Hex, light: Hex): void {
  p.disc(cx, cy, r, dark);
  p.disc(cx - 1, cy - 1, Math.max(1, r - 1), mid);
  p.disc(cx - Math.max(1, Math.round(r * 0.4)), cy - Math.max(1, Math.round(r * 0.4)), Math.max(1, r - 3), light);
}

/** Vaso de cerâmica com boca, corpo bojudo e sombra. */
function pot(p: Pix, x: number, y: number, w: number, h: number, c: Hex): void {
  p.rect(x + 1, y + 3, w - 2, h - 3, c);
  p.hline(x + 2, x + w - 3, y + h - 1, shade(c, -0.45));
  p.vline(x + 1, y + 3, y + h - 2, shade(c, 0.2)); p.vline(x + 2, y + 4, y + h - 3, shade(c, 0.1));
  p.vline(x + w - 2, y + 3, y + h - 2, shade(c, -0.3)); p.vline(x + w - 3, y + 4, y + h - 3, shade(c, -0.15));
  p.rect(x, y, w, 3, shade(c, 0.1)); p.hline(x, x + w - 1, y, shade(c, 0.35)); p.hline(x, x + w - 1, y + 2, shade(c, -0.25));
}

function outlineAndReturn(p: Pix): Pix { p.outline(OUT); return p; }

// ---------------------------------------------------------------------------
// Cama — 2 × 2 tiles (64 × 64) + cabeceira: sprite 64 × 76, só vista sul
// ---------------------------------------------------------------------------

export function furnBed(): Pix {
  const p = new Pix(64, 76);
  const frame = P.woodDark; const quilt = P.lilac; const sheet = P.creamLight;
  ground(p, 32, 72, 30, 4, 80);
  // cabeceira: topo arqueado, painel com moldura
  p.rrectR(6, 2, 52, 26, 6, frame);
  p.rrectR(7, 3, 50, 24, 5, shade(frame, 0.12));
  p.rrectR(11, 7, 42, 16, 3, frame);
  p.rrectR(13, 9, 38, 12, 2, shade(P.wood, -0.08));
  p.hline(14, 50, 9, shade(P.wood, 0.25)); p.vline(13, 10, 20, shade(P.wood, 0.15));
  p.hline(7, 56, 3, shade(frame, 0.4)); // brilho na borda superior
  p.disc(31, 6, 2, shade(P.wood, 0.3)); p.set(31, 5, shade(P.wood, 0.55)); // enfeite central
  // estrado / laterais
  p.rect(4, 24, 56, 44, frame);
  p.vline(4, 24, 67, shade(frame, 0.2)); p.vline(59, 24, 67, shade(frame, -0.3));
  // colchão + lençol
  p.rect(8, 26, 48, 40, sheet);
  p.rect(8, 26, 48, 3, shade(sheet, -0.2)); // sombra da cabeceira no colchão
  // travesseiros
  cushion(p, 11, 29, 19, 10, 3, P.white); cushion(p, 34, 29, 19, 10, 3, P.white);
  p.hline(13, 27, 36, shade(P.white, -0.22)); p.hline(36, 50, 36, shade(P.white, -0.22));
  // edredom com dobra de cima e padrão de losangos costurados
  p.rect(8, 41, 48, 25, quilt);
  p.rect(8, 41, 48, 4, shade(quilt, 0.25)); p.hline(8, 55, 41, shade(quilt, 0.5)); p.hline(8, 55, 45, shade(quilt, -0.35)); // dobra virada
  for (let yy = 49; yy < 64; yy += 7) for (let xx = 8; xx < 56; xx += 8) {
    const ox = ((yy - 49) / 7) % 2 ? 4 : 0;
    p.set(xx + ox + 4, yy, shade(quilt, 0.2)); p.set(xx + ox + 3, yy + 1, shade(quilt, 0.2)); p.set(xx + ox + 5, yy + 1, shade(quilt, 0.2));
    p.set(xx + ox + 4, yy + 2, shade(quilt, -0.2));
  }
  p.rectDither(44, 46, 12, 20, shade(quilt, -0.2), DITHER.checker); // sombra do lado direito
  p.vline(55, 42, 65, shade(quilt, -0.4));
  p.hline(8, 55, 65, shade(quilt, -0.45)); // borda inferior do edredom
  // pé da cama: travessa com face frontal e pernas
  woodFace(p, 4, 64, 56, 7, frame);
  p.hline(5, 58, 64, shade(frame, 0.45));
  legs(p, [[5, 71, 5], [55, 71, 5]], 4, frame);
  legs(p, [[5, 24, 3], [55, 24, 3]], 4, frame);
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Luminária de pé — 1 × 1, sprite 32 × 60
// ---------------------------------------------------------------------------

export function furnLamp(magic: boolean, f: Facing): Pix {
  const p = new Pix(32, 60);
  const shadeC = magic ? P.lilacLight : P.mustardLight; const shadeD = magic ? P.lilac : P.mustard;
  const metal = magic ? P.lilacDark : P.woodDark;
  ground(p, 16, 57, 9, 3);
  // base redonda
  p.ellipse(16, 54, 8, 3, shade(metal, -0.3)); p.ellipse(16, 53, 8, 3, metal); p.ellipse(15, 52, 5, 1, shade(metal, 0.3));
  // haste
  p.rect(15, 24, 3, 29, metal); p.vline(15, 24, 52, shade(metal, 0.3)); p.vline(17, 24, 52, shade(metal, -0.3));
  p.rect(14, 44, 5, 2, shade(metal, 0.1)); // anel
  // cúpula cônica com luz interna
  for (let i = 0; i < 18; i++) {
    const y = 8 + i; const half = 5 + Math.round(i * 0.55);
    p.hline(16 - half, 16 + half, y, shadeC);
    p.hline(16 - half, 16 - half + Math.max(1, Math.round(half * 0.35)), y, shade(shadeC, 0.35));
    p.hline(16 + half - Math.max(1, Math.round(half * 0.4)), 16 + half, y, shadeD);
  }
  p.hline(4, 28, 25, shade(shadeD, -0.3)); // borda inferior da cúpula
  p.hline(11, 21, 8, shade(shadeC, 0.5)); // aro superior
  p.rect(14, 5, 5, 3, metal); p.set(16, 4, shade(metal, 0.3)); // conector
  // luz saindo por baixo
  p.rectBlend(9, 26, 15, 6, magic ? P.lilacLight : P.amber, 70);
  p.rectDither(11, 32, 11, 4, magic ? P.lilacLight : P.amber, DITHER.checker, 60, false);
  // cordinha do interruptor muda de lado
  const cx = f === 'east' ? 24 : f === 'west' ? 8 : 20;
  p.vline(cx, 26, 31, shade(metal, 0.2)); p.set(cx, 32, magic ? P.amber : P.coral);
  if (magic) { p.set(3, 12, P.amber); p.set(28, 9, P.amber); p.set(6, 30, P.white); p.set(27, 27, P.white); p.set(2, 13, P.white, 160); }
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Cadeira — 1 × 1, sprite 32 × 48
// ---------------------------------------------------------------------------

export function furnChair(f: Facing): Pix {
  const p = new Pix(32, 48);
  const wood = P.wood; const woodD = P.woodDark; const cush = P.coral;
  ground(p, 16, 45, 11, 3);
  if (f === 'south') {
    // encosto atrás com travessas, assento com almofada, pernas da frente
    p.rrectR(5, 6, 22, 22, 3, woodD);
    p.rrectR(6, 7, 20, 20, 2, wood); p.hline(7, 24, 7, shade(wood, 0.35)); p.vline(6, 8, 25, shade(wood, 0.2));
    p.rect(9, 10, 14, 3, woodD); p.rect(9, 16, 14, 3, woodD); p.rect(9, 22, 14, 3, woodD);
    p.hline(9, 22, 10, shade(woodD, 0.3)); p.hline(9, 22, 16, shade(woodD, 0.3)); p.hline(9, 22, 22, shade(woodD, 0.3));
    woodTop(p, 4, 27, 24, 6, wood);
    cushion(p, 5, 26, 22, 8, 2, cush);
    woodFace(p, 4, 33, 24, 4, wood, false);
    legs(p, [[5, 37, 8], [24, 37, 8]], 3, woodD);
    legs(p, [[5, 27, 2], [24, 27, 2]], 3, woodD);
  } else if (f === 'north') {
    // costas do encosto na frente, cobrindo o assento
    woodTop(p, 4, 16, 24, 6, wood);
    cushion(p, 5, 15, 22, 7, 2, cush);
    legs(p, [[5, 22, 6], [24, 22, 6]], 3, woodD);
    p.rrectR(4, 22, 24, 24, 3, woodD);
    p.rrectR(5, 23, 22, 22, 2, wood); p.hline(6, 25, 23, shade(wood, 0.35)); p.vline(5, 24, 43, shade(wood, 0.2));
    for (let x = 8; x < 24; x += 5) p.vline(x, 26, 41, woodD);
    p.hline(6, 25, 44, shade(wood, -0.4));
    legs(p, [[5, 44, 3], [24, 44, 3]], 3, woodD);
  } else {
    const east = f === 'east';
    // vista lateral: encosto de um lado, assento e duas pernas visíveis
    const bx = east ? 6 : 21;
    p.rrectR(bx, 6, 5, 26, 2, woodD);
    p.rrectR(bx + (east ? 1 : 0), 7, 4, 24, 1, wood); p.vline(bx + (east ? 1 : 0), 7, 30, shade(wood, 0.3));
    p.hline(bx + 1, bx + 3, 14, woodD); p.hline(bx + 1, bx + 3, 20, woodD); p.hline(bx + 1, bx + 3, 26, woodD);
    const sx = east ? 10 : 7;
    woodTop(p, sx, 27, 16, 5, wood);
    cushion(p, sx, 26, 16, 7, 2, cush);
    woodFace(p, sx, 32, 16, 4, wood, false);
    legs(p, east ? [[sx + 1, 36, 8], [sx + 12, 36, 8]] : [[sx + 1, 36, 8], [sx + 12, 36, 8]], 3, woodD);
    if (east) legs(p, [[bx, 32, 12]], 3, woodD); else legs(p, [[bx + 2, 32, 12]], 3, woodD);
  }
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Mesa de chá — 1 × 1, sprite 32 × 44
// ---------------------------------------------------------------------------

export function furnTable(f: Facing): Pix {
  const p = new Pix(32, 44);
  ground(p, 16, 41, 13, 3);
  // pernas torneadas atrás e na frente
  legs(p, [[7, 24, 14], [22, 24, 14]], 3, P.woodDark);
  p.rect(8, 30, 16, 2, P.woodDark); p.hline(8, 23, 30, shade(P.woodDark, 0.3)); // travessa
  // tampo redondo com espessura (borda frontal)
  p.ellipse(16, 20, 14, 7, shade(P.woodDark, -0.1));
  p.ellipse(16, 18, 14, 7, P.wood);
  p.ellipse(16, 17, 12, 5, shade(P.wood, 0.2));
  p.ellipse(15, 16, 8, 3, shade(P.wood, 0.4));
  p.hline(3, 28, 22, shade(P.woodDark, -0.3));
  // toalhinha rendada
  p.rrectR(8, 13, 16, 9, 3, P.creamLight); p.hline(9, 22, 13, P.white);
  for (let x = 9; x < 23; x += 3) { p.set(x, 21, P.white); p.set(x + 1, 20, shade(P.cream, -0.12)); }
  // bule e xícara: o arranjo gira com a orientação
  const pos: Record<Facing, [number, number, number, number]> = { south: [11, 15, 20, 17], east: [19, 14, 12, 18], north: [20, 15, 11, 17], west: [12, 14, 19, 18] };
  const [tx, ty, cx, cy] = pos[f];
  // bule
  p.rrectR(tx - 3, ty - 2, 7, 6, 2, P.pink); p.hline(tx - 2, tx + 2, ty - 2, shade(P.pink, 0.4)); p.vline(tx + 3, ty - 1, ty + 3, shade(P.pink, -0.3));
  p.set(tx, ty - 3, shade(P.pink, -0.2)); p.set(tx + 4, ty, shade(P.pink, -0.1)); p.set(tx - 4, ty, shade(P.pink, -0.1)); p.set(tx - 5, ty - 1, shade(P.pink, -0.1));
  // xícara com pires
  p.ellipse(cx, cy + 2, 4, 1, P.white); p.rrectR(cx - 2, cy - 2, 5, 4, 1, P.tealLight); p.hline(cx - 1, cx + 1, cy - 2, P.white); p.set(cx + 3, cy - 1, P.tealLight);
  p.set(cx, cy - 4, P.grayLight, 140); p.set(cx + 1, cy - 5, P.grayLight, 110); // vapor
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Estante de livros — 2 × 1 tiles (64 px de largura), sprite 64 × 88, só vista sul
// ---------------------------------------------------------------------------

export function furnShelf(): Pix {
  const p = new Pix(64, 88);
  const frame = P.woodDark; const inner = shade(P.woodDark, -0.35);
  ground(p, 32, 85, 30, 3, 60);
  // corpo
  p.rect(2, 2, 60, 82, frame);
  p.hline(3, 60, 2, shade(frame, 0.45)); p.vline(2, 3, 83, shade(frame, 0.25)); p.vline(61, 3, 83, shade(frame, -0.35));
  p.rect(6, 6, 52, 74, inner); // fundo
  p.rect(6, 6, 52, 3, shade(inner, -0.35)); // sombra do topo
  // cimalha
  p.rect(0, 0, 64, 4, frame); p.hline(0, 63, 0, shade(frame, 0.5)); p.hline(0, 63, 3, shade(frame, -0.4));
  // prateleiras (face frontal) e livros/objetos
  const shelves = [30, 54, 78];
  const cols = [P.coral, P.teal, P.mustard, P.lilac, P.sage, P.red, P.pinkDark, P.tealDark, P.orange, P.lilacDark];
  let k = 0;
  const row = (y: number, items: Array<[number, number] | null>) => {
    // livros de alturas variadas, alguns inclinados
    let x = 8;
    for (const it of items) {
      if (!it) { x += 4; continue; }
      const [w, h] = it;
      book(p, x, y - h, w, h, cols[k++ % cols.length]);
      x += w + 1;
    }
  };
  row(shelves[0], [[4, 16], [5, 18], [4, 15], [6, 19], null, [5, 17], [4, 14], [5, 18], [4, 16], [5, 19], [4, 15]]);
  // 2ª prateleira: potes e um livro deitado
  p.rrectR(9, 41, 10, 12, 2, P.tealLight); p.rect(10, 39, 8, 3, P.tealDark); p.hline(10, 17, 39, shade(P.tealDark, 0.35)); p.vline(10, 43, 51, shade(P.tealLight, 0.4)); p.rect(12, 45, 5, 4, P.pink);
  p.rrectR(22, 43, 8, 10, 2, P.mustardLight); p.rect(23, 41, 6, 3, P.mustardDark); p.vline(23, 45, 51, shade(P.mustardLight, 0.4));
  p.rect(33, 48, 22, 5, P.lilacDark); p.hline(33, 54, 48, shade(P.lilacDark, 0.4)); p.rect(35, 44, 18, 4, P.coral); p.hline(35, 52, 44, shade(P.coral, 0.4));
  // 3ª prateleira: livros + plantinha
  row(shelves[2], [[5, 17], [4, 15], [5, 18], [4, 16], null, [5, 19], [4, 15]]);
  pot(p, 46, 66, 10, 12, P.coralDark); leaves(p, 51, 62, 5, P.grassDeep, P.grassDark, P.grass); p.set(49, 59, P.grassLight); p.set(54, 60, P.grassLight);
  for (const y of shelves) { woodFace(p, 4, y, 56, 4, P.wood, false); p.rectDither(6, y + 4, 52, 2, shade(inner, -0.4), DITHER.checker); }
  // pés
  legs(p, [[3, 84, 3], [58, 84, 3]], 3, frame);
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Vitrine de doces — 2 × 1 tiles, sprite 64 × 72, só vista sul
// ---------------------------------------------------------------------------

export function furnVitrine(): Pix {
  const p = new Pix(64, 72);
  const frame = P.wood; const glass = mix(P.sky, P.white, 0.3);
  ground(p, 32, 69, 30, 3, 60);
  // base com gavetas
  woodFace(p, 2, 50, 60, 18, frame);
  p.box(6, 53, 24, 11, shade(frame, -0.35)); p.box(34, 53, 24, 11, shade(frame, -0.35));
  p.hline(7, 28, 53, shade(frame, 0.3)); p.hline(35, 56, 53, shade(frame, 0.3));
  p.rect(16, 58, 4, 2, P.amber); p.rect(44, 58, 4, 2, P.amber);
  legs(p, [[3, 68, 3], [58, 68, 3]], 3, P.woodDark);
  // caixa de vidro com moldura
  p.rect(2, 4, 60, 46, P.woodDark); p.hline(3, 60, 4, shade(P.woodDark, 0.45));
  p.rect(5, 7, 54, 41, glass);
  p.rectDither(5, 7, 12, 41, P.white, DITHER.checker, 120, false); // reflexo à esquerda
  p.vline(6, 8, 46, P.white); p.vline(7, 8, 30, P.white, 150);
  p.rect(30, 7, 3, 41, P.woodDark); // montante central
  // prateleiras de vidro
  woodFace(p, 5, 27, 54, 3, P.wood, false); p.hline(5, 58, 30, shade(P.wood, -0.4));
  // doces: bolos, cupcakes, biscoitos
  const cake = (x: number, y: number, c: Hex, top: Hex) => { p.rrectR(x, y, 10, 7, 1, c); p.hline(x, x + 9, y, shade(c, 0.4)); p.vline(x + 9, y, y + 6, shade(c, -0.3)); p.rect(x + 1, y - 3, 8, 3, top); p.hline(x + 1, x + 8, y - 3, shade(top, 0.4)); p.set(x + 4, y - 4, P.red); p.set(x + 5, y - 4, P.red); };
  const cupcake = (x: number, y: number, c: Hex) => { p.rect(x + 1, y + 3, 5, 4, P.caramel); p.vline(x + 1, y + 3, y + 6, shade(P.caramel, 0.3)); p.disc(x + 3, y + 1, 3, c); p.set(x + 2, y - 1, shade(c, 0.4)); p.set(x + 3, y - 2, P.coralLight); };
  cake(9, 19, P.pink, P.coralLight); cupcake(21, 18, P.lilacLight); cake(36, 19, P.creamLight, P.mustard); cupcake(50, 18, P.coral);
  p.rrectR(8, 40, 8, 6, 1, P.mustardLight); p.hline(8, 15, 40, P.white); p.rrectR(18, 41, 6, 5, 1, P.caramel); p.hline(18, 23, 41, shade(P.caramel, 0.4)); // biscoitos
  cake(37, 39, P.lilac, P.lilacLight); cupcake(51, 38, P.pink);
  p.rect(9, 32, 6, 3, P.creamDark); p.set(10, 33, P.coralDark); p.rect(40, 32, 6, 3, P.creamDark); p.set(42, 33, P.coralDark); // etiquetas de preço
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Banco — 2 × 1 (sul/norte: 64 × 44) ou 1 × 2 (leste/oeste: 32 × 76)
// ---------------------------------------------------------------------------

export function furnBench(f: Facing): Pix {
  const wood = P.wood; const woodD = P.woodDark;
  if (f === 'south' || f === 'north') {
    const p = new Pix(64, 44);
    ground(p, 32, 41, 28, 3);
    if (f === 'south') {
      // encosto atrás com ripas, assento, face frontal e pernas
      legs(p, [[5, 4, 20], [56, 4, 20]], 3, woodD);
      woodFace(p, 3, 6, 58, 5, wood); woodFace(p, 3, 13, 58, 5, wood);
      woodTop(p, 2, 22, 60, 7, wood);
      for (let x = 10; x < 60; x += 12) p.vline(x, 23, 27, shade(wood, -0.2)); // ripas do assento
      woodFace(p, 2, 29, 60, 4, wood, false);
      legs(p, [[4, 33, 9], [57, 33, 9], [30, 33, 6]], 3, woodD);
      p.hline(6, 56, 36, woodD); // travessa entre as pernas
    } else {
      woodTop(p, 2, 16, 60, 7, wood);
      woodFace(p, 2, 23, 60, 3, wood, false);
      legs(p, [[4, 26, 6], [57, 26, 6]], 3, woodD);
      // encosto na frente cobrindo o assento
      legs(p, [[5, 20, 22], [56, 20, 22]], 3, woodD);
      woodFace(p, 3, 26, 58, 5, wood); woodFace(p, 3, 33, 58, 5, wood);
    }
    return outlineAndReturn(p);
  }
  // vista lateral: 1 × 2 tiles
  const p = new Pix(32, 76);
  ground(p, 16, 73, 12, 3);
  const east = f === 'east';
  const bx = east ? 5 : 22;
  // encosto (lado de trás) e assento comprido
  p.rrectR(bx, 2, 5, 62, 2, woodD); p.vline(bx + (east ? 1 : 0), 3, 62, shade(wood, 0.25)); p.vline(bx + (east ? 3 : 1), 3, 62, shade(woodD, -0.3));
  for (let y = 8; y < 60; y += 10) p.hline(bx + 1, bx + 3, y, shade(woodD, -0.4));
  const sx = east ? 10 : 6;
  woodTop(p, sx, 6, 16, 58, wood);
  for (let y = 12; y < 60; y += 12) p.hline(sx + 1, sx + 14, y, shade(wood, -0.2));
  woodFace(p, sx, 64, 16, 4, wood, false);
  legs(p, [[sx + 1, 68, 5], [sx + 12, 68, 5]], 3, woodD);
  legs(p, east ? [[bx, 64, 8]] : [[bx + 2, 64, 8]], 3, woodD);
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Banquinho — 1 × 1, sprite 32 × 36
// ---------------------------------------------------------------------------

export function furnStool(f: Facing): Pix {
  const p = new Pix(32, 36);
  ground(p, 16, 33, 9, 3);
  const side = f === 'east' || f === 'west';
  legs(p, side ? [[8, 18, 12], [21, 18, 12], [15, 20, 11]] : [[7, 18, 11], [22, 18, 11], [15, 19, 12]], 3, P.woodDark);
  p.hline(9, 22, 26, P.woodDark); p.hline(9, 22, 27, shade(P.woodDark, 0.25)); // travessa
  // assento redondo com espessura e almofadinha
  p.ellipse(16, 16, 10, 5, shade(P.woodDark, -0.1));
  p.ellipse(16, 14, 10, 5, P.wood);
  p.ellipse(16, 13, 8, 3, shade(P.wood, 0.25));
  p.ellipse(15, 12, 5, 2, shade(P.wood, 0.45));
  p.hline(7, 25, 18, shade(P.woodDark, -0.35));
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Vaso de flores / encantado — 1 × 1, sprite 32 × 52 (planta alta como na referência)
// ---------------------------------------------------------------------------

export function furnVase(magic: boolean, f: Facing): Pix {
  const p = new Pix(32, 52);
  ground(p, 16, 49, 9, 3);
  const potC = magic ? P.lilacDark : P.coralDark;
  pot(p, 9, 34, 14, 16, potC);
  p.rect(12, 41, 8, 2, magic ? P.lilacLight : P.mustardLight); // faixa decorativa
  p.rect(11, 37, 10, 2, shade(P.dirtDark, -0.2)); // terra
  const dark = magic ? shade(P.sageDark, -0.3) : P.grassDeep; const mid = magic ? P.sageDark : P.grassDark; const light = magic ? P.sage : P.grass;
  // folhagem em cachos + folhas longas
  leaves(p, 16, 26, 7, dark, mid, light);
  leaves(p, 9, 30, 5, dark, mid, light); leaves(p, 23, 30, 5, dark, mid, light);
  leaves(p, 12, 20, 4, dark, mid, light); leaves(p, 21, 21, 4, dark, mid, light);
  p.line(16, 30, 6, 16, mid); p.line(15, 30, 5, 16, light); p.line(17, 30, 27, 15, mid); p.line(18, 30, 28, 15, light); // folhas longas
  p.line(16, 28, 16, 12, mid); p.line(17, 28, 17, 13, light);
  p.set(5, 15, light); p.set(28, 14, light); p.set(16, 11, light);
  // flores: arranjo gira com a orientação
  const cols = magic ? [P.lilacLight, P.white, P.lilacLight] : [P.coral, P.mustardLight, P.pink];
  const arr: Record<Facing, number[][]> = { south: [[8, 15], [16, 8], [24, 14]], east: [[12, 12], [20, 8], [25, 18]], north: [[10, 10], [17, 16], [23, 10]], west: [[7, 18], [12, 8], [20, 12]] };
  arr[f].forEach(([x, y], i) => {
    const c = cols[i];
    p.disc(x, y, 3, c); p.set(x - 2, y - 1, shade(c, 0.4)); p.set(x - 1, y - 2, shade(c, 0.4)); p.set(x + 2, y + 1, shade(c, -0.3)); p.set(x, y, magic ? P.white : P.amber);
    if (magic) p.set(x, y - 4, P.white, 180);
  });
  if (magic) { p.set(3, 8, P.amber); p.set(28, 5, P.amber); p.set(27, 24, P.white); p.set(4, 26, P.white, 160); }
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Tapete — 2 × 2 tiles (64 × 64), padrão gira 90° nas orientações leste/oeste
// ---------------------------------------------------------------------------

export function furnRug(f: Facing): Pix {
  const draw = (q: Pix) => {
    const border = P.coralDark; const main = P.coral; const inner = P.mustardLight; const cream = P.creamLight;
    q.rrectR(2, 4, 60, 56, 4, border);
    q.rrectR(4, 6, 56, 52, 3, main);
    q.rrectR(8, 10, 48, 44, 3, inner);
    q.rrectR(14, 16, 36, 32, 3, main);
    q.rrectR(20, 22, 24, 20, 3, cream);
    // medalhão central
    q.disc(32, 32, 6, main); q.disc(32, 32, 3, inner); q.set(32, 32, border);
    for (const [x, y] of [[26, 32], [38, 32], [32, 26], [32, 38]]) q.set(x, y, border);
    // padrão de losangos na faixa
    for (let x = 10; x < 54; x += 6) { q.set(x, 12, cream); q.set(x, 51, cream); q.set(x + 1, 13, main); q.set(x + 1, 50, main); }
    for (let y = 18; y < 48; y += 6) { q.set(10, y, cream); q.set(53, y, cream); q.set(11, y + 1, main); q.set(52, y + 1, main); }
    // sombra de textura (trama)
    q.rectDither(4, 6, 56, 52, shade(main, -0.08), DITHER.sparse);
    // franjas em cima e embaixo
    for (let x = 5; x < 60; x += 2) { q.set(x, 2, cream); q.set(x, 3, shade(cream, -0.2)); q.set(x, 60, cream); q.set(x, 61, shade(cream, -0.2)); }
    q.hline(4, 59, 59, shade(border, -0.3));
  };
  const p = new Pix(64, 64);
  if (f === 'south' || f === 'north') draw(p); else { const t = new Pix(64, 64); draw(t); p.blit(t.rotated(1), 0, 0); }
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Almofada de chão — 1 × 1, sprite 32 × 32
// ---------------------------------------------------------------------------

export function furnCushion(f: Facing): Pix {
  const p = new Pix(32, 32);
  ground(p, 16, 29, 11, 3);
  const c = P.teal;
  p.rrectR(4, 8, 24, 20, 6, shade(c, -0.35));
  p.rrectR(4, 7, 23, 19, 6, c);
  p.rrectR(6, 9, 18, 10, 5, shade(c, 0.18));
  p.rrectR(8, 10, 8, 4, 2, shade(c, 0.4));
  p.rectDither(6, 18, 20, 7, shade(c, -0.18), DITHER.checker);
  // botão central e pregas
  p.set(16, 17, shade(c, -0.5)); p.set(15, 17, shade(c, -0.5));
  const folds = f === 'south' || f === 'north' ? [[15, 16, 11, 13], [16, 16, 20, 13], [15, 18, 12, 22], [16, 18, 19, 22]] : [[15, 17, 10, 17], [16, 17, 21, 17], [15, 16, 14, 11], [15, 18, 14, 23]];
  folds.forEach(([x0, y0, x1, y1]) => p.line(x0, y0, x1, y1, shade(c, -0.3)));
  // borlas
  for (const [x, y] of [[4, 8], [26, 8], [4, 26], [26, 26]]) { p.set(x, y, P.mustardLight); p.set(x + (x < 16 ? -1 : 1), y + (y < 16 ? -1 : 1), P.mustard); }
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Cortina — pendurada no tile da janela: sprite 32 × 40 (varão 8 px acima do tile)
// ---------------------------------------------------------------------------

export function furnCurtain(f: Facing): Pix {
  const p = new Pix(32, 40);
  const c = P.sage; const flip = f === 'east' || f === 'west';
  // varão com ponteiras
  p.rect(1, 6, 30, 3, P.woodDark); p.hline(2, 29, 6, P.woodLight); p.disc(1, 7, 2, P.mustard); p.disc(30, 7, 2, P.mustard); p.set(0, 6, P.mustardLight); p.set(29, 6, P.mustardLight);
  // painéis presos por abraçadeiras: ficam abertos e deixam a janela aparecer no meio
  const panel = (x0: number, dir: number) => {
    for (let y = 9; y < 38; y++) {
      // largura diminui na cintura (abraçadeira) e volta a abrir embaixo
      const t = y < 22 ? (y - 9) / 13 : (y - 22) / 16;
      const w = y < 22 ? 9 - Math.round(t * 4) : 5 + Math.round(t * 4);
      const xs = dir > 0 ? x0 : x0 - w + 1;
      p.hline(xs, xs + w - 1, y, c);
      p.set(dir > 0 ? xs : xs + w - 1, y, shade(c, 0.3));
      p.set(dir > 0 ? xs + w - 1 : xs, y, shade(c, -0.3));
      if ((y & 3) === 0) p.set(dir > 0 ? xs + 2 : xs + w - 3, y, shade(c, 0.2));
    }
    // abraçadeira
    const ax = dir > 0 ? x0 : x0 - 6;
    p.rect(ax, 20, 7, 4, P.mustard); p.hline(ax, ax + 6, 20, P.mustardLight); p.hline(ax, ax + 6, 23, P.mustardDark);
  };
  panel(2, 1); panel(29, -1);
  if (flip) { /* mesma arte: cortina é simétrica */ }
  // barra inferior
  p.hline(2, 10, 37, shade(c, -0.4)); p.hline(21, 29, 37, shade(c, -0.4));
  return outlineAndReturn(p);
}

// ---------------------------------------------------------------------------
// Quadro — no tile da parede: 32 × 32, moldura dourada ornamentada
// ---------------------------------------------------------------------------

export function furnPainting(f: Facing): Pix {
  const p = new Pix(32, 32);
  const flip = f === 'east' || f === 'west';
  const gold = P.mustard;
  p.rect(2, 3, 28, 26, shade(gold, -0.3));
  p.rect(3, 4, 26, 24, gold);
  p.hline(3, 28, 4, shade(gold, 0.5)); p.vline(3, 4, 27, shade(gold, 0.35)); p.hline(3, 28, 27, shade(gold, -0.4)); p.vline(28, 4, 27, shade(gold, -0.3));
  for (const [x, y] of [[3, 4], [27, 4], [3, 26], [27, 26]]) { p.rect(x, y, 2, 2, shade(gold, 0.6)); }
  for (let i = 7; i < 26; i += 4) { p.set(i, 5, shade(gold, 0.35)); p.set(i, 26, shade(gold, -0.2)); p.set(4, i, shade(gold, 0.3)); p.set(27, i, shade(gold, -0.2)); }
  // pintura: céu, colinas, o ateliê e o sol
  p.rect(6, 7, 20, 18, P.sky);
  p.rectDither(6, 7, 20, 4, P.white, DITHER.sparse, 160);
  p.ellipse(11, 20, 9, 5, P.sageDark); p.ellipse(22, 22, 9, 5, P.sage);
  p.rect(6, 22, 20, 3, P.grass);
  const hx = flip ? 16 : 9;
  p.rect(hx, 13, 9, 9, P.cream); p.rect(hx - 1, 10, 11, 4, P.lilacDark); p.set(hx + 4, 9, P.lilacDark); p.rect(hx + 3, 17, 3, 5, P.woodDark); p.set(hx + 1, 15, P.amber); p.set(hx + 7, 15, P.amber);
  p.disc(flip ? 10 : 22, 10, 2, P.amber); p.set(flip ? 9 : 21, 9, P.white);
  p.set(flip ? 22 : 8, 23, P.coral); p.set(flip ? 24 : 10, 24, P.pink);
  p.hline(6, 25, 7, shade(P.sky, -0.25)); p.vline(6, 8, 24, shade(P.sky, -0.2)); // sombra interna da moldura
  return outlineAndReturn(p);
}

/** Geradores de mobília por id (recebem a orientação; os que não giram ignoram). */
export const FURNITURE_GENERATORS: Record<string, (f: Facing) => Pix> = {
  furn_cama: () => furnBed(),
  furn_luminaria: (f) => furnLamp(false, f),
  furn_luminaria_encantada: (f) => furnLamp(true, f),
  furn_cadeira: furnChair,
  furn_mesa_cha: furnTable,
  furn_prateleira: () => furnShelf(),
  furn_vitrine: () => furnVitrine(),
  furn_banco: furnBench,
  furn_vaso_flores: (f) => furnVase(false, f),
  furn_vaso_encantado: (f) => furnVase(true, f),
  furn_tapete: furnRug,
  furn_almofada: furnCushion,
  furn_cortina: furnCurtain,
  furn_quadro: furnPainting,
  furn_banquinho: furnStool,
};
