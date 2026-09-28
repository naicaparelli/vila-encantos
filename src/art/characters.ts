import { P, darken, lighten, mix, type Hex } from './palette';
import { Pix } from './pix';
import { CHAR_W, CHAR_H, type Species } from '../config';

export type Dir = 'south' | 'north' | 'east' | 'west';
export const DIRS: Dir[] = ['south', 'north', 'east', 'west'];

export interface CharLook {
  species: Species;
  fur: Hex;
  furLight: Hex;
  furDark: Hex;
  overalls: Hex;
  scarf: Hex;
  eye: Hex;
  stripes?: boolean;
  /** Acessório: nenhum, avental (Amora), óculos de inventor (Pingo), capa de guardião (Lilo). */
  accessory?: 'none' | 'apron' | 'goggles' | 'cloak';
  hatColor?: Hex;
}

export const PLAYER_LOOKS: Record<Species, CharLook> = {
  coelho: { species: 'coelho', fur: P.fur, furLight: P.white, furDark: P.furShade, overalls: P.lilac, scarf: P.mustardLight, eye: P.outline },
  gato: { species: 'gato', fur: P.orange, furLight: P.fur, furDark: P.orangeDark, overalls: P.teal, scarf: P.coral, eye: P.eyeGreen, stripes: true },
  cachorro: { species: 'cachorro', fur: P.caramel, furLight: P.fur, furDark: P.caramelDark, overalls: P.mustard, scarf: P.sage, eye: P.outline },
};

export const NPC_LOOKS: Record<string, CharLook> = {
  amora: { species: 'gato', fur: '#8d7ba8', furLight: '#d9cfe8', furDark: '#5f4f7a', overalls: P.pink, scarf: P.white, eye: P.outline, accessory: 'apron' },
  pingo: { species: 'cachorro', fur: '#e8d7b8', furLight: P.white, furDark: '#b89f72', overalls: '#5a7fb3', scarf: P.mustardLight, eye: P.outline, accessory: 'goggles' },
  lilo: { species: 'coelho', fur: '#c9c4bf', furLight: P.white, furDark: '#8f8985', overalls: P.sageDark, scarf: P.sage, eye: P.outline, accessory: 'cloak' },
};

const BOOT = P.brown;
const BOOT_DARK = P.brownDark;
const BAG = P.brownDark;
const BAG_LIGHT = P.brown;

/** Cabeça arredondada com sombreamento (luz vinda de cima/esquerda). */
function head(p: Pix, x: number, y: number, w: number, h: number, look: CharLook): void {
  p.rrectR(x, y, w, h, 4, look.fur);
  // sombra na direita e embaixo, brilho em cima/esquerda
  p.vline(x + w - 1, y + 3, y + h - 4, look.furDark);
  p.vline(x + w - 2, y + h - 3, y + h - 2, look.furDark);
  p.hline(x + 3, x + w - 3, y + h - 1, look.furDark);
  p.hline(x + 2, x + w - 4, y + h - 2, mix(look.fur, look.furDark, 0.5));
  p.hline(x + 3, x + w - 5, y, lighten(look.fur, 0.25));
  p.set(x + 2, y + 1, lighten(look.fur, 0.25));
  p.vline(x, y + 4, y + h - 5, lighten(look.fur, 0.15));
}

function overallsBody(p: Pix, x: number, y: number, w: number, h: number, c: Hex): void {
  p.rrectR(x, y, w, h, 2, c);
  p.vline(x + w - 1, y + 1, y + h - 2, darken(c, 0.25));
  p.hline(x + 1, x + w - 2, y + h - 1, darken(c, 0.25));
  p.hline(x + 1, x + w - 2, y, lighten(c, 0.15));
}

function boot(p: Pix, x: number, y: number, w: number): void {
  p.rrectR(x, y, w, 4, 1, BOOT);
  p.hline(x, x + w - 1, y + 3, BOOT_DARK);
  p.set(x + w - 1, y + 1, BOOT_DARK); p.set(x + w - 1, y + 2, BOOT_DARK);
  p.set(x + 1, y, lighten(BOOT, 0.2));
}

/**
 * Desenha um frame do personagem em uma célula de 32 × 48.
 * frame: 0 = parado; 1..4 = ciclo de caminhada (contato E, passagem, contato D, passagem).
 */
export function drawCharacter(look: CharLook, dir: Dir, frame: number): Pix {
  const p = new Pix(CHAR_W, CHAR_H);
  const walk = frame > 0;
  const phase = walk ? (frame - 1) % 4 : -1;
  const contact = phase === 0 || phase === 2; // pernas abertas
  const pass = phase === 1 || phase === 3; // pernas juntas, corpo sobe
  const bob = pass ? -1 : 0; // corpo 1px mais alto na passagem
  const stride = phase === 0 ? 1 : phase === 2 ? -1 : 0; // +1: perna esquerda à frente

  const cx = 16;
  const side = dir === 'east';
  const back = dir === 'north';
  const headTop = 8 + bob;
  const bodyTop = 25 + bob;
  const legTop = 39 + bob;
  const fur = look.fur; const furD = look.furDark; const furL = look.furLight;
  const ov = look.overalls;

  // ------------------------------------------------------------ pernas e botas
  if (!side) {
    // frente/costas: pernas lado a lado; a perna à frente fica 1px mais longa
    const lLen = 5 + (stride > 0 ? 1 : 0) - (stride < 0 ? 1 : 0);
    const rLen = 5 + (stride < 0 ? 1 : 0) - (stride > 0 ? 1 : 0);
    p.rect(cx - 6, legTop, 4, lLen, ov); p.vline(cx - 3, legTop, legTop + lLen - 1, darken(ov, 0.2));
    p.rect(cx + 2, legTop, 4, rLen, ov); p.vline(cx + 5, legTop, legTop + rLen - 1, darken(ov, 0.2));
    boot(p, cx - 7, legTop + lLen, 6);
    boot(p, cx + 1, legTop + rLen, 6);
  } else {
    // perfil: pernas alternam para frente/trás
    const f = stride * 3;
    const backLeg = darken(ov, 0.25);
    p.rect(cx - 1 - f, legTop, 4, 5, backLeg);
    boot(p, cx - 2 - f, legTop + 5, 6);
    // a bota de trás fica mais escura
    p.rectDither(cx - 2 - f, legTop + 5, 6, 3, BOOT_DARK);
    p.rect(cx - 2 + f, legTop, 4, 5, ov); p.vline(cx + 1 + f, legTop, legTop + 4, darken(ov, 0.2));
    boot(p, cx - 3 + f, legTop + 5, 7);
  }

  // ------------------------------------------------------------ corpo
  if (!side) {
    // torso de pelo (peito) e jardineira por cima
    p.rrectR(cx - 7, bodyTop, 14, 15, 3, fur);
    p.vline(cx + 6, bodyTop + 2, bodyTop + 12, furD);
    overallsBody(p, cx - 6, bodyTop + 4, 12, 11, ov);
    // peitilho e alças
    p.rect(cx - 3, bodyTop + 1, 6, 4, ov);
    p.hline(cx - 3, cx + 2, bodyTop + 1, lighten(ov, 0.15));
    if (!back) {
      p.rect(cx - 5, bodyTop - 1, 2, 6, ov); p.rect(cx + 3, bodyTop - 1, 2, 6, ov);
      p.set(cx - 5, bodyTop + 4, P.mustardLight); p.set(cx + 4, bodyTop + 4, P.mustardLight); // botões
      p.rect(cx - 2, bodyTop + 8, 4, 3, darken(ov, 0.2)); // bolso
      p.hline(cx - 2, cx + 1, bodyTop + 8, darken(ov, 0.35));
    } else {
      // alças cruzadas nas costas
      p.line(cx - 5, bodyTop - 1, cx + 3, bodyTop + 5, ov); p.line(cx + 4, bodyTop - 1, cx - 4, bodyTop + 5, ov);
      p.set(cx - 5, bodyTop - 1, lighten(ov, 0.2)); p.set(cx + 4, bodyTop - 1, lighten(ov, 0.2));
    }
    // braços (balançam ao andar)
    const swing = stride; // braço direito acompanha a perna esquerda
    const armL = bodyTop + 4 - swing; const armR = bodyTop + 4 + swing;
    p.rect(cx - 9, armL, 2, 8, fur); p.set(cx - 9, armL + 7, furD); p.set(cx - 8, armL + 7, furD);
    p.rect(cx + 7, armR, 2, 8, fur); p.set(cx + 7, armR + 7, furD); p.set(cx + 8, armR + 7, furD);
    p.vline(cx + 8, armR, armR + 6, mix(fur, furD, 0.5));
    // bolsa a tiracolo
    if (!back) {
      p.line(cx - 6, bodyTop + 1, cx + 5, bodyTop + 9, BAG);
      p.line(cx - 6, bodyTop + 2, cx + 5, bodyTop + 10, BAG_LIGHT);
      p.rrectR(cx + 3, bodyTop + 9, 7, 6, 1, BAG);
      p.hline(cx + 4, cx + 8, bodyTop + 10, BAG_LIGHT);
      p.set(cx + 6, bodyTop + 12, P.amber); // fivela
    } else {
      p.line(cx + 5, bodyTop + 1, cx - 6, bodyTop + 9, BAG);
      p.rrectR(cx - 9, bodyTop + 8, 7, 6, 1, BAG);
      p.hline(cx - 8, cx - 4, bodyTop + 9, BAG_LIGHT);
    }
    // lenço
    p.rrectR(cx - 6, bodyTop - 2, 12, 4, 1, look.scarf);
    p.hline(cx - 5, cx + 4, bodyTop + 1, darken(look.scarf, 0.25));
    if (!back) {
      // nó e ponta caída
      p.rect(cx - 2, bodyTop + 1, 3, 2, look.scarf);
      p.rect(cx - 1, bodyTop + 3, 2, 3, darken(look.scarf, 0.15));
      p.set(cx, bodyTop + 5, darken(look.scarf, 0.3));
    } else {
      p.rect(cx + 3, bodyTop + 1, 2, 4, darken(look.scarf, 0.15));
    }
  } else {
    // perfil
    p.rrectR(cx - 5, bodyTop, 11, 15, 3, fur);
    p.vline(cx + 5, bodyTop + 2, bodyTop + 12, furD);
    overallsBody(p, cx - 4, bodyTop + 4, 9, 11, ov);
    p.rect(cx - 1, bodyTop, 2, 5, ov); p.set(cx, bodyTop + 3, P.mustardLight);
    p.rect(cx + 1, bodyTop + 8, 3, 3, darken(ov, 0.2)); // bolso
    // braço da frente balança com a perna oposta
    const armSwing = -stride * 2;
    p.rect(cx + 1 + armSwing, bodyTop + 5, 2, 8, fur);
    p.set(cx + 1 + armSwing, bodyTop + 12, furD); p.set(cx + 2 + armSwing, bodyTop + 12, furD);
    // bolsa no quadril de trás
    p.line(cx + 3, bodyTop + 1, cx - 4, bodyTop + 8, BAG);
    p.rrectR(cx - 7, bodyTop + 8, 6, 6, 1, BAG);
    p.hline(cx - 6, cx - 3, bodyTop + 9, BAG_LIGHT);
    // lenço com ponta para trás
    p.rrectR(cx - 5, bodyTop - 2, 10, 4, 1, look.scarf);
    p.hline(cx - 4, cx + 3, bodyTop + 1, darken(look.scarf, 0.25));
    p.rect(cx - 7, bodyTop - 1, 3, 2, look.scarf); p.rect(cx - 8, bodyTop, 2, 3, darken(look.scarf, 0.15));
  }

  // acessórios do corpo
  if (look.accessory === 'apron' && !back) {
    const ax = side ? cx - 3 : cx - 5;
    const aw = side ? 7 : 10;
    p.rrectR(ax, bodyTop + 6, aw, 9, 2, P.white);
    p.hline(ax + 1, ax + aw - 2, bodyTop + 14, P.creamDark);
    p.set(ax + 2, bodyTop + 9, P.pink); p.set(ax + aw - 3, bodyTop + 9, P.pink);
    p.hline(ax + 1, ax + aw - 2, bodyTop + 6, P.pinkDark);
  }
  if (look.accessory === 'cloak') {
    const c = look.overalls;
    if (back) {
      p.rrectR(cx - 8, bodyTop + 1, 16, 15, 3, c);
      p.vline(cx + 7, bodyTop + 3, bodyTop + 13, darken(c, 0.25));
      p.hline(cx - 6, cx + 5, bodyTop + 15, darken(c, 0.25));
      p.rectDither(cx - 7, bodyTop + 9, 14, 6, darken(c, 0.15));
    } else if (side) {
      p.rrectR(cx - 8, bodyTop + 1, 7, 15, 2, c);
      p.vline(cx - 2, bodyTop + 2, bodyTop + 14, darken(c, 0.25));
    } else {
      p.rect(cx - 9, bodyTop + 1, 3, 13, c); p.rect(cx + 6, bodyTop + 1, 3, 13, c);
      p.vline(cx + 8, bodyTop + 2, bodyTop + 13, darken(c, 0.25));
      p.hline(cx - 9, cx + 8, bodyTop + 1, lighten(c, 0.15));
    }
  }

  // ------------------------------------------------------------ cabeça
  const hy = headTop;
  const headW = side ? 15 : 16;
  const hx = side ? cx - 7 : cx - 8;
  head(p, hx, hy, headW, 16, look);

  if (!back) {
    if (!side) {
      // focinho
      p.rrectR(cx - 4, hy + 9, 8, 6, 2, furL);
      p.hline(cx - 3, cx + 2, hy + 14, mix(furL, furD, 0.35));
      // nariz e boca
      p.rect(cx - 1, hy + 10, 2, 1, P.outline); p.set(cx - 1, hy + 11, darken(P.outline, 0.2)); p.set(cx, hy + 11, darken(P.outline, 0.2));
      p.set(cx - 2, hy + 13, darken(fur, 0.4)); p.set(cx + 1, hy + 13, darken(fur, 0.4)); p.set(cx - 1, hy + 12, darken(fur, 0.4)); p.set(cx, hy + 12, darken(fur, 0.4));
      // bochechas
      p.set(cx - 6, hy + 11, P.pink); p.set(cx - 7, hy + 11, P.pink, 160); p.set(cx + 5, hy + 11, P.pink); p.set(cx + 6, hy + 11, P.pink, 160);
      // olhos com brilho
      p.rect(cx - 6, hy + 6, 2, 4, look.eye); p.rect(cx + 4, hy + 6, 2, 4, look.eye);
      p.set(cx - 6, hy + 6, P.white); p.set(cx + 4, hy + 6, P.white);
      p.set(cx - 5, hy + 9, mix(look.eye, P.white, 0.3)); p.set(cx + 5, hy + 9, mix(look.eye, P.white, 0.3));
      // sobrancelhas
      p.set(cx - 6, hy + 4, darken(fur, 0.3)); p.set(cx - 5, hy + 4, darken(fur, 0.3)); p.set(cx + 4, hy + 4, darken(fur, 0.3)); p.set(cx + 5, hy + 4, darken(fur, 0.3));
      if (look.species === 'gato') { p.set(cx - 9, hy + 10, darken(fur, 0.3)); p.set(cx - 9, hy + 12, darken(fur, 0.3)); p.set(cx + 8, hy + 10, darken(fur, 0.3)); p.set(cx + 8, hy + 12, darken(fur, 0.3)); } // bigodes
      if (look.species === 'cachorro') { p.set(cx + 3, hy + 3, furD); p.set(cx + 4, hy + 2, furD); p.set(cx + 2, hy + 2, furD); } // mancha
    } else {
      // perfil: focinho projetado para a direita
      p.rrectR(cx + 3, hy + 9, 7, 6, 2, furL);
      p.rect(cx + 8, hy + 10, 2, 2, P.outline); // nariz
      p.set(cx + 6, hy + 13, darken(fur, 0.4)); p.set(cx + 7, hy + 13, darken(fur, 0.4));
      p.set(cx + 1, hy + 11, P.pink); p.set(cx + 2, hy + 11, P.pink, 160);
      p.rect(cx + 2, hy + 6, 2, 4, look.eye); p.set(cx + 2, hy + 6, P.white); p.set(cx + 3, hy + 9, mix(look.eye, P.white, 0.3));
      p.set(cx + 2, hy + 4, darken(fur, 0.3)); p.set(cx + 3, hy + 4, darken(fur, 0.3));
      if (look.species === 'gato') { p.set(cx + 10, hy + 12, darken(fur, 0.3)); p.set(cx + 11, hy + 11, darken(fur, 0.3)); }
    }
  } else {
    // costas: tufo de pelo e sombra da nuca
    p.hline(cx - 5, cx + 4, hy + 15, furD);
    p.set(cx - 1, hy + 1, lighten(fur, 0.2)); p.set(cx, hy + 2, lighten(fur, 0.2)); p.set(cx + 1, hy + 1, lighten(fur, 0.2));
  }

  // listras do gato
  if (look.stripes) {
    const sx = side ? cx - 5 : cx - 7;
    p.rect(sx + 1, hy + 2, 2, 1, furD); p.rect(sx + 4, hy + 1, 2, 1, furD); p.rect(sx + 7, hy + 2, 2, 1, furD); p.rect(sx + 10, hy + 1, 2, 1, furD);
    p.set(sx + 2, hy + 3, furD); p.set(sx + 8, hy + 3, furD);
    if (back) { p.rect(cx - 6, hy + 7, 3, 1, furD); p.rect(cx + 3, hy + 7, 3, 1, furD); p.rect(cx - 2, hy + 10, 4, 1, furD); p.rect(cx - 5, hy + 12, 3, 1, furD); p.rect(cx + 2, hy + 12, 3, 1, furD); }
    else if (!side) { p.rect(cx - 8, hy + 8, 1, 2, furD); p.rect(cx + 7, hy + 8, 1, 2, furD); }
  }

  // ------------------------------------------------------------ orelhas por espécie
  const earIn = look.species === 'gato' ? P.pink : mix(look.fur, P.pink, 0.45);
  const earBounce = pass ? -1 : 0;
  if (look.species === 'coelho') {
    if (!side) {
      const ey = hy - 8 + earBounce;
      p.rrectR(cx - 7, ey, 4, 11, 2, fur); p.rrectR(cx + 3, ey, 4, 11, 2, fur);
      p.vline(cx - 4, ey + 2, ey + 9, furD); p.vline(cx + 6, ey + 2, ey + 9, furD);
      if (!back) { p.rect(cx - 6, ey + 2, 2, 7, earIn); p.rect(cx + 4, ey + 2, 2, 7, earIn); }
    } else {
      const ey = hy - 8 + earBounce;
      p.rrectR(cx - 5, ey, 4, 11, 2, mix(fur, furD, 0.3));
      p.rrectR(cx - 1, ey + 1, 4, 10, 2, fur); p.vline(cx + 2, ey + 3, ey + 8, furD);
      p.rect(cx, ey + 3, 2, 6, earIn);
    }
  } else if (look.species === 'gato') {
    if (!side) {
      p.triangle(cx - 6, hy - 5, 7, fur); p.triangle(cx + 5, hy - 5, 7, fur);
      p.set(cx - 3, hy, furD); p.set(cx + 8, hy, furD);
      if (!back) { p.triangle(cx - 6, hy - 3, 4, earIn); p.triangle(cx + 5, hy - 3, 4, earIn); }
    } else {
      p.triangle(cx - 3, hy - 5, 7, mix(fur, furD, 0.3));
      p.triangle(cx + 3, hy - 5, 7, fur);
      p.triangle(cx + 3, hy - 3, 4, earIn);
    }
  } else {
    // cachorro: orelhas caídas com balanço
    if (!side) {
      const ey = hy + 3 - earBounce;
      p.rrectR(cx - 11, ey, 4, 11, 2, furD); p.rrectR(cx + 8, ey, 4, 11, 2, furD);
      p.vline(cx - 10, ey + 1, ey + 8, mix(furD, fur, 0.4)); p.vline(cx + 9, ey + 1, ey + 8, mix(furD, fur, 0.4));
      p.set(cx - 9, ey + 10, darken(furD, 0.2)); p.set(cx + 10, ey + 10, darken(furD, 0.2));
    } else {
      const ey = hy + 3 - earBounce;
      p.rrectR(cx - 8, ey, 5, 11, 2, furD);
      p.vline(cx - 7, ey + 1, ey + 8, mix(furD, fur, 0.4));
      p.rrectR(cx - 4, hy + 1, 6, 3, 1, furD);
    }
  }

  // acessórios de cabeça
  if (look.accessory === 'goggles') {
    p.rect(hx, hy + 2, headW, 2, P.brownDark);
    p.hline(hx, hx + headW - 1, hy + 2, P.brown);
    if (!back) {
      const gx = side ? cx - 1 : cx - 6;
      p.rrectR(gx, hy + 1, 5, 4, 1, P.mustard); p.rrectR(gx + 6, hy + 1, 5, 4, 1, P.mustard);
      p.rect(gx + 1, hy + 2, 3, 2, P.tealLight); p.rect(gx + 7, hy + 2, 3, 2, P.tealLight);
      p.set(gx + 1, hy + 2, P.white); p.set(gx + 7, hy + 2, P.white);
    }
  }
  if (look.accessory === 'cloak') {
    // capuz caído
    p.rrectR(cx - 8, hy + 13, 16, 4, 1, look.overalls);
    p.hline(cx - 7, cx + 6, hy + 16, darken(look.overalls, 0.25));
  }
  if (look.accessory === 'apron' && !back) {
    // laço de confeiteira
    const bx = side ? cx + 2 : cx - 8;
    p.rect(bx, hy - 2, 3, 3, P.coral); p.rect(bx + 2, hy - 1, 3, 3, P.coral); p.set(bx + 2, hy - 1, P.coralDark);
    p.set(bx + 1, hy - 2, P.coralLight);
  }

  p.outline(P.outline);
  return p;
}

/** Retrato 48 × 48 para o painel de diálogo: cabeça grande, ombros e lenço. */
export function drawPortrait(look: CharLook, mood: 'neutral' | 'happy' = 'happy'): Pix {
  const p = new Pix(48, 48);
  const cx = 24;
  const fur = look.fur; const furD = look.furDark; const furL = look.furLight;
  // ombros e lenço
  p.rrectR(cx - 15, 38, 30, 12, 5, fur);
  p.rect(cx - 12, 43, 24, 6, look.overalls);
  p.rect(cx - 9, 40, 3, 8, look.overalls); p.rect(cx + 6, 40, 3, 8, look.overalls);
  p.rrectR(cx - 11, 36, 22, 5, 2, look.scarf); p.hline(cx - 10, cx + 9, 40, darken(look.scarf, 0.25));
  p.rect(cx - 2, 40, 4, 3, look.scarf); p.rect(cx - 1, 43, 2, 4, darken(look.scarf, 0.15));
  if (look.accessory === 'apron') { p.rrectR(cx - 6, 43, 12, 6, 2, P.white); }
  if (look.accessory === 'cloak') { p.rect(cx - 16, 38, 4, 10, look.overalls); p.rect(cx + 12, 38, 4, 10, look.overalls); }
  // cabeça
  const hx = cx - 14; const hy = 10; const hw = 28; const hh = 27;
  head(p, hx, hy, hw, hh, look);
  // focinho
  p.rrectR(cx - 7, hy + 15, 14, 9, 3, furL);
  p.rect(cx - 2, hy + 16, 4, 2, P.outline); p.set(cx - 2, hy + 17, darken(P.outline, 0.2)); p.set(cx + 1, hy + 17, darken(P.outline, 0.2));
  if (mood === 'happy') { p.set(cx - 4, hy + 20, darken(fur, 0.45)); p.set(cx - 3, hy + 21, darken(fur, 0.45)); p.hline(cx - 2, cx + 1, hy + 21, darken(fur, 0.45)); p.set(cx + 2, hy + 21, darken(fur, 0.45)); p.set(cx + 3, hy + 20, darken(fur, 0.45)); }
  else { p.hline(cx - 2, cx + 1, hy + 21, darken(fur, 0.45)); }
  // bochechas
  p.rect(cx - 12, hy + 17, 3, 2, P.pink, 200); p.rect(cx + 9, hy + 17, 3, 2, P.pink, 200);
  // olhos grandes com brilho
  p.rrectR(cx - 10, hy + 9, 4, 6, 1, look.eye); p.rrectR(cx + 6, hy + 9, 4, 6, 1, look.eye);
  p.rect(cx - 10, hy + 9, 2, 2, P.white); p.rect(cx + 6, hy + 9, 2, 2, P.white);
  p.set(cx - 8, hy + 13, mix(look.eye, P.white, 0.35)); p.set(cx + 8, hy + 13, mix(look.eye, P.white, 0.35));
  p.hline(cx - 10, cx - 7, hy + 7, darken(fur, 0.3)); p.hline(cx + 6, cx + 9, hy + 7, darken(fur, 0.3));
  if (look.species === 'gato') { p.hline(cx - 16, cx - 14, hy + 18, darken(fur, 0.3)); p.hline(cx - 16, cx - 14, hy + 20, darken(fur, 0.3)); p.hline(cx + 13, cx + 15, hy + 18, darken(fur, 0.3)); p.hline(cx + 13, cx + 15, hy + 20, darken(fur, 0.3)); }
  if (look.stripes) { p.rect(cx - 9, hy + 2, 3, 1, furD); p.rect(cx - 3, hy + 1, 3, 1, furD); p.rect(cx + 3, hy + 2, 3, 1, furD); p.rect(cx + 8, hy + 1, 3, 1, furD); p.rect(cx - 13, hy + 10, 1, 3, furD); p.rect(cx + 12, hy + 10, 1, 3, furD); }
  if (look.species === 'cachorro') { p.rrectR(cx + 3, hy + 2, 6, 4, 2, furD); }
  // orelhas
  const earIn = look.species === 'gato' ? P.pink : mix(fur, P.pink, 0.45);
  if (look.species === 'coelho') {
    p.rrectR(cx - 12, 0, 7, 16, 3, fur); p.rrectR(cx + 5, 0, 7, 16, 3, fur);
    p.rect(cx - 10, 3, 3, 10, earIn); p.rect(cx + 7, 3, 3, 10, earIn);
    p.vline(cx - 6, 2, 12, furD); p.vline(cx + 11, 2, 12, furD);
  } else if (look.species === 'gato') {
    p.triangle(cx - 9, 1, 12, fur); p.triangle(cx + 8, 1, 12, fur);
    p.triangle(cx - 9, 4, 8, earIn); p.triangle(cx + 8, 4, 8, earIn);
  } else {
    p.rrectR(cx - 20, hy + 4, 7, 18, 3, furD); p.rrectR(cx + 13, hy + 4, 7, 18, 3, furD);
    p.vline(cx - 18, hy + 6, hy + 18, mix(furD, fur, 0.4)); p.vline(cx + 15, hy + 6, hy + 18, mix(furD, fur, 0.4));
  }
  if (look.accessory === 'goggles') {
    p.rect(hx, hy + 2, hw, 3, P.brownDark); p.hline(hx, hx + hw - 1, hy + 2, P.brown);
    p.rrectR(cx - 11, hy, 9, 6, 2, P.mustard); p.rrectR(cx + 2, hy, 9, 6, 2, P.mustard);
    p.rect(cx - 9, hy + 1, 5, 4, P.tealLight); p.rect(cx + 4, hy + 1, 5, 4, P.tealLight);
    p.set(cx - 9, hy + 1, P.white); p.set(cx + 4, hy + 1, P.white);
  }
  if (look.accessory === 'apron') {
    p.rrectR(cx - 15, hy - 2, 5, 5, 1, P.coral); p.rrectR(cx - 11, hy, 5, 5, 1, P.coral); p.set(cx - 11, hy + 1, P.coralDark); p.set(cx - 14, hy - 1, P.coralLight);
  }
  if (look.accessory === 'cloak') { p.rrectR(cx - 15, hy + 24, 30, 5, 2, look.overalls); }
  p.outline(P.outline);
  return p;
}

/** Monta a spritesheet completa (4 direções × 5 frames) em um único Pix. */
export function buildCharacterSheet(look: CharLook): { pix: Pix; frames: Record<string, { x: number; y: number }> } {
  const cols = 5;
  const rows = 4;
  const sheet = new Pix(CHAR_W * cols, CHAR_H * rows);
  const frames: Record<string, { x: number; y: number }> = {};
  DIRS.forEach((dir, row) => {
    for (let f = 0; f < cols; f++) {
      const drawDir: Dir = dir === 'west' ? 'east' : dir;
      const frame = drawCharacter(look, drawDir, f);
      sheet.blit(frame, f * CHAR_W, row * CHAR_H, dir === 'west');
      frames[`${dir}_${f}`] = { x: f * CHAR_W, y: row * CHAR_H };
    }
  });
  return { pix: sheet, frames };
}
