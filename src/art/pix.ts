import { hexToRgb, type Hex } from './palette';

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

/**
 * Buffer de pixels para desenhar pixel art em código.
 * Todas as operações são inteiras e sem antialiasing.
 */
export class Pix {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  set(x: number, y: number, color: Hex | null, alpha = 255): void {
    if (!color || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const [r, g, b] = hexToRgb(color);
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = alpha;
  }

  clear(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = 0; this.data[i + 1] = 0; this.data[i + 2] = 0; this.data[i + 3] = 0;
  }

  erase(x: number, y: number, w: number, h: number): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.clear(xx, yy);
  }

  /** Triângulo com ápice em (ax, ay) e base na linha ay + h (largura cresce 1px por lado a cada 2 linhas). */
  triangle(ax: number, ay: number, h: number, color: Hex): void {
    for (let i = 0; i < h; i++) {
      const half = Math.floor((i + 1) / 2);
      this.hline(ax - half, ax + half, ay + i, color);
    }
  }

  get(x: number, y: number): [number, number, number, number] {
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  rect(x: number, y: number, w: number, h: number, color: Hex | null, alpha = 255): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color, alpha);
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

  /** Elipse preenchida. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: Hex, alpha = 255): void {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) this.set(cx + x, cy + y, color, alpha);
  }

  /** Retângulo com cantos arredondados (1px). */
  rrect(x: number, y: number, w: number, h: number, color: Hex, alpha = 255): void {
    this.rect(x + 1, y, w - 2, h, color, alpha);
    this.rect(x, y + 1, w, h - 2, color, alpha);
  }

  /** Contorno de todos os pixels opacos com uma cor. */
  outline(color: Hex): void {
    const src = new Uint8ClampedArray(this.data);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        if (src[i + 3] !== 0) continue;
        const n = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
        for (const [nx, ny] of n) {
          if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
          if (src[(ny * this.w + nx) * 4 + 3] !== 0) { this.set(x, y, color); break; }
        }
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

  blit(src: Pix, ox: number, oy: number, flipX = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const [r, g, b, a] = src.get(x, y);
        if (a === 0) continue;
        const tx = ox + (flipX ? src.w - 1 - x : x);
        const ty = oy + y;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        const i = (ty * this.w + tx) * 4;
        this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a;
      }
  }

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
