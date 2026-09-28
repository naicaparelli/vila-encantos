// Diagnóstico rápido: carrega o jogo, espera e imprime cenas ativas, logs e erros (sem screenshots).
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:4173/?renderer=canvas';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
const t0 = Date.now();
await page.goto(url);
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const g = window.__game;
    if (!g) return 'no game';
    return { renderer: g.renderer?.constructor?.name, scenes: g.scene.getScenes(true).map((s) => s.scene.key), textures: Object.keys(g.textures.list).length };
  }).catch((e) => `evaluate failed: ${e.message}`);
  console.log(`${Date.now() - t0}ms`, JSON.stringify(info));
}
console.log('--- logs');
for (const l of logs) console.log(l);
await browser.close();
