export type ItemKind = 'material' | 'furniture' | 'key';

export interface ItemAttrs {
  aconchego?: number;
  iluminacao?: number;
  natural?: number;
}

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
}

export const ITEMS: Record<string, ItemDef> = {
  // ---- materiais
  madeira: { id: 'madeira', name: 'Madeira', desc: 'Toras e galhos secos. A base de qualquer marcenaria.', kind: 'material', icon: 'icon_madeira' },
  pedra: { id: 'pedra', name: 'Pedra', desc: 'Pedras lisas do bosque. Boas para bases e prateleiras.', kind: 'material', icon: 'icon_pedra' },
  folhas: { id: 'folhas', name: 'Folhas', desc: 'Folhas macias, ótimas para enchimento e enfeites.', kind: 'material', icon: 'icon_folhas' },
  fibra: { id: 'fibra', name: 'Fibra', desc: 'Fibras vegetais para tecer tapetes e almofadas.', kind: 'material', icon: 'icon_fibra' },
  flor: { id: 'flor', name: 'Flor colorida', desc: 'Flores do bosque com um pouco de cor ainda viva.', kind: 'material', icon: 'icon_flor' },
  po_encanto: { id: 'po_encanto', name: 'Pó de Encanto', desc: 'Um brilho quente que resiste ao Desbotamento.', kind: 'material', icon: 'icon_po_encanto' },
  flor_lua: { id: 'flor_lua', name: 'Flor-de-lua', desc: 'Só floresce perto do velho altar da floresta. Guarda cores esquecidas.', kind: 'material', icon: 'icon_flor_lua' },
  tinta: { id: 'tinta', name: 'Tinta encantada', desc: 'Tinta que devolve cor a qualquer objeto.', kind: 'material', icon: 'icon_tinta' },

  // ---- itens-chave
  foto: { id: 'foto', name: 'Fotografia antiga', desc: '"Enquanto alguém continuar criando, a vila nunca perderá completamente sua magia."', kind: 'key', icon: 'icon_foto' },
  fragmento: { id: 'fragmento', name: 'Fragmento de Encanto', desc: 'Um pedaço de um Pequeno Encanto. Pulsa suavemente na direção da praça.', kind: 'key', icon: 'icon_fragmento' },
  carta: { id: 'carta', name: 'Carta misteriosa', desc: '"Se você conseguiu despertar um encanto, talvez ainda exista esperança para o Bosque dos Sussurros."', kind: 'key', icon: 'icon_carta' },

  // ---- mobílias (marcenaria)
  cama: { id: 'cama', name: 'Cama simples', desc: 'Uma cama de madeira com colcha lilás. Finalmente, descanso.', kind: 'furniture', icon: 'furn_cama', attrs: { aconchego: 3 } },
  luminaria: { id: 'luminaria', name: 'Luminária', desc: 'Luz quente para noites de criação.', kind: 'furniture', icon: 'furn_luminaria', attrs: { aconchego: 1, iluminacao: 2 } },
  cadeira: { id: 'cadeira', name: 'Cadeira', desc: 'Cadeira de madeira com almofada coral.', kind: 'furniture', icon: 'furn_cadeira', attrs: { aconchego: 1 } },
  mesa_cha: { id: 'mesa_cha', name: 'Mesa de chá', desc: 'Mesinha redonda para uma xícara e um doce.', kind: 'furniture', icon: 'furn_mesa_cha', attrs: { aconchego: 2 } },
  prateleira: { id: 'prateleira', name: 'Prateleira', desc: 'Para expor potes, livros e lembranças.', kind: 'furniture', icon: 'furn_prateleira', attrs: { aconchego: 1 }, wall: true },
  vitrine: { id: 'vitrine', name: 'Vitrine de doces', desc: 'Vitrine de vidro para bolos e biscoitos.', kind: 'furniture', icon: 'furn_vitrine', attrs: { aconchego: 2, iluminacao: 1 }, wall: true },
  banco: { id: 'banco', name: 'Banco de madeira', desc: 'Banco simples para dois amigos.', kind: 'furniture', icon: 'furn_banco', attrs: { aconchego: 1 } },
  banquinho: { id: 'banquinho', name: 'Banquinho', desc: 'Pequeno, mas firme.', kind: 'furniture', icon: 'furn_banquinho', attrs: { aconchego: 1 } },
  vaso_flores: { id: 'vaso_flores', name: 'Vaso de flores', desc: 'Flores do bosque em um vaso de barro.', kind: 'furniture', icon: 'furn_vaso_flores', attrs: { natural: 2 } },

  // ---- mobílias (costura)
  tapete: { id: 'tapete', name: 'Tapete tecido', desc: 'Tapete quente de fibras trançadas.', kind: 'furniture', icon: 'furn_tapete', attrs: { aconchego: 2 }, walkable: true },
  almofada: { id: 'almofada', name: 'Almofada', desc: 'Macia e azul-petróleo.', kind: 'furniture', icon: 'furn_almofada', attrs: { aconchego: 2 } },
  cortina: { id: 'cortina', name: 'Cortina', desc: 'Cortina verde-sálvia para suavizar a luz.', kind: 'furniture', icon: 'furn_cortina', attrs: { aconchego: 1, iluminacao: 1 }, wall: true, hang: 'window' },

  // ---- mobílias (pintura)
  quadro: { id: 'quadro', name: 'Quadro pintado', desc: 'Uma pintura do ateliê em seus melhores dias.', kind: 'furniture', icon: 'furn_quadro', attrs: { aconchego: 2 }, wall: true, hang: 'wall' },
  vaso_encantado: { id: 'vaso_encantado', name: 'Vaso encantado', desc: 'Flores-de-lua que brilham à noite.', kind: 'furniture', icon: 'furn_vaso_encantado', attrs: { natural: 2, iluminacao: 1 } },
  luminaria_encantada: { id: 'luminaria_encantada', name: 'Luminária encantada', desc: 'Luz lilás que afasta o Desbotamento.', kind: 'furniture', icon: 'furn_luminaria_encantada', attrs: { aconchego: 1, iluminacao: 3 } },
};

export const MATERIAL_ORDER = ['madeira', 'pedra', 'folhas', 'fibra', 'flor', 'po_encanto', 'flor_lua', 'tinta'];

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}
