/** Constantes globais do jogo. */
export const TILE = 32;
export const CHAR_W = 32;
export const CHAR_H = 48;

export const WALK_SPEED = 84;
export const RUN_SPEED = 150;

export const SAVE_KEY = 'vila-pequenos-encantos:save:v1';

/** Tempo de reaparecimento de cada material (segundos). */
export const REGROW_SECONDS: Record<string, number> = {
  folhas: 30,
  fibra: 45,
  madeira: 60,
  pedra: 90,
  flor: 120,
  po_encanto: 180,
  flor_lua: 150,
};

export type Species = 'coelho' | 'gato' | 'cachorro';

export const SPECIES_INFO: Record<Species, { name: string; desc: string }> = {
  coelho: { name: 'Bunny', desc: 'Cream fur and long ears.\nLilac overalls and a yellow scarf.' },
  gato: { name: 'Kitten', desc: 'Orange striped fur and green eyes.\nTeal overalls and a coral scarf.' },
  cachorro: { name: 'Puppy', desc: 'Caramel fur and floppy ears.\nMustard overalls and a sage scarf.' },
};

export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const UI_FONT = 'Verdana, "Segoe UI", Tahoma, sans-serif';
