import Phaser from 'phaser';
import { SPECIES_INFO, type Species } from '../config';
import { game } from '../state/GameState';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Button, textStyle, hudStyle, uiScale, drawPanel, PixelPanel, UI } from '../ui/widgets';
import { P } from '../art/palette';

const SPECIES: Species[] = ['coelho', 'gato', 'cachorro'];

/** Tela de título com escolha entre três personagens (README §5). */
export class TitleScene extends Phaser.Scene {
  private selected: Species = 'coelho';
  private objects: Phaser.GameObjects.GameObject[] = [];
  private mode: 'menu' | 'select' = 'menu';

  constructor() { super('TitleScene'); }

  create(): void {
    this.mode = 'menu';
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));
    this.input.once('pointerdown', () => { music.ensureContext(); music.play('title'); });
    this.input.keyboard?.once('keydown', () => { music.ensureContext(); music.play('title'); });
  }

  private clear(): void {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  private build(): void {
    this.clear();
    const { width, height } = this.scale;
    const s = uiScale(this);

    // fundo: gradiente de tiles de grama desbotada + faixa de céu
    const bg = this.add.graphics();
    bg.fillStyle(0x2b2f4a, 1); bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x3d3552, 1); bg.fillRect(0, height * 0.55, width, height);
    this.objects.push(bg);
    const cols = Math.ceil(width / 32) + 1;
    const rowsN = Math.ceil((height * 0.45) / 32) + 1;
    for (let y = 0; y < rowsN; y++)
      for (let x = 0; x < cols; x++) {
        const key = (x + y) % 3 === 0 ? 'tile_grass2__faded' : 'tile_grass__faded';
        this.objects.push(this.add.image(x * 32, height * 0.55 + y * 32, key).setOrigin(0).setAlpha(0.6));
      }
    // fachada do ateliê como cenário
    const fac = this.add.image(width / 2, height * 0.58, this.mode === 'menu' ? 'facadeAtelierOld__faded' : 'facadeAtelierNew').setOrigin(0.5, 1).setScale(Math.min(2, s * 1.2));
    this.objects.push(fac);

    const title = this.add.text(width / 2, height * 0.12, 'Vila dos\nPequenos Encantos', textStyle(30 * s, P.cream, { align: 'center', strokeThickness: 6 })).setOrigin(0.5);
    this.objects.push(title);
    this.objects.push(this.add.text(width / 2, height * 0.12 + 44 * s, 'um cozy game de crafting, decoração e memórias', textStyle(11 * s, UI.textDim)).setOrigin(0.5));

    if (this.mode === 'menu') this.buildMenu(width, height, s);
    else this.buildSelect(width, height, s);

    const muteBtn = new Button(this, width - 50 * s, 24 * s, music.muted ? 'Som: off' : 'Som: on', () => {
      const m = music.toggleMute();
      muteBtn.setText(m ? 'Som: off' : 'Som: on');
    }, { width: 84 * s, height: 26 * s, fontSize: 11 * s });
    this.objects.push(muteBtn);
  }

  private buildMenu(width: number, height: number, s: number): void {
    const y0 = height * 0.66;
    const hasSave = game.hasSave();
    if (hasSave) {
      this.objects.push(new Button(this, width / 2, y0, 'Continuar', () => { sfx('select'); this.continueGame(); }, { width: 200 * s, height: 40 * s, fontSize: 15 * s, kind: 'primary' }));
    }
    this.objects.push(new Button(this, width / 2, y0 + (hasSave ? 50 * s : 0), 'Novo jogo', () => { sfx('select'); this.mode = 'select'; this.build(); }, { width: 200 * s, height: 40 * s, fontSize: 15 * s }));
    this.objects.push(this.add.text(width / 2, height - 16 * s, 'WASD / setas: andar · Shift: correr · E: interagir · B: mochila · Tab: caderno · M: mapa · F: decorar', hudStyle(9 * s, P.lilacLight, { align: 'center', wordWrap: { width: width - 40 } })).setOrigin(0.5, 1));
  }

  private buildSelect(width: number, height: number, s0: number): void {
    const s = Math.min(s0, 1.5);
    const panelW = Math.min(width - 24, 520 * s);
    const panelH = Math.min(height - height * 0.3 - 12, 290 * s);
    const px = width / 2 - panelW / 2;
    const py = height * 0.3;
    this.objects.push(drawPanel(this, px, py, panelW, panelH));
    this.objects.push(this.add.text(width / 2, py + 14 * s, 'Quem vai recomeçar a vida na vila?', textStyle(14 * s, UI.title)).setOrigin(0.5, 0));

    const slotW = panelW / 3;
    SPECIES.forEach((sp, i) => {
      const cx = px + slotW * i + slotW / 2;
      const sel = this.selected === sp;
      this.objects.push(new PixelPanel(this, cx - slotW / 2 + 8, py + 40 * s, slotW - 16, 130 * s, sel ? 'ui_slot_sel' : 'ui_slot'));
      const spr = this.add.sprite(cx, py + 138 * s, `player_${sp}`, 'south_0').setOrigin(0.5, 1).setScale(2 * Math.min(1.4, s));
      if (sel) spr.play(`player_${sp}_walk_south`);
      this.objects.push(spr);
      this.objects.push(this.add.text(cx, py + 146 * s, SPECIES_INFO[sp].name, textStyle(12 * s, sel ? UI.title : UI.text)).setOrigin(0.5, 0));
      const zone = this.add.zone(cx, py + 105 * s, slotW - 16, 130 * s).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => { if (this.selected !== sp) { this.selected = sp; sfx('select'); this.build(); } });
      this.objects.push(zone);
    });

    this.objects.push(this.add.text(width / 2, py + 178 * s, SPECIES_INFO[this.selected].desc, textStyle(10 * s, UI.textDim, { align: 'center', wordWrap: { width: panelW - 30 } })).setOrigin(0.5, 0));
    this.objects.push(this.add.text(width / 2, py + 208 * s, 'A escolha é apenas visual: todos têm as mesmas habilidades.', textStyle(9 * s, UI.textDim)).setOrigin(0.5, 0));

    const by = py + panelH - 24 * s;
    this.objects.push(new Button(this, width / 2 - 80 * s, by, 'Voltar', () => { this.mode = 'menu'; this.build(); }, { width: 130 * s, height: 32 * s, fontSize: 13 * s }));
    this.objects.push(new Button(this, width / 2 + 80 * s, by, 'Começar', () => { sfx('quest'); this.startNew(); }, { width: 150 * s, height: 32 * s, fontSize: 13 * s, kind: 'primary' }));
  }

  private startNew(): void {
    music.ensureContext();
    game.newGame(this.selected);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('IntroScene'));
  }

  private continueGame(): void {
    music.ensureContext();
    if (!game.load()) { this.mode = 'select'; this.build(); return; }
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (!game.data.introSeen) this.scene.start('IntroScene');
      else this.scene.start('WorldScene', { map: game.data.map, x: game.data.x, y: game.data.y });
    });
  }
}
