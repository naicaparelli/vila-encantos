import Phaser from 'phaser';
import { TILE_GENERATORS } from './tiles';
import { OBJECT_GENERATORS, NO_FADE_PREFIXES, mapThumb } from './objects';
import { buildCharacterSheet, PLAYER_LOOKS, NPC_LOOKS, DIRS } from './characters';
import { fade } from './palette';
import { CHAR_W, CHAR_H } from '../config';
import type { Pix } from './pix';

export const FADED = '__faded';

function addPix(scene: Phaser.Scene, key: string, pix: Pix): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pix.toCanvas());
}

/** Gera e registra todas as texturas do jogo. Chamado uma vez na BootScene. */
export function generateAllTextures(scene: Phaser.Scene): void {
  for (const [id, gen] of Object.entries(TILE_GENERATORS)) {
    const pix = gen();
    addPix(scene, `tile_${id}`, pix);
    addPix(scene, `tile_${id}${FADED}`, pix.mapColors((c) => fade(c)));
  }

  for (const [id, gen] of Object.entries(OBJECT_GENERATORS)) {
    const pix = gen();
    addPix(scene, id, pix);
    if (!NO_FADE_PREFIXES.some((pre) => id.startsWith(pre))) {
      addPix(scene, `${id}${FADED}`, pix.mapColors((c) => fade(c)));
    }
  }

  for (const kind of ['atelier', 'praca', 'floresta', 'loja'] as const) addPix(scene, `thumb_${kind}`, mapThumb(kind));

  const sheets: Record<string, ReturnType<typeof buildCharacterSheet>> = {};
  for (const [species, look] of Object.entries(PLAYER_LOOKS)) sheets[`player_${species}`] = buildCharacterSheet(look);
  for (const [id, look] of Object.entries(NPC_LOOKS)) sheets[`npc_${id}`] = buildCharacterSheet(look);

  for (const [key, sheet] of Object.entries(sheets)) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.addCanvas(key, sheet.pix.toCanvas());
    if (!tex) continue;
    for (const [name, pos] of Object.entries(sheet.frames)) tex.add(name, 0, pos.x, pos.y, CHAR_W, CHAR_H);
    for (const dir of DIRS) {
      const walkKey = `${key}_walk_${dir}`;
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: [1, 2, 3, 4].map((f) => ({ key, frame: `${dir}_${f}` })),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
  }
}
