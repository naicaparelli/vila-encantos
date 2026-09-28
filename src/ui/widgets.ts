import Phaser from 'phaser';
import { UI_FONT } from '../config';
import { P, hexToInt } from '../art/palette';
import { SLICES, sliceRects, type Slice } from '../art/ui';

/** Cores da interface: painéis de pergaminho com texto escuro; HUD sobre o mundo usa texto claro com contorno. */
export const UI = {
  panel: hexToInt('#f3e6c8'),
  panelLight: hexToInt('#fbf3e0'),
  border: hexToInt(P.wood),
  accent: hexToInt(P.amber),
  text: '#3a2a2e',
  textDim: '#7d6a74',
  title: '#b85a45',
  light: P.cream,
  good: '#4f7a4c',
  bad: '#c23b3b',
  lilac: P.lilacDark,
};

export function uiScale(scene: Phaser.Scene): number {
  const { width, height } = scene.scale;
  return Phaser.Math.Clamp(Math.min(width, height) / 360, 1, 2.2);
}

/** Escala inteira usada pelas molduras em pixel art (1 ou 2), para manter os pixels quadrados. */
export function pixelScale(scene: Phaser.Scene): number {
  return uiScale(scene) >= 1.6 ? 2 : 1;
}

/** Texto de painel: escuro, sem contorno. */
export function textStyle(size: number, color = UI.text, extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONT,
    fontSize: `${Math.round(size)}px`,
    color,
    ...extra,
  };
}

/** Texto do HUD sobre o mundo: claro com contorno escuro. */
export function hudStyle(size: number, color = UI.light, extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return textStyle(size, color, { stroke: '#1d1418', strokeThickness: Math.max(2, Math.round(size / 6)), ...extra });
}

/** Registra os 9 frames de uma moldura na textura (chamado ao gerar as texturas). */
export function addSliceFrames(tex: Phaser.Textures.Texture, size: number, border: number): void {
  const rects = sliceRects(size, border);
  for (const s of SLICES) { const r = rects[s]; tex.add(s, 0, r.x, r.y, r.w, r.h); }
}

/**
 * Moldura 9-slice feita de 9 imagens (funciona no renderizador Canvas, ao contrário do NineSlice do Phaser).
 * A posição (x, y) é o canto superior esquerdo.
 */
export class PixelPanel extends Phaser.GameObjects.Container {
  private imgs: Record<Slice, Phaser.GameObjects.Image>;
  private tex: string;
  private border: number;
  private ps: number;
  panelW: number;
  panelH: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, tex = 'ui_panel', ps = pixelScale(scene)) {
    super(scene, x, y);
    this.tex = tex;
    this.ps = ps;
    this.border = (scene.textures.get(tex).frames as Record<string, Phaser.Textures.Frame>)['tl'].width;
    this.panelW = w; this.panelH = h;
    this.imgs = {} as Record<Slice, Phaser.GameObjects.Image>;
    for (const s of SLICES) { const img = scene.add.image(0, 0, tex, s).setOrigin(0); this.imgs[s] = img; this.add(img); }
    this.layout();
    scene.add.existing(this);
  }

  setPanelTexture(tex: string): this {
    if (tex === this.tex) return this;
    this.tex = tex;
    for (const s of SLICES) this.imgs[s].setTexture(tex, s);
    return this;
  }

  resize(w: number, h: number): this { this.panelW = w; this.panelH = h; this.layout(); return this; }

  private layout(): void {
    const b = this.border * this.ps;
    const w = Math.max(this.panelW, b * 2 + 2); const h = Math.max(this.panelH, b * 2 + 2);
    const mw = w - b * 2; const mh = h - b * 2;
    const put = (s: Slice, x: number, y: number, dw: number, dh: number) => this.imgs[s].setPosition(x, y).setDisplaySize(dw, dh);
    put('tl', 0, 0, b, b); put('t', b, 0, mw, b); put('tr', b + mw, 0, b, b);
    put('l', 0, b, b, mh); put('c', b, b, mw, mh); put('r', b + mw, b, b, mh);
    put('bl', 0, b + mh, b, b); put('b', b, b + mh, mw, b); put('br', b + mw, b + mh, b, b);
  }
}

/** Cria uma moldura de pergaminho na cena. */
export function drawPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, tex = 'ui_panel'): PixelPanel {
  return new PixelPanel(scene, x, y, w, h, tex);
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  /** 'wood' (padrão), 'primary' (coral), 'lilac'. */
  kind?: 'wood' | 'primary' | 'lilac';
  /** Mantido por compatibilidade: um `fill` igual a UI.border vira 'primary'. */
  fill?: number;
  icon?: string;
  fontSize?: number;
  disabled?: boolean;
}

/** Botão de madeira em pixel art (moldura 9-slice + texto/ícone) que funciona com mouse e toque. */
export class Button extends Phaser.GameObjects.Container {
  private bg: PixelPanel;
  private label?: Phaser.GameObjects.Text;
  private iconImg?: Phaser.GameObjects.Image;
  private btnW: number;
  private btnH: number;
  private kind: 'wood' | 'primary' | 'lilac';
  private hit: Phaser.GameObjects.Zone;
  disabled = false;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    const s = uiScale(scene);
    this.btnW = opts.width ?? Math.max(90 * s, text.length * 9 * s + 24 * s);
    this.btnH = opts.height ?? 34 * s;
    this.kind = opts.kind ?? (opts.fill === UI.border || opts.fill === UI.accent ? 'primary' : 'wood');
    this.bg = new PixelPanel(scene, -this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, this.texFor(false));
    this.add(this.bg);
    if (opts.icon) {
      this.iconImg = scene.add.image(text ? -this.btnW / 2 + 16 * s : 0, 0, opts.icon).setScale(s);
      this.add(this.iconImg);
    }
    if (text) {
      this.label = scene.add.text(opts.icon ? 8 * s : 0, -1, text, hudStyle(opts.fontSize ?? 13 * s)).setOrigin(0.5);
      this.add(this.label);
    }
    this.hit = scene.add.zone(0, 0, this.btnW, this.btnH).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on('pointerover', () => this.draw(true));
    this.hit.on('pointerout', () => this.draw(false));
    this.hit.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (this.disabled) return;
      this.label?.setY(1); this.iconImg?.setY(2);
    });
    this.hit.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      this.label?.setY(-1); this.iconImg?.setY(0);
      if (this.disabled) return;
      onClick();
    });
    this.setDisabled(!!opts.disabled);
    this.draw(false);
    scene.add.existing(this);
  }

  private texFor(hover: boolean): string {
    if (this.disabled) return 'ui_btn_disabled';
    if (this.kind === 'primary') return hover ? 'ui_btn_primary_hover' : 'ui_btn_primary';
    if (this.kind === 'lilac') return hover ? 'ui_btn_hover' : 'ui_btn_lilac';
    return hover ? 'ui_btn_hover' : 'ui_btn';
  }

  setDisabled(d: boolean): this {
    this.disabled = d;
    this.label?.setAlpha(d ? 0.6 : 1);
    this.draw(false);
    return this;
  }

  setText(t: string): this {
    this.label?.setText(t);
    return this;
  }

  private draw(hover: boolean): void {
    this.bg.setPanelTexture(this.texFor(hover));
  }
}

/** Botão redondo com ícone (controles mobile e ícones do HUD). */
export class RoundButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Image;
  private r: number;
  private zone: Phaser.GameObjects.Zone;
  private caption?: Phaser.GameObjects.Text;
  isDown = false;

  constructor(scene: Phaser.Scene, x: number, y: number, icon: string, radius: number, onDown: () => void, onUp?: () => void, caption?: string) {
    super(scene, x, y);
    this.r = radius;
    this.bg = scene.add.image(0, 0, 'ui_round').setDisplaySize(radius * 2, radius * 2);
    this.add(this.bg);
    const img = scene.add.image(0, -1, icon).setScale(Math.max(1, Math.round((radius / 14) * 2) / 2));
    this.add(img);
    if (caption) {
      this.caption = scene.add.text(0, radius + 6, caption, hudStyle(11 * uiScale(scene))).setOrigin(0.5, 0);
      this.add(this.caption);
    }
    this.zone = scene.add.zone(0, 0, radius * 2.2, radius * 2.2).setInteractive();
    this.add(this.zone);
    this.zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      this.isDown = true;
      this.draw(true);
      onDown();
    });
    const up = () => { if (!this.isDown) return; this.isDown = false; this.draw(false); onUp?.(); };
    this.zone.on('pointerup', up);
    this.zone.on('pointerout', up);
    this.draw(false);
    scene.add.existing(this);
  }

  setCaption(t: string): void { this.caption?.setText(t); }

  private draw(active: boolean): void {
    this.bg.setTexture(active ? 'ui_round_active' : 'ui_round').setDisplaySize(this.r * 2, this.r * 2);
  }
}

/** Barra de progresso em pixel art. */
export class PixelBar extends Phaser.GameObjects.Container {
  private bg: PixelPanel;
  private fill: PixelPanel;
  private barW: number;
  private barH: number;
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    super(scene, x, y);
    this.barW = w; this.barH = h;
    this.bg = new PixelPanel(scene, 0, 0, w, h, 'ui_bar_bg', 1);
    this.fill = new PixelPanel(scene, 2, 2, Math.max(8, w - 4), Math.max(6, h - 4), 'ui_bar_fill', 1);
    this.add([this.bg, this.fill]);
    scene.add.existing(this);
  }
  setProgress(t: number): this {
    const w = Math.round(Phaser.Math.Clamp(t, 0, 1) * (this.barW - 4));
    this.fill.setVisible(w >= 6);
    if (w >= 6) this.fill.resize(w, Math.max(6, this.barH - 4));
    return this;
  }
}
