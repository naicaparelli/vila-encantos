import Phaser from 'phaser';
import { game } from '../state/GameState';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Button, textStyle, hudStyle, uiScale, drawPanel, PixelPanel, UI } from '../ui/widgets';
import { P } from '../art/palette';

interface Slide {
  build: (c: Phaser.GameObjects.Container, w: number, h: number, s: number) => void;
  caption: string;
}

/**
 * Cinemática de abertura (README §6): escritório cinza, o anúncio, a viagem
 * e a chegada. Cada "slide" é um pequeno diorama desenhado com as texturas do jogo.
 */
export class IntroScene extends Phaser.Scene {
  private idx = 0;
  private container!: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;
  private captionBg: PixelPanel | null = null;
  private slides: Slide[] = [];
  private busy = false;

  constructor() { super('IntroScene'); }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    music.play('office');
    const sp = game.data.species;

    this.slides = [
      {
        caption: 'Mais um dia no escritório. Mais uma planilha. As luzes frias nunca se apagam por completo.',
        build: (c, w, h, s) => {
          this.officeBackdrop(c, w, h, s);
          const z = Math.min(3, Math.max(2, s * 1.6));
          c.add(this.add.image(w / 2, h * 0.5 + 40 * z, 'shadow').setDisplaySize(70 * z, 14 * z).setAlpha(0.5));
          c.add(this.add.image(w / 2, h * 0.5, 'officeDesk').setScale(z));
          c.add(this.add.sprite(w / 2, h * 0.5 + 36 * z, `player_${sp}`, 'north_0').setScale(z).setOrigin(0.5, 1));
          c.add(this.add.image(w / 2, h * 0.5 + 44 * z, 'officeChair').setScale(z).setOrigin(0.5, 1).setAlpha(0.9));
        },
      },
      {
        caption: 'Até que, entre um e-mail e outro, um anúncio aparece na tela.',
        build: (c, w, h, s) => {
          this.officeBackdrop(c, w, h, s);
          const pw = Math.min(w - 40, 440 * s);
          const ph = 160 * s;
          // monitor com o anúncio
          const g = this.add.graphics();
          g.fillStyle(0x4a5060, 1); g.fillRoundedRect(w / 2 - pw / 2 - 10 * s, h / 2 - ph / 2 - 10 * s, pw + 20 * s, ph + 20 * s, 6);
          g.fillStyle(0x7fb2d6, 1); g.fillRect(w / 2 - pw / 2 - 4 * s, h / 2 - ph / 2 - 4 * s, pw + 8 * s, ph + 8 * s);
          c.add(g);
          c.add(drawPanel(this, w / 2 - pw / 2, h / 2 - ph / 2, pw, ph));
          c.add(this.add.image(w / 2 - pw / 2 + 70 * s, h / 2 + 4 * s, 'facadeAtelierNew').setScale(0.55 * s));
          c.add(this.add.image(w / 2 - pw / 2 + 70 * s, h / 2 - 52 * s, 'sparkle0').setScale(s));
          c.add(this.add.text(w / 2 + 50 * s, h / 2 - 8 * s, 'Recomece sua vida na encantadora\nVila dos Pequenos Encantos.', {
            fontFamily: 'Georgia, serif', fontSize: `${Math.round(12 * s)}px`, color: UI.title, align: 'center', wordWrap: { width: pw - 150 * s },
          }).setOrigin(0.5));
          c.add(this.add.text(w / 2 + 50 * s, h / 2 + 34 * s, 'Ateliê mobiliado, vista privilegiada\ne vizinhos acolhedores.', {
            fontFamily: 'Georgia, serif', fontSize: `${Math.round(10 * s)}px`, color: UI.textDim, align: 'center', wordWrap: { width: pw - 150 * s },
          }).setOrigin(0.5));
        },
      },
      {
        caption: 'Você compra o ateliê naquela noite. Pede demissão na manhã seguinte. E parte cheio de expectativas.',
        build: (c, w, h, s) => {
          const g = this.add.graphics();
          const bands = 6;
          for (let i = 0; i < bands; i++) { const col = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor('#7fb2d6'), Phaser.Display.Color.ValueToColor('#dbe8f6'), bands - 1, i); g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1); g.fillRect(0, (h * 0.62 * i) / bands, w, h * 0.62 / bands + 1); }
          g.fillStyle(0x8fb08a, 1); g.fillEllipse(w * 0.3, h * 0.62, w * 0.9, 80 * s); g.fillEllipse(w * 0.85, h * 0.62, w * 0.8, 60 * s);
          c.add(g);
          for (let i = 0; i < 3; i++) { const cl = this.add.image(w * (0.15 + i * 0.35), h * (0.12 + (i % 2) * 0.12), `fx_cloud${i}`).setScale(Math.min(2, s * 1.2)); c.add(cl); this.tweens.add({ targets: cl, x: cl.x - 60 * s, duration: 5200, ease: 'Linear' }); }
          const cols = Math.ceil(w / 32) + 2;
          for (let x = 0; x < cols; x++) {
            c.add(this.add.image(x * 32, h * 0.62, 'tile_grass').setOrigin(0));
            c.add(this.add.image(x * 32, h * 0.62 + 32, 'tile_path').setOrigin(0));
            c.add(this.add.image(x * 32, h * 0.62 + 32, 'tile_edgePathN').setOrigin(0));
            c.add(this.add.image(x * 32, h * 0.62 + 32, 'tile_edgePathS').setOrigin(0));
            c.add(this.add.image(x * 32, h * 0.62 + 64, 'tile_grass2').setOrigin(0));
            for (let y = 3; y * 32 < h - h * 0.62; y++) c.add(this.add.image(x * 32, h * 0.62 + y * 32, (x + y) % 4 === 0 ? 'tile_flowers' : 'tile_grass').setOrigin(0));
            if (x % 3 === 0) c.add(this.add.image(x * 32 + 16, h * 0.62 + 4, x % 2 ? 'tree' : 'treeRound').setOrigin(0.5, 1));
            if (x % 3 === 1) c.add(this.add.image(x * 32, h * 0.62 - 4, 'tile_fenceH').setOrigin(0, 1));
          }
          const z = Math.min(2.5, Math.max(1.5, s * 1.3));
          const bus = this.add.image(-120, h * 0.62 + 48, 'busSide').setScale(z).setOrigin(0.5, 1);
          c.add(bus);
          this.tweens.add({ targets: bus, x: w + 120, duration: 5200, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: bus, y: bus.y - 2, duration: 180, yoyo: true, repeat: -1 });
        },
      },
      {
        caption: 'A placa da vila está quebrada. A praça, sem cor e coberta de folhas. As casas, fechadas. Quase ninguém na rua.',
        build: (c, w, h, s) => {
          const cols = Math.ceil(w / 32) + 1;
          const rows = Math.ceil(h / 32) + 1;
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) c.add(this.add.image(x * 32, y * 32, (x + y) % 2 ? 'tile_cobble__faded' : 'tile_grass__faded').setOrigin(0));
          const z = Math.min(2, Math.max(1.2, s));
          c.add(this.add.image(w / 2, h * 0.75, 'fountainDry__faded').setScale(z).setOrigin(0.5, 1));
          c.add(this.add.image(w / 2 - 140 * z, h * 0.45, 'houseA__faded').setScale(z * 0.8).setOrigin(0.5, 1));
          c.add(this.add.image(w / 2 + 140 * z, h * 0.45, 'houseB__faded').setScale(z * 0.8).setOrigin(0.5, 1));
          c.add(this.add.image(w / 2 - 60 * z, h * 0.9, 'signBroken__faded').setScale(z).setOrigin(0.5, 1));
          c.add(this.add.image(w / 2 - 110 * z, h * 0.75, 'lamppost__faded').setScale(z).setOrigin(0.5, 1));
          c.add(this.add.image(w / 2 + 110 * z, h * 0.75, 'lamppost__faded').setScale(z).setOrigin(0.5, 1));
          for (let i = 0; i < 6; i++) c.add(this.add.image(w * (0.15 + i * 0.14), h * (0.55 + (i % 2) * 0.3), 'leavesPile__faded').setScale(z));
          c.add(this.add.sprite(w / 2 + 40 * z, h * 0.92, `player_${sp}`, 'north_0').setScale(z).setOrigin(0.5, 1));
        },
      },
      {
        caption: 'E o ateliê "mobiliado, com vista privilegiada" é aquele ali. Menor. Com o telhado furado. Mas com uma luzinha âmbar ainda acesa.',
        build: (c, w, h, s) => {
          const cols = Math.ceil(w / 32) + 1;
          const rows = Math.ceil(h / 32) + 1;
          for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) c.add(this.add.image(x * 32, y * 32, 'tile_grass__faded').setOrigin(0));
          const z = Math.min(2.2, Math.max(1.3, s * 1.1));
          const fac = this.add.image(w / 2, h * 0.8, 'facadeAtelierOld__faded').setScale(z).setOrigin(0.5, 1);
          c.add(fac);
          const glow = this.add.image(w / 2 + 4 * z, h * 0.8 - 60 * z, 'sparkle0').setScale(z);
          c.add(glow);
          this.tweens.add({ targets: glow, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
          for (let i = 0; i < 8; i++) { const lf = this.add.image(Math.random() * w, Math.random() * h, `fx_leaf${i % 3}`).setScale(z).setAlpha(0.8); c.add(lf); this.tweens.add({ targets: lf, y: h + 20, x: lf.x + 40 * z, angle: 160, duration: 5000 + Math.random() * 3000, repeat: -1, onRepeat: () => { lf.y = -20; lf.x = Math.random() * w; } }); }
          c.add(this.add.sprite(w / 2, h * 0.95, `player_${sp}`, 'north_0').setScale(z).setOrigin(0.5, 1));
        },
      },
    ];

    this.container = this.add.container(0, 0);
    this.caption = this.add.text(0, 0, '', textStyle(13, UI.text)).setOrigin(0.5, 0);
    const s = uiScale(this);
    const skip = new Button(this, this.scale.width - 60 * s, 22 * s, 'Pular', () => this.finish(), { width: 90 * s, height: 28 * s, fontSize: 11 * s });
    skip.setDepth(10);
    this.add.text(this.scale.width / 2, this.scale.height - 6, 'toque / E / espaço para continuar', hudStyle(9 * s, P.lilacLight)).setOrigin(0.5, 1).setDepth(10);

    this.showSlide(0);
    this.input.on('pointerdown', () => this.next());
    this.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.input.keyboard?.on('keydown-E', () => this.next());
    this.input.keyboard?.on('keydown-ENTER', () => this.next());
  }

  private officeBackdrop(c: Phaser.GameObjects.Container, w: number, h: number, s: number): void {
    const cols = Math.ceil(w / 32) + 1;
    const rows = Math.ceil(h / 32) + 1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) c.add(this.add.image(x * 32, y * 32, y < 3 ? 'tile_officeWall' : 'tile_office').setOrigin(0));
    const lights = this.add.graphics();
    for (let x = w * 0.15; x < w; x += w * 0.3) { lights.fillStyle(0xe8f0ff, 0.9); lights.fillRect(x, 8, 60 * s, 6 * s); lights.fillStyle(0xe8f0ff, 0.08); lights.fillTriangle(x - 20 * s, h, x + 80 * s, h, x + 30 * s, 14 * s); }
    c.add(lights);
    c.add(this.add.image(w * 0.25, 40, 'officeWindow').setOrigin(0.5, 0).setScale(Math.min(2, s)));
    c.add(this.add.image(w * 0.8, 96 + 40 * s, 'officePlant').setOrigin(0.5, 1).setScale(Math.min(2, s)));
    const dim = this.add.graphics();
    dim.fillStyle(0x2b2f4a, 0.25); dim.fillRect(0, 0, w, h);
    c.add(dim);
  }

  private showSlide(i: number): void {
    this.idx = i;
    this.container.removeAll(true);
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    this.slides[i].build(this.container, w, h, s);
    this.container.setAlpha(0);
    this.tweens.add({ targets: this.container, alpha: 1, duration: 500 });

    const text = this.slides[i].caption;
    this.caption.setStyle(textStyle(13 * s, UI.text, { wordWrap: { width: Math.min(w - 40, 560 * s) }, align: 'center' }));
    this.caption.setText(text);
    const th = this.caption.height + 28 * s;
    const bw = Math.min(w - 20, 600 * s);
    this.captionBg?.destroy();
    this.captionBg = drawPanel(this, w / 2 - bw / 2, h - th - 26 * s, bw, th).setDepth(4);
    this.caption.setPosition(w / 2, h - th - 12 * s);
    this.caption.setDepth(5);
    sfx('talk');
  }

  private next(): void {
    if (this.busy) return;
    if (this.idx + 1 >= this.slides.length) { this.finish(); return; }
    this.showSlide(this.idx + 1);
  }

  private finish(): void {
    if (this.busy) return;
    this.busy = true;
    game.data.introSeen = true;
    game.save();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('WorldScene', { map: 'praca', x: 9, y: 15, dir: 'north', arrival: true });
    });
  }
}
