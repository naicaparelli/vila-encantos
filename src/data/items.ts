export type ItemKind = 'material' | 'furniture' | 'key';

export interface ItemAttrs {
  aconchego?: number;
  iluminacao?: number;
  natural?: number;
}

export const ATTRIBUTE_NAMES: Record<keyof ItemAttrs, string> = {
  aconchego: 'Coziness',
  iluminacao: 'Lighting',
  natural: 'Nature',
};

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  kind: ItemKind;
  /** Chave de textura do ícone (16 px para materiais, 32 px para mobílias). */
  icon: string;
  attrs?: ItemAttrs;
  /** Mobílias de parede só podem ser colocadas encostadas na parede superior. */
  wall?: boolean;
  /** Pendurado: ocupa o próprio tile da parede ('wall') ou de uma janela ('window'), sem ocupar o chão. */
  hang?: 'wall' | 'window';
  /** Mobílias de chão que não bloqueiam passagem (tapetes). */
  walkable?: boolean;
  /** Tamanho do footprint em tiles [largura, altura] na orientação sul (padrão 1×1). Girar 90° troca os dois. */
  size?: [number, number];
  /** Só tem a vista sul (cama, móveis de parede). */
  noRotate?: boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  // ---- materiais
  madeira: { id: 'madeira', name: 'Wood', desc: 'Dry logs and branches. The foundation of any woodworking project.', kind: 'material', icon: 'icon_madeira' },
  pedra: { id: 'pedra', name: 'Stone', desc: 'Smooth forest stones. Good for bases and shelves.', kind: 'material', icon: 'icon_pedra' },
  folhas: { id: 'folhas', name: 'Leaves', desc: 'Soft leaves, perfect for stuffing and decorations.', kind: 'material', icon: 'icon_folhas' },
  fibra: { id: 'fibra', name: 'Fiber', desc: 'Plant fibers for weaving rugs and cushions.', kind: 'material', icon: 'icon_fibra' },
  flor: { id: 'flor', name: 'Colorful flower', desc: 'Forest flowers with a little color still left in them.', kind: 'material', icon: 'icon_flor' },
  po_encanto: { id: 'po_encanto', name: 'Wonder Dust', desc: 'A warm glow that resists the Fading.', kind: 'material', icon: 'icon_po_encanto' },
  flor_lua: { id: 'flor_lua', name: 'Moonflower', desc: 'Blooms only near the old forest altar. Holds forgotten colors.', kind: 'material', icon: 'icon_flor_lua' },
  tinta: { id: 'tinta', name: 'Enchanted paint', desc: 'Paint that restores color to any object.', kind: 'material', icon: 'icon_tinta' },

  // ---- itens-chave
  foto: { id: 'foto', name: 'Old photograph', desc: '"As long as someone keeps creating, the village will never lose all its magic."', kind: 'key', icon: 'icon_foto' },
  fragmento: { id: 'fragmento', name: 'Wonder Fragment', desc: 'A piece of a Little Wonder. Pulses gently toward the square.', kind: 'key', icon: 'icon_fragmento' },
  carta: { id: 'carta', name: 'Mysterious letter', desc: '"If you\'ve managed to awaken a wonder, perhaps there\'s still hope for the Whispering Woods."', kind: 'key', icon: 'icon_carta' },

  // ---- mobílias (marcenaria)
  cama: { id: 'cama', name: 'Simple bed', desc: 'A wooden bed with a lilac quilt. Rest, at last.', kind: 'furniture', icon: 'furn_cama', attrs: { aconchego: 3 }, size: [2, 2], noRotate: true },
  luminaria: { id: 'luminaria', name: 'Lamp', desc: 'Warm light for nights spent creating.', kind: 'furniture', icon: 'furn_luminaria', attrs: { aconchego: 1, iluminacao: 2 } },
  cadeira: { id: 'cadeira', name: 'Chair', desc: 'A wooden chair with a coral cushion.', kind: 'furniture', icon: 'furn_cadeira', attrs: { aconchego: 1 } },
  mesa_cha: { id: 'mesa_cha', name: 'Tea table', desc: 'A little round table for a cup of tea and a treat.', kind: 'furniture', icon: 'furn_mesa_cha', attrs: { aconchego: 2 } },
  prateleira: { id: 'prateleira', name: 'Shelf', desc: 'For displaying jars, books and keepsakes.', kind: 'furniture', icon: 'furn_prateleira', attrs: { aconchego: 1 }, wall: true, size: [2, 1], noRotate: true },
  vitrine: { id: 'vitrine', name: 'Pastry display case', desc: 'A glass display case for cakes and cookies.', kind: 'furniture', icon: 'furn_vitrine', attrs: { aconchego: 2, iluminacao: 1 }, wall: true, size: [2, 1], noRotate: true },
  banco: { id: 'banco', name: 'Wooden bench', desc: 'A simple bench for two friends.', kind: 'furniture', icon: 'furn_banco', attrs: { aconchego: 1 }, size: [2, 1] },
  banquinho: { id: 'banquinho', name: 'Stool', desc: 'Small, but sturdy.', kind: 'furniture', icon: 'furn_banquinho', attrs: { aconchego: 1 } },
  vaso_flores: { id: 'vaso_flores', name: 'Flower pot', desc: 'Forest flowers in a clay pot.', kind: 'furniture', icon: 'furn_vaso_flores', attrs: { natural: 2 } },

  // ---- mobílias (costura)
  tapete: { id: 'tapete', name: 'Woven rug', desc: 'A warm rug made of braided fibers.', kind: 'furniture', icon: 'furn_tapete', attrs: { aconchego: 2 }, walkable: true, size: [2, 2] },
  almofada: { id: 'almofada', name: 'Cushion', desc: 'Soft and teal.', kind: 'furniture', icon: 'furn_almofada', attrs: { aconchego: 2 } },
  cortina: { id: 'cortina', name: 'Curtain', desc: 'A sage curtain to soften the light.', kind: 'furniture', icon: 'furn_cortina', attrs: { aconchego: 1, iluminacao: 1 }, wall: true, hang: 'window' },

  // ---- mobílias (pintura)
  quadro: { id: 'quadro', name: 'Painting', desc: 'A painting of the workshop in its finest days.', kind: 'furniture', icon: 'furn_quadro', attrs: { aconchego: 2 }, wall: true, hang: 'wall' },
  vaso_encantado: { id: 'vaso_encantado', name: 'Enchanted flower pot', desc: 'Moonflowers that glow at night.', kind: 'furniture', icon: 'furn_vaso_encantado', attrs: { natural: 2, iluminacao: 1 } },
  luminaria_encantada: { id: 'luminaria_encantada', name: 'Enchanted lamp', desc: 'Lilac light that keeps the Fading away.', kind: 'furniture', icon: 'furn_luminaria_encantada', attrs: { aconchego: 1, iluminacao: 3 } },
};

export const MATERIAL_ORDER = ['madeira', 'pedra', 'folhas', 'fibra', 'flor', 'po_encanto', 'flor_lua', 'tinta'];

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}
