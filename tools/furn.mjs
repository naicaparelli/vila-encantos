// Coloca todas as mobílias no ateliê (nas orientações que cada uma tem) e captura a tela.
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

// [item, x, y, rot] — o ateliê tem chão em x 1..12, y 2..9; parede de fundo em y 1 (janela em 7,1)
const SCENES = {
  A: [
    ['prateleira', 1, 2, 0], ['vitrine', 4, 2, 0], ['cortina', 7, 1, 0], ['quadro', 9, 1, 0], ['quadro', 11, 1, 0],
    ['cama', 1, 4, 0], ['tapete', 4, 5, 0], ['tapete', 7, 5, 1],
    ['banco', 10, 4, 0], ['banco', 10, 6, 2], ['banco', 9, 8, 1], ['banco', 11, 8, 3],
    ['luminaria', 4, 8, 0], ['luminaria_encantada', 6, 8, 0],
  ],
  B: [
    ['cadeira', 1, 3, 0], ['cadeira', 3, 3, 1], ['cadeira', 5, 3, 2], ['cadeira', 7, 3, 3],
    ['mesa_cha', 9, 3, 0], ['mesa_cha', 11, 3, 1],
    ['vaso_flores', 1, 5, 0], ['vaso_flores', 3, 5, 1], ['vaso_encantado', 5, 5, 0], ['vaso_encantado', 7, 5, 2],
    ['banquinho', 9, 5, 0], ['banquinho', 11, 5, 1],
    ['almofada', 1, 7, 0], ['almofada', 3, 7, 1], ['luminaria', 5, 7, 1], ['luminaria_encantada', 7, 7, 3],
    ['mesa_cha', 9, 7, 2], ['mesa_cha', 11, 7, 3],
  ],
};
let first = true;
for (const [name, list] of Object.entries(SCENES)) {
  await page.evaluate(([list, first]) => {
    const g = window.__game; const st = window.__state;
    st.newGame('coelho'); st.data.introSeen = true; st.data.flags.push('atelier_restored', 'window_open', 'bench_repaired', 'atelier_visited', 'arrived');
    for (const [it, x, y, r] of list) { st.addItem(it, 1, true); st.place('atelier', it, x, y, r); }
    if (first) { g.scene.stop('TitleScene'); g.scene.start('WorldScene', { map: 'atelier', x: 12, y: 9 }); }
    else g.scene.getScene('WorldScene').scene.restart({ map: 'atelier', x: 12, y: 9 });
  }, [list, first]);
  first = false;
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const open = await page.evaluate(() => !!window.__game.scene.getScene('UIScene').dialogueBox); if (!open) break; await page.keyboard.press('e'); await page.waitForTimeout(150); }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `atelier_${name}.png`) });
  console.log('shot', name);
}
console.log('ERRORS', errors.length, errors.join('\n'));
await browser.close();
