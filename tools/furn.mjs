// Coloca todas as mobílias no ateliê nas 4 orientações e captura a tela.
// Uso: node tools/furn.mjs [pasta-saida]
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
const OUT = path.resolve(process.argv[2] ?? 'tools/shots/furn');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/?renderer=canvas');
await page.waitForTimeout(2500);
const WALL = ['prateleira', 'vitrine', 'cortina', 'quadro'];
const FLOOR = ['cama', 'luminaria', 'luminaria_encantada', 'cadeira', 'mesa_cha', 'banco', 'vaso_flores', 'vaso_encantado', 'tapete', 'almofada', 'banquinho'];
for (const [name, wall] of [['A', WALL.slice(0, 3)], ['B', WALL.slice(3)]]) {
  await page.evaluate(([wall, floor, first]) => {
    const g = window.__game; const st = window.__state;
    st.newGame('coelho'); st.data.introSeen = true; st.data.flags.push('atelier_restored', 'window_open', 'bench_repaired');
    let x = 1;
    for (const it of [...wall, ...floor]) st.addItem(it, 4, true);
    for (const it of wall) for (let r = 0; r < 4; r++) st.place('atelier', it, x++, 2, r);
    let i = 0;
    for (const it of floor) for (let r = 0; r < 4; r++) { st.place('atelier', it, 1 + (i % 12), 3 + Math.floor(i / 12) * 2, r); i++; }
    if (first) { g.scene.stop('TitleScene'); g.scene.start('WorldScene', { map: 'atelier', x: 12, y: 9 }); }
    else g.scene.getScene('WorldScene').scene.restart({ map: 'atelier', x: 12, y: 9 });
  }, [wall, FLOOR, name === 'A']);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const open = await page.evaluate(() => !!window.__game.scene.getScene('UIScene').dialogueBox); if (!open) break; await page.keyboard.press('e'); await page.waitForTimeout(150); }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `atelier_${name}.png`) });
  console.log('shot', name);
}
console.log('ERRORS', errors.length, errors.join('\n'));
await browser.close();
