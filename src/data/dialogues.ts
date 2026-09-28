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
        'The fountain... it\'s flowing again! I heard the water from the shop and came running.',
        'I\'m opening the bakery tomorrow. With vanilla cake, just like on market mornings.',
        'Thank you for not giving up on us.',
      ],
    },
    {
      when: (g) => g.questActive('q7') && g.questObjectivesDone('q7'),
      lines: [
        'It\'s... perfect. Just how I imagined it. No, even better.',
        'Wait. There\'s something glowing under the display case...',
        '* An amber fragment pulses gently between the floorboards.',
        'That\'s a piece of a Little Wonder! I thought they had all disappeared.',
        'Lilo always said the wonders lived in the fountain. Take it there. Please.',
      ],
    },
    {
      when: (g) => g.questActive('q7'),
      lines: [
        'Here\'s my request: a pastry display case, two tea tables, two cushions, a rug and a painting.',
        'Make it cozy and bright, with a touch of nature. Check your progress in the Journal (Tab).',
        'Use Decorate mode (F) in here. I\'ll stay out of the way, I promise.',
      ],
    },
    {
      when: (g) => g.questActive('q6'),
      lines: [
        'Pingo said there are moonflowers in the forest. Lilo knows where. He just... doesn\'t like talking about it.',
        'Once the painting table is ready, I\'ll tell you what I have in mind.',
      ],
    },
    {
      when: (g) => g.questActive('q5') && !g.flag('talked_amora_q5'),
      lines: [
        'Welcome to my bakery. Or what\'s left of it.',
        'When the colors went away, the customers stopped coming. Then I stopped baking. Then... I closed up.',
        'If you clear out these boxes and cobwebs, I can start picturing how it used to be.',
        'Oh, and you\'ll need a sewing table for rugs and cushions. Pingo knows about those things. He\'s in the square.',
      ],
      flags: ['talked_amora_q5'],
    },
    {
      when: (g) => g.questActive('q5'),
      lines: [
        'Are the boxes still here? No rush. Well, maybe a little rush.',
        'Pingo is in the square, near the fountain. He can fix any worktable.',
      ],
    },
    {
      when: (g) => g.questActive('q4'),
      lines: [
        'Hello? The door was open and I saw a light. It\'s been so long since I\'ve seen a light in this house.',
        '> I bought the workshop. Online. The listing was... a little different.',
        'Hehe. All the village listings were. I\'m Amora. I used to have a bakery here in the square.',
        'Used to. I still do, actually. It\'s just closed. Do you make furniture? Really?',
        '> I\'m learning.',
        'Then maybe you can help me reopen. Meet me at the bakery. It\'s the house with the awning.',
      ],
      flags: ['talked_amora_q4'],
    },
    {
      when: () => true,
      lines: ['It\'s nice to see you around.'],
    },
  ],

  pingo: [
    {
      when: (g) => g.flag('praca_restored'),
      lines: [
        'Did you see that? DID YOU SEE THAT? The water! The flowers! I need to invent something RIGHT NOW.',
        'A bubble machine. No. A windmill. No! Both!',
      ],
    },
    {
      when: (g) => g.questActive('q6') && !g.flag('paint_repaired'),
      lines: [
        'The painting table in your workshop can be fixed. Bring 3 wood, 2 stone and 1 moonflower.',
        'The moonflower helps balance the colors. It only grows in the altar clearing. Ask Lilo how to get there.',
      ],
    },
    {
      when: (g) => g.questDone('q6'),
      lines: [
        'Painting already? I knew that table still had some life in it.',
        'Come tell me when you finish Amora\'s shop. I want to see it.',
      ],
    },
    {
      when: (g) => g.questActive('q5') && !g.flag('talked_pingo_q5'),
      lines: [
        'Hey! You\'re the new crafter! I\'m Pingo. I invent things. Well, I used to.',
        'I lost my tools when the Fading came. Or I stopped looking. Same sort of thing.',
        '> Amora said you fix worktables.',
        'Sewing tables are my specialty! There\'s one in your workshop, right? Every crafter\'s home had one.',
        'Bring it 4 wood, 3 stone and 2 fiber. You can find fiber near the forest pond.',
      ],
      flags: ['talked_pingo_q5'],
    },
    {
      when: (g) => g.questActive('q5'),
      lines: ['The sewing table: 4 wood, 3 stone and 2 fiber. Look for fiber near the pond.'],
    },
    {
      when: () => true,
      lines: ['If you need anything fixed, just give me a shout.'],
    },
  ],

  lilo: [
    {
      when: (g) => g.flag('praca_restored'),
      lines: [
        'So it was true... the village wasn\'t lost. It was just waiting for someone to start again.',
        'I looked after this square for years without believing in it. Thank you for believing when I couldn\'t.',
        'That path to the north leads to the Whispering Woods. It\'s still faded. But now I know it doesn\'t have to stay that way.',
      ],
    },
    {
      when: (g) => g.questActive('q8'),
      lines: [
        'Are you carrying a fragment? I can feel its warmth from here.',
        'The fountain. The Little Wonders always lived in the fountain. Place the fragment there.',
      ],
    },
    {
      when: (g) => g.questActive('q6') && !g.flag('talked_lilo_q6'),
      lines: [
        'Moonflowers? No one\'s asked about them in a long time.',
        'They grow around the old altar in the northeast of the forest. A log blocks the path.',
        'I left the log there myself. I thought it was better if people stopped hoping.',
        'But you don\'t seem like the kind to stop. Go on. The log will budge if you push from the right side.',
      ],
      flags: ['talked_lilo_q6'],
    },
    {
      when: (g) => g.questActive('q6'),
      lines: ['The altar is in the northeast of the forest. Push the log. It\'ll budge.'],
    },
    {
      when: (g) => g.questActive('q7'),
      lines: ['Amora seems excited. I haven\'t seen that in a while. Please don\'t spoil it.'],
    },
    {
      when: (g) => g.questDone('q3'),
      lines: [
        'You lit up the workshop. I saw it from the square.',
        'Don\'t get your hopes up. The colors will leave again. They always do.',
      ],
    },
    {
      when: () => true,
      lines: [
        'Are you the workshop\'s new owner? I\'m Lilo. I look after the square. What\'s left of it.',
        'I won\'t lie: the village won\'t be what it once was. But good luck with your home.',
      ],
    },
  ],
};

export function getDialogue(npc: string, g: GameState): { lines: DialogueLine[]; flags: string[] } {
  const branches = NPC_DIALOGUES[npc] ?? [];
  const branch = branches.find((b) => b.when(g)) ?? { lines: ['...'], flags: [] };
  const name = NPC_NAMES[npc] ?? npc;
  const lines = branch.lines.map((raw) => {
    if (raw.startsWith('> ')) return { speaker: 'You', text: raw.slice(2) };
    if (raw.startsWith('* ')) return { speaker: '', text: raw.slice(2) };
    return { speaker: name, text: raw };
  });
  return { lines, flags: branch.flags ?? [] };
}

export const narrator = (...texts: string[]): DialogueLine[] => texts.map((text) => ({ speaker: '', text }));

/** Textos narrativos usados pelo mundo. */
export const TEXTS = {
  notebookWake: [
    'The Journal of Wonders awakens. Its pages glow softly.',
    '"Every fresh start begins with one small step."',
  ],
  windowOpen: ['Light streams in. For a moment, the walls seem a little less gray.'],
  photoFound: [
    'An old photograph: the workshop and square in their brightest days. Colors, bunting, people.',
    'On the back, someone wrote: "As long as someone keeps creating, the village will never lose all its magic."',
    'Behind you, the broken workbench begins to glow softly.',
  ],
  benchBroken: (have: number) => [`The woodworking bench is broken. You can repair it with 5 wood. (${have}/5)`],
  benchRepaired: ['The workbench is sturdy again. It smells of fresh sawdust. You\'ve learned new recipes.'],
  sewingBroken: ['A rusty sewing table. Someone who knows machines could help fix it.'],
  sewingNeeds: (m: number, p: number, f: number) => [`Pingo asked for 4 wood, 3 stone and 2 fiber. You have ${m}/4, ${p}/3 and ${f}/2.`],
  sewingRepaired: ['The sewing table hums. Now you can make rugs, cushions and curtains.'],
  paintBroken: ['A painting table with no paint. It needs a little living color to get started.'],
  paintNeeds: (m: number, p: number, f: number) => [`To repair: 3 wood, 2 stone and 1 moonflower. You have ${m}/3, ${p}/2 and ${f}/1.`],
  paintRepaired: ['The moonflower dissolves into lilac paint. The painting table is ready.'],
  fountainDry: ['The fountain has been dry for years. At the bottom, among the leaves, is an empty star-shaped socket.'],
  logBlocked: ['A heavy log blocks the way. Maybe someone in the village knows more.'],
  logMoved: ['You push the log from the right side. It gives way with a creak. The clearing opens up.'],
  shrine: ['A moss-covered stone altar. The moonflowers around it still glow softly.'],
  signBroken: ['"Village of Lit... Wond..." The sign is broken in half.'],
  signOk: ['"Village of Little Wonders. Welcome back."'],
  arrival: [
    'Village of Little Wonders.',
    'The sign is broken. The square is colorless and covered in leaves. The houses are shuttered.',
    'And the workshop, "fully furnished, with stunning views"... is that one over there, with the hole in the roof.',
    'Well. Every fresh start needs a first step.',
  ],
  atelierFirst: [
    'Boxes, cobwebs, broken furniture and shuttered windows. This is your new workshop.',
    'In a corner, a closed book glows softly.',
  ],
  freeDecor: ['Free decorating is now unlocked in your workshop. Create whatever you like.'],
};
