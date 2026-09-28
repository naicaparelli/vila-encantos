import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { IntroScene } from './scenes/IntroScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { EndingScene } from './scenes/EndingScene';
import { game } from './state/GameState';

// `?renderer=canvas` força o renderizador Canvas (útil em navegadores sem WebGL estável e em testes headless).
const params = new URLSearchParams(window.location.search);
const rendererType = params.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO;

const config: Phaser.Types.Core.GameConfig = {
  type: rendererType,
  parent: 'game',
  backgroundColor: '#1d1418',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, IntroScene, WorldScene, UIScene, EndingScene],
};

const gameInstance = new Phaser.Game(config);
// Exposto para testes automatizados (tools/smoke.mjs).
(window as unknown as { __game: Phaser.Game }).__game = gameInstance;
(window as unknown as { __state: typeof game }).__state = game;
