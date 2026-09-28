export type StationId = 'marcenaria' | 'costura' | 'pintura';

export const STATION_NAMES: Record<StationId, string> = {
  marcenaria: 'Bancada de marcenaria',
  costura: 'Mesa de costura',
  pintura: 'Mesa de pintura',
};

export interface RecipeDef {
  id: string;
  result: string;
  count: number;
  station: StationId;
  ingredients: Record<string, number>;
}

export const RECIPES: Record<string, RecipeDef> = {
  // ---- marcenaria
  cadeira: { id: 'cadeira', result: 'cadeira', count: 1, station: 'marcenaria', ingredients: { madeira: 4 } },
  banquinho: { id: 'banquinho', result: 'banquinho', count: 1, station: 'marcenaria', ingredients: { madeira: 2 } },
  cama: { id: 'cama', result: 'cama', count: 1, station: 'marcenaria', ingredients: { madeira: 6, folhas: 3 } },
  luminaria: { id: 'luminaria', result: 'luminaria', count: 1, station: 'marcenaria', ingredients: { madeira: 3, po_encanto: 1 } },
  mesa_cha: { id: 'mesa_cha', result: 'mesa_cha', count: 1, station: 'marcenaria', ingredients: { madeira: 5 } },
  banco: { id: 'banco', result: 'banco', count: 1, station: 'marcenaria', ingredients: { madeira: 4, pedra: 1 } },
  prateleira: { id: 'prateleira', result: 'prateleira', count: 1, station: 'marcenaria', ingredients: { madeira: 4, pedra: 2 } },
  vaso_flores: { id: 'vaso_flores', result: 'vaso_flores', count: 1, station: 'marcenaria', ingredients: { pedra: 2, flor: 2 } },
  vitrine: { id: 'vitrine', result: 'vitrine', count: 1, station: 'marcenaria', ingredients: { madeira: 8, pedra: 3, po_encanto: 1 } },

  // ---- costura
  tapete: { id: 'tapete', result: 'tapete', count: 1, station: 'costura', ingredients: { fibra: 4, folhas: 2 } },
  almofada: { id: 'almofada', result: 'almofada', count: 1, station: 'costura', ingredients: { fibra: 3, folhas: 2, flor: 1 } },
  cortina: { id: 'cortina', result: 'cortina', count: 1, station: 'costura', ingredients: { fibra: 5, flor: 2 } },

  // ---- pintura
  tinta: { id: 'tinta', result: 'tinta', count: 2, station: 'pintura', ingredients: { flor_lua: 1, po_encanto: 1 } },
  quadro: { id: 'quadro', result: 'quadro', count: 1, station: 'pintura', ingredients: { madeira: 2, tinta: 1 } },
  vaso_encantado: { id: 'vaso_encantado', result: 'vaso_encantado', count: 1, station: 'pintura', ingredients: { pedra: 2, flor_lua: 2, tinta: 1 } },
  luminaria_encantada: { id: 'luminaria_encantada', result: 'luminaria_encantada', count: 1, station: 'pintura', ingredients: { madeira: 3, tinta: 1, po_encanto: 1 } },
};

/** Grupos de receitas desbloqueados por eventos da história. */
export const RECIPE_UNLOCKS: Record<string, string[]> = {
  bench: ['cadeira', 'banquinho', 'cama', 'luminaria'],
  comfort: ['mesa_cha', 'banco', 'prateleira', 'vaso_flores'],
  sewing: ['tapete', 'almofada', 'cortina'],
  shop: ['vitrine'],
  paint: ['tinta', 'quadro', 'vaso_encantado', 'luminaria_encantada'],
};
