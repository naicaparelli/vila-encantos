import { hexToRgb, rgbToHex, mix, type Hex } from './palette';

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Padrões de dithering (retornam true onde o pixel deve ser pintado). */
export const DITHER = {
  checker: (x: number, y: number) => ((x + y) & 1) === 0,
  sparse: (x: number, y: number) => ((x + y) & 3) === 0 && ((y & 1) === 0),
  dense: (x: number, y: number) => ((x + y) & 3) !== 0,
  rows: (_x: number, y: number) => (y & 1) === 0,
  cols: (x: number) => (x & 1) === 0,
};
export type DitherFn = (x: number, y: number) => boolean;

/**
 * Buffer de pixels para desenhar pixel art em código.
 * Todas as operações são inteiras e sem antialiasing.
 * Com `wrap = true`, coordenadas fora do buffer "dão a volta" (para tiles sem emenda).
 */
export class Pix {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;
  wrap = false;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  private idx(x: number, y: number): number {
    if (this.wrap) { x = ((x % this.w) + this.w) % this.w; y = ((y % this.h) + this.h) % this.h; }
    else if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return (y * this.w + x) * 4;
  }

  set(x: number, y: number, color: Hex | null, alpha = 255): void {
    if (!color) return;
    const i = this.idx(x, y);
    if (i < 0) return;
    const [r, g, b] = hexToRgb(color);
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = alpha;
  }

  /** Composição alpha sobre o pixel existente (para sombras e brilhos suaves). */
  blend(x: number, y: number, color: Hex, alpha: number): void {
    const i = this.idx(x, y);
    if (i < 0) return;
    const [r, g, b] = hexToRgb(color);
    const a = alpha / 255;
    const da = this.data[i + 3] / 255;
    const outA = a + da * (1 - a);
    if (outA <= 0) return;
    this.data[i] = Math.round((r * a + this.data[i] * da * (1 - a)) / outA);
    this.data[i + 1] = Math.round((g * a + this.data[i + 1] * da * (1 - a)) / outA);
    this.data[i + 2] = Math.round((b * a + this.data[i + 2] * da * (1 - a)) / outA);
    this.data[i + 3] = Math.round(outA * 255);
  }

  clear(x: number, y: number): void {
    const i = this.idx(x, y);
    if (i < 0) return;
    this.data[i] = 0; this.data[i + 1] = 0; this.data[i + 2] = 0; this.data[i + 3] = 0;
  }

  erase(x: number, y: number, w: number, h: number): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.clear(xx, yy);
  }

  opaque(x: number, y: number): boolean {
    const i = this.idx(x, y);
    return i >= 0 && this.data[i + 3] !== 0;
  }

  get(x: number, y: number): [number, number, number, number] {
    const i = this.idx(x, y);
    if (i < 0) return [0, 0, 0, 0];
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  getHex(x: number, y: number): Hex {
    const [r, g, b] = this.get(x, y);
    return rgbToHex(r, g, b);
  }

  /** Triângulo com ápice em (ax, ay) e base na linha ay + h (largura cresce 1px por lado a cada 2 linhas). */
  triangle(ax: number, ay: number, h: number, color: Hex): void {
    for (let i = 0; i < h; i++) {
      const half = Math.floor((i + 1) / 2);
      this.hline(ax - half, ax + half, ay + i, color);
    }
  }

  rect(x: number, y: number, w: number, h: number, color: Hex | null, alpha = 255): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color, alpha);
  }

  /** Retângulo pintado apenas onde o padrão de dithering permite. */
  rectDither(x: number, y: number, w: number, h: number, color: Hex, pattern: DitherFn = DITHER.checker, alpha = 255): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (pattern(xx, yy)) this.set(xx, yy, color, alpha);
  }

  /** Retângulo com sombra composta (alpha) — para sombras no chão. */
  rectBlend(x: number, y: number, w: number, h: number, color: Hex, alpha: number): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.blend(xx, yy, color, alpha);
  }

  box(x: number, y: number, w: number, h: number, color: Hex): void {
    this.hline(x, x + w - 1, y, color);
    this.hline(x, x + w - 1, y + h - 1, color);
    this.vline(x, y, y + h - 1, color);
    this.vline(x + w - 1, y, y + h - 1, color);
  }

  hline(x0: number, x1: number, y: number, color: Hex, alpha = 255): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, color, alpha);
  }

  vline(x: number, y0: number, y1: number, color: Hex, alpha = 255): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, color, alpha);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: Hex, alpha = 255): void {
    // Bresenham exige inteiros; coordenadas fracionárias nunca atingiriam o ponto final.
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, color, alpha);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  /** Disco preenchido (raio em pixels). */
  disc(cx: number, cy: number, r: number, color: Hex, alpha = 255): void {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r + r * 0.5) this.set(cx + x, cy + y, color, alpha);
  }

  /** Disco com a borda externa em dithering (transição suave para manchas de terreno). */
  discSoft(cx: number, cy: number, r: number, color: Hex, pattern: DitherFn = DITHER.checker): void {
    const inner = Math.max(0, r - 1.5);
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d2 = x * x + y * y;
        if (d2 > r * r + r * 0.5) continue;
        if (d2 <= inner * inner || pattern(cx + x, cy + y)) this.set(cx + x, cy + y, color);
      }
  }

  /** Elipse preenchida. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: Hex, alpha = 255): void {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) this.set(cx + x, cy + y, color, alpha);
  }

  /** Elipse com composição alpha (sombra suave no chão). */
  ellipseBlend(cx: number, cy: number, rx: number, ry: number, color: Hex, alpha: number): void {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) this.blend(cx + x, cy + y, color, alpha);
  }

  /** Retângulo com cantos arredondados (1px). */
  rrect(x: number, y: number, w: number, h: number, color: Hex, alpha = 255): void {
    this.rect(x + 1, y, w - 2, h, color, alpha);
    this.rect(x, y + 1, w, h - 2, color, alpha);
  }

  /** Retângulo com cantos arredondados de raio r (círculos de pixel art nos cantos). */
  rrectR(x: number, y: number, w: number, h: number, r: number, color: Hex, alpha = 255): void {
    r = Math.min(r, Math.floor(w / 2), Math.floor(h / 2));
    if (r <= 1) { this.rrect(x, y, w, h, color, alpha); return; }
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const dx = xx < r ? r - xx - 0.5 : xx >= w - r ? xx - (w - r) + 0.5 : 0;
        const dy = yy < r ? r - yy - 0.5 : yy >= h - r ? yy - (h - r) + 0.5 : 0;
        if (dx * dx + dy * dy <= r * r) this.set(x + xx, y + yy, color, alpha);
      }
  }

  /** Contorno (1px) de um retângulo arredondado de raio r. */
  rrectOutline(x: number, y: number, w: number, h: number, r: number, color: Hex): void {
    // a borda é a diferença entre a forma e a mesma forma encolhida em 1px
    const outer = new Pix(w, h); outer.rrectR(0, 0, w, h, r, color);
    const inner = new Pix(w, h); inner.rrectR(1, 1, w - 2, h - 2, Math.max(0, r - 1), color);
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) if (outer.opaque(xx, yy) && !inner.opaque(xx, yy)) this.set(x + xx, y + yy, color);
  }

  /** Contorno de todos os pixels opacos com uma cor (4-vizinhança). */
  outline(color: Hex, diagonal = false): void {
    const src = new Uint8ClampedArray(this.data);
    const n4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const n8 = [...n4, [-1, -1], [1, -1], [-1, 1], [1, 1]];
    const ns = diagonal ? n8 : n4;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        if (src[i + 3] !== 0) continue;
        for (const [ox, oy] of ns) {
          const nx = x + ox; const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
          if (src[(ny * this.w + nx) * 4 + 3] !== 0) { this.set(x, y, color); break; }
        }
      }
  }

  /**
   * Sombreamento interno: escurece os pixels opacos cuja vizinhança inferior/direita é transparente
   * e clareia os que têm a vizinhança superior transparente. Dá volume a qualquer silhueta.
   */
  bevel(dark = 0.22, light = 0.18, skip?: (hex: Hex) => boolean): void {
    const src = new Uint8ClampedArray(this.data);
    const alphaAt = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[(y * this.w + x) * 4 + 3]);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        if (src[i + 3] === 0) continue;
        const hex = rgbToHex(src[i], src[i + 1], src[i + 2]);
        if (skip && skip(hex)) continue;
        const below = alphaAt(x, y + 1) === 0;
        const right = alphaAt(x + 1, y) === 0;
        const above = alphaAt(x, y - 1) === 0;
        if (below || right) this.set(x, y, mix(hex, '#1d1418', dark), src[i + 3]);
        else if (above) this.set(x, y, mix(hex, '#fff8ee', light), src[i + 3]);
      }
  }

  /** Substitui uma cor por outra em todo o buffer. */
  replace(from: Hex, to: Hex): void {
    const [fr, fg, fb] = hexToRgb(from);
    const [tr, tg, tb] = hexToRgb(to);
    for (let i = 0; i < this.data.length; i += 4) {
      if (this.data[i + 3] === 0) continue;
      if (this.data[i] === fr && this.data[i + 1] === fg && this.data[i + 2] === fb) { this.data[i] = tr; this.data[i + 1] = tg; this.data[i + 2] = tb; }
    }
  }

  /** Desenha a partir de linhas de texto, onde cada caractere mapeia para uma cor. */
  rows(rows: string[], map: Record<string, Hex | null>, ox = 0, oy = 0): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ' ' || ch === '.') continue;
        const c = map[ch];
        if (c) this.set(ox + x, oy + y, c);
      }
    });
  }

  blit(src: Pix, ox: number, oy: number, flipX = false, alphaMul = 1): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const [r, g, b, a] = src.get(x, y);
        if (a === 0) continue;
        const tx = ox + (flipX ? src.w - 1 - x : x);
        const ty = oy + y;
        const i = this.idx(tx, ty);
        if (i < 0) continue;
        if (alphaMul >= 1 && a === 255) { this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a; }
        else this.blend(tx, ty, rgbToHex(r, g, b), Math.round(a * alphaMul));
      }
  }

  /** Cópia com rotação de 90° no sentido horário (n vezes). */
  rotated(times = 1): Pix {
    let cur: Pix = this;
    for (let t = 0; t < ((times % 4) + 4) % 4; t++) {
      const out = new Pix(cur.h, cur.w);
      for (let y = 0; y < cur.h; y++)
        for (let x = 0; x < cur.w; x++) {
          const [r, g, b, a] = cur.get(x, y);
          if (a === 0) continue;
          const nx = cur.h - 1 - y; const ny = x;
          const i = (ny * out.w + nx) * 4;
          out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a;
        }
      cur = out;
    }
    return cur === this ? this.clone() : cur;
  }

  flippedX(): Pix { const out = new Pix(this.w, this.h); out.blit(this, 0, 0, true); return out; }

  flippedY(): Pix {
    const out = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const [r, g, b, a] = this.get(x, y);
        const i = ((this.h - 1 - y) * this.w + x) * 4;
        out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a;
      }
    return out;
  }

  clone(): Pix { const out = new Pix(this.w, this.h); out.data.set(this.data); out.wrap = this.wrap; return out; }

  /** Aplica uma transformação de cor a todos os pixels (usado para o Desbotamento). */
  mapColors(fn: (hex: Hex) => Hex): Pix {
    const out = new Pix(this.w, this.h);
    const cache = new Map<string, [number, number, number]>();
    for (let i = 0; i < this.data.length; i += 4) {
      const a = this.data[i + 3];
      if (a === 0) continue;
      const key = `${this.data[i]},${this.data[i + 1]},${this.data[i + 2]}`;
      let rgb = cache.get(key);
      if (!rgb) {
        const hex = '#' + [this.data[i], this.data[i + 1], this.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        rgb = hexToRgb(fn(hex));
        cache.set(key, rgb);
      }
      out.data[i] = rgb[0]; out.data[i + 1] = rgb[1]; out.data[i + 2] = rgb[2]; out.data[i + 3] = a;
    }
    return out;
  }

  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

/** Sombra elíptica suave, pronta para ficar sob objetos. */
export function shadowPix(w: number, h: number, alpha = 90): Pix {
  const p = new Pix(w, h);
  p.ellipseBlend(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, '#1d1418', alpha);
  p.ellipseBlend(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 3), Math.max(1, Math.floor(h / 3)), '#1d1418', Math.round(alpha * 0.5));
  return p;
}
