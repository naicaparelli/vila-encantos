import type { Dir } from '../art/characters';
import type { TrackId } from '../audio/music';

export type MapId = 'atelier' | 'praca' | 'floresta' | 'loja';

/** Tipos de interação com objetos do mundo. */
export type InteractKind = 'box' | 'web' | 'window' | 'photo' | 'bench' | 'sewing' | 'paint' | 'notebook' | 'fountain' | 'log' | 'sign' | 'shrine';

export interface DoorObj { type: 'door'; x: number; y: number; w?: number; h?: number; to: MapId; spawn: { x: number; y: number }; dir: Dir; label: string }
export interface PropObj {
  type: 'prop';
  id: string;
  x: number; y: number;
  tex: string;
  /** Textura alternativa usada quando a flag `restoredFlag` do mapa estiver ativa. */
  texRestored?: string;
  px?: number; py?: number;
  /** Retângulos bloqueados em tiles (relativos ao mapa). */
  blocks?: Array<{ x: number; y: number; w: number; h: number }>;
  /** Retângulos bloqueados em pixels, relativos ao canto superior esquerdo do sprite (formas que não cabem na grade). */
  pxBlocks?: Array<{ x: number; y: number; w: number; h: number }>;
  hideWhen?: string;
  showWhen?: string;
  /** Profundidade fixa (para objetos deitados no chão, como folhas). */
  flat?: boolean;
  /** Anima entre texturas (ex.: fonte). */
  anim?: string[];
}
export interface InteractObj {
  type: 'interact';
  id: string;
  kind: InteractKind;
  x: number; y: number;
  tex?: string;
  texDone?: string;
  px?: number; py?: number;
  blocks?: Array<{ x: number; y: number; w: number; h: number }>;
  pxBlocks?: Array<{ x: number; y: number; w: number; h: number }>;
  /** Contador incrementado ao remover (caixas/teias). */
  counter?: string;
  flat?: boolean;
  showWhen?: string;
  hideWhen?: string;
}
export interface NodeObj { type: 'node'; id: string; x: number; y: number; material: string; amount: [number, number] }
export interface NpcObj { type: 'npc'; id: string; x: number; y: number; dir: Dir; showWhen?: string; hideWhen?: string }

export type MapObject = DoorObj | PropObj | InteractObj | NodeObj | NpcObj;

export interface MapDef {
  id: MapId;
  name: string;
  rows: string[];
  objects: MapObject[];
  music: TrackId;
  musicRestored?: TrackId;
  indoor: boolean;
  /** Flag que marca o mapa como restaurado (troca texturas desbotadas pelas vibrantes). */
  restoredFlag?: string;
  /** Se o mapa permite decoração. */
  decoratable: boolean;
  /** Char de tile "chão" onde se pode decorar. */
  floorChars: string;
}

export const BLOCKING_CHARS = new Set(['w', 'x', '-', '|', 's', '#', 'W', 'O', 't']);

export const MAPS: Record<MapId, MapDef> = {
  atelier: {
    id: 'atelier',
    name: 'Ateliê',
    indoor: true,
    music: 'atelier',
    restoredFlag: 'atelier_restored',
    decoratable: true,
    floorChars: '.',
    rows: [
      'WWWWWWWWWWWWWW',
      '##############',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      'WWWWWWDDWWWWWW',
    ],
    objects: [
      { type: 'door', x: 6, y: 10, w: 2, h: 1, to: 'praca', spawn: { x: 4, y: 5 }, dir: 'south', label: 'Sair para a praça' },
      { type: 'interact', id: 'notebook', kind: 'notebook', x: 2, y: 2, tex: 'notebookStand', blocks: [{ x: 2, y: 2, w: 1, h: 1 }] },
      { type: 'interact', id: 'bench', kind: 'bench', x: 9, y: 2, tex: 'benchBroken', texDone: 'benchOk', blocks: [{ x: 9, y: 2, w: 2, h: 1 }] },
      { type: 'interact', id: 'sewing', kind: 'sewing', x: 4, y: 2, px: 8, tex: 'sewingBroken', texDone: 'sewingOk', blocks: [{ x: 4, y: 2, w: 2, h: 1 }] },
      { type: 'interact', id: 'paint', kind: 'paint', x: 1, y: 7, px: 8, tex: 'paintBroken', texDone: 'paintOk', blocks: [{ x: 1, y: 7, w: 2, h: 1 }] },
      { type: 'interact', id: 'window', kind: 'window', x: 7, y: 1, tex: 'windowClosed', texDone: 'windowOpen', flat: true },
      { type: 'prop', id: 'shelf', x: 12, y: 1, tex: 'shelfOld', flat: true },
      { type: 'interact', id: 'box1', kind: 'box', x: 3, y: 4, tex: 'crate', counter: 'boxes_atelier', blocks: [{ x: 3, y: 4, w: 1, h: 1 }] },
      { type: 'interact', id: 'box2', kind: 'box', x: 6, y: 5, tex: 'crate', counter: 'boxes_atelier', blocks: [{ x: 6, y: 5, w: 1, h: 1 }] },
      { type: 'interact', id: 'box3', kind: 'box', x: 10, y: 6, tex: 'crate', counter: 'boxes_atelier', blocks: [{ x: 10, y: 6, w: 1, h: 1 }] },
      { type: 'interact', id: 'box4', kind: 'box', x: 4, y: 8, tex: 'crate', counter: 'boxes_atelier', blocks: [{ x: 4, y: 8, w: 1, h: 1 }] },
      { type: 'interact', id: 'box5', kind: 'box', x: 11, y: 3, tex: 'crate', counter: 'boxes_atelier', blocks: [{ x: 11, y: 3, w: 1, h: 1 }] },
      { type: 'interact', id: 'web1', kind: 'web', x: 12, y: 2, tex: 'cobweb', counter: 'webs_atelier', flat: true },
      { type: 'interact', id: 'web2', kind: 'web', x: 1, y: 8, tex: 'cobweb', counter: 'webs_atelier', flat: true },
      { type: 'interact', id: 'web3', kind: 'web', x: 6, y: 3, tex: 'cobweb', counter: 'webs_atelier', flat: true },
      { type: 'interact', id: 'photo', kind: 'photo', x: 8, y: 7, tex: 'photo', px: 8, py: 8, flat: true, showWhen: 'window_open', hideWhen: 'has_foto' },
      { type: 'prop', id: 'dust1', x: 8, y: 4, tex: 'dustPile', flat: true, hideWhen: 'atelier_restored' },
      { type: 'prop', id: 'dust2', x: 2, y: 6, tex: 'dustPile', flat: true, hideWhen: 'atelier_restored' },
      { type: 'prop', id: 'dust3', x: 11, y: 8, tex: 'dustPile', flat: true, hideWhen: 'atelier_restored' },
      { type: 'npc', id: 'amora', x: 7, y: 6, dir: 'south', showWhen: 'amora_at_atelier', hideWhen: 'amora_at_loja' },
    ],
  },

  praca: {
    id: 'praca',
    name: 'Praça da Vila',
    indoor: false,
    music: 'praca',
    musicRestored: 'praca_restored',
    restoredFlag: 'praca_restored',
    decoratable: false,
    floorChars: '',
    rows: [
      //0123456789012345678901234
      'tttttttttttttttttttttttt',
      'tggggggggggggggggggggggt',
      'tggggggggggggggggggggggt',
      'tggggggggggggggggggggggt',
      'tggggggggggggggggggggggt',
      'tgggpggggggggggggpgggggt',
      'tgggpppppppppppppppgggtt',
      'tGggppccccccccccccppggGt',
      'tgggppccccccccccccpppppD',
      'tgggppccccccccccccpppppD',
      'tggfppccccccccccccppgfgt',
      'tgggpppppppppppppppggggt',
      'tggggggggppgggggggggggtt',
      'tGggggggfppfggggggGggggt',
      't-------gpp-g---------gt',
      'tggggggggppggggggggggggt',
      'tttttttttppttttttttttttt',
      'xxxxxxxxxxxxxxxxxxxxxxxx',
    ],
    objects: [
      { type: 'prop', id: 'facade_atelier', x: 2, y: 0, px: -16, tex: 'facadeAtelierOld', texRestored: 'facadeAtelierNew', blocks: [{ x: 2, y: 1, w: 2, h: 4 }, { x: 5, y: 1, w: 3, h: 4 }, { x: 4, y: 1, w: 1, h: 3 }] },
      { type: 'door', x: 4, y: 4, to: 'atelier', spawn: { x: 6, y: 9 }, dir: 'north', label: 'Entrar no ateliê' },
      { type: 'prop', id: 'facade_shop', x: 15, y: 1, tex: 'facadeShopOld', texRestored: 'facadeShopNew', blocks: [{ x: 15, y: 2, w: 2, h: 3 }, { x: 18, y: 2, w: 2, h: 3 }, { x: 17, y: 2, w: 1, h: 2 }] },
      { type: 'door', x: 17, y: 4, to: 'loja', spawn: { x: 5, y: 8 }, dir: 'north', label: 'Confeitaria da Amora' },
      { type: 'prop', id: 'houseA', x: 9, y: 0, py: 48, tex: 'houseA', texRestored: 'houseANew', blocks: [{ x: 9, y: 2, w: 4, h: 3 }] },
      { type: 'prop', id: 'houseB', x: 19, y: 11, py: -16, tex: 'houseB', texRestored: 'houseBNew', blocks: [{ x: 19, y: 12, w: 4, h: 2 }] },
      { type: 'prop', id: 'houseC', x: 1, y: 11, py: -16, tex: 'houseC', texRestored: 'houseCNew', blocks: [{ x: 1, y: 12, w: 4, h: 2 }] },
      { type: 'interact', id: 'fountain', kind: 'fountain', x: 10, y: 7, tex: 'fountainDry', pxBlocks: [{ x: 22, y: 50, w: 52, h: 4 }, { x: 13, y: 54, w: 70, h: 34 }, { x: 4, y: 62, w: 88, h: 20 }] },
      // postes: só a base (últimos 10 px do sprite de 16×64) ocupa o chão
      { type: 'prop', id: 'lamp1', x: 8, y: 6, py: -32, tex: 'lamppost', px: 8, pxBlocks: [{ x: 2, y: 54, w: 12, h: 10 }] },
      { type: 'prop', id: 'lamp2', x: 14, y: 6, py: -32, tex: 'lamppost', px: 8, pxBlocks: [{ x: 2, y: 54, w: 12, h: 10 }] },
      { type: 'prop', id: 'lamp3', x: 8, y: 11, py: -32, tex: 'lamppost', px: 8, pxBlocks: [{ x: 2, y: 54, w: 12, h: 10 }] },
      { type: 'prop', id: 'lamp4', x: 14, y: 11, py: -32, tex: 'lamppost', px: 8, pxBlocks: [{ x: 2, y: 54, w: 12, h: 10 }] },
      { type: 'interact', id: 'sign', kind: 'sign', x: 12, y: 14, py: -16, tex: 'signBroken', texDone: 'signOk', blocks: [{ x: 12, y: 14, w: 1, h: 1 }] },
      { type: 'prop', id: 'leaves1', x: 7, y: 8, tex: 'leavesPile', flat: true, hideWhen: 'praca_restored' },
      { type: 'prop', id: 'leaves2', x: 15, y: 9, tex: 'leavesPile2', flat: true, hideWhen: 'praca_restored' },
      { type: 'prop', id: 'leaves3', x: 9, y: 10, tex: 'leavesPile2', flat: true, hideWhen: 'praca_restored' },
      { type: 'prop', id: 'leaves4', x: 13, y: 7, tex: 'leavesPile', flat: true, hideWhen: 'praca_restored' },
      { type: 'prop', id: 'leaves5', x: 6, y: 12, tex: 'leavesPile', flat: true, hideWhen: 'praca_restored' },
      { type: 'prop', id: 'leaves6', x: 16, y: 12, tex: 'leavesPile2', flat: true, hideWhen: 'praca_restored' },
      { type: 'prop', id: 'leaves7', x: 11, y: 5, tex: 'leavesPile', flat: true, hideWhen: 'praca_restored' },
      { type: 'prop', id: 'flowersA', x: 7, y: 7, tex: 'nodeFlower', flat: true, showWhen: 'praca_restored' },
      { type: 'prop', id: 'flowersB', x: 15, y: 10, tex: 'nodeFlower', flat: true, showWhen: 'praca_restored' },
      { type: 'prop', id: 'flowersC', x: 6, y: 12, tex: 'nodeFlower', flat: true, showWhen: 'praca_restored' },
      { type: 'prop', id: 'flowersD', x: 16, y: 12, tex: 'nodeFlower', flat: true, showWhen: 'praca_restored' },
      { type: 'prop', id: 'flowersE', x: 13, y: 12, tex: 'nodeMoonFlower', flat: true, showWhen: 'praca_restored' },
      { type: 'prop', id: 'bosque_sign', x: 11, y: 1, py: -16, tex: 'signOk', showWhen: 'praca_restored', blocks: [{ x: 11, y: 1, w: 1, h: 1 }] },
      { type: 'node', id: 'praca_dust', x: 21, y: 10, material: 'po_encanto', amount: [1, 1] },
      { type: 'node', id: 'praca_stone', x: 2, y: 8, material: 'pedra', amount: [1, 2] },
      { type: 'node', id: 'praca_leaves', x: 20, y: 6, material: 'folhas', amount: [2, 3] },
      { type: 'door', x: 23, y: 8, w: 1, h: 2, to: 'floresta', spawn: { x: 1, y: 8 }, dir: 'east', label: 'Ir para a floresta' },
      { type: 'npc', id: 'lilo', x: 14, y: 9, dir: 'west', hideWhen: 'praca_restored' },
      { type: 'npc', id: 'lilo', x: 12, y: 11, dir: 'south', showWhen: 'praca_restored' },
      { type: 'npc', id: 'pingo', x: 7, y: 10, dir: 'east', showWhen: 'pingo_in_praca', hideWhen: 'praca_restored' },
      { type: 'npc', id: 'pingo', x: 9, y: 12, dir: 'south', showWhen: 'praca_restored' },
      { type: 'npc', id: 'amora', x: 15, y: 12, dir: 'west', showWhen: 'praca_restored' },
    ],
  },

  floresta: {
    id: 'floresta',
    name: 'Floresta',
    indoor: false,
    music: 'floresta',
    decoratable: false,
    floorChars: '',
    rows: [
      //0123456789012345678901
      'tttttttttttttttttttttt',
      'tggGgggggggggttgGggggt',
      'tgggggggfggggtgggggggt',
      'tggggGgggggggpgggggggt',
      'tgggggggggggttggggfggt',
      'tggGgggggtggggtttttttt',
      'tgggggpppppgggGggggggt',
      'tggggppgggppgggggtgggt',
      'Dpppppggwwggppppggggtt',
      'Dppgggggwwwggggpppgggt',
      'tgggtgggwwwwggggggpggt',
      'tggGgggggwwggggggggpgt',
      'tgggggfgggggggggGggggt',
      'tggggggggggggggtgggggt',
      'tgGgggggggggggggfggggt',
      'tttttttttttttttttttttt',
    ],
    objects: [
      { type: 'door', x: 0, y: 8, w: 1, h: 2, to: 'praca', spawn: { x: 22, y: 8 }, dir: 'west', label: 'Voltar à praça' },
      { type: 'interact', id: 'log', kind: 'log', x: 13, y: 3, px: -16, tex: 'fallenLog', blocks: [{ x: 13, y: 3, w: 1, h: 1 }], hideWhen: 'forest_path_open' },
      { type: 'interact', id: 'shrine', kind: 'shrine', x: 17, y: 1, tex: 'shrine', pxBlocks: [{ x: 16, y: 43, w: 32, h: 18 }, { x: 7, y: 47, w: 50, h: 11 }] },
      { type: 'node', id: 'f_wood1', x: 3, y: 2, material: 'madeira', amount: [2, 3] },
      { type: 'node', id: 'f_wood2', x: 10, y: 4, material: 'madeira', amount: [2, 3] },
      { type: 'node', id: 'f_wood3', x: 4, y: 12, material: 'madeira', amount: [2, 3] },
      { type: 'node', id: 'f_wood4', x: 18, y: 12, material: 'madeira', amount: [2, 3] },
      { type: 'node', id: 'f_wood5', x: 6, y: 7, material: 'madeira', amount: [1, 2] },
      { type: 'node', id: 'f_stone1', x: 2, y: 6, material: 'pedra', amount: [1, 2] },
      { type: 'node', id: 'f_stone2', x: 17, y: 7, material: 'pedra', amount: [1, 2] },
      { type: 'node', id: 'f_stone3', x: 12, y: 13, material: 'pedra', amount: [1, 2] },
      { type: 'node', id: 'f_leaves1', x: 7, y: 2, material: 'folhas', amount: [2, 3] },
      { type: 'node', id: 'f_leaves2', x: 14, y: 7, material: 'folhas', amount: [2, 3] },
      { type: 'node', id: 'f_leaves3', x: 6, y: 13, material: 'folhas', amount: [2, 3] },
      { type: 'node', id: 'f_fiber1', x: 7, y: 10, material: 'fibra', amount: [2, 3] },
      { type: 'node', id: 'f_fiber2', x: 12, y: 10, material: 'fibra', amount: [2, 3] },
      { type: 'node', id: 'f_fiber3', x: 10, y: 12, material: 'fibra', amount: [1, 2] },
      { type: 'node', id: 'f_flower1', x: 8, y: 2, material: 'flor', amount: [1, 2] },
      { type: 'node', id: 'f_flower2', x: 18, y: 4, material: 'flor', amount: [1, 2] },
      { type: 'node', id: 'f_flower3', x: 6, y: 12, material: 'flor', amount: [1, 2] },
      { type: 'node', id: 'f_dust1', x: 20, y: 13, material: 'po_encanto', amount: [1, 1] },
      { type: 'node', id: 'f_dust2', x: 2, y: 13, material: 'po_encanto', amount: [1, 1] },
      { type: 'node', id: 'f_moon1', x: 15, y: 2, material: 'flor_lua', amount: [1, 1] },
      { type: 'node', id: 'f_moon2', x: 19, y: 3, material: 'flor_lua', amount: [1, 1] },
      { type: 'node', id: 'f_moon3', x: 16, y: 4, material: 'flor_lua', amount: [1, 1] },
      { type: 'prop', id: 'bush1', x: 11, y: 1, tex: 'bush', blocks: [{ x: 11, y: 1, w: 1, h: 1 }] },
      { type: 'prop', id: 'bush2', x: 16, y: 10, tex: 'bush', blocks: [{ x: 16, y: 10, w: 1, h: 1 }] },
      { type: 'prop', id: 'bush3', x: 3, y: 9, tex: 'bush', blocks: [{ x: 3, y: 9, w: 1, h: 1 }] },
    ],
  },

  loja: {
    id: 'loja',
    name: 'Confeitaria da Amora',
    indoor: true,
    music: 'loja',
    musicRestored: 'loja_restored',
    restoredFlag: 'loja_restored',
    decoratable: true,
    floorChars: ':',
    rows: [
      'WWWWWWWWWWWW',
      '############',
      '#::::::::::#',
      '#::::::::::#',
      '#::::::::::#',
      '#::::::::::#',
      '#::::::::::#',
      '#::::::::::#',
      '#::::::::::#',
      'WWWWWDDWWWWW',
    ],
    objects: [
      { type: 'door', x: 5, y: 9, w: 2, h: 1, to: 'praca', spawn: { x: 17, y: 5 }, dir: 'south', label: 'Sair para a praça' },
      { type: 'interact', id: 'lbox1', kind: 'box', x: 3, y: 3, tex: 'crate', counter: 'boxes_loja', blocks: [{ x: 3, y: 3, w: 1, h: 1 }] },
      { type: 'interact', id: 'lbox2', kind: 'box', x: 8, y: 5, tex: 'crate', counter: 'boxes_loja', blocks: [{ x: 8, y: 5, w: 1, h: 1 }] },
      { type: 'interact', id: 'lbox3', kind: 'box', x: 2, y: 7, tex: 'crate', counter: 'boxes_loja', blocks: [{ x: 2, y: 7, w: 1, h: 1 }] },
      { type: 'interact', id: 'lweb1', kind: 'web', x: 10, y: 2, tex: 'cobweb', counter: 'webs_loja', flat: true },
      { type: 'interact', id: 'lweb2', kind: 'web', x: 1, y: 6, tex: 'cobweb', counter: 'webs_loja', flat: true },
      { type: 'prop', id: 'ldust1', x: 5, y: 4, tex: 'dustPile', flat: true, hideWhen: 'loja_restored' },
      { type: 'prop', id: 'ldust2', x: 9, y: 7, tex: 'dustPile', flat: true, hideWhen: 'loja_restored' },
      { type: 'prop', id: 'lwindow', x: 3, y: 1, tex: 'windowOpen', flat: true },
      { type: 'prop', id: 'lwindow2', x: 8, y: 1, tex: 'windowOpen', flat: true },
      { type: 'npc', id: 'amora', x: 6, y: 3, dir: 'south', showWhen: 'amora_at_loja', hideWhen: 'praca_restored' },
    ],
  },
};

/** Ordem de exibição no mapa do jogo. */
export const MAP_ORDER: MapId[] = ['atelier', 'praca', 'floresta', 'loja'];
