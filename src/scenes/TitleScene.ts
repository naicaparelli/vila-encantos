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
    this.tweens.killAll();
  }

  private build(): void {
    this.clear();
    const { width, height } = this.scale;
    const s = uiScale(this);
    const restored = this.mode === 'select';
    const horizon = height * 0.55;

    // céu em faixas (dithering) — mais claro perto do horizonte
    const sky = this.add.graphics();
    const top = Phaser.Display.Color.ValueToColor(restored ? '#7fb2d6' : '#4a5474');
    const bot = Phaser.Display.Color.ValueToColor(restored ? '#dbe8f6' : '#8d97ad');
    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, bands - 1, i);
      sky.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      sky.fillRect(0, (horizon * i) / bands, width, horizon / bands + 1);
    }
    this.objects.push(sky);
    // sol / lua e colinas distantes
    const sun = this.add.graphics();
    sun.fillStyle(restored ? 0xffc857 : 0xd9c49a, restored ? 1 : 0.6); sun.fillCircle(width * 0.82, horizon * 0.28, 22 * s);
    sun.fillStyle(0xfff8ee, restored ? 0.9 : 0.5); sun.fillCircle(width * 0.82 - 6 * s, horizon * 0.28 - 6 * s, 8 * s);
    sun.fillStyle(restored ? 0x8fb08a : 0x6f7a7c, 1); sun.fillEllipse(width * 0.2, horizon, width * 0.7, 90 * s); sun.fillEllipse(width * 0.8, horizon + 6, width * 0.8, 70 * s);
    sun.fillStyle(restored ? 0x5f7f5c : 0x5b6266, 1); sun.fillEllipse(width * 0.5, horizon + 20 * s, width * 0.9, 60 * s);
    this.objects.push(sun);
    // nuvens à deriva
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(width * (0.1 + i * 0.28), horizon * (0.15 + (i % 2) * 0.2), `fx_cloud${i % 3}`).setScale(Math.min(2, s * 1.2)).setAlpha(restored ? 0.95 : 0.55);
      this.objects.push(c);
      this.tweens.add({ targets: c, x: c.x + 40 * s, duration: 9000 + i * 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // chão de grama com flores e caminho
    const cols = Math.ceil(width / 32) + 1;
    const rowsN = Math.ceil((height - horizon) / 32) + 1;
    const suffix = restored ? '' : '__faded';
    for (let y = 0; y < rowsN; y++)
      for (let x = 0; x < cols; x++) {
        const mid = Math.floor(cols / 2);
        const isPath = y >= 1 && Math.abs(x - mid) <= 1 && this.mode === 'menu';
        const key = isPath ? `tile_path${suffix}` : (x * 7 + y * 3) % 5 === 0 ? `tile_flowers${suffix}` : (x + y) % 3 === 0 ? `tile_grass2${suffix}` : `tile_grass${suffix}`;
        this.objects.push(this.add.image(x * 32, horizon + y * 32, key).setOrigin(0));
      }
    // árvores nas laterais
    for (let i = 0; i < 3; i++) {
      this.objects.push(this.add.image(20 + i * 46, horizon + 40 + (i % 2) * 20, (i % 2 ? 'tree' : 'treeRound') + suffix).setOrigin(0.5, 1).setScale(Math.min(2, s)));
      this.objects.push(this.add.image(width - 20 - i * 46, horizon + 40 + ((i + 1) % 2) * 20, (i % 2 ? 'treeRound' : 'tree2') + suffix).setOrigin(0.5, 1).setScale(Math.min(2, s)));
    }
    // fachada do ateliê como cenário
    const facScale = Math.min(1.7, s);
    const fac = this.add.image(width / 2, horizon + 8 * s, restored ? 'facadeAtelierNew' : 'facadeAtelierOld__faded').setOrigin(0.5, 1).setScale(facScale);
    this.objects.push(fac);
    if (!restored) {
      const glow = this.add.image(width / 2 + 4 * facScale, horizon + 8 * s - 60 * facScale, 'sparkle0').setScale(facScale);
      this.objects.push(glow);
      this.tweens.add({ targets: glow, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    }
    // partículas: folhas (desbotado) ou pétalas (restaurado)
    for (let i = 0; i < 10; i++) {
      const pImg = this.add.image(Math.random() * width, Math.random() * height, restored ? `fx_petal${i % 3}` : `fx_leaf${i % 3}`).setScale(Math.min(2, s)).setAlpha(0.85);
      this.objects.push(pImg);
      this.tweens.add({ targets: pImg, y: height + 20, x: pImg.x + 60 * s, angle: 180, duration: 6000 + Math.random() * 5000, delay: Math.random() * 3000, repeat: -1, onRepeat: () => { pImg.y = -20; pImg.x = Math.random() * width; } });
    }

    // placa de madeira pendurada com o título
    const tw = Math.min(width - 40, 400 * s);
    const th = 78 * s;
    const tx = width / 2 - tw / 2;
    const ty = 16 * s;
    const ropes = this.add.graphics();
    ropes.lineStyle(3 * Math.max(1, Math.round(s / 1.5)), 0x7a4a25, 1);
    ropes.lineBetween(tx + 30 * s, 0, tx + 30 * s, ty); ropes.lineBetween(tx + tw - 30 * s, 0, tx + tw - 30 * s, ty);
    this.objects.push(ropes);
    const sign = drawPanel(this, tx, ty, tw, th);
    this.objects.push(sign);
    const title = this.add.text(width / 2, ty + th / 2 - 9 * s, 'Vila dos Pequenos Encantos', textStyle(22 * s, UI.title, { fontStyle: 'bold', align: 'center', wordWrap: { width: tw - 40 * s } })).setOrigin(0.5);
    const subtitle = this.add.text(width / 2, ty + th / 2 + 14 * s, '~ um cozy game de crafting, decoração e memórias ~', textStyle(9.5 * s, UI.lilac, { fontStyle: 'italic' })).setOrigin(0.5);
    this.objects.push(title, subtitle);
    // balanço suave da placa
    this.tweens.add({ targets: [sign, title, subtitle, ropes], y: '+=3', duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const o of [sign, title, subtitle]) o.setDepth(5);

    if (this.mode === 'menu') this.buildMenu(width, height, s);
    else this.buildSelect(width, height, s);

    const muteBtn = new Button(this, width - 50 * s, 24 * s, music.muted ? 'Som: off' : 'Som: on', () => {
      const m = music.toggleMute();
      muteBtn.setText(m ? 'Som: off' : 'Som: on');
    }, { width: 84 * s, height: 26 * s, fontSize: 11 * s });
    muteBtn.setDepth(10);
    this.objects.push(muteBtn);
  }

  private buildMenu(width: number, height: number, s: number): void {
    const y0 = height * 0.7;
    const hasSave = game.hasSave();
    // personagem parado na porta do ateliê
    const spr = this.add.sprite(width / 2 + 40 * s, height * 0.55 + 14 * s, `player_${game.data.species ?? 'coelho'}`, 'south_0').setOrigin(0.5, 1).setScale(Math.min(2, s * 1.2)).setDepth(2);
    spr.play(`player_${game.data.species ?? 'coelho'}_walk_south`);
    this.objects.push(spr);
    if (hasSave) {
      this.objects.push(new Button(this, width / 2, y0, 'Continuar', () => { sfx('select'); this.continueGame(); }, { width: 200 * s, height: 40 * s, fontSize: 15 * s, kind: 'primary' }).setDepth(10));
    }
    this.objects.push(new Button(this, width / 2, y0 + (hasSave ? 50 * s : 0), 'Novo jogo', () => { sfx('select'); this.mode = 'select'; this.build(); }, { width: 200 * s, height: 40 * s, fontSize: 15 * s, kind: hasSave ? 'wood' : 'primary' }).setDepth(10));
    this.objects.push(this.add.text(width / 2, height - 16 * s, 'WASD / setas: andar · Shift: correr · E: interagir · B: mochila · Tab: caderno · M: mapa · F: decorar', hudStyle(9 * s, P.cream, { align: 'center', wordWrap: { width: width - 40 } })).setOrigin(0.5, 1).setDepth(10));
  }

  private buildSelect(width: number, height: number, s0: number): void {
    const s = Math.min(s0, 1.5);
    const panelW = Math.min(width - 24, 520 * s);
    const panelH = Math.min(height - height * 0.3 - 12, 290 * s);
    const px = width / 2 - panelW / 2;
    const py = height * 0.3;
    this.objects.push(drawPanel(this, px, py, panelW, panelH).setDepth(6));
    this.objects.push(this.add.text(width / 2, py + 14 * s, 'Quem vai recomeçar a vida na vila?', textStyle(14 * s, UI.title)).setOrigin(0.5, 0).setDepth(7));

    const slotW = panelW / 3;
    const slotH = Math.min(130 * s, panelH * 0.46);
    const slotY = py + 40 * s;
    SPECIES.forEach((sp, i) => {
      const cx = px + slotW * i + slotW / 2;
      const sel = this.selected === sp;
      this.objects.push(new PixelPanel(this, cx - slotW / 2 + 8, slotY, slotW - 16, slotH, sel ? 'ui_slot_sel' : 'ui_slot').setDepth(7));
      const spr = this.add.sprite(cx, slotY + slotH - 22 * s, `player_${sp}`, 'south_0').setOrigin(0.5, 1).setScale(Math.min(2 * Math.min(1.4, s), (slotH - 30 * s) / 48)).setDepth(8);
      if (sel) spr.play(`player_${sp}_walk_south`);
      this.objects.push(spr);
      this.objects.push(this.add.text(cx, slotY + slotH - 16 * s, SPECIES_INFO[sp].name, textStyle(11 * s, sel ? UI.title : UI.text)).setOrigin(0.5, 0).setDepth(8));
      const zone = this.add.zone(cx, slotY + slotH / 2, slotW - 16, slotH).setInteractive({ useHandCursor: true }).setDepth(9);
      zone.on('pointerdown', () => { if (this.selected !== sp) { this.selected = sp; sfx('select'); this.build(); } });
      this.objects.push(zone);
    });

    const descY = slotY + slotH + 8 * s;
    this.objects.push(this.add.text(width / 2, descY, SPECIES_INFO[this.selected].desc, textStyle((panelH < 280 * s ? 9 : 10) * s, UI.textDim, { align: 'center', wordWrap: { width: panelW - 30 } })).setOrigin(0.5, 0).setDepth(8));
    if (panelH >= 280 * s) this.objects.push(this.add.text(width / 2, descY + 30 * s, 'A escolha é apenas visual: todos têm as mesmas habilidades.', textStyle(9 * s, UI.textDim)).setOrigin(0.5, 0).setDepth(8));

    const by = py + panelH - 24 * s;
    this.objects.push(new Button(this, width / 2 - 80 * s, by, 'Voltar', () => { this.mode = 'menu'; this.build(); }, { width: 130 * s, height: 32 * s, fontSize: 13 * s }).setDepth(9));
    this.objects.push(new Button(this, width / 2 + 80 * s, by, 'Começar', () => { sfx('quest'); this.startNew(); }, { width: 150 * s, height: 32 * s, fontSize: 13 * s, kind: 'primary' }).setDepth(9));
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
      else this.scene.start('WorldScene', { map: game.data.map, x: game.data.x, y: game.data.y, px: game.data.px, py: game.data.py });
    });
  }
}
