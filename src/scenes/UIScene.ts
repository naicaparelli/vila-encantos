import Phaser from 'phaser';
import { isTouchDevice } from '../config';
import { ITEMS, MATERIAL_ORDER } from '../data/items';
import { RECIPES, STATION_NAMES, type StationId } from '../data/recipes';
import { MAPS, MAP_ORDER, type MapDef } from '../data/maps';
import { QUESTS, QUEST_ORDER, type QuestDef } from '../data/quests';
import type { DialogueLine } from '../data/dialogues';
import { game } from '../state/GameState';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Button, RoundButton, drawPanel, textStyle, uiScale, UI } from '../ui/widgets';
import { P } from '../art/palette';
import type { WorldScene } from './WorldScene';

type PanelKind = 'inventory' | 'notebook' | 'map' | 'crafting';

/**
 * Camada de interface: HUD, diálogos, painéis (mochila, caderno, mapa, crafting),
 * controles de toque e avisos. Roda em paralelo à WorldScene.
 */
export class UIScene extends Phaser.Scene {
  private hudObjs: Phaser.GameObjects.GameObject[] = [];
  private trackerBg!: Phaser.GameObjects.Graphics;
  private trackerTitle!: Phaser.GameObjects.Text;
  private trackerObj!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private promptBg!: Phaser.GameObjects.Graphics;
  private toasts: Phaser.GameObjects.Container[] = [];
  private panel: Phaser.GameObjects.Container | null = null;
  private panelKind: PanelKind | null = null;
  private panelPause = false;
  private dialogueBox: Phaser.GameObjects.Container | null = null;
  private dlgLines: DialogueLine[] = [];
  private dlgIdx = 0;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgFull = '';
  private dlgShown = 0;
  private dlgTimer = 0;
  private dlgDone?: () => void;
  private decorHud: Phaser.GameObjects.GameObject[] = [];
  private touchObjs: Phaser.GameObjects.GameObject[] = [];
  private joy: { base: Phaser.GameObjects.Graphics; knob: Phaser.GameObjects.Graphics; cx: number; cy: number; r: number; pointerId: number | null } | null = null;
  private runBtn: RoundButton | null = null;
  private decorBtn: RoundButton | null = null;
  private notebookTab = 0;
  private craftStation: StationId = 'marcenaria';
  private selectedInv: string | null = null;
  private stateHandlers: Array<[string, (...a: unknown[]) => void]> = [];

  constructor() { super('UIScene'); }

  get world(): WorldScene { return this.scene.get('WorldScene') as WorldScene; }

  create(): void {
    this.buildHud();
    this.scale.on('resize', this.onResize, this);
    const kb = this.input.keyboard!;
    kb.on('keydown-B', () => this.togglePanel('inventory'));
    kb.on('keydown-TAB', (e: KeyboardEvent) => { e.preventDefault(); this.togglePanel('notebook'); });
    kb.on('keydown-M', () => this.togglePanel('map'));
    kb.on('keydown-ESC', () => { if (this.panel) this.closePanel(); });
    kb.on('keydown-E', () => this.advanceDialogue());
    kb.on('keydown-SPACE', () => this.advanceDialogue());
    kb.on('keydown-ENTER', () => this.advanceDialogue());

    const on = (ev: string, fn: (...a: unknown[]) => void) => { game.on(ev, fn); this.stateHandlers.push([ev, fn]); };
    on('toast', (text, icon) => this.toast(text as string, icon as string | undefined));
    on('quest-started', (q) => this.questBanner('Nova missão', q as QuestDef, true));
    on('quest-completed', (q) => { sfx('quest'); this.questBanner('Missão concluída', q as QuestDef, false); });
    on('recipes-unlocked', (ids) => this.toast(`Novas receitas: ${(ids as string[]).map((i) => ITEMS[RECIPES[i].result].name).join(', ')}`));
    on('changed', () => { this.updateTracker(); if (this.panelKind === 'crafting') this.rebuildPanel(); if (this.panelKind === 'inventory') this.rebuildPanel(); });
    this.world.events.on('map-changed', this.onMapChanged, this);

    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      for (const [ev, fn] of this.stateHandlers) game.off(ev, fn);
      this.world.events.off('map-changed', this.onMapChanged, this);
    });
    this.updateTracker();
  }

  private onResize(): void {
    this.closePanel();
    this.buildHud();
    if (this.dialogueBox) this.layoutDialogue();
  }

  private onMapChanged(_def: MapDef): void {
    this.closePanel();
    this.clearDecorHud();
    this.buildTouchControls();
    this.updateTracker();
  }

  // =========================================================================
  // HUD
  // =========================================================================
  private buildHud(): void {
    this.hudObjs.forEach((o) => o.destroy());
    this.hudObjs = [];
    const { width: w } = this.scale;
    const s = uiScale(this);

    this.trackerBg = this.add.graphics();
    this.hudObjs.push(this.trackerBg);
    this.trackerTitle = this.add.text(16, 12 * s, '', textStyle(11 * s, P.amber));
    this.trackerObj = this.add.text(16, 27 * s, '', textStyle(10 * s, UI.text, { wordWrap: { width: Math.min(250 * s, w * 0.5) - 12 } }));
    this.hudObjs.push(this.trackerTitle, this.trackerObj);

    const icons: Array<[string, PanelKind]> = [['ui_bag', 'inventory'], ['ui_book', 'notebook'], ['ui_map', 'map']];
    icons.forEach(([icon, kind], i) => {
      const b = new RoundButton(this, w - 24 * s - i * 46 * s, 26 * s, icon, 18 * s, () => this.togglePanel(kind));
      this.hudObjs.push(b);
    });
    const mute = new Button(this, w - 24 * s - 3 * 46 * s - 10 * s, 26 * s, music.muted ? 'Som off' : 'Som on', () => {
      const m = music.toggleMute(); mute.setText(m ? 'Som off' : 'Som on');
    }, { width: 64 * s, height: 24 * s, fontSize: 9 * s });
    this.hudObjs.push(mute);

    this.promptBg = this.add.graphics();
    this.promptText = this.add.text(0, 0, '', textStyle(12 * s)).setOrigin(0.5);
    this.hudObjs.push(this.promptBg, this.promptText);
    this.setPrompt(this.promptText.text);

    this.buildTouchControls();
    this.updateTracker();
  }

  private updateTracker(): void {
    if (!this.trackerTitle?.active) return;
    this.updateTrackerText();
    const s = uiScale(this);
    const w = this.scale.width;
    const h = Math.max(44 * s, this.trackerObj.y + this.trackerObj.height + 6 * s - 8);
    this.trackerBg.clear();
    if (!this.trackerTitle.text && !this.trackerObj.text) return;
    this.trackerBg.fillStyle(UI.panel, 0.7);
    this.trackerBg.fillRoundedRect(8, 8, Math.min(260 * s, w * 0.5), h, 6);
  }

  private updateTrackerText(): void {
    const q = game.currentQuest;
    if (!q) {
      if (!game.flag('notebook_seen')) { this.trackerTitle.setText('Começar'); this.trackerObj.setText('Encontre o Caderno dos Encantos no ateliê.'); }
      else if (game.questDone('q8')) { this.trackerTitle.setText('Capítulo 1 concluído'); this.trackerObj.setText('Decore livremente. O Bosque dos Sussurros espera.'); }
      else { this.trackerTitle.setText(''); this.trackerObj.setText(''); }
      return;
    }
    const pending = q.objectives.find((o) => !o.check(game).done);
    this.trackerTitle.setText(`${q.order}. ${q.title}`);
    if (pending) {
      const st = pending.check(game);
      const prog = st.max !== undefined ? ` (${st.cur}/${st.max})` : '';
      this.trackerObj.setText(`• ${pending.text}${prog}`);
    } else this.trackerObj.setText(q.turnIn ? `• Fale com ${q.turnIn === 'amora' ? 'Amora' : q.turnIn}` : '• Concluído');
  }

  setPrompt(text: string): void {
    if (!this.promptText?.active) return;
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    this.promptText.setText(text ? (isTouchDevice() ? text : `[E]  ${text}`) : '');
    this.promptBg.clear();
    if (!text) return;
    const pw = this.promptText.width + 24 * s;
    const ph = 26 * s;
    const y = isTouchDevice() ? h - 130 * s : h - 40 * s;
    this.promptBg.fillStyle(UI.panel, 0.8); this.promptBg.fillRoundedRect(w / 2 - pw / 2, y - ph / 2, pw, ph, 6);
    this.promptText.setPosition(w / 2, y);
  }

  toast(text: string, icon?: string): void {
    const { width: w } = this.scale;
    const s = uiScale(this);
    const baseY = (isTouchDevice() && this.world.decorMode ? 124 : 62) * s;
    const c = this.add.container(w / 2, baseY + this.toasts.length * 26 * s).setDepth(900);
    const t = this.add.text(icon ? 12 * s : 0, 0, text, textStyle(11 * s)).setOrigin(icon ? 0 : 0.5, 0.5);
    const bw = t.width + (icon ? 44 : 20) * s;
    const g = this.add.graphics();
    g.fillStyle(UI.panel, 0.85); g.fillRoundedRect(-bw / 2, -12 * s, bw, 24 * s, 6);
    c.add(g);
    if (icon) { c.add(this.add.image(-bw / 2 + 16 * s, 0, icon).setScale(ITEMS[icon.replace('icon_', '')] ? s : s * 0.6)); t.setX(-bw / 2 + 30 * s); }
    c.add(t);
    c.setAlpha(0);
    this.toasts.push(c);
    this.tweens.add({ targets: c, alpha: 1, duration: 150 });
    this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: c, alpha: 0, y: c.y - 10, duration: 300, onComplete: () => { c.destroy(); this.toasts = this.toasts.filter((x) => x !== c); this.toasts.forEach((x, i) => x.setY(baseY + i * 26 * s)); } });
    });
  }

  private questBanner(kind: string, q: QuestDef, showIntro: boolean): void {
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    const c = this.add.container(w / 2, h * 0.3).setDepth(950).setAlpha(0);
    const bw = Math.min(w - 30, 460 * s);
    const body = showIntro ? `"${q.intro}"` : q.teaches;
    const bodyT = this.add.text(0, 30 * s, body, textStyle(10 * s, UI.textDim, { align: 'center', wordWrap: { width: bw - 30 } })).setOrigin(0.5, 0);
    const bh = 44 * s + bodyT.height + 12 * s;
    const g = this.add.graphics();
    drawPanel(g, -bw / 2, 0, bw, bh);
    c.add(g);
    c.add(this.add.text(0, 8 * s, kind, textStyle(9 * s, P.amber)).setOrigin(0.5, 0));
    c.add(this.add.text(0, 18 * s, `${q.order}. ${q.title}`, textStyle(14 * s)).setOrigin(0.5, 0));
    c.add(bodyT);
    this.tweens.add({ targets: c, alpha: 1, y: h * 0.28, duration: 300 });
    this.time.delayedCall(3600, () => this.tweens.add({ targets: c, alpha: 0, duration: 400, onComplete: () => c.destroy() }));
    this.updateTracker();
  }

  // =========================================================================
  // controles de toque
  // =========================================================================
  private buildTouchControls(): void {
    this.touchObjs.forEach((o) => o.destroy());
    this.touchObjs = [];
    this.joy = null; this.runBtn = null; this.decorBtn = null;
    if (!isTouchDevice()) return;
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    const r = 46 * s;
    const cx = 24 * s + r; const cy = h - 24 * s - r;
    const base = this.add.graphics().setDepth(800);
    base.fillStyle(UI.panel, 0.35); base.fillCircle(cx, cy, r);
    base.lineStyle(2, UI.border, 0.6); base.strokeCircle(cx, cy, r);
    const knob = this.add.graphics().setDepth(801);
    knob.fillStyle(UI.accent, 0.7); knob.fillCircle(cx, cy, r * 0.42);
    this.joy = { base, knob, cx, cy, r, pointerId: null };
    const zone = this.add.zone(cx, cy, r * 2.6, r * 2.6).setInteractive().setDepth(802);
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { if (this.joy) { this.joy.pointerId = p.id; this.updateJoy(p); } });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.joy && this.joy.pointerId === p.id) this.updateJoy(p); });
    const release = (p: Phaser.Input.Pointer) => { if (this.joy && this.joy.pointerId === p.id) { this.joy.pointerId = null; this.resetJoy(); } };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.touchObjs.push(base, knob, zone);

    const act = new RoundButton(this, w - 24 * s - 30 * s, h - 24 * s - 30 * s, 'ui_hand', 30 * s, () => this.world.queueAction(), undefined, 'Ação');
    act.setDepth(803);
    this.touchObjs.push(act);
    this.runBtn = new RoundButton(this, w - 24 * s - 30 * s - 78 * s, h - 24 * s - 22 * s, 'ui_run', 22 * s, () => {
      this.world.mobile.run = !this.world.mobile.run;
      this.runBtn?.setCaption(this.world.mobile.run ? 'Correndo' : 'Correr');
    }, undefined, 'Correr');
    this.runBtn.setDepth(803);
    this.touchObjs.push(this.runBtn);
    this.decorBtn = new RoundButton(this, w - 24 * s - 30 * s, h - 24 * s - 30 * s - 78 * s, 'ui_decor', 22 * s, () => this.world.toggleDecor(), undefined, 'Decorar');
    this.decorBtn.setDepth(803);
    this.decorBtn.setVisible(this.world.isDecoratable());
    this.touchObjs.push(this.decorBtn);
  }

  private updateJoy(p: Phaser.Input.Pointer): void {
    if (!this.joy) return;
    let dx = p.x - this.joy.cx; let dy = p.y - this.joy.cy;
    const len = Math.hypot(dx, dy);
    const max = this.joy.r;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    this.joy.knob.setPosition(dx, dy);
    const dead = 0.18;
    const nx = dx / max; const ny = dy / max;
    const m = Math.hypot(nx, ny);
    this.world.mobile.dx = m < dead ? 0 : nx / Math.max(m, 0.001) * Math.min(1, (m - dead) / (1 - dead) + 0.4);
    this.world.mobile.dy = m < dead ? 0 : ny / Math.max(m, 0.001) * Math.min(1, (m - dead) / (1 - dead) + 0.4);
  }

  private resetJoy(): void {
    if (!this.joy) return;
    this.joy.knob.setPosition(0, 0);
    this.world.mobile.dx = 0; this.world.mobile.dy = 0;
  }

  update(_t: number, delta: number): void {
    if (this.dialogueBox && this.dlgShown < this.dlgFull.length) {
      this.dlgTimer += delta;
      const step = Math.floor(this.dlgTimer / 22);
      if (step > 0) {
        this.dlgTimer -= step * 22;
        this.dlgShown = Math.min(this.dlgFull.length, this.dlgShown + step);
        this.dlgText.setText(this.dlgFull.slice(0, this.dlgShown));
        if (this.dlgShown % 3 === 0) sfx('talk');
      }
    }
    if (this.decorBtn) this.decorBtn.setVisible(this.world.isDecoratable() && !this.panel && !this.dialogueBox);
  }

  // =========================================================================
  // diálogo
  // =========================================================================
  showDialogue(lines: DialogueLine[], onDone?: () => void): void {
    if (this.dialogueBox) { this.dlgLines.push(...lines); return; }
    this.closePanel();
    this.world.setPaused(true);
    this.dlgLines = lines;
    this.dlgIdx = 0;
    this.dlgDone = onDone;
    this.dialogueBox = this.add.container(0, 0).setDepth(1000);
    this.dlgName = this.add.text(0, 0, '', textStyle(11, P.amber));
    this.dlgText = this.add.text(0, 0, '', textStyle(12));
    this.dialogueBox.add([this.add.graphics(), this.dlgName, this.dlgText]);
    this.layoutDialogue();
    this.showLine();
    this.input.on('pointerdown', this.onDialogueTap, this);
  }

  private onDialogueTap(p: Phaser.Input.Pointer): void {
    // ignora toques no joystick
    if (this.joy && Math.hypot(p.x - this.joy.cx, p.y - this.joy.cy) < this.joy.r * 1.3) return;
    this.advanceDialogue();
  }

  private layoutDialogue(): void {
    if (!this.dialogueBox) return;
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    const bw = Math.min(w - 16, 640 * s);
    const bh = 92 * s;
    const bx = w / 2 - bw / 2;
    const by = h - bh - (isTouchDevice() ? 10 * s : 12 * s);
    const g = this.dialogueBox.getAt(0) as Phaser.GameObjects.Graphics;
    g.clear();
    drawPanel(g, bx, by, bw, bh);
    this.dlgName.setStyle(textStyle(11 * s, P.amber)).setPosition(bx + 14 * s, by + 8 * s);
    this.dlgText.setStyle(textStyle(12 * s, UI.text, { wordWrap: { width: bw - 28 * s } })).setPosition(bx + 14 * s, by + 26 * s);
  }

  private showLine(): void {
    const line = this.dlgLines[this.dlgIdx];
    this.dlgName.setText(line.speaker);
    this.dlgFull = line.text;
    this.dlgShown = 0;
    this.dlgTimer = 0;
    this.dlgText.setText('');
    if (line.speaker === '') this.dlgText.setStyle(textStyle(12 * uiScale(this), P.lilacLight, { fontStyle: 'italic', wordWrap: { width: this.dlgText.style.wordWrapWidth ?? 400 } }));
    else this.dlgText.setStyle(textStyle(12 * uiScale(this), UI.text, { wordWrap: { width: this.dlgText.style.wordWrapWidth ?? 400 } }));
  }

  private advanceDialogue(): void {
    if (!this.dialogueBox) return;
    if (this.dlgShown < this.dlgFull.length) { this.dlgShown = this.dlgFull.length; this.dlgText.setText(this.dlgFull); return; }
    this.dlgIdx++;
    if (this.dlgIdx < this.dlgLines.length) { this.showLine(); return; }
    this.input.off('pointerdown', this.onDialogueTap, this);
    this.dialogueBox.destroy();
    this.dialogueBox = null;
    this.world.setPaused(false);
    const done = this.dlgDone;
    this.dlgDone = undefined;
    done?.();
  }

  // =========================================================================
  // painéis
  // =========================================================================
  private togglePanel(kind: PanelKind): void {
    if (this.dialogueBox) return;
    if (this.panelKind === kind) { this.closePanel(); return; }
    this.openPanel(kind);
  }

  openNotebook(): void { this.openPanel('notebook'); }
  openCrafting(station: StationId): void { this.craftStation = station; this.openPanel('crafting'); }

  private openPanel(kind: PanelKind): void {
    this.closePanel();
    this.panelKind = kind;
    if (!this.panelPause) { this.world.setPaused(true); this.panelPause = true; }
    sfx('open');
    this.rebuildPanel();
  }

  closePanel(): void {
    if (!this.panel) return;
    this.panel.destroy();
    this.panel = null;
    this.panelKind = null;
    if (this.panelPause) { this.world.setPaused(false); this.panelPause = false; }
    sfx('close');
  }

  private rebuildPanel(): void {
    const kind = this.panelKind;
    if (!kind) return;
    this.panel?.destroy();
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    const pw = Math.min(w - 16, 640 * s);
    const ph = Math.min(h - 16, 420 * s);
    const px = w / 2 - pw / 2;
    const py = h / 2 - ph / 2;
    const c = this.add.container(0, 0).setDepth(700);
    this.panel = c;
    const blocker = this.add.zone(w / 2, h / 2, w, h).setInteractive();
    blocker.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
    c.add(blocker);
    const g = this.add.graphics();
    drawPanel(g, px, py, pw, ph);
    c.add(g);
    const titles: Record<PanelKind, string> = { inventory: 'Mochila', notebook: 'Caderno dos Encantos', map: 'Mapa da vila', crafting: STATION_NAMES[this.craftStation] };
    c.add(this.add.text(px + 16 * s, py + 10 * s, titles[kind], textStyle(15 * s, P.amber)));
    const close = new RoundButton(this, px + pw - 20 * s, py + 20 * s, 'ui_close', 14 * s, () => this.closePanel());
    c.add(close);
    const area = { x: px + 12 * s, y: py + 40 * s, w: pw - 24 * s, h: ph - 52 * s };
    if (kind === 'inventory') this.buildInventory(c, area, s);
    if (kind === 'notebook') this.buildNotebook(c, area, s);
    if (kind === 'map') this.buildMap(c, area, s);
    if (kind === 'crafting') this.buildCrafting(c, area, s);
  }

  /** Cria uma região com rolagem vertical (roda do mouse e arrasto). */
  private scrollArea(parent: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, contentHeight: number): Phaser.GameObjects.Container {
    const content = this.add.container(area.x, area.y);
    parent.add(content);
    const maskG = this.make.graphics({ x: 0, y: 0 });
    maskG.fillStyle(0xffffff); maskG.fillRect(area.x, area.y, area.w, area.h);
    content.setMask(maskG.createGeometryMask());
    const maxScroll = Math.max(0, contentHeight - area.h);
    if (maxScroll <= 0) return content;
    let offset = 0;
    const apply = () => { offset = Phaser.Math.Clamp(offset, -maxScroll, 0); content.setY(area.y + offset); };
    const zone = this.add.zone(area.x + area.w / 2, area.y + area.h / 2, area.w, area.h).setInteractive();
    parent.addAt(zone, 1);
    let dragY: number | null = null;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { dragY = p.y; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (dragY !== null && p.isDown) { offset += p.y - dragY; dragY = p.y; apply(); } });
    this.input.on('pointerup', () => { dragY = null; });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => { if (this.panel === parent) { offset -= dy * 0.5; apply(); } });
    const hint = this.add.text(area.x + area.w - 4, area.y + area.h - 2, '▼ role', textStyle(8 * uiScale(this), UI.textDim)).setOrigin(1, 1);
    parent.add(hint);
    return content;
  }

  private buildInventory(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    const entries = Object.entries(game.data.inventory).filter(([, n]) => n > 0);
    const order = (id: string) => (ITEMS[id]?.kind === 'material' ? 0 : ITEMS[id]?.kind === 'furniture' ? 1 : 2);
    entries.sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]));
    const slot = 48 * s;
    const cols = Math.max(1, Math.floor(area.w / slot));
    const rows = Math.ceil(entries.length / cols);
    const descH = 70 * s;
    const gridArea = { ...area, h: area.h - descH };
    const content = this.scrollArea(c, gridArea, rows * slot + 4);
    if (entries.length === 0) content.add(this.add.text(8, 8, 'A mochila está vazia. Colete materiais na praça e na floresta.', textStyle(11 * s, UI.textDim)));
    entries.forEach(([id, n], i) => {
      const item = ITEMS[id];
      const x = (i % cols) * slot + slot / 2;
      const y = Math.floor(i / cols) * slot + slot / 2;
      const g = this.add.graphics();
      const sel = this.selectedInv === id;
      g.fillStyle(sel ? UI.accent : UI.panelLight, sel ? 0.5 : 0.8); g.fillRoundedRect(x - slot / 2 + 2, y - slot / 2 + 2, slot - 4, slot - 4, 6);
      content.add(g);
      const scale = item.kind === 'furniture' ? s * 1.1 : s * 2;
      content.add(this.add.image(x, y - 4 * s, item.icon).setScale(scale));
      content.add(this.add.text(x + slot / 2 - 6, y + slot / 2 - 6, `${n}`, textStyle(10 * s)).setOrigin(1, 1));
      const z = this.add.zone(x, y, slot - 4, slot - 4).setInteractive({ useHandCursor: true });
      z.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (this.selectedInv === id && item.kind === 'furniture') { this.startDecorWith(id); return; }
        this.selectedInv = id; sfx('select'); this.rebuildPanel();
      });
      content.add(z);
    });
    // descrição do item selecionado
    const dy = area.y + area.h - descH + 6 * s;
    const sel = this.selectedInv && game.count(this.selectedInv) > 0 ? ITEMS[this.selectedInv] : null;
    if (sel) {
      c.add(this.add.text(area.x + 4, dy, sel.name, textStyle(12 * s, P.amber)));
      const attrs = sel.attrs ? Object.entries(sel.attrs).map(([k, v]) => `${k} +${v}`).join(' · ') : '';
      c.add(this.add.text(area.x + 4, dy + 16 * s, sel.desc + (attrs ? `\n${attrs}` : ''), textStyle(10 * s, UI.textDim, { wordWrap: { width: area.w - 150 * s } })));
      if (sel.kind === 'furniture') {
        const can = this.world.isDecoratable();
        c.add(new Button(this, area.x + area.w - 70 * s, dy + 24 * s, 'Decorar', () => this.startDecorWith(sel.id), { width: 120 * s, fill: UI.border, disabled: !can }));
        if (!can) c.add(this.add.text(area.x + area.w - 70 * s, dy + 46 * s, 'não dá para decorar aqui', textStyle(8 * s, UI.textDim)).setOrigin(0.5, 0));
      }
    } else {
      c.add(this.add.text(area.x + 4, dy, 'Toque em um item para ver detalhes. Toque duas vezes em uma mobília para decorar.', textStyle(10 * s, UI.textDim, { wordWrap: { width: area.w - 8 } })));
    }
  }

  private startDecorWith(id: string): void {
    if (!this.world.isDecoratable()) { this.toast('Este lugar não pode ser decorado (ainda).'); return; }
    this.closePanel();
    if (!this.world.decorMode) this.world.enterDecor(id);
    else this.world.setDecorItem(id);
  }

  private buildNotebook(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    const tabs = ['Missões', 'Receitas', 'Materiais', 'Memórias', 'Encantos'];
    const tabW = Math.min(100 * s, area.w / tabs.length);
    tabs.forEach((t, i) => {
      const b = new Button(this, area.x + tabW * i + tabW / 2, area.y + 12 * s, t, () => { this.notebookTab = i; sfx('select'); this.rebuildPanel(); }, { width: tabW - 4, height: 24 * s, fontSize: 10 * s, fill: this.notebookTab === i ? UI.border : UI.panelLight });
      c.add(b);
    });
    const body = { x: area.x, y: area.y + 30 * s, w: area.w, h: area.h - 30 * s };
    const lines: Array<{ text: string; color?: string; size?: number; icon?: string }> = [];
    const tab = this.notebookTab;
    if (tab === 0) {
      const active = game.activeQuests;
      if (active.length === 0 && game.data.doneQuests.length === 0) lines.push({ text: 'Nenhuma missão ainda. O caderno espera o seu primeiro passo.', color: UI.textDim });
      for (const q of active) {
        lines.push({ text: `${q.order}. ${q.title}`, color: P.amber, size: 13 });
        lines.push({ text: `"${q.intro}"`, color: P.lilacLight, size: 10 });
        for (const o of q.objectives) {
          const st = o.check(game);
          const prog = st.max !== undefined ? ` (${st.cur}/${st.max})` : '';
          lines.push({ text: `${st.done ? '☑' : '☐'} ${o.text}${prog}`, color: st.done ? UI.good : UI.text });
          if (!st.done && o.hint) lines.push({ text: `     ${o.hint}`, color: UI.textDim, size: 9 });
        }
        if (q.turnIn && q.objectives.every((o) => o.check(game).done)) lines.push({ text: `→ Fale com ${q.turnIn === 'amora' ? 'Amora' : q.turnIn} para concluir.`, color: P.amber });
        lines.push({ text: '' });
      }
      const done = QUEST_ORDER.filter((id) => game.questDone(id));
      if (done.length) {
        lines.push({ text: 'Concluídas', color: UI.textDim, size: 11 });
        for (const id of done) lines.push({ text: `✓ ${QUESTS[id].order}. ${QUESTS[id].title}`, color: UI.textDim });
      }
    } else if (tab === 1) {
      const known = Object.values(RECIPES).filter((r) => game.recipeKnown(r.id));
      if (known.length === 0) lines.push({ text: 'Nenhuma receita ainda. Conserte a bancada de marcenaria.', color: UI.textDim });
      for (const st of ['marcenaria', 'costura', 'pintura'] as StationId[]) {
        const rs = known.filter((r) => r.station === st);
        if (!rs.length) continue;
        lines.push({ text: STATION_NAMES[st], color: P.amber, size: 12 });
        for (const r of rs) {
          const ing = Object.entries(r.ingredients).map(([id, n]) => `${ITEMS[id].name} ×${n}`).join(', ');
          lines.push({ text: `${ITEMS[r.result].name}${r.count > 1 ? ` ×${r.count}` : ''}  —  ${ing}`, icon: ITEMS[r.result].icon });
        }
        lines.push({ text: '' });
      }
    } else if (tab === 2) {
      const seen = MATERIAL_ORDER.filter((m) => game.data.materialsSeen.includes(m));
      if (!seen.length) lines.push({ text: 'Você ainda não coletou nenhum material.', color: UI.textDim });
      for (const m of seen) { lines.push({ text: ITEMS[m].name, color: P.amber, icon: ITEMS[m].icon }); lines.push({ text: ITEMS[m].desc, color: UI.textDim, size: 10 }); }
    } else if (tab === 3) {
      if (!game.data.memories.length) lines.push({ text: 'As memórias da vila ainda estão escondidas.', color: UI.textDim });
      game.data.memories.forEach((m, i) => { lines.push({ text: `Fragmento ${i + 1}`, color: P.amber }); lines.push({ text: m, size: 10 }); lines.push({ text: '' }); });
    } else {
      if (!game.data.encantos.length) lines.push({ text: 'Nenhum Pequeno Encanto recuperado. Dizem que eles moram na fonte.', color: UI.textDim });
      for (const e of game.data.encantos) lines.push({ text: `✦ ${e}`, color: P.amber, size: 13 });
    }
    // renderiza linhas
    const objs: Phaser.GameObjects.GameObject[] = [];
    let y = 4;
    for (const l of lines) {
      const size = (l.size ?? 11) * s;
      const t = this.add.text(l.icon ? 26 * s : 4, y, l.text, textStyle(size, l.color ?? UI.text, { wordWrap: { width: body.w - 34 * s } }));
      if (l.icon) objs.push(this.add.image(12 * s, y + t.height / 2, l.icon).setScale(l.icon.startsWith('furn') ? s * 0.5 : s));
      objs.push(t);
      y += Math.max(t.height, size * 1.2) + 4 * s;
    }
    const content = this.scrollArea(c, body, y + 8);
    content.add(objs);
  }

  private buildMap(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    const positions: Record<string, [number, number]> = { atelier: [0.22, 0.3], praca: [0.5, 0.55], floresta: [0.82, 0.5], loja: [0.5, 0.2] };
    const g = this.add.graphics();
    g.lineStyle(3 * s, UI.border, 0.7);
    const pt = (id: string) => [area.x + area.w * positions[id][0], area.y + area.h * positions[id][1]] as const;
    for (const [a, b] of [['atelier', 'praca'], ['praca', 'floresta'], ['praca', 'loja']]) { const [ax, ay] = pt(a); const [bx, by] = pt(b); g.lineBetween(ax, ay, bx, by); }
    c.add(g);
    for (const id of MAP_ORDER) {
      const [x, y] = pt(id);
      const def = MAPS[id];
      const restored = !def.restoredFlag || game.flag(def.restoredFlag);
      const img = this.add.image(x, y, `thumb_${id}`).setScale(1.6 * s);
      if (!restored) img.setTint(0x9a97a3);
      c.add(img);
      c.add(this.add.text(x, y + 36 * s, def.name + (restored && def.restoredFlag ? ' ✦' : ''), textStyle(10 * s, this.world.mapId === id ? P.amber : UI.text)).setOrigin(0.5, 0));
      if (this.world.mapId === id) {
        const m = this.add.image(x, y - 40 * s, 'markerExclaim').setScale(s);
        c.add(m);
        this.tweens.add({ targets: m, y: m.y - 4 * s, duration: 400, yoyo: true, repeat: -1 });
      }
    }
    c.add(this.add.text(area.x + area.w / 2, area.y + area.h - 6, 'Você está em: ' + this.world.def.name + '   ·   ✦ = restaurado', textStyle(9 * s, UI.textDim)).setOrigin(0.5, 1));
  }

  private buildCrafting(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    const recipes = Object.values(RECIPES).filter((r) => r.station === this.craftStation && game.recipeKnown(r.id));
    const rowH = 52 * s;
    const content = this.scrollArea(c, area, recipes.length * rowH + 8);
    if (!recipes.length) content.add(this.add.text(8, 8, 'Nenhuma receita conhecida para esta mesa.', textStyle(11 * s, UI.textDim)));
    recipes.forEach((r, i) => {
      const y = i * rowH;
      const item = ITEMS[r.result];
      const can = game.canCraft(r.id);
      const bg = this.add.graphics();
      bg.fillStyle(UI.panelLight, 0.6); bg.fillRoundedRect(0, y + 2, area.w, rowH - 4, 6);
      content.add(bg);
      content.add(this.add.image(26 * s, y + rowH / 2, item.icon).setScale(s * 1.1));
      content.add(this.add.text(52 * s, y + 8 * s, `${item.name}${r.count > 1 ? ` ×${r.count}` : ''}`, textStyle(12 * s, can ? UI.text : UI.textDim)));
      let ix = 52 * s;
      for (const [id, n] of Object.entries(r.ingredients)) {
        const have = game.count(id);
        const t = this.add.text(ix, y + 28 * s, `${ITEMS[id].name} ${have}/${n}`, textStyle(9 * s, have >= n ? UI.good : UI.bad));
        content.add(t);
        ix += t.width + 10 * s;
      }
      const attrs = item.attrs ? Object.entries(item.attrs).map(([k, v]) => `${k} +${v}`).join(' ') : '';
      if (attrs) content.add(this.add.text(area.w - 110 * s, y + 8 * s, attrs, textStyle(8 * s, UI.textDim)).setOrigin(1, 0));
      const b = new Button(this, area.w - 50 * s, y + rowH / 2, 'Criar', () => {
        if (game.craft(r.id)) { sfx('craft'); this.rebuildPanel(); } else sfx('error');
      }, { width: 80 * s, height: 28 * s, fill: UI.border, disabled: !can });
      content.add(b);
    });
  }

  // =========================================================================
  // HUD de decoração
  // =========================================================================
  onDecorChanged(): void {
    this.clearDecorHud();
    if (!this.world.decorMode) return;
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    const touch = isTouchDevice();
    const bw = Math.min(w - 16, 520 * s);
    const bh = 54 * s;
    const bx = w / 2 - bw / 2;
    const by = touch ? 60 * s : h - bh - 12 * s;
    const g = this.add.graphics().setDepth(600);
    drawPanel(g, bx, by, bw, bh);
    this.decorHud.push(g);
    const item = this.world.decorInfo.item;
    const title = item ? `Decorando: ${ITEMS[item].name} (×${game.count(item)})` : 'Modo decoração — escolha uma mobília na mochila';
    this.decorHud.push(this.add.text(bx + 12 * s, by + 8 * s, title, textStyle(11 * s, P.amber)).setDepth(601));
    const hint = touch ? 'Toque no chão para mover o cursor; toque de novo para colocar/pegar.' : 'E/clique: colocar ou pegar · R: girar · WASD/mouse: mover cursor · F/Esc: sair';
    this.decorHud.push(this.add.text(bx + 12 * s, by + 26 * s, hint, textStyle(9 * s, UI.textDim, { wordWrap: { width: bw - 150 * s } })).setDepth(601));
    this.decorHud.push(new Button(this, bx + bw - 60 * s, by + bh / 2, 'Mochila', () => this.openPanel('inventory'), { width: 90 * s, height: 26 * s, fontSize: 10 * s }).setDepth(601));
    // requisitos da loja (missão 7)
    if (game.questActive('q7') && this.world.mapId === 'loja') {
      const q = QUESTS.q7;
      const lines = q.objectives.map((o) => { const st = o.check(game); return `${st.done ? '☑' : '☐'} ${o.text}${st.max !== undefined ? ` ${st.cur}/${st.max}` : ''}`; });
      const rt = this.add.text(12, touch ? by + bh + 8 * s : 60 * s, lines.join('\n'), textStyle(9 * s, UI.text, { lineSpacing: 2 })).setDepth(601);
      const rg = this.add.graphics().setDepth(600);
      rg.fillStyle(UI.panel, 0.8); rg.fillRoundedRect(6, rt.y - 6, rt.width + 14, rt.height + 12, 6);
      this.decorHud.push(rg, rt);
    }
    if (touch) {
      const rot = new RoundButton(this, w - 24 * s - 30 * s - 78 * s, h - 24 * s - 30 * s - 78 * s, 'ui_rotate', 22 * s, () => this.world.queueRotate(), undefined, 'Girar').setDepth(803);
      const exit = new RoundButton(this, 24 * s + 22 * s, h - 24 * s - 46 * s - 46 * s - 60 * s, 'ui_close', 22 * s, () => this.world.exitDecor(), undefined, 'Sair').setDepth(803);
      this.decorHud.push(rot, exit);
    }
  }

  private clearDecorHud(): void {
    this.decorHud.forEach((o) => o.destroy());
    this.decorHud = [];
  }
}
