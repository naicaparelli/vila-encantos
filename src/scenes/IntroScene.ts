import Phaser from 'phaser';
import { game } from '../state/GameState';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Button, textStyle, uiScale, drawPanel, UI } from '../ui/widgets';
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
  private captionBg!: Phaser.GameObjects.Graphics;
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
          c.add(this.add.image(w / 2, h * 0.5, 'officeDesk').setScale(z));
          c.add(this.add.sprite(w / 2, h * 0.5 + 36 * z, `player_${sp}`, 'north_0').setScale(z).setOrigin(0.5, 1));
          c.add(this.add.image(w / 2, h * 0.5 + 44 * z, 'officeChair').setScale(z).setOrigin(0.5, 1).setAlpha(0.9));
        },
      },
      {
        caption: 'Até que, entre um e-mail e outro, um anúncio aparece na tela.',
        build: (c, w, h, s) => {
          this.officeBackdrop(c, w, h, s);
          const pw = Math.min(w - 40, 420 * s);
          const ph = 150 * s;
          const g = this.add.graphics();
          g.fillStyle(0x7fb2d6, 1); g.fillRoundedRect(w / 2 - pw / 2, h / 2 - ph / 2, pw, ph, 6);
          g.fillStyle(0xf3e6c8, 1); g.fillRoundedRect(w / 2 - pw / 2 + 8, h / 2 - ph / 2 + 8, pw - 16, ph - 16, 4);
          c.add(g);
          c.add(this.add.image(w / 2 - pw / 2 + 60 * s, h / 2, 'facadeAtelierNew').setScale(0.5 * s));
          c.add(this.add.text(w / 2 + 40 * s, h / 2, 'Recomece sua vida na encantadora\nVila dos Pequenos Encantos.\n\nAteliê mobiliado, vista privilegiada\ne vizinhos acolhedores.', {
            fontFamily: 'Georgia, serif', fontSize: `${Math.round(11 * s)}px`, color: '#3a2a2e', align: 'center', wordWrap: { width: pw - 140 * s },
          }).setOrigin(0.5));
        },
      },
      {
        caption: 'Você compra o ateliê naquela noite. Pede demissão na manhã seguinte. E parte cheio de expectativas.',
        build: (c, w, h, s) => {
          const g = this.add.graphics();
          g.fillStyle(0xc9d6e6, 1); g.fillRect(0, 0, w, h);
          c.add(g);
          const cols = Math.ceil(w / 32) + 2;
          for (let x = 0; x < cols; x++) {
            c.add(this.add.image(x * 32, h * 0.62, 'tile_grass').setOrigin(0));
            c.add(this.add.image(x * 32, h * 0.62 + 32, 'tile_path').setOrigin(0));
            c.add(this.add.image(x * 32, h * 0.62 + 64, 'tile_grass2').setOrigin(0));
            if (x % 3 === 0) c.add(this.add.image(x * 32 + 16, h * 0.62 + 4, x % 2 ? 'tree' : 'treeRound').setOrigin(0.5, 1));
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
          c.add(this.add.sprite(w / 2, h * 0.95, `player_${sp}`, 'north_0').setScale(z).setOrigin(0.5, 1));
        },
      },
    ];

    this.container = this.add.container(0, 0);
    this.captionBg = this.add.graphics();
    this.caption = this.add.text(0, 0, '', textStyle(13, P.cream)).setOrigin(0.5, 0);
    const s = uiScale(this);
    const skip = new Button(this, this.scale.width - 60 * s, 22 * s, 'Pular', () => this.finish(), { width: 90 * s, height: 28 * s, fontSize: 11 * s });
    skip.setDepth(10);
    this.add.text(this.scale.width / 2, this.scale.height - 8, 'toque / E / espaço para continuar', textStyle(9 * s, UI.textDim)).setOrigin(0.5, 1).setDepth(10);

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
    this.caption.setStyle(textStyle(13 * s, P.cream, { wordWrap: { width: Math.min(w - 40, 560 * s) }, align: 'center' }));
    this.caption.setText(text);
    const th = this.caption.height + 24 * s;
    const bw = Math.min(w - 20, 600 * s);
    this.captionBg.clear();
    drawPanel(this.captionBg, w / 2 - bw / 2, h - th - 24 * s, bw, th);
    this.caption.setPosition(w / 2, h - th - 12 * s);
    this.caption.setDepth(5);
    this.captionBg.setDepth(4);
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
