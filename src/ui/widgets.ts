import Phaser from 'phaser';
import { UI_FONT } from '../config';
import { P, hexToInt } from '../art/palette';

export const UI = {
  panel: hexToInt('#2a1f2e'),
  panelLight: hexToInt('#3d2f42'),
  border: hexToInt(P.lilac),
  accent: hexToInt(P.amber),
  text: P.cream,
  textDim: '#bdb0c4',
  good: P.sage,
  bad: P.coral,
};

export function uiScale(scene: Phaser.Scene): number {
  const { width, height } = scene.scale;
  return Phaser.Math.Clamp(Math.min(width, height) / 360, 1, 2.2);
}

export function textStyle(size: number, color = UI.text, extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONT,
    fontSize: `${Math.round(size)}px`,
    color,
    stroke: '#1d1418',
    strokeThickness: Math.max(2, Math.round(size / 6)),
    ...extra,
  };
}

export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = UI.panel, alpha = 0.94): void {
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(3, UI.border, 1);
  g.strokeRoundedRect(x, y, w, h, 8);
  g.lineStyle(1, UI.accent, 0.6);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 6);
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  fill?: number;
  icon?: string;
  fontSize?: number;
  disabled?: boolean;
}

/** Botão simples (retângulo arredondado + texto/ícone) que funciona com mouse e toque. */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.Text;
  private iconImg?: Phaser.GameObjects.Image;
  private btnW: number;
  private btnH: number;
  private fill: number;
  private hit: Phaser.GameObjects.Zone;
  disabled = false;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    const s = uiScale(scene);
    this.btnW = opts.width ?? Math.max(90 * s, text.length * 9 * s + 24 * s);
    this.btnH = opts.height ?? 34 * s;
    this.fill = opts.fill ?? UI.panelLight;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    if (opts.icon) {
      this.iconImg = scene.add.image(text ? -this.btnW / 2 + 16 * s : 0, 0, opts.icon).setScale(s);
      this.add(this.iconImg);
    }
    if (text) {
      this.label = scene.add.text(opts.icon ? 8 * s : 0, 0, text, textStyle(opts.fontSize ?? 13 * s)).setOrigin(0.5);
      this.add(this.label);
    }
    this.hit = scene.add.zone(0, 0, this.btnW, this.btnH).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on('pointerover', () => this.draw(true));
    this.hit.on('pointerout', () => this.draw(false));
    this.hit.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (this.disabled) return;
      this.setScale(0.95);
    });
    this.hit.on('pointerup', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      this.setScale(1);
      if (this.disabled) return;
      onClick();
    });
    this.setDisabled(!!opts.disabled);
    this.draw(false);
    scene.add.existing(this);
  }

  setDisabled(d: boolean): this {
    this.disabled = d;
    this.setAlpha(d ? 0.45 : 1);
    return this;
  }

  setText(t: string): this {
    this.label?.setText(t);
    return this;
  }

  private draw(hover: boolean): void {
    this.bg.clear();
    this.bg.fillStyle(hover ? UI.accent : this.fill, hover ? 0.9 : 0.95);
    this.bg.fillRoundedRect(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, 8);
    this.bg.lineStyle(2, hover ? 0xffffff : UI.border, 1);
    this.bg.strokeRoundedRect(-this.btnW / 2, -this.btnH / 2, this.btnW, this.btnH, 8);
  }
}

/** Botão redondo com ícone (controles mobile). */
export class RoundButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private r: number;
  private zone: Phaser.GameObjects.Zone;
  private caption?: Phaser.GameObjects.Text;
  isDown = false;

  constructor(scene: Phaser.Scene, x: number, y: number, icon: string, radius: number, onDown: () => void, onUp?: () => void, caption?: string) {
    super(scene, x, y);
    this.r = radius;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    const img = scene.add.image(0, 0, icon).setScale(radius / 16);
    this.add(img);
    if (caption) {
      this.caption = scene.add.text(0, radius + 8, caption, textStyle(11 * uiScale(scene))).setOrigin(0.5, 0);
      this.add(this.caption);
    }
    this.zone = scene.add.zone(0, 0, radius * 2.2, radius * 2.2).setInteractive();
    this.add(this.zone);
    this.zone.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
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
    this.bg.clear();
    this.bg.fillStyle(active ? UI.accent : UI.panel, active ? 0.85 : 0.6);
    this.bg.fillCircle(0, 0, this.r);
    this.bg.lineStyle(2, active ? 0xffffff : UI.border, 0.9);
    this.bg.strokeCircle(0, 0, this.r);
  }
}
