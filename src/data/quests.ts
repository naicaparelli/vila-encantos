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
    title: 'Um recomeço empoeirado',
    intro: 'Todo grande recomeço precisa de um pequeno primeiro passo.',
    teaches: 'Interação, limpeza e organização',
    objectives: [
      counterObj('boxes', 'Retirar as caixas do ateliê', 'boxes_atelier', 5, 'Aproxime-se de uma caixa e pressione E.'),
      counterObj('webs', 'Limpar as teias', 'webs_atelier', 3),
      flagObj('window', 'Abrir a janela', 'window_open', 'A janela fica na parede do fundo.'),
      itemObj('photo', 'Encontrar a fotografia antiga', 'foto', 1, 'Algo brilha no chão quando a luz entra.'),
    ],
    onComplete: (s) => { s.setFlag('bench_glow'); s.setFlag('atelier_light'); },
    memory: 'No verso da fotografia: "Enquanto alguém continuar criando, a vila nunca perderá completamente sua magia."',
  },
  q2: {
    id: 'q2',
    order: 2,
    title: 'A mesa quebrada',
    intro: 'A bancada emite uma luz suave. Ela só precisa de madeira nova e de alguém disposto a tentar.',
    teaches: 'Coleta e crafting',
    objectives: [
      itemObj('wood', 'Coletar madeira na floresta', 'madeira', 5, 'Saia pela porta, atravesse a praça para o leste.'),
      flagObj('repair', 'Consertar a bancada de marcenaria', 'bench_repaired', 'Volte ao ateliê e interaja com a bancada.'),
    ],
    onComplete: (s) => { s.unlockRecipes('bench'); },
  },
  q3: {
    id: 'q3',
    order: 3,
    title: 'Um pouco de conforto',
    intro: 'Um ateliê também é uma casa. Faça dele um lugar onde valha a pena acordar.',
    teaches: 'Decoração do espaço pessoal',
    objectives: [
      placedObj('bed', 'Produzir e colocar uma cama', 'atelier', 'cama', 1, 'Use a bancada (E) e depois o modo Decorar (F).'),
      placedObj('lamp', 'Produzir e colocar uma luminária', 'atelier', 'luminaria', 1, 'A luminária precisa de Pó de Encanto (praça ou floresta).'),
      placedObj('chair', 'Produzir e colocar uma cadeira', 'atelier', 'cadeira', 1),
    ],
    onComplete: (s) => { s.setFlag('atelier_restored'); s.setFlag('amora_at_atelier'); s.unlockRecipes('comfort'); },
    memory: 'O ateliê voltou a ter cores. Pela primeira vez desde a chegada, a vila pareceu menos silenciosa.',
  },
  q4: {
    id: 'q4',
    order: 4,
    title: 'A primeira visitante',
    intro: 'Alguém bateu à porta. Uma gatinha com um avental de confeiteira olha para dentro, curiosa.',
    teaches: 'Diálogo e introdução aos moradores',
    objectives: [
      flagObj('talk', 'Conversar com Amora', 'talked_amora_q4', 'Ela está dentro do ateliê.'),
    ],
    turnIn: 'amora',
    onComplete: (s) => { s.setFlag('amora_at_loja'); s.setFlag('pingo_in_praca'); },
  },
  q5: {
    id: 'q5',
    order: 5,
    title: 'A loja sem brilho',
    intro: 'A confeitaria de Amora está fechada há muito tempo. Antes de decorar, é preciso limpar. E costurar.',
    teaches: 'Encomenda de decoração',
    objectives: [
      flagObj('visit', 'Visitar Amora na confeitaria', 'talked_amora_q5', 'A confeitaria fica à direita da praça.'),
      counterObj('boxes', 'Retirar as caixas da confeitaria', 'boxes_loja', 3),
      counterObj('webs', 'Limpar as teias da confeitaria', 'webs_loja', 2),
      flagObj('pingo', 'Conversar com Pingo na praça', 'talked_pingo_q5', 'O cachorrinho inventor está perto da fonte.'),
      flagObj('sewing', 'Consertar a mesa de costura', 'sewing_repaired', 'No ateliê. Pingo pediu 4 madeira, 3 pedra e 2 fibra.'),
    ],
    onComplete: (s) => { s.unlockRecipes('sewing'); s.unlockRecipes('shop'); },
  },
  q6: {
    id: 'q6',
    order: 6,
    title: 'Cores esquecidas',
    intro: 'Para devolver cor à loja, é preciso encontrar as flores que o Desbotamento não alcançou.',
    teaches: 'Exploração, coleta e novos materiais',
    objectives: [
      flagObj('lilo', 'Perguntar a Lilo sobre as flores', 'talked_lilo_q6', 'O coelho guardião fica ao lado da fonte.'),
      flagObj('path', 'Abrir o caminho até a clareira', 'forest_path_open', 'No nordeste da floresta há um tronco caído.'),
      itemObj('moon', 'Colher flores-de-lua', 'flor_lua', 3),
      itemObj('dust', 'Reunir Pó de Encanto', 'po_encanto', 2),
      flagObj('paint', 'Consertar a mesa de pintura', 'paint_repaired', 'No ateliê. Precisa de 3 madeira, 2 pedra e 1 flor-de-lua.'),
    ],
    onComplete: (s) => { s.unlockRecipes('paint'); },
    memory: 'Lilo contou: o Desbotamento começou no dia em que a última feira de artesãos foi cancelada. Ninguém percebeu na hora.',
  },
  q7: {
    id: 'q7',
    order: 7,
    title: 'O pedido especial',
    intro: 'Amora sonha com uma confeitaria aconchegante, iluminada e com um toque de natureza. Decore-a seguindo o pedido.',
    teaches: 'Desafio de decoração',
    objectives: [
      placedObj('vitrine', 'Colocar uma vitrine de doces', 'loja', 'vitrine', 1),
      placedObj('tables', 'Colocar duas mesas de chá', 'loja', 'mesa_cha', 2),
      placedObj('cushions', 'Colocar duas almofadas', 'loja', 'almofada', 2),
      placedObj('rug', 'Colocar um tapete', 'loja', 'tapete', 1),
      placedObj('painting', 'Colocar um quadro pintado', 'loja', 'quadro', 1),
      attrObj('cozy', 'Aconchego da loja', 'loja', 'aconchego', 10),
      attrObj('light', 'Iluminação da loja', 'loja', 'iluminacao', 2),
      attrObj('natural', 'Toque natural da loja', 'loja', 'natural', 2),
    ],
    turnIn: 'amora',
    onComplete: (s) => { s.setFlag('loja_restored'); s.addItem('fragmento', 1); s.setFlag('has_fragment'); },
    memory: 'Amora lembrou do cheiro de baunilha nas manhãs de feira. "Eu tinha esquecido que isso era meu."',
  },
  q8: {
    id: 'q8',
    order: 8,
    title: 'O primeiro encanto',
    intro: 'O fragmento pulsa na direção da praça. A fonte seca espera há muito tempo.',
    teaches: 'Conclusão narrativa e transformação da vila',
    objectives: [
      flagObj('fountain', 'Levar o fragmento até a fonte da praça', 'fountain_restored', 'Interaja com a fonte.'),
    ],
    onComplete: (s) => {
      s.setFlag('praca_restored');
      s.setFlag('free_decor');
      s.addEncanto('Encanto da Fonte');
      s.removeItem('fragmento', 1);
      s.addItem('carta', 1, true);
    },
    memory: 'Lilo: "Então era verdade... a vila não estava perdida. Ela só estava esperando alguém recomeçar."',
  },
};

export const QUEST_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
