import { P, darken, lighten, mix, type Hex } from './palette';
import { Pix, DITHER } from './pix';

/**
 * Texturas da interface (molduras 9-slice, botões, slots, controles de toque).
 * Cada moldura tem uma borda fixa em px; o centro é sólido para poder ser esticado.
 */

export interface UiTex { pix: Pix; border: number }

/** Moldura de pergaminho com borda de madeira, cantos arredondados e gemas nos cantos. */
function framePanel(size: number, border: number, fill: Hex, frameC: Hex, gem: Hex | null, inset = false): Pix {
  const p = new Pix(size, size);
  const r = 6;
  p.rrectR(0, 0, size, size, r, P.outline);
  p.rrectR(1, 1, size - 2, size - 2, r - 1, darken(frameC, 0.35));
  p.rrectR(2, 2, size - 4, size - 4, r - 2, frameC);
  // luz na borda superior/esquerda e sombra na inferior/direita da moldura
  p.rrectOutline(2, 2, size - 4, size - 4, r - 2, lighten(frameC, 0.25));
  for (let i = 3; i < size - 3; i++) { p.set(i, size - 4, darken(frameC, 0.3)); p.set(size - 4, i, darken(frameC, 0.3)); }
  p.rrectR(border - 3, border - 3, size - (border - 3) * 2, size - (border - 3) * 2, 3, darken(frameC, 0.45));
  p.rrectR(border - 2, border - 2, size - (border - 2) * 2, size - (border - 2) * 2, 2, fill);
  if (inset) {
    // sombra interna (o conteúdo fica "afundado")
    p.hline(border - 2, size - border + 1, border - 2, darken(fill, 0.25));
    p.vline(border - 2, border - 2, size - border + 1, darken(fill, 0.25));
    p.hline(border - 1, size - border, size - border + 1, lighten(fill, 0.35));
    p.vline(size - border + 1, border - 1, size - border + 1, lighten(fill, 0.35));
  } else {
    p.hline(border - 1, size - border, border - 2, lighten(fill, 0.5));
    p.vline(border - 2, border - 1, size - border, lighten(fill, 0.5));
  }
  if (gem) {
    const g = (x: number, y: number) => { p.rect(x, y, 3, 3, gem); p.set(x, y, lighten(gem, 0.4)); p.set(x + 2, y + 2, darken(gem, 0.3)); p.set(x + 1, y - 1, darken(gem, 0.2)); p.set(x + 1, y + 3, darken(gem, 0.2)); p.set(x - 1, y + 1, darken(gem, 0.2)); p.set(x + 3, y + 1, darken(gem, 0.2)); };
    g(4, 4); g(size - 7, 4); g(4, size - 7); g(size - 7, size - 7);
  }
  return p;
}

export function uiPanel(): UiTex { return { pix: framePanel(48, 12, P.cream, P.wood, P.lilac), border: 12 }; }
export function uiPanelDark(): UiTex { return { pix: framePanel(48, 12, '#2f2433', P.lilacDark, P.amber), border: 12 }; }
export function uiPanelInset(): UiTex { return { pix: framePanel(40, 10, P.creamDark, P.woodDark, null, true), border: 10 }; }

/** Botão com volume: topo claro, base escura. */
function button(size: number, border: number, fill: Hex, textShadow = false): Pix {
  const p = new Pix(size, size);
  const r = 5;
  p.rrectR(0, 0, size, size, r, P.outline);
  p.rrectR(1, 1, size - 2, size - 2, r - 1, fill);
  p.rrectOutline(1, 1, size - 2, size - 2, r - 1, lighten(fill, 0.3));
  // sombra inferior (2px) e lateral direita
  for (let i = 3; i < size - 3; i++) { p.set(i, size - 2, darken(fill, 0.35)); p.set(i, size - 3, darken(fill, 0.25)); p.set(size - 2, i, darken(fill, 0.3)); }
  p.set(2, size - 3, darken(fill, 0.25)); p.set(size - 3, 2, lighten(fill, 0.15));
  // brilho no topo
  p.hline(4, size - 5, 2, lighten(fill, 0.45));
  void textShadow; void border;
  return p;
}

export function uiBtn(): UiTex { return { pix: button(24, 7, P.wood), border: 7 }; }
export function uiBtnHover(): UiTex { return { pix: button(24, 7, P.woodLight), border: 7 }; }
export function uiBtnPrimary(): UiTex { return { pix: button(24, 7, P.coral), border: 7 }; }
export function uiBtnPrimaryHover(): UiTex { return { pix: button(24, 7, P.coralLight), border: 7 }; }
export function uiBtnLilac(): UiTex { return { pix: button(24, 7, P.lilac), border: 7 }; }
export function uiBtnDisabled(): UiTex { return { pix: button(24, 7, mix(P.gray, P.cream, 0.3)), border: 7 }; }

/** Slot de inventário (afundado) e versão selecionada (borda âmbar). */
function slot(sel: boolean): Pix {
  const size = 24; const p = new Pix(size, size);
  p.rrectR(0, 0, size, size, 4, sel ? P.amberDark : P.woodDark);
  p.rrectR(1, 1, size - 2, size - 2, 3, sel ? P.amber : P.wood);
  p.rrectR(3, 3, size - 6, size - 6, 2, sel ? P.creamLight : P.creamDark);
  p.hline(4, size - 5, 3, darken(sel ? P.creamLight : P.creamDark, 0.25));
  p.vline(3, 4, size - 5, darken(sel ? P.creamLight : P.creamDark, 0.25));
  p.hline(4, size - 5, size - 4, lighten(P.creamDark, 0.4));
  return p;
}
export function uiSlot(): UiTex { return { pix: slot(false), border: 6 }; }
export function uiSlotSel(): UiTex { return { pix: slot(true), border: 6 }; }

/** Moldura fina (pílula) para avisos, prompt e rastreador de missão. */
export function uiPill(): UiTex {
  const size = 24; const b = 6; const p = new Pix(size, size);
  p.rrectR(0, 0, size, size, 5, P.outline);
  p.rrectR(1, 1, size - 2, size - 2, 4, P.woodDark);
  p.rrectR(2, 2, size - 4, size - 4, 3, P.wood);
  p.rrectOutline(2, 2, size - 4, size - 4, 3, lighten(P.wood, 0.25));
  for (let i = 3; i < size - 3; i++) { p.set(i, size - 4, darken(P.wood, 0.3)); p.set(size - 4, i, darken(P.wood, 0.3)); }
  p.rrectR(b - 2, b - 2, size - (b - 2) * 2, size - (b - 2) * 2, 2, darken(P.wood, 0.45));
  p.rrectR(b - 1, b - 1, size - (b - 1) * 2, size - (b - 1) * 2, 2, P.cream);
  p.hline(b, size - b - 1, b - 1, lighten(P.cream, 0.5));
  return { pix: p, border: b };
}

/** Etiqueta de nome (fita lilás) usada no diálogo. */
export function uiTag(): UiTex {
  const size = 20; const p = new Pix(size, size);
  p.rrectR(0, 0, size, size, 4, P.outline);
  p.rrectR(1, 1, size - 2, size - 2, 3, P.lilacDark);
  p.rrectR(2, 2, size - 4, size - 4, 2, P.lilac);
  p.hline(4, size - 5, 2, P.lilacLight);
  for (let i = 3; i < size - 3; i++) p.set(i, size - 3, P.lilacDark);
  return { pix: p, border: 6 };
}

/** Botão redondo (controles de toque e ícones do HUD). */
function round(size: number, fill: Hex, ring: Hex, alpha = 255): Pix {
  const p = new Pix(size, size);
  const c = Math.floor(size / 2); const r = c - 1;
  p.disc(c, c, r, P.outline, alpha);
  p.disc(c, c, r - 1, darken(ring, 0.3), alpha);
  p.disc(c, c, r - 2, ring, alpha);
  p.disc(c, c, r - 4, fill, alpha);
  // brilho superior e sombra inferior
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d2 = x * x + y * y;
    if (d2 > (r - 4) * (r - 4)) continue;
    if (y < -(r - 4) * 0.55 && DITHER.checker(x, y)) p.set(c + x, c + y, lighten(fill, 0.3), alpha);
    if (y > (r - 4) * 0.6 && DITHER.checker(x, y)) p.set(c + x, c + y, darken(fill, 0.2), alpha);
  }
  for (let x = -Math.floor(r * 0.6); x <= Math.floor(r * 0.6); x++) { const y = -Math.round(Math.sqrt((r - 2) * (r - 2) - x * x)); p.set(c + x, c + y, lighten(ring, 0.35), alpha); }
  return p;
}
export function uiRound(): UiTex { return { pix: round(64, P.cream, P.wood, 235), border: 0 }; }
export function uiRoundActive(): UiTex { return { pix: round(64, P.amber, P.woodLight, 255), border: 0 }; }
export function uiJoyBase(): UiTex {
  const size = 96; const p = new Pix(size, size); const c = 48;
  p.disc(c, c, 46, P.outline, 150); p.disc(c, c, 44, P.woodDark, 150); p.disc(c, c, 42, P.cream, 120); p.disc(c, c, 30, P.creamDark, 110);
  // setas de direção
  const arrow = (dx: number, dy: number) => { for (let i = 0; i < 4; i++) p.hline(c + dx * 36 - (3 - i) * (dy !== 0 ? 1 : 0), c + dx * 36 + (3 - i) * (dy !== 0 ? 1 : 0), c + dy * (36 + i * (dy > 0 ? 1 : -1)) + (dy === 0 ? 0 : 0), P.woodDark, 200); };
  arrow(0, -1); arrow(0, 1);
  for (let i = 0; i < 4; i++) { p.vline(c - 36 - i, c - (3 - i), c + (3 - i), P.woodDark, 200); p.vline(c + 36 + i, c - (3 - i), c + (3 - i), P.woodDark, 200); }
  return { pix: p, border: 0 };
}
export function uiJoyKnob(): UiTex { return { pix: round(40, P.amber, P.wood, 235), border: 0 }; }

/** Barra de progresso (fundo e preenchimento) para o HUD. */
export function uiBarBg(): UiTex { const p = new Pix(12, 12); p.rrectR(0, 0, 12, 12, 3, P.outline); p.rrectR(1, 1, 10, 10, 2, P.woodDark); p.rrectR(2, 2, 8, 8, 2, darken(P.creamDark, 0.2)); return { pix: p, border: 4 }; }
export function uiBarFill(): UiTex { const p = new Pix(12, 12); p.rrectR(0, 0, 12, 12, 2, P.amberDark); p.rrectR(1, 1, 10, 10, 2, P.amber); p.hline(2, 9, 1, P.mustardLight); return { pix: p, border: 3 }; }

/** Bolha de fala (seta) e marcador de página do caderno. */
export function uiCheckbox(on: boolean): Pix {
  const p = new Pix(12, 12);
  p.rrectR(0, 0, 12, 12, 2, P.woodDark); p.rrectR(1, 1, 10, 10, 2, on ? P.sageLight : P.creamLight);
  p.hline(2, 9, 1, on ? P.white : P.white);
  if (on) { p.line(3, 6, 5, 8, P.sageDark); p.line(4, 6, 6, 8, P.sageDark); p.line(5, 8, 9, 3, P.sageDark); p.line(6, 8, 10, 3, P.sageDark); }
  return p;
}

export const UI_TEXTURES: Record<string, () => UiTex> = {
  ui_panel: uiPanel,
  ui_panel_dark: uiPanelDark,
  ui_panel_inset: uiPanelInset,
  ui_btn: uiBtn,
  ui_btn_hover: uiBtnHover,
  ui_btn_primary: uiBtnPrimary,
  ui_btn_primary_hover: uiBtnPrimaryHover,
  ui_btn_lilac: uiBtnLilac,
  ui_btn_disabled: uiBtnDisabled,
  ui_slot: uiSlot,
  ui_slot_sel: uiSlotSel,
  ui_tag: uiTag,
  ui_pill: uiPill,
  ui_round: uiRound,
  ui_round_active: uiRoundActive,
  ui_joy_base: uiJoyBase,
  ui_joy_knob: uiJoyKnob,
  ui_bar_bg: uiBarBg,
  ui_bar_fill: uiBarFill,
  ui_check_on: () => ({ pix: uiCheckbox(true), border: 0 }),
  ui_check_off: () => ({ pix: uiCheckbox(false), border: 0 }),
};

/** Nomes dos 9 pedaços de uma moldura. */
export const SLICES = ['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br'] as const;
export type Slice = (typeof SLICES)[number];

/** Retângulos dos 9 pedaços dentro da textura (em px). */
export function sliceRects(size: number, b: number): Record<Slice, { x: number; y: number; w: number; h: number }> {
  const m = size - b * 2;
  return {
    tl: { x: 0, y: 0, w: b, h: b }, t: { x: b, y: 0, w: m, h: b }, tr: { x: b + m, y: 0, w: b, h: b },
    l: { x: 0, y: b, w: b, h: m }, c: { x: b, y: b, w: m, h: m }, r: { x: b + m, y: b, w: b, h: m },
    bl: { x: 0, y: b + m, w: b, h: b }, b: { x: b, y: b + m, w: m, h: b }, br: { x: b + m, y: b + m, w: b, h: b },
  };
}
