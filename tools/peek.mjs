// Captura rápida de cada mapa (velho e restaurado) sem jogar o fluxo inteiro.
// Uso: node tools/peek.mjs [pasta-saida] [largura] [altura]   (padrão tools/shots/peek, 1280x720)
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.resolve(process.argv[2] ?? 'tools/shots/peek');
const W = Number(process.argv[3] ?? 1280);
const H = Number(process.argv[4] ?? 720);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/?renderer=canvas');
await page.waitForTimeout(2500);
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log('shot', name); };
await shot('title');

const views = [
  { name: 'praca_old', map: 'praca', x: 11, y: 11, flags: [] },
  { name: 'praca_new', map: 'praca', x: 11, y: 11, flags: ['praca_restored', 'fountain_restored', 'pingo_in_praca'] },
  { name: 'floresta', map: 'floresta', x: 9, y: 8, flags: ['forest_path_open'] },
  { name: 'atelier_old', map: 'atelier', x: 6, y: 6, flags: [] },
  { name: 'atelier_new', map: 'atelier', x: 6, y: 6, flags: ['atelier_restored', 'window_open', 'bench_repaired', 'sewing_repaired', 'paint_repaired', 'amora_at_atelier'] },
  { name: 'loja_old', map: 'loja', x: 5, y: 5, flags: ['amora_at_loja'] },
  { name: 'loja_new', map: 'loja', x: 5, y: 5, flags: ['loja_restored', 'amora_at_loja'] },
];

let first = true;
for (const v of views) {
  await page.evaluate(([v, first]) => {
    const g = window.__game; const st = window.__state;
    st.newGame('gato');
    st.data.introSeen = true;
    for (const f of v.flags) st.data.flags.push(f);
    if (first) { g.scene.stop('TitleScene'); g.scene.start('WorldScene', { map: v.map, x: v.x, y: v.y }); }
    else g.scene.getScene('WorldScene').scene.restart({ map: v.map, x: v.x, y: v.y });
  }, [v, first]);
  first = false;
  await page.waitForTimeout(1300);
  // fecha diálogo de chegada se houver
  for (let i = 0; i < 6; i++) { const open = await page.evaluate(() => !!window.__game.scene.getScene('UIScene').dialogueBox); if (!open) break; await page.keyboard.press('e'); await page.waitForTimeout(150); }
  await page.waitForTimeout(300);
  await shot(v.name);
}
// painéis
await page.keyboard.press('b'); await page.waitForTimeout(400); await shot('panel_inventory'); await page.keyboard.press('Escape');
await page.keyboard.press('Tab'); await page.waitForTimeout(400); await shot('panel_notebook'); await page.keyboard.press('Escape');
await page.keyboard.press('m'); await page.waitForTimeout(400); await shot('panel_map'); await page.keyboard.press('Escape');
await page.evaluate(() => { const w = window.__game.scene.getScene('WorldScene'); w.say([{ speaker: 'Amora', text: 'Oi! Eu sou a Amora. Que bom ver alguém novo por aqui, o ateliê estava tão quieto...' }]); });
await page.waitForTimeout(1500); await shot('dialogue'); await page.keyboard.press('e'); await page.keyboard.press('e');
console.log('ERRORS:', errors.length); for (const e of errors) console.log(e);
await browser.close();
