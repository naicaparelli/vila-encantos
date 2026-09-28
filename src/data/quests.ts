import type { GameState } from '../state/GameState';

export interface ObjectiveStatus { done: boolean; cur?: number; max?: number }

export interface ObjectiveDef {
  id: string;
  text: string;
  check: (s: GameState) => ObjectiveStatus;
  /** Dica de onde ir (mostrada no caderno). */
  hint?: string;
}

export interface QuestDef {
  id: string;
  order: number;
  title: string;
  /** Texto que o Caderno dos Encantos mostra ao iniciar. */
  intro: string;
  /** Mecânica ensinada (exibida no caderno). */
  teaches: string;
  objectives: ObjectiveDef[];
  /** NPC que recebe a missão quando os objetivos estiverem prontos. */
  turnIn?: string;
  onStart?: (s: GameState) => void;
  onComplete?: (s: GameState) => void;
  /** Fragmento de memória revelado ao concluir. */
  memory?: string;
}

const flagObj = (id: string, text: string, flag: string, hint?: string): ObjectiveDef => ({
  id, text, hint, check: (s) => ({ done: s.flag(flag) }),
});
const counterObj = (id: string, text: string, counter: string, max: number, hint?: string): ObjectiveDef => ({
  id, text, hint, check: (s) => ({ done: s.counter(counter) >= max, cur: Math.min(max, s.counter(counter)), max }),
});
const itemObj = (id: string, text: string, item: string, max: number, hint?: string): ObjectiveDef => ({
  id, text, hint, check: (s) => ({ done: s.count(item) >= max, cur: Math.min(max, s.count(item)), max }),
});
const placedObj = (id: string, text: string, map: 'atelier' | 'loja', item: string, max: number, hint?: string): ObjectiveDef => ({
  id, text, hint, check: (s) => ({ done: s.placedCount(map, item) >= max, cur: Math.min(max, s.placedCount(map, item)), max }),
});
const attrObj = (id: string, text: string, map: 'atelier' | 'loja', attr: 'aconchego' | 'iluminacao' | 'natural', max: number): ObjectiveDef => ({
  id, text, check: (s) => ({ done: s.attrsIn(map)[attr] >= max, cur: Math.min(max, s.attrsIn(map)[attr]), max }),
});

export const QUESTS: Record<string, QuestDef> = {
  q1: {
    id: 'q1',
    order: 1,
    title: 'A Dusty New Beginning',
    intro: 'Every fresh start begins with one small step.',
    teaches: 'Interacting, cleaning and organizing',
    objectives: [
      counterObj('boxes', 'Clear the boxes from the workshop', 'boxes_atelier', 5, 'Walk up to a box and press E.'),
      counterObj('webs', 'Clear the cobwebs', 'webs_atelier', 3),
      flagObj('window', 'Open the window', 'window_open', 'The window is on the back wall.'),
      itemObj('photo', 'Find the old photograph', 'foto', 1, 'Something sparkles on the floor when the light comes in.'),
    ],
    onComplete: (s) => { s.setFlag('bench_glow'); s.setFlag('atelier_light'); },
    memory: 'On the back of the photograph: "As long as someone keeps creating, the village will never lose all its magic."',
  },
  q2: {
    id: 'q2',
    order: 2,
    title: 'The Broken Workbench',
    intro: 'The workbench glows softly. All it needs is fresh wood and someone willing to try.',
    teaches: 'Gathering and crafting',
    objectives: [
      itemObj('wood', 'Gather wood in the forest', 'madeira', 5, 'Head outside and cross the square to the east.'),
      flagObj('repair', 'Repair the woodworking bench', 'bench_repaired', 'Return to the workshop and interact with the workbench.'),
    ],
    onComplete: (s) => { s.unlockRecipes('bench'); },
  },
  q3: {
    id: 'q3',
    order: 3,
    title: 'A Little Comfort',
    intro: 'A workshop is a home, too. Make it somewhere worth waking up in.',
    teaches: 'Decorating your own space',
    objectives: [
      placedObj('bed', 'Craft and place a bed', 'atelier', 'cama', 1, 'Use the workbench (E), then Decorate mode (F).'),
      placedObj('lamp', 'Craft and place a lamp', 'atelier', 'luminaria', 1, 'The lamp needs Wonder Dust (found in the square or forest).'),
      placedObj('chair', 'Craft and place a chair', 'atelier', 'cadeira', 1),
    ],
    onComplete: (s) => { s.setFlag('atelier_restored'); s.setFlag('amora_at_atelier'); s.unlockRecipes('comfort'); },
    memory: 'Color returned to the workshop. For the first time since your arrival, the village felt less silent.',
  },
  q4: {
    id: 'q4',
    order: 4,
    title: 'The First Visitor',
    intro: 'Someone knocked on the door. A kitten in a baker\'s apron peers inside, curious.',
    teaches: 'Talking and meeting the villagers',
    objectives: [
      flagObj('talk', 'Talk to Amora', 'talked_amora_q4', 'She\'s inside the workshop.'),
    ],
    turnIn: 'amora',
    onComplete: (s) => { s.setFlag('amora_at_loja'); s.setFlag('pingo_in_praca'); },
  },
  q5: {
    id: 'q5',
    order: 5,
    title: 'A Shop Without Sparkle',
    intro: 'Amora\'s bakery has been closed for a long time. Before decorating, there\'s cleaning to do. And sewing.',
    teaches: 'A decorating commission',
    objectives: [
      flagObj('visit', 'Visit Amora at the bakery', 'talked_amora_q5', 'The bakery is on the right side of the square.'),
      counterObj('boxes', 'Clear the boxes from the bakery', 'boxes_loja', 3),
      counterObj('webs', 'Clear the bakery\'s cobwebs', 'webs_loja', 2),
      flagObj('pingo', 'Talk to Pingo in the square', 'talked_pingo_q5', 'The puppy inventor is near the fountain.'),
      flagObj('sewing', 'Repair the sewing table', 'sewing_repaired', 'In the workshop. Pingo asked for 4 wood, 3 stone and 2 fiber.'),
    ],
    onComplete: (s) => { s.unlockRecipes('sewing'); s.unlockRecipes('shop'); },
  },
  q6: {
    id: 'q6',
    order: 6,
    title: 'Forgotten Colors',
    intro: 'To bring color back to the shop, find the flowers the Fading never reached.',
    teaches: 'Exploring, gathering and new materials',
    objectives: [
      flagObj('lilo', 'Ask Lilo about the flowers', 'talked_lilo_q6', 'The rabbit guardian is beside the fountain.'),
      flagObj('path', 'Open the path to the clearing', 'forest_path_open', 'There\'s a fallen log in the northeast of the forest.'),
      itemObj('moon', 'Gather moonflowers', 'flor_lua', 3),
      itemObj('dust', 'Gather Wonder Dust', 'po_encanto', 2),
      flagObj('paint', 'Repair the painting table', 'paint_repaired', 'In the workshop. Needs 3 wood, 2 stone and 1 moonflower.'),
    ],
    onComplete: (s) => { s.unlockRecipes('paint'); },
    memory: 'Lilo said the Fading began the day the last craft fair was canceled. No one noticed at the time.',
  },
  q7: {
    id: 'q7',
    order: 7,
    title: 'A Special Request',
    intro: 'Amora dreams of a cozy, bright bakery with a touch of nature. Decorate it to match her request.',
    teaches: 'A decorating challenge',
    objectives: [
      placedObj('vitrine', 'Place a pastry display case', 'loja', 'vitrine', 1),
      placedObj('tables', 'Place two tea tables', 'loja', 'mesa_cha', 2),
      placedObj('cushions', 'Place two cushions', 'loja', 'almofada', 2),
      placedObj('rug', 'Place a rug', 'loja', 'tapete', 1),
      placedObj('painting', 'Place a painting', 'loja', 'quadro', 1),
      attrObj('cozy', 'Shop coziness', 'loja', 'aconchego', 10),
      attrObj('light', 'Shop lighting', 'loja', 'iluminacao', 2),
      attrObj('natural', 'Shop nature', 'loja', 'natural', 2),
    ],
    turnIn: 'amora',
    onComplete: (s) => { s.setFlag('loja_restored'); s.addItem('fragmento', 1); s.setFlag('has_fragment'); },
    memory: 'Amora remembered the smell of vanilla on market mornings. "I\'d forgotten this was mine."',
  },
  q8: {
    id: 'q8',
    order: 8,
    title: 'The First Wonder',
    intro: 'The fragment pulses toward the square. The dry fountain has been waiting a long time.',
    teaches: 'The story\'s conclusion and the village\'s transformation',
    objectives: [
      flagObj('fountain', 'Bring the fragment to the square\'s fountain', 'fountain_restored', 'Interact with the fountain.'),
    ],
    onComplete: (s) => {
      s.setFlag('praca_restored');
      s.setFlag('free_decor');
      s.addEncanto('Wonder of the Fountain');
      s.removeItem('fragmento', 1);
      s.addItem('carta', 1, true);
    },
    memory: 'Lilo: "So it was true... the village wasn\'t lost. It was just waiting for someone to start again."',
  },
};

export const QUEST_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
