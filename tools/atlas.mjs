// Gera uma "folha de contato" com todas as texturas do jogo ampliadas (para revisão visual da pixel art).
// Uso: node tools/atlas.mjs [pasta-saida] [escala]   (padrão: tools/shots/atlas, 3x)
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.resolve(process.argv[2] ?? 'tools/shots/atlas');
const SCALE = Number(process.argv[3] ?? 3);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto('http://localhost:4173/?renderer=canvas');
await page.waitForTimeout(2500);

const groups = {
  tiles: (k) => k.startsWith('tile_') && !k.endsWith('__faded'),
  tiles_faded: (k) => k.startsWith('tile_') && k.endsWith('__faded'),
  chars: (k) => k.startsWith('player_') || k.startsWith('npc_'),
  portraits: (k) => k.startsWith('portrait_'),
  props: (k) => !k.startsWith('tile_') && !k.startsWith('player_') && !k.startsWith('npc_') && !k.startsWith('portrait_') && !k.startsWith('furn_') && !k.startsWith('icon_') && !k.startsWith('ui_') && !k.startsWith('facade') && !k.startsWith('house') && !k.endsWith('__faded') && !k.startsWith('thumb'),
  buildings: (k) => (k.startsWith('facade') || k.startsWith('house')) && !k.endsWith('__faded'),
  furniture: (k) => k.startsWith('furn_') && !k.endsWith('__faded'),
  icons: (k) => (k.startsWith('icon_') || k.startsWith('ui_') || k.startsWith('thumb')),
};

const only = process.argv[4];
for (const [name, filter] of Object.entries(groups)) {
  if (only && name !== only) continue;
  const dataUrl = await page.evaluate(([filterSrc, scale]) => {
    const filter = new Function('k', `return (${filterSrc})(k)`);
    const tm = window.__game.textures;
    const keys = tm.getTextureKeys().filter((k) => !['__DEFAULT', '__MISSING', '__WHITE', '__NORMAL'].includes(k) && filter(k)).sort();
    const cells = keys.map((k) => { const src = tm.get(k).getSourceImage(); return { k, src, w: src.width, h: src.height }; });
    const pad = 8; const labelH = 14;
    const maxW = 1500;
    let x = pad, y = pad, rowH = 0, totalH = 0;
    const pos = [];
    for (const c of cells) {
      const cw = c.w * scale; const ch = c.h * scale + labelH;
      if (x + cw + pad > maxW && x > pad) { x = pad; y += rowH + pad; rowH = 0; }
      pos.push({ ...c, x, y });
      x += cw + pad; rowH = Math.max(rowH, ch); totalH = y + rowH + pad;
    }
    const cv = document.createElement('canvas'); cv.width = maxW; cv.height = totalH;
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#5a5a66'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = '10px monospace'; ctx.fillStyle = '#fff';
    for (const p of pos) {
      ctx.fillStyle = '#2b2b33'; ctx.fillRect(p.x, p.y, p.w * scale, p.h * scale);
      ctx.drawImage(p.src, p.x, p.y, p.w * scale, p.h * scale);
      ctx.fillStyle = '#fff'; ctx.fillText(p.k.slice(0, Math.max(4, Math.floor(p.w * scale / 6))), p.x, p.y + p.h * scale + 11);
    }
    return cv.toDataURL('image/png');
  }, [filter.toString(), SCALE]);
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(OUT, `${name}.png`), buf);
  console.log('atlas', name);
}
await browser.close();
