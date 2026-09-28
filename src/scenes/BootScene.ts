import Phaser from 'phaser';
import { generateAllTextures } from '../art/textures';
import { hudStyle } from '../ui/widgets';

/** Gera toda a pixel art em memória e segue para o título. */
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create(): void {
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height / 2, 'Desenhando a vila...', hudStyle(16)).setOrigin(0.5);
    // Deixa o texto aparecer antes do trabalho síncrono de geração.
    this.time.delayedCall(40, () => {
      const t0 = performance.now();
      generateAllTextures(this);
      const ms = Math.round(performance.now() - t0);
      t.setText(`Pronto (${ms} ms)`);
      this.time.delayedCall(120, () => this.scene.start('TitleScene'));
    });
  }
}
