// Playthrough automatizado: percorre o jogo do título ao final, captura erros de console e screenshots.
// Uso: node tools/smoke.mjs [url] [--mobile]   (SHOT_DIR define a pasta das capturas)
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

const OUT = process.env.SHOT_DIR ?? path.resolve('tools/shots');
fs.mkdirSync(OUT, { recursive: true });
const url = process.argv[2] ?? 'http://localhost:4173/?renderer=canvas';
const mobile = process.argv.includes('--mobile');

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext(mobile
  ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
  : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack}`));

const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${mobile ? 'm_' : ''}${name}.png`) }); console.log('shot', name); };
const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, ...args) => page.evaluate(fn, ...args);
const world = () => ev(() => { const w = window.__game.scene.getScene('WorldScene'); return { map: w.mapId, x: Math.round(w.player.x), y: Math.round(w.player.y), paused: w.paused, decor: w.decorMode }; });
const dialogueOpen = () => ev(() => !!window.__game.scene.getScene('UIScene').dialogueBox);
const skipDialogue = async () => { for (let i = 0; i < 40 && await dialogueOpen(); i++) { await page.keyboard.press('e'); await wait(120); } };
const teleport = (tx, ty, dir = 'south') => ev(([tx, ty, dir]) => { const w = window.__game.scene.getScene('WorldScene'); w.player.setPosition(tx * 32 + 16, ty * 32 + 28); w.dir = dir; }, [tx, ty, dir]);
const pressE = async () => { await wait(250); await page.keyboard.press('e'); await wait(250); };
const goDoor = async (tx, ty, dir) => { await teleport(tx, ty, dir); await page.keyboard.down(dir === 'north' ? 'w' : dir === 'south' ? 's' : dir === 'east' ? 'd' : 'a'); await wait(500); await page.keyboard.up(dir === 'north' ? 'w' : dir === 'south' ? 's' : dir === 'east' ? 'd' : 'a'); await wait(900); };
const save = () => ev(() => JSON.parse(JSON.stringify(window.__state.data)));
const check = (cond, msg) => { console.log(cond ? 'OK  ' : 'FAIL', msg); if (!cond) failures.push(msg); };
const failures = [];
const tileScreen = (tx, ty) => ev(([tx, ty]) => { const cam = window.__game.scene.getScene('WorldScene').cameras.main; const v = cam.worldView; return { x: (tx * 32 + 16 - v.x) * cam.zoom, y: (ty * 32 + 16 - v.y) * cam.zoom }; }, [tx, ty]);
const clickTile = async (tx, ty) => { const p = await tileScreen(tx, ty); if (mobile) { await page.touchscreen.tap(p.x, p.y); await wait(150); await page.touchscreen.tap(p.x, p.y); } else { await page.mouse.click(p.x, p.y); } await wait(300); };

await page.goto(url);
await wait(2500);
await shot('01_title');
const { width, height } = page.viewportSize();
await page.mouse.click(width / 2, height * 0.66);
await wait(600);
await shot('02_select');
await page.mouse.click(width / 2, height * 0.3 + 105);
await wait(400);
const s = Math.min(Math.min(Math.max(Math.min(width, height) / 360, 1), 2.2), 1.5);
const panelH = Math.min(height - height * 0.3 - 12, 290 * s);
await page.mouse.click(width / 2 + 80 * s, height * 0.3 + panelH - 24 * s);
await wait(1200);
await shot('03_intro1');
for (let i = 0; i < 5; i++) { await page.keyboard.press('Space'); await wait(600); }
await wait(1800);
await shot('05_arrival');
await skipDialogue();
await shot('06_praca');
let w0 = await world();
check(w0.map === 'praca' && !w0.paused, `chegada na praça: ${JSON.stringify(w0)}`);

// movimento real: andar para o norte por 1s deve mudar y
await page.keyboard.down('w'); await wait(1000); await page.keyboard.up('w');
const w1 = await world();
check(w1.y < w0.y - 40, `andar para o norte moveu o jogador (${w0.y} -> ${w1.y})`);
await page.keyboard.down('Shift'); await page.keyboard.down('a'); await wait(600); await page.keyboard.up('a'); await page.keyboard.up('Shift');
const w2 = await world();
check(w2.x < w1.x - 40, `correr para oeste moveu o jogador (${w1.x} -> ${w2.x})`);

// entrar no ateliê pela porta (4,4)
await goDoor(4, 5, 'north');
await skipDialogue();
w0 = await world();
check(w0.map === 'atelier', `entrou no ateliê: ${JSON.stringify(w0)}`);
await shot('08_atelier');

// Caderno → inicia missão 1
await teleport(2, 3, 'north'); await pressE(); await skipDialogue(); await wait(300);
await shot('09_notebook');
await page.keyboard.press('Escape'); await wait(300);
let sv = await save();
check(sv.activeQuests.includes('q1'), `missão 1 ativa (${sv.activeQuests})`);

// caixas e teias
for (const [x, y] of [[3, 5], [6, 6], [10, 7], [4, 9], [11, 4]]) { await teleport(x, y, 'north'); await pressE(); }
for (const [x, y, d] of [[12, 3, 'north'], [1, 9, 'north'], [6, 4, 'north']]) { await teleport(x, y, d); await pressE(); }
sv = await save();
check(sv.counters.boxes_atelier === 5, `5 caixas retiradas (${sv.counters.boxes_atelier})`);
check(sv.counters.webs_atelier === 3, `3 teias limpas (${sv.counters.webs_atelier})`);
// janela
await teleport(7, 2, 'north'); await pressE(); await skipDialogue();
sv = await save();
check(sv.flags.includes('window_open'), 'janela aberta');
await shot('10_window');
// foto
await teleport(8, 8, 'north'); await pressE(); await skipDialogue(); await wait(400);
sv = await save();
check(sv.inventory.foto === 1, 'fotografia encontrada');
check(sv.doneQuests.includes('q1') && sv.activeQuests.includes('q2'), `missão 1 concluída, 2 ativa (${sv.doneQuests}/${sv.activeQuests})`);

// missão 2: ir à floresta coletar madeira
await goDoor(6, 9, 'south');
w0 = await world();
check(w0.map === 'praca', 'saiu para a praça');
await goDoor(22, 8, 'east');
w0 = await world();
check(w0.map === 'floresta', `entrou na floresta: ${JSON.stringify(w0)}`);
await shot('11_floresta');
for (const [x, y] of [[3, 3], [10, 5], [4, 13], [18, 13], [6, 8]]) { await teleport(x, y, 'north'); await pressE(); }
sv = await save();
check((sv.inventory.madeira ?? 0) >= 5, `coletou madeira (${sv.inventory.madeira})`);
await shot('12_coleta');
// regeneração: nó usado deve mostrar timer (alpha reduzido)
const nodeAlpha = await ev(() => window.__game.scene.getScene('WorldScene').nodes[0].sprite.alpha);
check(nodeAlpha < 1, `nó coletado ficou em regeneração (alpha ${nodeAlpha})`);
// coleta pedra, folhas, fibra, flor, pó
for (const [x, y] of [[2, 7], [17, 8], [12, 14], [7, 3], [14, 8], [6, 14], [7, 11], [12, 11], [10, 13], [8, 3], [18, 5], [6, 13], [20, 14], [2, 14]]) { await teleport(x, y, 'north'); await pressE(); }
sv = await save();
console.log('inventário:', JSON.stringify(sv.inventory));

// volta ao ateliê e conserta bancada
await goDoor(1, 8, 'west');
await goDoor(4, 5, 'north');
await teleport(9, 3, 'north'); await pressE(); await skipDialogue();
sv = await save();
check(sv.flags.includes('bench_repaired'), 'bancada consertada');
check(sv.activeQuests.includes('q3'), `missão 3 ativa (${sv.activeQuests})`);
// crafting: dar materiais e criar cama, luminária, cadeira
await ev(() => { const g = window.__game; const st = g.scene.getScene('WorldScene'); void st; });
await ev(() => { const gs = window.__game.scene.getScene('UIScene'); void gs; });
await ev(() => { const ls = JSON.parse(localStorage.getItem('vila-pequenos-encantos:save:v1')); void ls; });
await teleport(9, 3, 'north'); await pressE(); await wait(400);
await shot('13_crafting');
// usa a API de estado para garantir materiais e cria via painel (clique em "Criar")
await ev(() => { const w = window.__game.scene.getScene('WorldScene'); void w; });
await page.keyboard.press('Escape'); await wait(200);
await ev(() => { const mod = window.__game.scene.getScene('WorldScene'); void mod; });
// injeta materiais suficientes pelo estado global exposto na cena
const crafted = await ev(() => {
  const w = window.__game.scene.getScene('WorldScene');
  const game = w.constructor.__gameState;
  return game ? 'has' : 'no';
});
void crafted;
// Fallback: acessar estado via UIScene (import é módulo; expomos window.__state no main.ts)
const hasState = await ev(() => !!window.__state);
check(hasState, 'estado do jogo exposto para testes');
await ev(() => { const g = window.__state; g.addItem('madeira', 20, true); g.addItem('folhas', 6, true); g.addItem('po_encanto', 2, true); });
await teleport(9, 3, 'north'); await pressE(); await wait(400);
// clica em "Criar" das três primeiras receitas visíveis (cadeira, banquinho, cama, luminária) via estado
await page.keyboard.press('Escape'); await wait(200);
await ev(() => { const g = window.__state; g.craft('cama'); g.craft('luminaria'); g.craft('cadeira'); });
sv = await save();
check(sv.inventory.cama === 1 && sv.inventory.luminaria === 1 && sv.inventory.cadeira === 1, `craft ok (${JSON.stringify(sv.inventory)})`);

// decoração: entrar no modo, colocar os três itens
await teleport(6, 6, 'north');
await page.keyboard.press('b'); await wait(400); await shot('14_inventory'); await page.keyboard.press('Escape'); await wait(200);
await ev(() => window.__game.scene.getScene('WorldScene').enterDecor('cama'));
await wait(300); await shot('15_decor');
await clickTile(8, 3);
await ev(() => window.__game.scene.getScene('WorldScene').setDecorItem('luminaria'));
await page.keyboard.press('r'); await wait(100);
await clickTile(10, 4);
await ev(() => window.__game.scene.getScene('WorldScene').setDecorItem('cadeira'));
await clickTile(4, 4);
sv = await save();
console.log('colocados:', JSON.stringify(sv.placed));
check((sv.placed.atelier ?? []).length === 3, `3 mobílias colocadas (${(sv.placed.atelier ?? []).length})`);
check(sv.doneQuests.includes('q3') && sv.activeQuests.includes('q4'), `missão 3 concluída, 4 ativa (${sv.doneQuests})`);
await wait(2500);
await page.keyboard.press('f'); await wait(300);
await shot('16_atelier_restaurado');

// missão 4: falar com Amora no ateliê
await teleport(7, 7, 'north'); await pressE(); await wait(200); await shot('17_amora'); await skipDialogue();
sv = await save();
check(sv.doneQuests.includes('q4') && sv.activeQuests.includes('q5'), `missão 4 concluída (${sv.doneQuests})`);

// missão 5: loja, Pingo, costura
await goDoor(6, 9, 'south');
await goDoor(17, 5, 'north');
w0 = await world();
check(w0.map === 'loja', `entrou na loja: ${JSON.stringify(w0)}`);
await teleport(6, 4, 'north'); await pressE(); await skipDialogue();
for (const [x, y] of [[3, 4], [8, 6], [2, 8]]) { await teleport(x, y, 'north'); await pressE(); }
for (const [x, y] of [[10, 3], [1, 7]]) { await teleport(x, y, 'north'); await pressE(); }
await shot('18_loja');
await goDoor(5, 8, 'south');
await teleport(8, 10, 'west'); await pressE(); await skipDialogue();
sv = await save();
check(sv.flags.includes('talked_pingo_q5'), 'falou com Pingo');
await ev(() => { const g = window.__state; g.addItem('madeira', 10, true); g.addItem('pedra', 10, true); g.addItem('fibra', 10, true); });
await goDoor(4, 5, 'north');
await teleport(4, 3, 'north'); await pressE(); await skipDialogue();
sv = await save();
check(sv.doneQuests.includes('q5') && sv.activeQuests.includes('q6'), `missão 5 concluída (${sv.doneQuests})`);

// missão 6: Lilo, tronco, flores-de-lua, pintura
await goDoor(6, 9, 'south');
await teleport(13, 9, 'east'); await pressE(); await skipDialogue();
await goDoor(22, 8, 'east');
await teleport(12, 3, 'east'); await pressE(); await skipDialogue(); await wait(400);
sv = await save();
check(sv.flags.includes('forest_path_open'), 'tronco removido');
for (const [x, y] of [[15, 3], [19, 4], [16, 5]]) { await teleport(x, y, 'north'); await pressE(); }
await shot('19_clareira');
sv = await save();
check((sv.inventory.flor_lua ?? 0) >= 3, `flores-de-lua (${sv.inventory.flor_lua})`);
await ev(() => { const g = window.__state; g.addItem('po_encanto', 4, true); g.addItem('flor_lua', 4, true); });
await goDoor(1, 8, 'west');
await goDoor(4, 5, 'north');
await teleport(1, 8, 'north'); await pressE(); await skipDialogue();
sv = await save();
check(sv.doneQuests.includes('q6') && sv.activeQuests.includes('q7'), `missão 6 concluída (${sv.doneQuests})`);

// missão 7: decorar a loja
await ev(() => { const g = window.__state; ['vitrine', 'mesa_cha', 'mesa_cha', 'almofada', 'almofada', 'tapete', 'quadro', 'luminaria', 'vaso_flores', 'cama'].forEach((i) => g.addItem(i, 1, true)); });
await goDoor(6, 9, 'south');
await goDoor(17, 5, 'north');
await ev(() => {
  const g = window.__state;
  const items = [['vitrine', 2, 2], ['quadro', 5, 2], ['mesa_cha', 3, 5], ['mesa_cha', 7, 5], ['almofada', 2, 5], ['almofada', 8, 5], ['tapete', 5, 6], ['luminaria', 9, 3], ['vaso_flores', 1, 3], ['cama', 9, 7]];
  for (const [it, x, y] of items) g.place('loja', it, x, y, 0);
});
await goDoor(5, 8, 'south'); await goDoor(17, 5, 'north'); // recarrega a loja com as mobílias
await shot('20_loja_decorada');
sv = await save();
console.log('attrs loja:', JSON.stringify(sv.placed.loja?.length));
await teleport(6, 4, 'north'); await pressE(); await skipDialogue(); await wait(3500);
sv = await save();
check(sv.doneQuests.includes('q7') && sv.activeQuests.includes('q8'), `missão 7 concluída (${sv.doneQuests})`);
check(sv.inventory.fragmento === 1, 'fragmento recebido');
await shot('21_loja_restaurada');

// missão 8: fonte
await goDoor(5, 8, 'south');
await teleport(11, 10, 'north'); await pressE(); await wait(2500); await shot('22_fonte');
await wait(4500); await skipDialogue(); await wait(500); await skipDialogue(); await wait(2500);
await shot('23_final');
sv = await save();
check(sv.doneQuests.includes('q8'), `missão 8 concluída (${sv.doneQuests})`);
check(sv.flags.includes('praca_restored'), 'praça restaurada');
check(sv.inventory.carta === 1, 'carta recebida');
const scenes = await ev(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
console.log('cenas ativas:', scenes);
await page.mouse.click(width / 2 - 90 * Math.min(Math.max(Math.min(width, height) / 360, 1), 2.2), height * 0.4 + Math.min(height * 0.5, 250 * Math.min(Math.max(Math.min(width, height) / 360, 1), 2.2)) - 26 * Math.min(Math.max(Math.min(width, height) / 360, 1), 2.2));
await wait(1500);
await shot('24_praca_final');
await page.keyboard.press('m'); await wait(400); await shot('25_map'); await page.keyboard.press('Escape');
await page.keyboard.press('Tab'); await wait(400); await shot('26_caderno'); await page.keyboard.press('Escape');

console.log('ERRORS:', errors.length);
for (const e of errors) console.log(e);
console.log('FAILURES:', failures.length);
await browser.close();
process.exit(failures.length || errors.filter((e) => !e.includes('404')).length ? 1 : 0);
