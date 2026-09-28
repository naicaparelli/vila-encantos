import type { GameState } from '../state/GameState';

export interface DialogueLine { speaker: string; text: string }

interface Branch {
  when: (g: GameState) => boolean;
  lines: string[];
  /** Flags marcadas ao terminar a conversa. */
  flags?: string[];
}

export const NPC_NAMES: Record<string, string> = {
  amora: 'Amora',
  pingo: 'Pingo',
  lilo: 'Lilo',
};

/** Linhas iniciadas com ">" são falas do jogador; com "*" são narração. */
const NPC_DIALOGUES: Record<string, Branch[]> = {
  amora: [
    {
      when: (g) => g.flag('praca_restored'),
      lines: [
        'A fonte... está correndo de novo! Eu ouvi o barulho da água lá da loja e saí correndo.',
        'Amanhã eu abro a confeitaria. Com bolo de baunilha, como nas manhãs de feira.',
        'Obrigada por não desistir de nós.',
      ],
    },
    {
      when: (g) => g.questActive('q7') && g.questObjectivesDone('q7'),
      lines: [
        'Está... perfeito. É exatamente como eu imaginava. Não, é melhor.',
        'Espera. Tem alguma coisa brilhando embaixo da vitrine...',
        '* Um fragmento âmbar pulsa suavemente entre as tábuas do chão.',
        'Isso é um pedaço de Pequeno Encanto! Achei que tinham desaparecido todos.',
        'Lilo sempre disse que os encantos moravam na fonte. Leve até lá. Por favor.',
      ],
    },
    {
      when: (g) => g.questActive('q7'),
      lines: [
        'Meu pedido: uma vitrine de doces, duas mesas de chá, duas almofadas, um tapete e um quadro.',
        'E que fique aconchegante, com luz e um toque de natureza. Confira o progresso no Caderno (Tab).',
        'Use o modo Decorar (F) aqui dentro. Eu fico fora do caminho, prometo.',
      ],
    },
    {
      when: (g) => g.questActive('q6'),
      lines: [
        'Pingo disse que existem flores-de-lua na floresta. Lilo sabe onde. Ele só... não gosta de falar disso.',
        'Quando a mesa de pintura estiver pronta, eu conto o meu pedido.',
      ],
    },
    {
      when: (g) => g.questActive('q5') && !g.flag('talked_amora_q5'),
      lines: [
        'Bem-vindo à minha confeitaria. Ou ao que sobrou dela.',
        'Quando as cores foram embora, os clientes pararam de vir. Depois eu parei de assar. Depois... fechei.',
        'Se você tirar essas caixas e teias, eu já consigo imaginar de novo como era.',
        'Ah, e para tapetes e almofadas você vai precisar de uma mesa de costura. Pingo entende dessas coisas. Ele está na praça.',
      ],
      flags: ['talked_amora_q5'],
    },
    {
      when: (g) => g.questActive('q5'),
      lines: [
        'As caixas ainda estão aqui? Sem pressa. Mas com um pouquinho de pressa.',
        'Pingo está na praça, perto da fonte. Ele conserta qualquer mesa.',
      ],
    },
    {
      when: (g) => g.questActive('q4'),
      lines: [
        'Oi? A porta estava aberta e eu vi luz. Faz muito tempo que não vejo luz nesta casa.',
        '> Eu comprei o ateliê. Pela internet. O anúncio era... um pouco diferente.',
        'Hihi. Todos os anúncios da vila eram. Eu sou Amora. Eu tinha uma confeitaria aqui na praça.',
        'Tinha. Ainda tenho, na verdade. Só está fechada. Você faz móveis? De verdade?',
        '> Estou aprendendo.',
        'Então talvez você possa me ajudar a reabrir. Me encontre na confeitaria. É a casa com o toldo.',
      ],
      flags: ['talked_amora_q4'],
    },
    {
      when: () => true,
      lines: ['Que bom te ver por aqui.'],
    },
  ],

  pingo: [
    {
      when: (g) => g.flag('praca_restored'),
      lines: [
        'Você viu isso? VIU ISSO? A água! As flores! Eu preciso inventar alguma coisa AGORA.',
        'Uma máquina de fazer bolhas. Não. Um moinho. Não! Os dois!',
      ],
    },
    {
      when: (g) => g.questActive('q6') && !g.flag('paint_repaired'),
      lines: [
        'A mesa de pintura do seu ateliê dá para consertar. Leve 3 madeira, 2 pedra e 1 flor-de-lua.',
        'A flor-de-lua serve para calibrar as cores. Só cresce na clareira do altar. Pergunte ao Lilo como chegar lá.',
      ],
    },
    {
      when: (g) => g.questDone('q6'),
      lines: [
        'Já está pintando? Eu sabia que aquela mesa ainda tinha vida.',
        'Quando terminar a loja da Amora, vem me contar. Eu quero ver.',
      ],
    },
    {
      when: (g) => g.questActive('q5') && !g.flag('talked_pingo_q5'),
      lines: [
        'Ei! Você é o novo artesão! Eu sou Pingo. Eu invento coisas. Bem, inventava.',
        'Perdi minhas ferramentas quando o Desbotamento chegou. Ou parei de procurar. É parecido.',
        '> Amora disse que você conserta mesas.',
        'Mesas de costura são a minha especialidade! Tem uma no seu ateliê, não tem? Toda casa de artesão tinha.',
        'Leve 4 madeira, 3 pedra e 2 fibra até ela. A fibra cresce perto do lago da floresta.',
      ],
      flags: ['talked_pingo_q5'],
    },
    {
      when: (g) => g.questActive('q5'),
      lines: ['A mesa de costura: 4 madeira, 3 pedra e 2 fibra. Fibra fica perto do lago.'],
    },
    {
      when: () => true,
      lines: ['Se precisar consertar alguma coisa, é só chamar.'],
    },
  ],

  lilo: [
    {
      when: (g) => g.flag('praca_restored'),
      lines: [
        'Então era verdade... a vila não estava perdida. Ela só estava esperando alguém recomeçar.',
        'Eu cuidei desta praça por anos sem acreditar nela. Obrigado por acreditar por mim.',
        'Aquele caminho ao norte leva ao Bosque dos Sussurros. Ainda está desbotado. Mas agora eu sei que não precisa ficar assim.',
      ],
    },
    {
      when: (g) => g.questActive('q8'),
      lines: [
        'Você está carregando um fragmento? Eu sinto o calor daqui.',
        'A fonte. Os Pequenos Encantos sempre viveram na fonte. Coloque o fragmento lá.',
      ],
    },
    {
      when: (g) => g.questActive('q6') && !g.flag('talked_lilo_q6'),
      lines: [
        'Flores-de-lua? Ninguém pergunta sobre elas há muito tempo.',
        'Elas crescem ao redor do velho altar, no nordeste da floresta. O caminho está fechado por um tronco.',
        'Eu mesmo deixei o tronco lá. Achei que era melhor as pessoas pararem de esperar.',
        'Mas você não parece do tipo que para. Vá. O tronco cede se você empurrar do lado certo.',
      ],
      flags: ['talked_lilo_q6'],
    },
    {
      when: (g) => g.questActive('q6'),
      lines: ['O altar fica no nordeste da floresta. Empurre o tronco. Ele cede.'],
    },
    {
      when: (g) => g.questActive('q7'),
      lines: ['Amora parece animada. Faz tempo que não vejo isso. Não estrague, por favor.'],
    },
    {
      when: (g) => g.questDone('q3'),
      lines: [
        'Você acendeu luz no ateliê. Vi da praça.',
        'Não se anime. As cores vão embora de novo. Sempre vão.',
      ],
    },
    {
      when: () => true,
      lines: [
        'Você é o novo dono do ateliê? Sou Lilo. Eu cuido da praça. Do que sobrou dela.',
        'Não vou mentir: a vila não vai voltar a ser o que era. Mas boa sorte com a sua casa.',
      ],
    },
  ],
};

export function getDialogue(npc: string, g: GameState): { lines: DialogueLine[]; flags: string[] } {
  const branches = NPC_DIALOGUES[npc] ?? [];
  const branch = branches.find((b) => b.when(g)) ?? { lines: ['...'], flags: [] };
  const name = NPC_NAMES[npc] ?? npc;
  const lines = branch.lines.map((raw) => {
    if (raw.startsWith('> ')) return { speaker: 'Você', text: raw.slice(2) };
    if (raw.startsWith('* ')) return { speaker: '', text: raw.slice(2) };
    return { speaker: name, text: raw };
  });
  return { lines, flags: branch.flags ?? [] };
}

export const narrator = (...texts: string[]): DialogueLine[] => texts.map((text) => ({ speaker: '', text }));

/** Textos narrativos usados pelo mundo. */
export const TEXTS = {
  notebookWake: [
    'O Caderno dos Encantos desperta. Suas páginas brilham de leve.',
    '"Todo grande recomeço precisa de um pequeno primeiro passo."',
  ],
  windowOpen: ['A luz entra. Por um instante, as paredes parecem menos cinzas.'],
  photoFound: [
    'Uma fotografia antiga: o ateliê e a praça em seus melhores dias. Cores, bandeirinhas, gente.',
    'No verso, alguém escreveu: "Enquanto alguém continuar criando, a vila nunca perderá completamente sua magia."',
    'Atrás de você, a bancada quebrada começa a emitir uma luz suave.',
  ],
  benchBroken: (have: number) => [`A bancada de marcenaria está quebrada. Com 5 madeira dá para consertar. (${have}/5)`],
  benchRepaired: ['A bancada está firme de novo. Cheira a serragem fresca. Você aprendeu novas receitas.'],
  sewingBroken: ['Uma mesa de costura, toda enferrujada. Alguém que entenda de máquinas saberia consertar.'],
  sewingNeeds: (m: number, p: number, f: number) => [`Pingo pediu 4 madeira, 3 pedra e 2 fibra. Você tem ${m}/4, ${p}/3 e ${f}/2.`],
  sewingRepaired: ['A mesa de costura ronrona. Tapetes, almofadas e cortinas agora são possíveis.'],
  paintBroken: ['Uma mesa de pintura sem tintas. Falta alguma cor viva para começar.'],
  paintNeeds: (m: number, p: number, f: number) => [`Para consertar: 3 madeira, 2 pedra e 1 flor-de-lua. Você tem ${m}/3, ${p}/2 e ${f}/1.`],
  paintRepaired: ['A flor-de-lua se dissolve em tinta lilás. A mesa de pintura está pronta.'],
  fountainDry: ['A fonte está seca há anos. No fundo, entre as folhas, há um encaixe vazio em forma de estrela.'],
  logBlocked: ['Um tronco pesado bloqueia a passagem. Talvez alguém da vila saiba mais.'],
  logMoved: ['Você empurra o tronco pelo lado certo. Ele cede com um rangido. A clareira se abre.'],
  shrine: ['Um altar de pedra coberto de musgo. As flores-de-lua ao redor ainda brilham de leve.'],
  signBroken: ['"Vila dos Pequ... Encan..." A placa está quebrada ao meio.'],
  signOk: ['"Vila dos Pequenos Encantos. Bem-vindo de volta."'],
  arrival: [
    'Vila dos Pequenos Encantos.',
    'A placa está quebrada. A praça, sem cor e coberta de folhas. As casas, fechadas.',
    'E o ateliê "mobiliado, com vista privilegiada"... é aquele ali, com o telhado furado.',
    'Bom. Todo recomeço precisa de um primeiro passo.',
  ],
  atelierFirst: [
    'Caixas, teias, móveis quebrados e janelas fechadas. Este é o seu novo ateliê.',
    'Em um canto, um livro fechado brilha de leve.',
  ],
  freeDecor: ['A decoração livre do ateliê foi desbloqueada. Crie o que quiser.'],
};
