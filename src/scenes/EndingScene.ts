import Phaser from 'phaser';
import { game } from '../state/GameState';
import { music } from '../audio/music';
import { Button, textStyle, uiScale, drawPanel, UI } from '../ui/widgets';
import { P } from '../art/palette';

/** Encerramento do primeiro arco (README §15): carta misteriosa e gancho para o próximo capítulo. */
export class EndingScene extends Phaser.Scene {
  constructor() { super('EndingScene'); }

  create(): void {
    music.play('ending');
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.build();
    this.scale.on('resize', this.build, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.build, this));
  }

  private build(): void {
    this.children.removeAll(true);
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);

    const cols = Math.ceil(w / 32) + 1;
    const rows = Math.ceil(h / 32) + 1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) this.add.image(x * 32, y * 32, (x * 7 + y * 3) % 5 === 0 ? 'tile_flowers' : 'tile_grass').setOrigin(0).setAlpha(0.5);
    const z = Math.min(1.6, s);
    this.add.image(w * 0.5, h * 0.36, 'fountainFlow0').setScale(z).setOrigin(0.5, 1).setAlpha(0.9);
    this.add.sprite(w * 0.5 - 50 * z, h * 0.36, `player_${game.data.species}`, 'east_0').setScale(z).setOrigin(0.5, 1);
    this.add.sprite(w * 0.5 + 50 * z, h * 0.36, 'npc_lilo', 'west_0').setScale(z).setOrigin(0.5, 1);
    this.add.sprite(w * 0.5 + 90 * z, h * 0.38, 'npc_amora', 'west_0').setScale(z).setOrigin(0.5, 1);
    this.add.sprite(w * 0.5 - 90 * z, h * 0.38, 'npc_pingo', 'east_0').setScale(z).setOrigin(0.5, 1);

    const pw = Math.min(w - 24, 520 * s);
    const ph = Math.min(h * 0.5, 250 * s);
    const px = w / 2 - pw / 2;
    const py = h * 0.4;
    const g = this.add.graphics();
    drawPanel(g, px, py, pw, ph);
    this.add.image(px + 30 * s, py + 30 * s, 'letter').setScale(s * 1.5);
    this.add.text(w / 2, py + 14 * s, 'Uma carta misteriosa', textStyle(15 * s, P.amber)).setOrigin(0.5, 0);
    this.add.text(w / 2, py + 44 * s,
      '"Se você conseguiu despertar um encanto,\ntalvez ainda exista esperança para o Bosque dos Sussurros."',
      textStyle(12 * s, P.cream, { align: 'center', wordWrap: { width: pw - 40 } })).setOrigin(0.5, 0);
    this.add.text(w / 2, py + 100 * s,
      'Fim do primeiro capítulo.\nA decoração livre do ateliê foi desbloqueada, e a vila continua viva para você explorar.',
      textStyle(10 * s, UI.textDim, { align: 'center', wordWrap: { width: pw - 40 } })).setOrigin(0.5, 0);

    const by = py + ph - 26 * s;
    new Button(this, w / 2 - 90 * s, by, 'Voltar à vila', () => this.backToWorld(), { width: 160 * s, fill: UI.border });
    new Button(this, w / 2 + 90 * s, by, 'Título', () => { this.scene.start('TitleScene'); }, { width: 140 * s });
  }

  private backToWorld(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('WorldScene', { map: 'praca', x: 11, y: 11, dir: 'south' });
    });
  }
}
