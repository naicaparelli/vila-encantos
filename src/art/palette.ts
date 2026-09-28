/** Paleta base do jogo (README §16). */
export const P = {
  outline: '#2c1e26',
  black: '#1a1220',
  white: '#fff8ee',
  cream: '#f3e6c8',
  creamDark: '#d9c49a',
  creamLight: '#fbf3e0',
  wood: '#a86f3d',
  woodDark: '#74451f',
  woodLight: '#cf9a55',
  lilac: '#b28fc9',
  lilacDark: '#7d5f96',
  lilacLight: '#d6bfe6',
  teal: '#3f7f86',
  tealDark: '#2a565b',
  tealLight: '#6fb1b5',
  mustard: '#d9a33a',
  mustardDark: '#a5761f',
  mustardLight: '#f0c860',
  coral: '#e8836a',
  coralDark: '#b85a45',
  coralLight: '#f5a993',
  sage: '#8fb08a',
  sageDark: '#5f7f5c',
  sageLight: '#b8d1b0',
  grass: '#62ad47',
  grassDark: '#3f7d3b',
  grassLight: '#8fd05c',
  grassDeep: '#2c5a36',
  dirt: '#c49b5e',
  dirtDark: '#8e693c',
  dirtLight: '#e0c284',
  stone: '#9a9db0',
  stoneDark: '#62647a',
  stoneLight: '#c9cbd8',
  water: '#4a9bd8',
  waterDark: '#2c6cae',
  waterLight: '#8fd2f0',
  waterDeep: '#1f4f8f',
  amber: '#ffc857',
  amberDark: '#d99a2b',
  pink: '#f2a7c3',
  pinkDark: '#c77a9a',
  orange: '#e5904a',
  orangeDark: '#b5652a',
  caramel: '#c98a4b',
  caramelDark: '#96602e',
  fur: '#f6e7c9',
  furShade: '#d8c39c',
  green: '#4fa35d',
  eyeGreen: '#3f9a5a',
  brown: '#6b4a2f',
  brownDark: '#4a301c',
  gray: '#8b8791',
  grayDark: '#5b5760',
  grayLight: '#b7b3bd',
  sky: '#c9d6e6',
  night: '#2b2f4a',
  red: '#d24b4b',
};

export type Hex = string;

export function hexToRgb(hex: Hex): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): Hex {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function hexToInt(hex: Hex): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Mistura duas cores (t = 0 retorna a, t = 1 retorna b). */
export function mix(a: Hex, b: Hex, t: number): Hex {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Aplica o "Desbotamento": reduz saturação e puxa para um cinza-azulado frio. */
export function fade(hex: Hex, amount = 0.62): Hex {
  const [r, g, b] = hexToRgb(hex);
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const gr = l * 0.9 + 14;
  const gg = l * 0.9 + 12;
  const gb = l * 0.93 + 24;
  return rgbToHex(r + (gr - r) * amount, g + (gg - g) * amount, b + (gb - b) * amount);
}

export function darken(hex: Hex, t = 0.2): Hex {
  return mix(hex, P.black, t);
}

export function lighten(hex: Hex, t = 0.2): Hex {
  return mix(hex, P.white, t);
}

/**
 * Sombreamento com desvio de matiz (como na pixel art de referência): sombras puxam
 * para azul-arroxeado e luzes para amarelo quente, em vez de só preto/branco.
 * t < 0 escurece, t > 0 clareia (|t| ≤ 1).
 */
export function shade(hex: Hex, t: number): Hex {
  return t < 0 ? mix(hex, '#2a2e5c', Math.min(1, -t)) : mix(hex, '#fff1b8', Math.min(1, t));
}

/** Rampa de 5 tons com desvio de matiz: [muito escuro, escuro, base, claro, muito claro]. */
export function ramp(hex: Hex): [Hex, Hex, Hex, Hex, Hex] {
  return [shade(hex, -0.55), shade(hex, -0.3), hex, shade(hex, 0.28), shade(hex, 0.5)];
}
