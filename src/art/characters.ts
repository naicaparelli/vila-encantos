import { P, darken, lighten, type Hex } from './palette';
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

/**
 * Desenha um frame do personagem em uma célula de 32 × 48.
 * frame: 0 = parado; 1..4 = ciclo de caminhada.
 */
export function drawCharacter(look: CharLook, dir: Dir, frame: number): Pix {
  const p = new Pix(CHAR_W, CHAR_H);
  const walk = frame > 0;
  const phase = walk ? (frame - 1) % 4 : -1; // 0: perna E à frente, 1: neutro, 2: perna D à frente, 3: neutro
  const bob = phase === 0 || phase === 2 ? 1 : 0;
  const legOff = phase === 0 ? 2 : phase === 2 ? -2 : 0;

  const cx = 16;
  const headTop = 8 - bob;
  const bodyTop = 25 - bob;

  const side = dir === 'east' || dir === 'west';
  const back = dir === 'north';
  const boots = P.brown;
  const bag = P.brownDark;

  // ---- pernas e botas
  const legY = 39 - bob;
  if (!side) {
    const lx = cx - 6;
    const rx = cx + 2;
    p.rect(lx, legY + (legOff > 0 ? 0 : 0), 4, 6 + (legOff > 0 ? 1 : 0), look.overalls);
    p.rect(rx, legY, 4, 6 + (legOff < 0 ? 1 : 0), look.overalls);
    p.rect(lx - 1, legY + 5 + (legOff > 0 ? 1 : 0), 6, 3, boots);
    p.rect(rx - 1, legY + 5 + (legOff < 0 ? 1 : 0), 6, 3, boots);
  } else {
    // perfil: pernas alternam para frente/trás
    const front = legOff;
    p.rect(cx - 3 + front, legY, 4, 6, look.overalls);
    p.rect(cx - 1 - front, legY, 4, 6, darken(look.overalls, 0.25));
    p.rect(cx - 4 + front, legY + 5, 7, 3, boots);
    p.rect(cx - 2 - front, legY + 5, 6, 3, darken(boots, 0.2));
  }

  // ---- corpo (jardineira)
  if (!side) {
    p.rrect(cx - 7, bodyTop, 14, 15, look.fur);
    p.rrect(cx - 6, bodyTop + 4, 12, 11, look.overalls);
    p.rect(cx - 5, bodyTop, 2, 5, look.overalls); // alças
    p.rect(cx + 3, bodyTop, 2, 5, look.overalls);
    p.rect(cx - 3, bodyTop + 7, 6, 4, darken(look.overalls, 0.2)); // bolso
    p.set(cx - 5, bodyTop + 4, P.mustardLight); // botões
    p.set(cx + 4, bodyTop + 4, P.mustardLight);
    // braços
    p.rect(cx - 9, bodyTop + 4, 2, 8, look.fur);
    p.rect(cx + 7, bodyTop + 4, 2, 8, look.fur);
    // bolsa a tiracolo
    if (!back) {
      p.line(cx - 6, bodyTop + 1, cx + 6, bodyTop + 10, bag);
      p.rrect(cx + 4, bodyTop + 9, 6, 5, bag);
      p.set(cx + 6, bodyTop + 10, lighten(bag, 0.3));
    } else {
      p.rrect(cx - 9, bodyTop + 9, 6, 5, bag);
    }
    // lenço
    p.rect(cx - 5, bodyTop - 1, 10, 3, look.scarf);
    if (!back) { p.rect(cx - 1, bodyTop + 2, 3, 3, look.scarf); p.set(cx, bodyTop + 5, darken(look.scarf, 0.2)); }
  } else {
    p.rrect(cx - 5, bodyTop, 11, 15, look.fur);
    p.rrect(cx - 4, bodyTop + 4, 9, 11, look.overalls);
    p.rect(cx - 1, bodyTop, 2, 5, look.overalls);
    const armSwing = phase === 0 ? 2 : phase === 2 ? -2 : 0;
    p.rect(cx + 1 + armSwing, bodyTop + 5, 2, 8, look.fur);
    p.rrect(cx - 6, bodyTop + 8, 6, 5, bag);
    p.rect(cx - 4, bodyTop - 1, 9, 3, look.scarf);
    p.rect(cx + 4, bodyTop + 1, 2, 4, look.scarf);
  }

  // acessórios corporais
  if (look.accessory === 'apron' && !back) {
    p.rrect(cx - 5, bodyTop + 6, 10, 9, P.white);
    p.set(cx - 2, bodyTop + 9, P.pink); p.set(cx + 1, bodyTop + 9, P.pink);
  }
  if (look.accessory === 'cloak') {
    p.rect(cx - 8, bodyTop + 1, 16, 4, look.overalls);
    if (back) p.rrect(cx - 8, bodyTop + 1, 16, 14, look.overalls);
  }

  // ---- cabeça
  const hy = headTop;
  const headW = side ? 15 : 16;
  const hx = side ? cx - 7 : cx - 8;
  p.rrect(hx, hy + 2, headW, 15, look.fur);
  p.rrect(hx + 1, hy + 1, headW - 2, 2, look.fur);
  p.rrect(hx + 1, hy + 16, headW - 2, 2, look.fur);

  if (!back) {
    // focinho / bochechas
    if (!side) {
      p.rrect(cx - 4, hy + 10, 8, 6, look.furLight);
      p.set(cx - 1, hy + 11, P.outline); p.set(cx, hy + 11, P.outline); // nariz
      p.set(cx - 1, hy + 13, darken(look.fur, 0.35)); p.set(cx, hy + 13, darken(look.fur, 0.35)); // boca
      p.set(cx - 7, hy + 12, P.pink); p.set(cx + 6, hy + 12, P.pink); // bochechas
    } else {
      p.rrect(cx + 1, hy + 10, 7, 6, look.furLight);
      p.set(cx + 7, hy + 11, P.outline);
      p.set(cx + 5, hy + 13, darken(look.fur, 0.35));
    }
    // olhos
    if (!side) {
      p.rect(cx - 5, hy + 7, 2, 3, look.eye); p.rect(cx + 3, hy + 7, 2, 3, look.eye);
      p.set(cx - 5, hy + 7, P.white); p.set(cx + 3, hy + 7, P.white);
    } else {
      p.rect(cx + 3, hy + 7, 2, 3, look.eye);
      p.set(cx + 3, hy + 7, P.white);
    }
    // sobrancelhas suaves
    if (!side) { p.set(cx - 5, hy + 5, darken(look.fur, 0.3)); p.set(cx + 4, hy + 5, darken(look.fur, 0.3)); }
  }

  // listras do gato
  if (look.stripes) {
    const sx = side ? cx - 5 : cx - 7;
    p.rect(sx, hy + 3, 2, 1, look.furDark);
    p.rect(sx + 3, hy + 2, 2, 1, look.furDark);
    p.rect(sx + 6, hy + 3, 2, 1, look.furDark);
    p.rect(sx + 9, hy + 2, 2, 1, look.furDark);
    if (back) { p.rect(cx - 6, hy + 8, 3, 1, look.furDark); p.rect(cx + 3, hy + 8, 3, 1, look.furDark); p.rect(cx - 2, hy + 11, 4, 1, look.furDark); }
  }

  // ---- orelhas por espécie
  const ear = look.fur;
  const earIn = look.species === 'gato' ? P.pink : lighten(look.fur, 0.3);
  if (look.species === 'coelho') {
    if (!side) {
      p.rrect(cx - 7, hy - 7, 4, 10, ear); p.rrect(cx + 3, hy - 7, 4, 10, ear);
      if (!back) { p.rect(cx - 6, hy - 5, 2, 6, earIn); p.rect(cx + 4, hy - 5, 2, 6, earIn); }
    } else {
      p.rrect(cx - 4, hy - 7, 4, 10, ear); p.rrect(cx - 1, hy - 6, 4, 9, darken(ear, 0.1));
      p.rect(cx, hy - 4, 2, 5, earIn);
    }
  } else if (look.species === 'gato') {
    if (!side) {
      p.triangle(cx - 6, hy - 5, 7, ear); p.triangle(cx + 5, hy - 5, 7, ear);
      if (!back) { p.triangle(cx - 6, hy - 3, 4, earIn); p.triangle(cx + 5, hy - 3, 4, earIn); }
    } else {
      p.triangle(cx - 3, hy - 5, 7, darken(ear, 0.1));
      p.triangle(cx + 3, hy - 5, 7, ear);
      p.triangle(cx + 3, hy - 3, 4, earIn);
    }
  } else {
    // cachorro: orelhas caídas
    if (!side) {
      p.rrect(cx - 11, hy + 3, 4, 10, look.furDark); p.rrect(cx + 8, hy + 3, 4, 10, look.furDark);
      p.set(cx - 10, hy + 4, look.fur); p.set(cx + 9, hy + 4, look.fur);
    } else {
      p.rrect(cx - 8, hy + 3, 4, 10, look.furDark);
      p.rrect(cx - 3, hy + 2, 5, 3, look.furDark);
    }
  }

  // acessórios de cabeça
  if (look.accessory === 'goggles') {
    p.rect(hx, hy + 3, headW, 2, P.brownDark);
    if (!back) {
      p.rrect(cx - 6, hy + 2, 5, 4, P.mustard); p.rrect(cx + 1, hy + 2, 5, 4, P.mustard);
      p.rect(cx - 5, hy + 3, 3, 2, P.tealLight); p.rect(cx + 2, hy + 3, 3, 2, P.tealLight);
    }
  }
  if (look.accessory === 'cloak') {
    // capuz caído nas costas
    p.rect(cx - 8, hy + 14, 16, 3, look.overalls);
  }
  if (look.accessory === 'apron' && !back) {
    // laço de confeiteira
    p.rect(cx - 8, hy - 1, 3, 3, P.coral); p.rect(cx - 6, hy, 2, 2, P.coralDark);
  }

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
