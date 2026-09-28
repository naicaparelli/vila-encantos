import Phaser from 'phaser';
import { isTouchDevice } from '../config';
import { ITEMS, MATERIAL_ORDER, ATTRIBUTE_NAMES, type ItemAttrs } from '../data/items';
import { RECIPES, STATION_NAMES, type StationId } from '../data/recipes';
import { MAPS, MAP_ORDER, type MapDef } from '../data/maps';
import { QUESTS, QUEST_ORDER, type QuestDef } from '../data/quests';
import { NPC_NAMES, type DialogueLine } from '../data/dialogues';
import { game } from '../state/GameState';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Button, RoundButton, PixelPanel, drawPanel, textStyle, hudStyle, uiScale, pixelScale, UI } from '../ui/widgets';
import type { WorldScene } from './WorldScene';

type PanelKind = 'inventory' | 'notebook' | 'map' | 'crafting';

/**
 * Camada de interface: HUD, diálogos, painéis (mochila, caderno, mapa, crafting),
 * controles de toque e avisos. Roda em paralelo à WorldScene.
 */
export class UIScene extends Phaser.Scene {
  private hudObjs: Phaser.GameObjects.GameObject[] = [];
  private trackerBg: PixelPanel | null = null;
  private trackerTitle!: Phaser.GameObjects.Text;
  private trackerObj!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private promptBg: PixelPanel | null = null;
  private toasts: Phaser.GameObjects.Container[] = [];
  private panel: Phaser.GameObjects.Container | null = null;
  private panelKind: PanelKind | null = null;
  private panelPause = false;
  dialogueBox: Phaser.GameObjects.Container | null = null;
  private dlgLines: DialogueLine[] = [];
  private dlgIdx = 0;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgName!: Phaser.GameObjects.Text;
  private dlgTag: PixelPanel | null = null;
  private dlgPortrait: Phaser.GameObjects.Image | null = null;
  private dlgPortraitFrame: PixelPanel | null = null;
  private dlgArrow: Phaser.GameObjects.Text | null = null;
  private dlgFull = '';
  private dlgShown = 0;
  private dlgTimer = 0;
  private dlgDone?: () => void;
  private decorHud: Phaser.GameObjects.GameObject[] = [];
  private touchObjs: Phaser.GameObjects.GameObject[] = [];
  private joy: { base: Phaser.GameObjects.Image; knob: Phaser.GameObjects.Image; cx: number; cy: number; r: number; pointerId: number | null } | null = null;
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
    on('quest-started', (q) => this.questBanner('New quest', q as QuestDef, true));
    on('quest-completed', (q) => { sfx('quest'); this.questBanner('Quest complete', q as QuestDef, false); });
    on('recipes-unlocked', (ids) => this.toast(`New recipes: ${(ids as string[]).map((i) => ITEMS[RECIPES[i].result].name).join(', ')}`));
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
    this.trackerBg = null; this.promptBg = null;
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);

    // vinheta suave nos cantos da tela (abaixo de todo o HUD)
    this.hudObjs.push(this.add.image(0, 0, 'fx_vignette').setOrigin(0).setDisplaySize(w, h).setDepth(1).setAlpha(0.6));

    this.trackerTitle = this.add.text(18 * s, 16 * s, '', textStyle(11 * s, UI.title)).setDepth(11);
    this.trackerObj = this.add.text(18 * s, 31 * s, '', textStyle(10 * s, UI.text, { wordWrap: { width: Math.min(250 * s, w * 0.5) - 20 * s } })).setDepth(11);
    this.hudObjs.push(this.trackerTitle, this.trackerObj);

    const icons: Array<[string, PanelKind, string]> = [['ui_bag', 'inventory', 'B'], ['ui_book', 'notebook', 'Tab'], ['ui_map', 'map', 'M']];
    icons.forEach(([icon, kind], i) => {
      const b = new RoundButton(this, w - 26 * s - i * 48 * s, 26 * s, icon, 19 * s, () => this.togglePanel(kind));
      this.hudObjs.push(b);
    });
    const mute = new Button(this, w - 26 * s - 3 * 48 * s - 14 * s, 26 * s, music.muted ? 'Sound off' : 'Sound on', () => {
      const m = music.toggleMute(); mute.setText(m ? 'Sound off' : 'Sound on');
    }, { width: 66 * s, height: 26 * s, fontSize: 9 * s });
    this.hudObjs.push(mute);

    this.promptText = this.add.text(0, 0, '', textStyle(12 * s)).setOrigin(0.5).setDepth(11);
    this.hudObjs.push(this.promptText);
    this.setPrompt(this.promptText.text);

    this.buildTouchControls();
    this.updateTracker();
  }

  private updateTracker(): void {
    if (!this.trackerTitle?.active) return;
    this.updateTrackerText();
    const s = uiScale(this);
    const w = this.scale.width;
    const has = !!(this.trackerTitle.text || this.trackerObj.text);
    if (!has) { this.trackerBg?.setVisible(false); return; }
    const pw = Math.min(260 * s, w * 0.5);
    const ph = Math.max(40 * s, this.trackerObj.y + this.trackerObj.height + 8 * s - 8 * s);
    if (!this.trackerBg) { this.trackerBg = drawPanel(this, 8 * s, 8 * s, pw, ph, 'ui_pill').setDepth(10); this.hudObjs.push(this.trackerBg); }
    this.trackerBg.setVisible(true).resize(pw, ph);
  }

  private updateTrackerText(): void {
    const q = game.currentQuest;
    if (!q) {
      if (!game.flag('notebook_seen')) { this.trackerTitle.setText('Getting started'); this.trackerObj.setText('Find the Journal of Wonders in the workshop.'); }
      else if (game.questDone('q8')) { this.trackerTitle.setText('Chapter 1 complete'); this.trackerObj.setText('Decorate freely. The Whispering Woods await.'); }
      else { this.trackerTitle.setText(''); this.trackerObj.setText(''); }
      return;
    }
    const pending = q.objectives.find((o) => !o.check(game).done);
    this.trackerTitle.setText(`${q.order}. ${q.title}`);
    if (pending) {
      const st = pending.check(game);
      const prog = st.max !== undefined ? ` (${st.cur}/${st.max})` : '';
      this.trackerObj.setText(`• ${pending.text}${prog}`);
    } else this.trackerObj.setText(q.turnIn ? `• Talk to ${q.turnIn === 'amora' ? 'Amora' : q.turnIn}` : '• Complete');
  }

  setPrompt(text: string): void {
    if (!this.promptText?.active) return;
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    this.promptText.setText(text ? (isTouchDevice() ? text : `[E]  ${text}`) : '');
    if (!text) { this.promptBg?.setVisible(false); return; }
    const pw = this.promptText.width + 32 * s;
    const ph = 30 * s;
    const y = isTouchDevice() ? h - 130 * s : h - 40 * s;
    if (!this.promptBg) { this.promptBg = drawPanel(this, 0, 0, pw, ph, 'ui_pill').setDepth(10); this.hudObjs.push(this.promptBg); }
    this.promptBg.setVisible(true).resize(pw, ph).setPosition(w / 2 - pw / 2, y - ph / 2);
    this.promptText.setPosition(w / 2, y);
  }

  toast(text: string, icon?: string): void {
    const { width: w } = this.scale;
    const s = uiScale(this);
    const baseY = (isTouchDevice() && this.world.decorMode ? 124 : 66) * s;
    const c = this.add.container(w / 2, baseY + this.toasts.length * 30 * s).setDepth(900);
    const t = this.add.text(icon ? 12 * s : 0, 0, text, textStyle(11 * s)).setOrigin(icon ? 0 : 0.5, 0.5);
    const bw = t.width + (icon ? 48 : 32) * s;
    const bh = 28 * s;
    c.add(drawPanel(this, -bw / 2, -bh / 2, bw, bh, 'ui_pill'));
    if (icon) { c.add(this.add.image(-bw / 2 + 18 * s, 0, icon).setScale(ITEMS[icon.replace('icon_', '')] ? s : s * 0.6)); t.setX(-bw / 2 + 32 * s); }
    c.add(t);
    c.setAlpha(0);
    this.toasts.push(c);
    this.tweens.add({ targets: c, alpha: 1, y: c.y + 4 * s, duration: 150 });
    this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: c, alpha: 0, y: c.y - 10, duration: 300, onComplete: () => { c.destroy(); this.toasts = this.toasts.filter((x) => x !== c); this.toasts.forEach((x, i) => x.setY(baseY + i * 30 * s)); } });
    });
  }

  private questBanner(kind: string, q: QuestDef, showIntro: boolean): void {
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    const c = this.add.container(w / 2, h * 0.3).setDepth(950).setAlpha(0);
    const bw = Math.min(w - 30, 460 * s);
    const body = showIntro ? `"${q.intro}"` : q.teaches;
    const bodyT = this.add.text(0, 40 * s, body, textStyle(10 * s, UI.textDim, { align: 'center', wordWrap: { width: bw - 40 * s } })).setOrigin(0.5, 0);
    const bh = 52 * s + bodyT.height + 14 * s;
    c.add(drawPanel(this, -bw / 2, 0, bw, bh));
    c.add(this.add.text(0, 12 * s, kind.toUpperCase(), textStyle(8 * s, UI.lilac)).setOrigin(0.5, 0));
    c.add(this.add.text(0, 22 * s, `${q.order}. ${q.title}`, textStyle(14 * s, UI.title)).setOrigin(0.5, 0));
    c.add(bodyT);
    c.add(this.add.image(-bw / 2 + 18 * s, 22 * s, 'markerExclaim').setScale(s));
    c.add(this.add.image(bw / 2 - 18 * s, 22 * s, 'sparkle0').setScale(s));
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
    const base = this.add.image(cx, cy, 'ui_joy_base').setDisplaySize(r * 2, r * 2).setDepth(800).setAlpha(0.85);
    const knob = this.add.image(cx, cy, 'ui_joy_knob').setDisplaySize(r * 0.9, r * 0.9).setDepth(801);
    this.joy = { base, knob, cx, cy, r, pointerId: null };
    const zone = this.add.zone(cx, cy, r * 2.6, r * 2.6).setInteractive().setDepth(802);
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => { if (this.joy) { this.joy.pointerId = p.id; this.updateJoy(p); } });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.joy && this.joy.pointerId === p.id) this.updateJoy(p); });
    const release = (p: Phaser.Input.Pointer) => { if (this.joy && this.joy.pointerId === p.id) { this.joy.pointerId = null; this.resetJoy(); } };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.touchObjs.push(base, knob, zone);

    const act = new RoundButton(this, w - 24 * s - 30 * s, h - 24 * s - 30 * s, 'ui_hand', 30 * s, () => this.world.queueAction(), undefined, 'Action');
    act.setDepth(803);
    this.touchObjs.push(act);
    this.runBtn = new RoundButton(this, w - 24 * s - 30 * s - 78 * s, h - 24 * s - 22 * s, 'ui_run', 22 * s, () => {
      this.world.mobile.run = !this.world.mobile.run;
      this.runBtn?.setCaption(this.world.mobile.run ? 'Running' : 'Run');
    }, undefined, 'Run');
    this.runBtn.setDepth(803);
    this.touchObjs.push(this.runBtn);
    this.decorBtn = new RoundButton(this, w - 24 * s - 30 * s, h - 24 * s - 30 * s - 78 * s, 'ui_decor', 22 * s, () => this.world.toggleDecor(), undefined, 'Decorate');
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
    this.joy.knob.setPosition(this.joy.cx + dx, this.joy.cy + dy);
    const dead = 0.18;
    const nx = dx / max; const ny = dy / max;
    const m = Math.hypot(nx, ny);
    this.world.mobile.dx = m < dead ? 0 : nx / Math.max(m, 0.001) * Math.min(1, (m - dead) / (1 - dead) + 0.4);
    this.world.mobile.dy = m < dead ? 0 : ny / Math.max(m, 0.001) * Math.min(1, (m - dead) / (1 - dead) + 0.4);
  }

  private resetJoy(): void {
    if (!this.joy) return;
    this.joy.knob.setPosition(this.joy.cx, this.joy.cy);
    this.world.mobile.dx = 0; this.world.mobile.dy = 0;
  }

  update(t: number, delta: number): void {
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
    if (this.dlgArrow) this.dlgArrow.setVisible(this.dlgShown >= this.dlgFull.length && Math.floor(t / 400) % 2 === 0);
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
    this.layoutDialogue();
    this.showLine();
    this.input.on('pointerdown', this.onDialogueTap, this);
  }

  private onDialogueTap(p: Phaser.Input.Pointer): void {
    // ignora toques no joystick
    if (this.joy && Math.hypot(p.x - this.joy.cx, p.y - this.joy.cy) < this.joy.r * 1.3) return;
    this.advanceDialogue();
  }

  /** Chave do retrato para o nome de quem fala (NPC ou o jogador). */
  private portraitFor(speaker: string): string | null {
    if (!speaker) return null;
    if (speaker === 'You') return `portrait_player_${game.data.species}`;
    const id = Object.entries(NPC_NAMES).find(([, name]) => name === speaker)?.[0];
    if (id && this.textures.exists(`portrait_npc_${id}`)) return `portrait_npc_${id}`;
    return null;
  }

  private layoutDialogue(): void {
    if (!this.dialogueBox) return;
    this.dialogueBox.removeAll(true);
    const { width: w, height: h } = this.scale;
    const s = uiScale(this);
    const ps = pixelScale(this);
    const bw = Math.min(w - 16, 640 * s);
    const bh = 96 * s;
    const bx = w / 2 - bw / 2;
    const by = h - bh - (isTouchDevice() ? 10 * s : 14 * s);
    this.dialogueBox.add(drawPanel(this, bx, by, bw, bh));
    // retrato
    const pf = 48 * ps + 8 * ps;
    this.dlgPortraitFrame = drawPanel(this, bx + 10 * s, by + bh / 2 - pf / 2, pf, pf, 'ui_panel_inset');
    this.dlgPortrait = this.add.image(bx + 10 * s + pf / 2, by + bh / 2, 'portrait_npc_amora').setScale(ps);
    this.dialogueBox.add([this.dlgPortraitFrame, this.dlgPortrait]);
    // etiqueta com o nome
    this.dlgTag = drawPanel(this, bx + 12 * s + pf, by - 10 * s, 80 * s, 22 * s, 'ui_tag');
    this.dlgName = this.add.text(bx + 12 * s + pf + 10 * s, by - 10 * s + 11 * s, '', hudStyle(11 * s)).setOrigin(0, 0.5);
    this.dialogueBox.add([this.dlgTag, this.dlgName]);
    this.dlgText = this.add.text(bx + 16 * s + pf, by + 18 * s, '', textStyle(12 * s, UI.text, { wordWrap: { width: bw - pf - 34 * s } }));
    this.dialogueBox.add(this.dlgText);
    this.dlgArrow = this.add.text(bx + bw - 16 * s, by + bh - 12 * s, '▼', textStyle(10 * s, UI.title)).setOrigin(1, 1);
    this.dialogueBox.add(this.dlgArrow);
    if (this.dlgLines.length) this.applyLineStyle();
  }

  private applyLineStyle(): void {
    const line = this.dlgLines[this.dlgIdx];
    if (!line) return;
    const s = uiScale(this);
    const ps = pixelScale(this);
    const key = this.portraitFor(line.speaker);
    const { width: w } = this.scale;
    const bw = Math.min(w - 16, 640 * s);
    const bx = w / 2 - bw / 2;
    const pf = 48 * ps + 8 * ps;
    const hasPortrait = !!key;
    this.dlgPortrait?.setVisible(hasPortrait);
    this.dlgPortraitFrame?.setVisible(hasPortrait);
    if (key) this.dlgPortrait?.setTexture(key);
    const textX = hasPortrait ? bx + 16 * s + pf : bx + 16 * s;
    const wrap = hasPortrait ? bw - pf - 34 * s : bw - 32 * s;
    if (line.speaker === '') {
      this.dlgTag?.setVisible(false); this.dlgName.setVisible(false);
      this.dlgText.setStyle(textStyle(12 * s, UI.lilac, { fontStyle: 'italic', wordWrap: { width: wrap } })).setX(textX);
    } else {
      this.dlgTag?.setVisible(true); this.dlgName.setVisible(true).setText(line.speaker);
      const tagW = this.dlgName.width + 22 * s;
      this.dlgTag?.resize(tagW, 22 * s).setX(textX - 4 * s);
      this.dlgName.setX(textX - 4 * s + 11 * s);
      this.dlgText.setStyle(textStyle(12 * s, UI.text, { wordWrap: { width: wrap } })).setX(textX);
    }
  }

  private showLine(): void {
    const line = this.dlgLines[this.dlgIdx];
    this.dlgFull = line.text;
    this.dlgShown = 0;
    this.dlgTimer = 0;
    this.dlgText.setText('');
    this.applyLineStyle();
  }

  private advanceDialogue(): void {
    if (!this.dialogueBox) return;
    if (this.dlgShown < this.dlgFull.length) { this.dlgShown = this.dlgFull.length; this.dlgText.setText(this.dlgFull); return; }
    this.dlgIdx++;
    if (this.dlgIdx < this.dlgLines.length) { this.showLine(); return; }
    this.input.off('pointerdown', this.onDialogueTap, this);
    this.dialogueBox.destroy();
    this.dialogueBox = null;
    this.dlgArrow = null; this.dlgTag = null; this.dlgPortrait = null; this.dlgPortraitFrame = null;
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
    const dim = this.add.graphics(); dim.fillStyle(0x1d1418, 0.45); dim.fillRect(0, 0, w, h);
    c.add(dim);
    c.add(drawPanel(this, px, py, pw, ph));
    const titles: Record<PanelKind, string> = { inventory: 'Backpack', notebook: 'Journal of Wonders', map: 'Village map', crafting: STATION_NAMES[this.craftStation] };
    const titleIcon: Record<PanelKind, string> = { inventory: 'ui_bag', notebook: 'ui_book', map: 'ui_map', crafting: 'icon_madeira' };
    c.add(this.add.image(px + 24 * s, py + 22 * s, titleIcon[kind]).setScale(kind === 'crafting' ? s * 1.4 : s));
    c.add(this.add.text(px + 40 * s, py + 12 * s, titles[kind], textStyle(15 * s, UI.title)));
    const close = new RoundButton(this, px + pw - 22 * s, py + 22 * s, 'ui_close', 14 * s, () => this.closePanel());
    c.add(close);
    const area = { x: px + 18 * s, y: py + 42 * s, w: pw - 36 * s, h: ph - 58 * s };
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
    const hint = this.add.text(area.x + area.w - 4, area.y + area.h - 2, '▼ scroll', textStyle(8 * uiScale(this), UI.textDim)).setOrigin(1, 1);
    parent.add(hint);
    return content;
  }

  private buildInventory(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    const entries = Object.entries(game.data.inventory).filter(([, n]) => n > 0);
    const order = (id: string) => (ITEMS[id]?.kind === 'material' ? 0 : ITEMS[id]?.kind === 'furniture' ? 1 : 2);
    entries.sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]));
    const slot = 50 * s;
    const cols = Math.max(1, Math.floor(area.w / slot));
    const rows = Math.ceil(entries.length / cols);
    const descH = 74 * s;
    const gridArea = { ...area, h: area.h - descH };
    const content = this.scrollArea(c, gridArea, rows * slot + 4);
    if (entries.length === 0) content.add(this.add.text(8, 8, 'Your backpack is empty. Gather materials in the square and forest.', textStyle(11 * s, UI.textDim)));
    entries.forEach(([id, n], i) => {
      const item = ITEMS[id];
      const x = (i % cols) * slot + slot / 2;
      const y = Math.floor(i / cols) * slot + slot / 2;
      const sel = this.selectedInv === id;
      content.add(new PixelPanel(this, x - slot / 2 + 2, y - slot / 2 + 2, slot - 4, slot - 4, sel ? 'ui_slot_sel' : 'ui_slot'));
      const scale = item.kind === 'furniture' ? s * 1.1 : s * 2;
      content.add(this.fitIcon(this.add.image(x, y - 3 * s, item.icon).setScale(scale), slot - 12 * s));
      const count = this.add.text(x + slot / 2 - 7 * s, y + slot / 2 - 6 * s, `${n}`, hudStyle(10 * s)).setOrigin(1, 1);
      content.add(count);
      const z = this.add.zone(x, y, slot - 4, slot - 4).setInteractive({ useHandCursor: true });
      z.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        if (this.selectedInv === id && item.kind === 'furniture') { this.startDecorWith(id); return; }
        this.selectedInv = id; sfx('select'); this.rebuildPanel();
      });
      content.add(z);
    });
    // descrição do item selecionado
    const dy = area.y + area.h - descH + 8 * s;
    c.add(new PixelPanel(this, area.x, dy - 6 * s, area.w, descH - 4 * s, 'ui_panel_inset'));
    const sel = this.selectedInv && game.count(this.selectedInv) > 0 ? ITEMS[this.selectedInv] : null;
    if (sel) {
      c.add(this.fitIcon(this.add.image(area.x + 22 * s, dy + 20 * s, sel.icon).setScale(sel.kind === 'furniture' ? s : s * 1.6), 36 * s));
      c.add(this.add.text(area.x + 42 * s, dy + 2 * s, sel.name, textStyle(12 * s, UI.title)));
      const attrs = sel.attrs ? Object.entries(sel.attrs).map(([k, v]) => `${ATTRIBUTE_NAMES[k as keyof ItemAttrs]} +${v}`).join(' · ') : '';
      c.add(this.add.text(area.x + 42 * s, dy + 18 * s, sel.desc + (attrs ? `\n${attrs}` : ''), textStyle(10 * s, UI.textDim, { wordWrap: { width: area.w - 190 * s } })));
      if (sel.kind === 'furniture') {
        const can = this.world.isDecoratable();
        c.add(new Button(this, area.x + area.w - 70 * s, dy + 22 * s, 'Decorate', () => this.startDecorWith(sel.id), { width: 116 * s, height: 30 * s, kind: 'primary', disabled: !can }));
        if (!can) c.add(this.add.text(area.x + area.w - 70 * s, dy + 42 * s, 'can\'t decorate here', textStyle(8 * s, UI.textDim)).setOrigin(0.5, 0));
      }
    } else {
      c.add(this.add.text(area.x + 10 * s, dy + 4 * s, 'Tap an item for details. Double-tap furniture to decorate.', textStyle(10 * s, UI.textDim, { wordWrap: { width: area.w - 20 * s } })));
    }
  }

  private startDecorWith(id: string): void {
    if (!this.world.isDecoratable()) { this.toast('You can\'t decorate this place (yet).'); return; }
    this.closePanel();
    if (!this.world.decorMode) this.world.enterDecor(id);
    else this.world.setDecorItem(id);
  }

  private buildNotebook(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    const tabs = ['Quests', 'Recipes', 'Materials', 'Memories', 'Wonders'];
    const tabW = Math.min(100 * s, area.w / tabs.length);
    tabs.forEach((t, i) => {
      const b = new Button(this, area.x + tabW * i + tabW / 2, area.y + 13 * s, t, () => { this.notebookTab = i; sfx('select'); this.rebuildPanel(); }, { width: tabW - 4, height: 26 * s, fontSize: 10 * s, kind: this.notebookTab === i ? 'primary' : 'wood' });
      c.add(b);
    });
    const body = { x: area.x, y: area.y + 34 * s, w: area.w, h: area.h - 34 * s };
    c.add(new PixelPanel(this, body.x, body.y - 4 * s, body.w, body.h + 4 * s, 'ui_panel_inset'));
    const lines: Array<{ text: string; color?: string; size?: number; icon?: string; iconScale?: number }> = [];
    const tab = this.notebookTab;
    const check = (done: boolean) => (done ? 'ui_check_on' : 'ui_check_off');
    if (tab === 0) {
      const active = game.activeQuests;
      if (active.length === 0 && game.data.doneQuests.length === 0) lines.push({ text: 'No quests yet. The journal awaits your first step.', color: UI.textDim });
      for (const q of active) {
        lines.push({ text: `${q.order}. ${q.title}`, color: UI.title, size: 13, icon: 'markerExclaim' });
        lines.push({ text: `"${q.intro}"`, color: UI.lilac, size: 10 });
        for (const o of q.objectives) {
          const st = o.check(game);
          const prog = st.max !== undefined ? ` (${st.cur}/${st.max})` : '';
          lines.push({ text: `${o.text}${prog}`, color: st.done ? UI.good : UI.text, icon: check(st.done) });
          if (!st.done && o.hint) lines.push({ text: `     ${o.hint}`, color: UI.textDim, size: 9 });
        }
        if (q.turnIn && q.objectives.every((o) => o.check(game).done)) lines.push({ text: `→ Talk to ${q.turnIn === 'amora' ? 'Amora' : q.turnIn} to finish.`, color: UI.title });
        lines.push({ text: '' });
      }
      const done = QUEST_ORDER.filter((id) => game.questDone(id));
      if (done.length) {
        lines.push({ text: 'Completed', color: UI.textDim, size: 11 });
        for (const id of done) lines.push({ text: `${QUESTS[id].order}. ${QUESTS[id].title}`, color: UI.textDim, icon: 'ui_check_on' });
      }
    } else if (tab === 1) {
      const known = Object.values(RECIPES).filter((r) => game.recipeKnown(r.id));
      if (known.length === 0) lines.push({ text: 'No recipes yet. Repair the woodworking bench.', color: UI.textDim });
      for (const st of ['marcenaria', 'costura', 'pintura'] as StationId[]) {
        const rs = known.filter((r) => r.station === st);
        if (!rs.length) continue;
        lines.push({ text: STATION_NAMES[st], color: UI.title, size: 12 });
        for (const r of rs) {
          const ing = Object.entries(r.ingredients).map(([id, n]) => `${ITEMS[id].name} ×${n}`).join(', ');
          lines.push({ text: `${ITEMS[r.result].name}${r.count > 1 ? ` ×${r.count}` : ''}  —  ${ing}`, icon: ITEMS[r.result].icon });
        }
        lines.push({ text: '' });
      }
    } else if (tab === 2) {
      const seen = MATERIAL_ORDER.filter((m) => game.data.materialsSeen.includes(m));
      if (!seen.length) lines.push({ text: 'You haven\'t gathered any materials yet.', color: UI.textDim });
      for (const m of seen) { lines.push({ text: ITEMS[m].name, color: UI.title, icon: ITEMS[m].icon }); lines.push({ text: ITEMS[m].desc, color: UI.textDim, size: 10 }); }
    } else if (tab === 3) {
      if (!game.data.memories.length) lines.push({ text: 'The village\'s memories are still hidden.', color: UI.textDim });
      game.data.memories.forEach((m, i) => { lines.push({ text: `Fragment ${i + 1}`, color: UI.title, icon: 'icon_fragmento' }); lines.push({ text: m, size: 10 }); lines.push({ text: '' }); });
    } else {
      if (!game.data.encantos.length) lines.push({ text: 'No Little Wonders recovered. They say they live in the fountain.', color: UI.textDim });
      for (const e of game.data.encantos) lines.push({ text: e, color: UI.title, size: 13, icon: 'sparkle0' });
    }
    // renderiza linhas
    const objs: Phaser.GameObjects.GameObject[] = [];
    let y = 8 * s;
    for (const l of lines) {
      const size = (l.size ?? 11) * s;
      const t = this.add.text(l.icon ? 30 * s : 10 * s, y, l.text, textStyle(size, l.color ?? UI.text, { wordWrap: { width: body.w - 44 * s } }));
      if (l.icon) {
        const sc = l.icon.startsWith('furn') ? s * 0.5 : l.icon.startsWith('ui_check') ? s : s;
        objs.push(this.fitIcon(this.add.image(18 * s, y + t.height / 2, l.icon).setScale(sc), 22 * s));
      }
      objs.push(t);
      y += Math.max(t.height, size * 1.2) + 4 * s;
    }
    const content = this.scrollArea(c, { ...body, x: body.x, w: body.w, h: body.h }, y + 8 * s);
    content.add(objs);
  }

  private buildMap(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    c.add(new PixelPanel(this, area.x, area.y, area.w, area.h, 'ui_panel_inset'));
    const positions: Record<string, [number, number]> = { atelier: [0.22, 0.3], praca: [0.5, 0.55], floresta: [0.82, 0.5], loja: [0.5, 0.2] };
    const g = this.add.graphics();
    const pt = (id: string) => [area.x + area.w * positions[id][0], area.y + area.h * positions[id][1]] as const;
    for (const [a, b] of [['atelier', 'praca'], ['praca', 'floresta'], ['praca', 'loja']]) {
      const [ax, ay] = pt(a); const [bx, by] = pt(b);
      // trilha pontilhada
      const n = Math.max(4, Math.floor(Math.hypot(bx - ax, by - ay) / (10 * s)));
      for (let i = 0; i <= n; i++) { const t = i / n; g.fillStyle(0x7a4a25, 0.8); g.fillCircle(ax + (bx - ax) * t, ay + (by - ay) * t, 2 * s); }
    }
    c.add(g);
    for (const id of MAP_ORDER) {
      const [x, y] = pt(id);
      const def = MAPS[id];
      const restored = !def.restoredFlag || game.flag(def.restoredFlag);
      const img = this.add.image(x, y, `thumb_${id}`).setScale(1.6 * s);
      if (!restored) img.setTint(0x9a97a3);
      c.add(img);
      c.add(this.add.text(x, y + 36 * s, def.name + (restored && def.restoredFlag ? ' ✦' : ''), textStyle(10 * s, this.world.mapId === id ? UI.title : UI.text)).setOrigin(0.5, 0));
      if (this.world.mapId === id) {
        const m = this.add.image(x, y - 40 * s, 'markerExclaim').setScale(s);
        c.add(m);
        this.tweens.add({ targets: m, y: m.y - 4 * s, duration: 400, yoyo: true, repeat: -1 });
      }
    }
    c.add(this.add.text(area.x + area.w / 2, area.y + area.h - 8 * s, 'You are in: ' + this.world.def.name + '   ·   ✦ = restored', textStyle(9 * s, UI.textDim)).setOrigin(0.5, 1));
  }

  private buildCrafting(c: Phaser.GameObjects.Container, area: { x: number; y: number; w: number; h: number }, s: number): void {
    const recipes = Object.values(RECIPES).filter((r) => r.station === this.craftStation && game.recipeKnown(r.id));
    const rowH = 54 * s;
    const content = this.scrollArea(c, area, recipes.length * rowH + 8);
    if (!recipes.length) content.add(this.add.text(8, 8, 'No known recipes for this table.', textStyle(11 * s, UI.textDim)));
    recipes.forEach((r, i) => {
      const y = i * rowH;
      const item = ITEMS[r.result];
      const can = game.canCraft(r.id);
      content.add(new PixelPanel(this, 0, y + 2, area.w, rowH - 4, 'ui_panel_inset'));
      content.add(new PixelPanel(this, 6 * s, y + rowH / 2 - 20 * s, 40 * s, 40 * s, 'ui_slot'));
      content.add(this.fitIcon(this.add.image(26 * s, y + rowH / 2, item.icon).setScale(s * 1.1), 34 * s));
      content.add(this.add.text(54 * s, y + 9 * s, `${item.name}${r.count > 1 ? ` ×${r.count}` : ''}`, textStyle(12 * s, can ? UI.text : UI.textDim)));
      let ix = 54 * s;
      for (const [id, n] of Object.entries(r.ingredients)) {
        const have = game.count(id);
        content.add(this.add.image(ix + 6 * s, y + 34 * s, ITEMS[id].icon).setScale(s * 0.8));
        const t = this.add.text(ix + 14 * s, y + 28 * s, `${have}/${n}`, textStyle(9 * s, have >= n ? UI.good : UI.bad));
        content.add(t);
        ix += t.width + 26 * s;
      }
      const attrs = item.attrs ? Object.entries(item.attrs).map(([k, v]) => `${ATTRIBUTE_NAMES[k as keyof ItemAttrs]} +${v}`).join(' ') : '';
      if (attrs) content.add(this.add.text(area.w - 110 * s, y + 9 * s, attrs, textStyle(8 * s, UI.textDim)).setOrigin(1, 0));
      const b = new Button(this, area.w - 52 * s, y + rowH / 2, 'Craft', () => {
        if (game.craft(r.id)) { sfx('craft'); this.rebuildPanel(); } else sfx('error');
      }, { width: 80 * s, height: 30 * s, kind: 'primary', disabled: !can });
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
    const bw = Math.min(w - 16, 560 * s);
    const bh = 58 * s;
    const bx = w / 2 - bw / 2;
    const by = touch ? 60 * s : h - bh - 12 * s;
    this.decorHud.push(drawPanel(this, bx, by, bw, bh).setDepth(600));
    const item = this.world.decorInfo.item;
    if (item) this.decorHud.push(this.fitIcon(this.add.image(bx + 22 * s, by + bh / 2, this.world.furnTexture(item, this.world.decorInfo.rot)).setScale(s * 0.9).setDepth(601), bh - 8 * s));
    const title = item ? `Decorating: ${ITEMS[item].name} (×${game.count(item)})` : 'Decorate mode — choose furniture from your backpack';
    this.decorHud.push(this.add.text(bx + (item ? 40 : 14) * s, by + 10 * s, title, textStyle(11 * s, UI.title)).setDepth(601));
    const hint = touch ? 'Joystick: walk · tap the floor to aim; tap again to place/pick up.' : 'WASD: walk · mouse: aim · E/click: place or pick up · R: rotate · F/Esc: exit';
    this.decorHud.push(this.add.text(bx + (item ? 40 : 14) * s, by + 27 * s, hint, textStyle(8.5 * s, UI.textDim, { wordWrap: { width: bw - (item ? 150 : 124) * s } })).setDepth(601));
    this.decorHud.push(new Button(this, bx + bw - 60 * s, by + bh / 2, 'Backpack', () => this.openPanel('inventory'), { width: 92 * s, height: 28 * s, fontSize: 10 * s }).setDepth(601));
    // requisitos da loja (missão 7)
    if (game.questActive('q7') && this.world.mapId === 'loja') {
      const q = QUESTS.q7;
      const lines = q.objectives.map((o) => { const st = o.check(game); return `${st.done ? '✓' : '○'} ${o.text}${st.max !== undefined ? ` ${st.cur}/${st.max}` : ''}`; });
      const rt = this.add.text(18 * s, (touch ? by + bh + 14 * s : 66 * s), lines.join('\n'), textStyle(9 * s, UI.text, { lineSpacing: 2 })).setDepth(601);
      this.decorHud.push(drawPanel(this, 8 * s, rt.y - 8 * s, rt.width + 22 * s, rt.height + 16 * s, 'ui_pill').setDepth(600), rt);
    }
    if (touch) {
      const rot = new RoundButton(this, w - 24 * s - 30 * s - 78 * s, h - 24 * s - 30 * s - 78 * s, 'ui_rotate', 22 * s, () => this.world.queueRotate(), undefined, 'Rotate').setDepth(803);
      const exit = new RoundButton(this, 24 * s + 22 * s, h - 24 * s - 46 * s - 46 * s - 60 * s, 'ui_close', 22 * s, () => this.world.exitDecor(), undefined, 'Exit').setDepth(803);
      this.decorHud.push(rot, exit);
    }
  }

  /** Limita a escala de um ícone para caber em `maxPx` (mobílias grandes não estouram o slot). */
  private fitIcon(img: Phaser.GameObjects.Image, maxPx: number): Phaser.GameObjects.Image {
    const big = Math.max(img.width, img.height) * img.scaleX;
    if (big > maxPx) img.setScale(img.scaleX * (maxPx / big));
    return img;
  }

  private clearDecorHud(): void {
    this.decorHud.forEach((o) => o.destroy());
    this.decorHud = [];
  }
}
