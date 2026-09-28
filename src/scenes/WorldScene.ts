import Phaser from 'phaser';
import { TILE, WALK_SPEED, RUN_SPEED, REGROW_SECONDS } from '../config';
import { MAPS, BLOCKING_CHARS, type MapDef, type MapId, type InteractObj, type NodeObj, type NpcObj, type PropObj, type DoorObj } from '../data/maps';
import { ITEMS } from '../data/items';
import { getDialogue, narrator, TEXTS, NPC_NAMES, type DialogueLine } from '../data/dialogues';
import { game, type PlacedItem } from '../state/GameState';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import type { Dir } from '../art/characters';
import type { UIScene } from './UIScene';

export interface WorldStartData { map: MapId; x: number; y: number; dir?: Dir; arrival?: boolean }

interface WInteract { obj: InteractObj; sprite: Phaser.GameObjects.Image; done: boolean; removed: boolean }
interface WNode { obj: NodeObj; sprite: Phaser.GameObjects.Image; bar: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }
interface WNpc { obj: NpcObj; sprite: Phaser.GameObjects.Sprite; visible: boolean }
interface WProp { obj: PropObj; sprite: Phaser.GameObjects.Image; visible: boolean; animIdx: number }
interface WPlaced { data: PlacedItem; sprite: Phaser.GameObjects.Image }

type Target = { kind: 'interact'; ref: WInteract } | { kind: 'node'; ref: WNode } | { kind: 'npc'; ref: WNpc };

const DIR_VEC: Record<Dir, [number, number]> = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };

/**
 * Cena principal: renderiza o mapa por tiles, controla o jogador, NPCs, coleta,
 * interações, portas, modo de decoração e as transformações visuais (Desbotamento).
 */
export class WorldScene extends Phaser.Scene {
  mapId: MapId = 'atelier';
  def!: MapDef;
  cols = 0;
  rows = 0;
  private staticBlocked: Uint8Array = new Uint8Array(0);
  private dynBlocked = new Map<string, number>();
  private tileImgs: Phaser.GameObjects.Image[] = [];
  private waterImgs: Phaser.GameObjects.Image[] = [];
  private interacts: WInteract[] = [];
  private nodes: WNode[] = [];
  private npcs: WNpc[] = [];
  private props: WProp[] = [];
  private doors: DoorObj[] = [];
  private placed: WPlaced[] = [];
  private treeImgs: Phaser.GameObjects.Image[] = [];

  player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  dir: Dir = 'south';
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  /** Entrada vinda dos controles de toque (UIScene). */
  mobile = { dx: 0, dy: 0, run: false };
  private actionQueued = false;
  private rotateQueued = false;
  private decorToggleQueued = false;
  private escQueued = false;
  private pauseCount = 0;
  private inputCooldownUntil = 0;
  private transitioning = false;
  private target: Target | null = null;
  private lastPrompt = '';
  private vibrant = false;
  private restoring = false;
  private lastSavePos = 0;
  private waterFrame = 0;
  private waterTimer = 0;
  private nodeTimer = 0;
  private startData: WorldStartData = { map: 'atelier', x: 6, y: 8 };

  // modo decoração
  decorMode = false;
  decorItem: string | null = null;
  private decorTile = { x: 0, y: 0 };
  private decorRot = 0;
  private decorCursor!: Phaser.GameObjects.Image;
  private decorGhost: Phaser.GameObjects.Image | null = null;
  private decorLastTap = { x: -1, y: -1 };
  private decorMoveAt = 0;

  private stateHandlers: Array<[string, (...args: unknown[]) => void]> = [];

  // efeitos ambientais
  private ambient: Array<{ img: Phaser.GameObjects.Image; vx: number; vy: number; phase: number; kind: 'leaf' | 'petal' | 'firefly' | 'mote' }> = [];
  private beam: Phaser.GameObjects.Image | null = null;
  private puffTimer = 0;
  private fountainSparkleTimer = 0;

  constructor() { super('WorldScene'); }

  get ui(): UIScene | null {
    const s = this.scene.get('UIScene') as UIScene | undefined;
    return s && this.scene.isActive('UIScene') ? s : null;
  }

  get paused(): boolean { return this.pauseCount > 0; }

  setPaused(p: boolean): void {
    this.pauseCount = Math.max(0, this.pauseCount + (p ? 1 : -1));
    if (!this.paused) this.inputCooldownUntil = this.time.now + 200;
  }

  // =========================================================================
  // criação
  // =========================================================================
  init(data: WorldStartData): void {
    this.startData = data ?? { map: game.data.map, x: game.data.x, y: game.data.y };
  }

  create(): void {
    this.mapId = this.startData.map;
    this.def = MAPS[this.mapId];
    this.rows = this.def.rows.length;
    this.cols = this.def.rows[0].length;
    this.vibrant = !this.def.restoredFlag || game.flag(this.def.restoredFlag);
    this.restoring = false;
    this.transitioning = false;
    this.pauseCount = 0;
    this.target = null;
    this.lastPrompt = '';
    this.dynBlocked.clear();
    this.tileImgs = []; this.waterImgs = []; this.interacts = []; this.nodes = []; this.npcs = []; this.props = []; this.doors = []; this.placed = []; this.treeImgs = [];
    this.decorMode = false; this.decorItem = null; this.decorGhost = null;
    this.mobile = { dx: 0, dy: 0, run: false };
    this.actionQueued = false; this.rotateQueued = false; this.decorToggleQueued = false; this.escQueued = false;

    this.buildTiles();
    this.buildObjects();
    this.buildPlaced();
    this.buildPlayer();
    this.buildInput();
    this.buildAmbient();

    this.decorCursor = this.add.image(0, 0, 'cursorTile').setOrigin(0).setDepth(5000).setVisible(false);

    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.cameras.main.fadeIn(350, 0, 0, 0);

    const track = this.vibrant && this.def.musicRestored ? this.def.musicRestored : this.def.music;
    music.play(track);

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.events.emit('map-changed', this.def);

    // eventos de estado
    const onFlag = (name: unknown) => this.onFlag(name as string);
    game.on('flag', onFlag);
    this.stateHandlers.push(['flag', onFlag]);
    const onChanged = () => this.refreshConditionalObjects(false);
    game.on('changed', onChanged);
    this.stateHandlers.push(['changed', onChanged]);

    this.events.once('shutdown', () => {
      this.scale.off('resize', this.applyZoom, this);
      for (const [ev, fn] of this.stateHandlers) game.off(ev, fn);
      this.stateHandlers = [];
    });

    game.setPosition(this.mapId, this.startData.x, this.startData.y);
    this.time.delayedCall(400, () => this.onEnterMap());
  }

  private applyZoom(): void {
    const { width, height } = this.scale;
    const zoom = Phaser.Math.Clamp(Math.round(Math.min(width / 420, height / 300)), 1, 4);
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // Mapas menores que a tela ficam centralizados (em vez de grudados no canto).
    const viewW = width / zoom;
    const viewH = height / zoom;
    const mapW = this.cols * TILE;
    const mapH = this.rows * TILE + TILE;
    const bx = mapW < viewW ? (mapW - viewW) / 2 : 0;
    const by = -TILE + (mapH < viewH ? (mapH - viewH) / 2 : 0);
    cam.setBounds(bx, by, Math.max(mapW, viewW), Math.max(mapH, viewH));
  }

  private tex(key: string): string {
    if (this.vibrant) return key;
    const f = `${key}__faded`;
    return this.textures.exists(f) ? f : key;
  }

  private charAt(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 'x';
    return this.def.rows[y][x] ?? 'x';
  }

  private tileKeyFor(ch: string, x: number, y: number): string | null {
    const h = (x * 73 + y * 151) % 7;
    switch (ch) {
      case 'g': case 't': return h < 4 ? 'grass' : h < 6 ? 'grass2' : 'grass3';
      case 'G': return 'tallgrass';
      case 'f': return 'flowers';
      case 'p': return h % 2 ? 'path' : 'path2';
      case 'c': return 'cobble';
      case 'w': return 'water0';
      case 'x': return 'void';
      case '-': return 'fenceH';
      case '|': return 'fenceV';
      case 's': return 'rock';
      case '.': return h % 3 === 0 ? 'floor2' : 'floor';
      case ':': return 'floorShop';
      case '#': {
        // Só a fileira que tem chão logo abaixo mostra a face da parede; o resto é a lateral.
        const below = this.charAt(x, y + 1);
        if (!this.def.floorChars.includes(below)) return 'wallSide';
        return this.mapId === 'loja' ? 'wallShop' : 'wall';
      }
      case 'W': return 'wallTop';
      case 'D': return this.def.indoor ? (this.mapId === 'loja' ? 'matShop' : 'matWood') : 'matPath';
      default: return 'grass';
    }
  }

  /** Classe de terreno usada para decidir as bordas (água afundada, grama sobre o caminho, meio-fio). */
  private terrainClass(ch: string): 'water' | 'path' | 'cobble' | 'grass' | 'none' {
    if (this.def.indoor) return 'none';
    switch (ch) {
      case 'w': return 'water';
      case 'p': case 'D': return 'path';
      case 'c': return 'cobble';
      case 'g': case 'G': case 'f': case 't': case 's': case '-': case '|': return 'grass';
      default: return 'none';
    }
  }

  private addTileImage(key: string, x: number, y: number, depth: number): Phaser.GameObjects.Image {
    const img = this.add.image(x * TILE, y * TILE, this.tex(`tile_${key}`)).setOrigin(0).setDepth(depth);
    img.setData('base', `tile_${key}`);
    this.tileImgs.push(img);
    return img;
  }

  /** Sobrepõe bordas de transição conforme os vizinhos (auto-tiling simples). */
  private addEdges(x: number, y: number, ch: string): void {
    const me = this.terrainClass(ch);
    if (me === 'none' || me === 'grass') return;
    const cls = (dx: number, dy: number) => {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) return me;
      const c = this.terrainClass(this.charAt(nx, ny));
      return c === 'none' ? me : c;
    };
    const N = cls(0, -1); const S = cls(0, 1); const E = cls(1, 0); const W = cls(-1, 0);
    const edge = (n: typeof N) => {
      if (me === 'water') return n !== 'water' ? 'edgeWater' : null;
      if (me === 'path') return n === 'grass' ? 'edgePath' : null;
      if (me === 'cobble') return n === 'grass' || n === 'path' ? 'edgeCobble' : null;
      return null;
    };
    const sides: Array<[string, typeof N]> = [['N', N], ['S', S], ['E', E], ['W', W]];
    for (const [side, n] of sides) { const k = edge(n); if (k) this.addTileImage(`${k}${side}`, x, y, 0.5); }
    if (me === 'water' || me === 'path') {
      const corner = me === 'water' ? 'cornerWater' : 'cornerPath';
      const cap = me === 'water' ? 'capWater' : 'capPath';
      const out = (n: typeof N) => (me === 'water' ? n !== 'water' : n === 'grass');
      const diag: Array<[string, number, number, typeof N, typeof N]> = [['NE', 1, -1, N, E], ['NW', -1, -1, N, W], ['SE', 1, 1, S, E], ['SW', -1, 1, S, W]];
      for (const [name, dx, dy, a, b] of diag) {
        if (out(cls(dx, dy)) && !out(a) && !out(b)) this.addTileImage(`${corner}${name}`, x, y, 0.5);
        if (out(a) && out(b)) this.addTileImage(`${cap}${name}`, x, y, 0.6); // canto externo arredondado
      }
    }
  }

  /** Sombra suave no chão sob um objeto (largura em px, centrada em cx, com a base em baseY). */
  private groundShadow(cx: number, baseY: number, w: number, h = Math.max(4, Math.round(w / 3)), alpha = 0.55): Phaser.GameObjects.Image {
    return this.add.image(cx, baseY - 1, 'shadow').setDisplaySize(w, h).setDepth(0.9).setAlpha(alpha);
  }

  private buildTiles(): void {
    this.staticBlocked = new Uint8Array(this.cols * this.rows);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const ch = this.charAt(x, y);
        const key = this.tileKeyFor(ch, x, y);
        if (key) {
          const img = this.addTileImage(key, x, y, 0);
          if (ch === 'w') this.waterImgs.push(img);
          this.addEdges(x, y, ch);
        }
        if (BLOCKING_CHARS.has(ch)) this.staticBlocked[y * this.cols + x] = 1;
        if (ch === 't') {
          const tkey = (x * 31 + y * 17) % 5 === 0 ? 'treeRound' : (x + y) % 2 ? 'tree' : 'tree2';
          this.groundShadow(x * TILE + 16, y * TILE + 32, 40, 12, 0.5);
          const t = this.add.image(x * TILE + 16, y * TILE + 32, this.tex(tkey)).setOrigin(0.5, 1).setDepth(y * TILE + 32);
          t.setData('base', tkey);
          this.treeImgs.push(t);
        }
      }
    }
  }

  private blockRects(rects: Array<{ x: number; y: number; w: number; h: number }> | undefined, delta: number): void {
    if (!rects) return;
    for (const r of rects)
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) {
          const k = `${x},${y}`;
          const v = (this.dynBlocked.get(k) ?? 0) + delta;
          if (v <= 0) this.dynBlocked.delete(k); else this.dynBlocked.set(k, v);
        }
  }

  isBlocked(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    if (this.staticBlocked[ty * this.cols + tx]) return true;
    return this.dynBlocked.has(`${tx},${ty}`);
  }

  private buildObjects(): void {
    for (const obj of this.def.objects) {
      if (obj.type === 'door') { this.doors.push(obj); continue; }
      if (obj.type === 'prop') {
        const key = this.vibrant && obj.texRestored ? obj.texRestored : obj.tex;
        const img = this.add.image(obj.x * TILE + (obj.px ?? 0), obj.y * TILE + (obj.py ?? 0), this.tex(key)).setOrigin(0);
        img.setData('base', key);
        img.setDepth(obj.flat ? 1 : img.y + img.displayHeight);
        const p: WProp = { obj, sprite: img, visible: true, animIdx: 0 };
        this.props.push(p);
        const vis = this.condVisible(obj.showWhen, obj.hideWhen);
        p.visible = vis;
        img.setVisible(vis);
        if (vis) this.blockRects(obj.blocks, 1);
        if (!obj.flat && img.displayWidth <= 96) {
          const sh = this.groundShadow(img.x + img.displayWidth / 2, img.y + img.displayHeight, img.displayWidth * 0.9);
          sh.setVisible(vis);
          img.setData('shadow', sh);
        }
        continue;
      }
      if (obj.type === 'interact') {
        const removed = game.flag(`removed_${this.mapId}_${obj.id}`);
        if (removed) continue;
        const doneFlag = this.interactDoneFlag(obj);
        const done = doneFlag ? game.flag(doneFlag) : false;
        const key = done && obj.texDone ? obj.texDone : (obj.tex ?? 'crate');
        const img = this.add.image(obj.x * TILE + (obj.px ?? 0), obj.y * TILE + (obj.py ?? 0), this.tex(key)).setOrigin(0);
        img.setData('base', key);
        img.setDepth(obj.flat ? 1 : img.y + img.displayHeight);
        const it: WInteract = { obj, sprite: img, done, removed: false };
        this.interacts.push(it);
        const vis = this.condVisible(obj.showWhen, obj.hideWhen);
        img.setVisible(vis);
        if (vis) this.blockRects(obj.blocks, 1); else it.removed = true;
        if (!obj.flat && obj.kind !== 'fountain') {
          const sh = this.groundShadow(img.x + img.displayWidth / 2, img.y + img.displayHeight, img.displayWidth * 0.85);
          sh.setVisible(vis);
          img.setData('shadow', sh);
        }
        if (obj.kind === 'fountain' && game.flag('praca_restored')) { img.setTexture('fountainFlow0'); img.setData('base', 'fountainFlow0'); }
        continue;
      }
      if (obj.type === 'node') {
        const texKey = this.nodeTexture(obj.material);
        this.groundShadow(obj.x * TILE + 16, obj.y * TILE + 32, 26, 8, 0.45);
        const img = this.add.image(obj.x * TILE + 16, obj.y * TILE + 32, this.tex(texKey)).setOrigin(0.5, 1).setDepth(obj.y * TILE + 32);
        img.setData('base', texKey);
        const bar = this.add.graphics().setDepth(4000).setVisible(false);
        const label = this.add.text(obj.x * TILE + 16, obj.y * TILE + 34, '', { fontFamily: 'monospace', fontSize: '9px', color: '#fff8ee', stroke: '#1d1418', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(4001).setVisible(false);
        this.nodes.push({ obj, sprite: img, bar, label });
        continue;
      }
      if (obj.type === 'npc') {
        const spr = this.add.sprite(obj.x * TILE + 16, obj.y * TILE + 28, `npc_${obj.id}`, `${obj.dir}_0`).setOrigin(0.5, 1);
        spr.setDepth(spr.y);
        const n: WNpc = { obj, sprite: spr, visible: false };
        this.npcs.push(n);
        const vis = this.condVisible(obj.showWhen, obj.hideWhen);
        n.visible = vis;
        spr.setVisible(vis);
        const sh = this.groundShadow(spr.x, spr.y + 1, 22, 8, 0.5);
        sh.setVisible(vis);
        spr.setData('shadow', sh);
        if (vis) this.blockRects([{ x: obj.x, y: obj.y, w: 1, h: 1 }], 1);
      }
    }
    this.updateNodeVisuals(true);
  }

  private condVisible(showWhen?: string, hideWhen?: string): boolean {
    if (showWhen && !game.flag(showWhen)) return false;
    if (hideWhen && game.flag(hideWhen)) return false;
    return true;
  }

  private interactDoneFlag(obj: InteractObj): string | null {
    switch (obj.kind) {
      case 'window': return 'window_open';
      case 'bench': return 'bench_repaired';
      case 'sewing': return 'sewing_repaired';
      case 'paint': return 'paint_repaired';
      case 'sign': return 'praca_restored';
      default: return null;
    }
  }

  private nodeTexture(material: string): string {
    return { madeira: 'nodeWood', pedra: 'nodeStone', folhas: 'nodeLeaves', fibra: 'nodeFiber', flor: 'nodeFlower', po_encanto: 'nodeDust', flor_lua: 'nodeMoonFlower' }[material] ?? 'nodeWood';
  }

  /** Textura da mobília na orientação `rot` (0 sul, 1 leste, 2 norte, 3 oeste). */
  furnTexture(item: string, rot: number): string {
    const base = ITEMS[item].icon;
    const key = `${base}_${['south', 'east', 'north', 'west'][((rot % 4) + 4) % 4]}`;
    return this.textures.exists(key) ? key : base;
  }

  private buildPlaced(): void {
    for (const p of game.placedIn(this.mapId)) this.addPlacedSprite(p);
  }

  private addPlacedSprite(p: PlacedItem): WPlaced {
    const item = ITEMS[p.item];
    const img = this.add.image(p.x * TILE + 16, p.y * TILE + 16, this.furnTexture(p.item, p.rot));
    img.setDepth(item.walkable ? 2 : p.y * TILE + 32);
    const w: WPlaced = { data: p, sprite: img };
    this.placed.push(w);
    if (!item.walkable) this.blockRects([{ x: p.x, y: p.y, w: 1, h: 1 }], 1);
    return w;
  }

  private buildPlayer(): void {
    const key = `player_${game.data.species}`;
    this.dir = this.startData.dir ?? 'south';
    this.shadow = this.add.image(0, 0, 'shadow').setOrigin(0.5, 0.5).setDepth(1).setAlpha(0.8);
    this.player = this.add.sprite(this.startData.x * TILE + 16, this.startData.y * TILE + 28, key, `${this.dir}_0`).setOrigin(0.5, 1);
    this.player.setDepth(this.player.y);
  }

  private buildInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys({ W: 'W', A: 'A', S: 'S', D: 'D', E: 'E', F: 'F', R: 'R', SHIFT: 'SHIFT', ESC: 'ESC', SPACE: 'SPACE' }) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture(['TAB', 'SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    // Ações por evento (não por polling): toques muito rápidos não são perdidos.
    const onAction = () => { this.actionQueued = true; };
    kb.on('keydown-E', onAction);
    kb.on('keydown-SPACE', onAction);
    kb.on('keydown-F', () => { this.decorToggleQueued = true; });
    kb.on('keydown-R', () => { this.rotateQueued = true; });
    kb.on('keydown-ESC', () => { this.escQueued = true; });
    this.events.once('shutdown', () => { kb.off('keydown-E', onAction); kb.off('keydown-SPACE', onAction); kb.removeAllListeners('keydown-F'); kb.removeAllListeners('keydown-R'); kb.removeAllListeners('keydown-ESC'); });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.decorMode || !p.isDown && this.sys.game.device.input.touch && p.wasTouch) return;
      if (this.sys.game.device.input.touch && p.wasTouch) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      this.setDecorTile(Math.floor(wp.x / TILE), Math.floor(wp.y / TILE));
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.decorMode || this.paused) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      const tx = Math.floor(wp.x / TILE);
      const ty = Math.floor(wp.y / TILE);
      if (p.wasTouch) {
        if (this.decorLastTap.x === tx && this.decorLastTap.y === ty && this.decorTile.x === tx && this.decorTile.y === ty) {
          this.decorConfirm();
          this.decorLastTap = { x: -1, y: -1 };
        } else {
          this.setDecorTile(tx, ty);
          this.decorLastTap = { x: tx, y: ty };
        }
      } else {
        this.setDecorTile(tx, ty);
        this.decorConfirm();
      }
    });
  }

  private onEnterMap(): void {
    if (this.startData.arrival && !game.flag('arrived')) {
      game.setFlag('arrived');
      this.say(narrator(...TEXTS.arrival));
      return;
    }
    if (this.mapId === 'atelier' && !game.flag('atelier_visited')) {
      game.setFlag('atelier_visited');
      this.say(narrator(...TEXTS.atelierFirst));
    }
  }

  // =========================================================================
  // loop
  // =========================================================================
  update(time: number, delta: number): void {
    this.animateWater(delta);
    this.updateAmbient(time, delta);
    this.nodeTimer += delta;
    if (this.nodeTimer > 250) { this.nodeTimer = 0; this.updateNodeVisuals(false); }

    if (this.decorMode) { this.updateDecor(time); this.idle(); return; }
    if (this.paused || this.transitioning) { this.idle(); this.actionQueued = false; this.decorToggleQueued = false; this.rotateQueued = false; this.escQueued = false; return; }

    this.updateMovement(delta);
    this.updateTarget();

    if (time > this.inputCooldownUntil) {
      const act = this.actionQueued;
      const dec = this.decorToggleQueued;
      this.actionQueued = false; this.decorToggleQueued = false; this.rotateQueued = false; this.escQueued = false;
      if (act) this.interact();
      if (dec) this.toggleDecor();
    } else {
      this.actionQueued = false; this.decorToggleQueued = false; this.rotateQueued = false; this.escQueued = false;
    }

    if (time - this.lastSavePos > 2000) {
      this.lastSavePos = time;
      game.setPosition(this.mapId, Math.floor(this.player.x / TILE), Math.floor((this.player.y - 4) / TILE));
    }
  }

  private idle(): void {
    this.player.anims.stop();
    this.player.setFrame(`${this.dir}_0`);
  }

  private animateWater(delta: number): void {
    if (this.waterImgs.length === 0) return;
    this.waterTimer += delta;
    if (this.waterTimer < 450) return;
    this.waterTimer = 0;
    this.waterFrame = (this.waterFrame + 1) % 3;
    const key = this.tex(`tile_water${this.waterFrame}`);
    for (const w of this.waterImgs) w.setTexture(key);
    // fonte animada
    for (const it of this.interacts) {
      if (it.obj.kind === 'fountain' && game.flag('praca_restored')) it.sprite.setTexture(this.waterFrame % 2 ? 'fountainFlow1' : 'fountainFlow0');
    }
  }

  private updateMovement(delta: number): void {
    let dx = 0; let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;
    if (dx === 0 && dy === 0) { dx = this.mobile.dx; dy = this.mobile.dy; }
    const len = Math.hypot(dx, dy);
    if (len < 0.15) { this.idle(); return; }
    dx /= len; dy /= len;
    const run = this.keys.SHIFT.isDown || this.mobile.run;
    const speed = (run ? RUN_SPEED : WALK_SPEED) * (delta / 1000);

    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'east' : 'west';
    else this.dir = dy > 0 ? 'south' : 'north';

    this.tryMove(dx * speed, 0);
    this.tryMove(0, dy * speed);

    const anim = `player_${game.data.species}_walk_${this.dir}`;
    if (this.player.anims.currentAnim?.key !== anim || !this.player.anims.isPlaying) this.player.play(anim, true);
    this.player.anims.msPerFrame = run ? 80 : 125;
    this.puffTimer += delta;
    if (this.puffTimer > (run ? 140 : 320)) { this.puffTimer = 0; this.puffAt(this.player.x - dx * 6, this.player.y - 2); }
    this.player.setDepth(this.player.y);
    this.shadow.setPosition(this.player.x, this.player.y - 2);
    this.checkDoors();
  }

  private tryMove(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (this.fits(nx, ny)) { this.player.x = nx; this.player.y = ny; }
    this.shadow.setPosition(this.player.x, this.player.y - 2);
  }

  private fits(x: number, y: number): boolean {
    const hw = 6; const top = 8;
    const pts = [[x - hw, y - top], [x + hw, y - top], [x - hw, y - 1], [x + hw, y - 1]];
    return pts.every(([px, py]) => !this.isBlocked(Math.floor(px / TILE), Math.floor(py / TILE)));
  }

  private feetTile(): { x: number; y: number } {
    return { x: Math.floor(this.player.x / TILE), y: Math.floor((this.player.y - 4) / TILE) };
  }

  private checkDoors(): void {
    if (this.transitioning) return;
    const { x, y } = this.feetTile();
    for (const d of this.doors) {
      const w = d.w ?? 1; const h = d.h ?? 1;
      if (x >= d.x && x < d.x + w && y >= d.y && y < d.y + h) { this.goTo(d); return; }
    }
  }

  private goTo(d: DoorObj): void {
    this.transitioning = true;
    sfx('door');
    this.idle();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ map: d.to, x: d.spawn.x, y: d.spawn.y, dir: d.dir } as WorldStartData);
    });
  }

  // =========================================================================
  // alvo de interação
  // =========================================================================
  private updateTarget(): void {
    const px = this.player.x; const py = this.player.y - 6;
    const [fx, fy] = DIR_VEC[this.dir];
    const ax = px + fx * 12; const ay = py + fy * 12;
    let best: Target | null = null;
    let bestD = 46;
    const consider = (t: Target, cx: number, cy: number) => {
      const d = Math.hypot(cx - ax, cy - ay);
      if (d < bestD) { bestD = d; best = t; }
    };
    for (const it of this.interacts) {
      if (it.removed || !it.sprite.visible) continue;
      if (it.obj.kind === 'window' && it.done) continue;
      const cx = it.sprite.x + it.sprite.displayWidth / 2;
      const cy = it.sprite.y + it.sprite.displayHeight / 2 + (it.obj.kind === 'fountain' ? 24 : 0);
      consider({ kind: 'interact', ref: it }, Phaser.Math.Clamp(ax, it.sprite.x, it.sprite.x + it.sprite.displayWidth), Phaser.Math.Clamp(ay, it.sprite.y, cy + 8));
    }
    for (const n of this.nodes) {
      if (!game.nodeAvailable(n.obj.id)) continue;
      consider({ kind: 'node', ref: n }, n.sprite.x, n.sprite.y - 12);
    }
    for (const n of this.npcs) {
      if (!n.visible) continue;
      consider({ kind: 'npc', ref: n }, n.sprite.x, n.sprite.y - 16);
    }
    if (best !== this.target) {
      this.clearTargetTint();
      this.target = best;
      if (best) this.targetSprite(best).setTint(0xffe6a8);
    }
    const prompt = best ? this.promptFor(best) : '';
    if (prompt !== this.lastPrompt) { this.lastPrompt = prompt; this.ui?.setPrompt(prompt); }
  }

  private targetSprite(t: Target): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite { return t.ref.sprite; }

  private clearTargetTint(): void {
    if (this.target) this.targetSprite(this.target).clearTint();
  }

  private promptFor(t: Target): string {
    if (t.kind === 'node') return `Coletar ${ITEMS[t.ref.obj.material].name}`;
    if (t.kind === 'npc') return `Falar com ${NPC_NAMES[t.ref.obj.id]}`;
    const k = t.ref.obj.kind;
    const done = t.ref.done;
    return {
      box: 'Retirar caixa', web: 'Limpar teia', window: 'Abrir janela', photo: 'Pegar fotografia',
      bench: done ? 'Bancada de marcenaria' : 'Bancada quebrada', sewing: done ? 'Mesa de costura' : 'Mesa de costura quebrada',
      paint: done ? 'Mesa de pintura' : 'Mesa de pintura quebrada', notebook: 'Caderno dos Encantos', fountain: 'Fonte da praça',
      log: 'Empurrar tronco', sign: 'Ler placa', shrine: 'Altar antigo',
    }[k] ?? 'Interagir';
  }

  queueAction(): void { this.actionQueued = true; }
  queueRotate(): void { this.rotateQueued = true; }

  private interact(): void {
    const t = this.target;
    if (!t) return;
    if (t.kind === 'node') return this.harvest(t.ref);
    if (t.kind === 'npc') return this.talk(t.ref);
    const it = t.ref;
    const c = it.obj.counter;
    switch (it.obj.kind) {
      case 'box':
      case 'web':
        sfx('clean');
        this.removeInteract(it);
        if (c) game.inc(c);
        this.sparkleAt(it.sprite.x + 16, it.sprite.y + 16, 4);
        break;
      case 'window':
        if (it.done) break;
        it.done = true;
        it.sprite.setTexture(this.tex('windowOpen'));
        sfx('open');
        game.setFlag('window_open');
        this.lightBurst();
        this.buildAmbient();
        this.say(narrator(...TEXTS.windowOpen));
        break;
      case 'photo':
        sfx('sparkle');
        this.removeInteract(it);
        game.addItem('foto', 1, true);
        game.setFlag('has_foto');
        this.say(narrator(...TEXTS.photoFound), () => this.glowBench());
        break;
      case 'bench':
        if (it.done) { this.ui?.openCrafting('marcenaria'); break; }
        if (game.questActive('q2') && game.count('madeira') >= 5) {
          game.removeItem('madeira', 5);
          this.repair(it, 'bench_repaired');
          this.say(narrator(...TEXTS.benchRepaired));
        } else this.say(narrator(...TEXTS.benchBroken(game.count('madeira'))));
        break;
      case 'sewing':
        if (it.done) { this.ui?.openCrafting('costura'); break; }
        if (!game.flag('talked_pingo_q5')) { this.say(narrator(...TEXTS.sewingBroken)); break; }
        if (game.hasAll({ madeira: 4, pedra: 3, fibra: 2 })) {
          game.removeItem('madeira', 4); game.removeItem('pedra', 3); game.removeItem('fibra', 2);
          this.repair(it, 'sewing_repaired');
          this.say(narrator(...TEXTS.sewingRepaired));
        } else this.say(narrator(...TEXTS.sewingNeeds(game.count('madeira'), game.count('pedra'), game.count('fibra'))));
        break;
      case 'paint':
        if (it.done) { this.ui?.openCrafting('pintura'); break; }
        if (!game.questActive('q6')) { this.say(narrator(...TEXTS.paintBroken)); break; }
        if (game.hasAll({ madeira: 3, pedra: 2, flor_lua: 1 })) {
          game.removeItem('madeira', 3); game.removeItem('pedra', 2); game.removeItem('flor_lua', 1);
          this.repair(it, 'paint_repaired');
          this.say(narrator(...TEXTS.paintRepaired));
        } else this.say(narrator(...TEXTS.paintNeeds(game.count('madeira'), game.count('pedra'), game.count('flor_lua'))));
        break;
      case 'notebook':
        if (!game.flag('notebook_seen')) {
          game.setFlag('notebook_seen');
          sfx('sparkle');
          this.say(narrator(...TEXTS.notebookWake), () => { game.startQuest('q1'); this.ui?.openNotebook(); });
        } else this.ui?.openNotebook();
        break;
      case 'fountain':
        if (game.questActive('q8') && game.count('fragmento') > 0) this.fountainSequence(it);
        else if (game.flag('praca_restored')) this.say(narrator('A água corre limpa. Pequenas luzes dançam na superfície.'));
        else this.say(narrator(...TEXTS.fountainDry));
        break;
      case 'log':
        if (game.flag('talked_lilo_q6')) {
          sfx('clean');
          this.say(narrator(...TEXTS.logMoved), () => { this.removeInteract(it); game.setFlag('forest_path_open'); });
        } else this.say(narrator(...TEXTS.logBlocked));
        break;
      case 'sign':
        this.say(narrator(...(game.flag('praca_restored') ? TEXTS.signOk : TEXTS.signBroken)));
        break;
      case 'shrine':
        this.say(narrator(...TEXTS.shrine));
        break;
    }
  }

  private removeInteract(it: WInteract): void {
    it.removed = true;
    this.blockRects(it.obj.blocks, -1);
    game.setFlag(`removed_${this.mapId}_${it.obj.id}`);
    const sh = it.sprite.getData('shadow') as Phaser.GameObjects.Image | undefined;
    if (sh) this.tweens.add({ targets: sh, alpha: 0, duration: 220 });
    this.tweens.add({ targets: it.sprite, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 220, onComplete: () => it.sprite.setVisible(false) });
    if (this.target?.ref === it) { this.clearTargetTint(); this.target = null; }
  }

  private repair(it: WInteract, flag: string): void {
    it.done = true;
    it.sprite.setTexture(this.tex(it.obj.texDone ?? it.obj.tex ?? ''));
    sfx('craft');
    this.sparkleAt(it.sprite.x + it.sprite.displayWidth / 2, it.sprite.y + 8, 8);
    game.setFlag(flag);
  }

  private harvest(n: WNode): void {
    const [min, max] = n.obj.amount;
    const amount = Phaser.Math.Between(min, max);
    sfx('pickup');
    game.harvestNode(n.obj.id, n.obj.material, amount);
    this.sparkleAt(n.sprite.x, n.sprite.y - 12, 5);
    this.tweens.add({ targets: n.sprite, y: n.sprite.y - 4, duration: 90, yoyo: true });
    this.updateNodeVisuals(true);
    this.clearTargetTint(); this.target = null;
  }

  private updateNodeVisuals(force: boolean): void {
    const now = Date.now();
    for (const n of this.nodes) {
      const ready = game.nodeReadyAt(n.obj.id);
      const available = now >= ready;
      if (available) {
        if (n.sprite.alpha !== 1 || force) { n.sprite.setAlpha(1); n.bar.setVisible(false); n.label.setVisible(false); }
        continue;
      }
      const total = (REGROW_SECONDS[n.obj.material] ?? 60) * 1000;
      const remaining = ready - now;
      const progress = Phaser.Math.Clamp(1 - remaining / total, 0, 1);
      n.sprite.setAlpha(0.35);
      n.bar.setVisible(true).clear();
      const bx = n.sprite.x - 14; const by = n.sprite.y + 2;
      n.bar.fillStyle(0x1d1418, 0.8); n.bar.fillRect(bx - 1, by - 1, 30, 6);
      n.bar.fillStyle(0x5b5760, 1); n.bar.fillRect(bx, by, 28, 4);
      n.bar.fillStyle(0xffc857, 1); n.bar.fillRect(bx, by, Math.round(28 * progress), 4);
      const secs = Math.ceil(remaining / 1000);
      n.label.setVisible(true).setText(`${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`);
    }
  }

  private talk(n: WNpc): void {
    const id = n.obj.id;
    // NPC vira para o jogador
    const dx = this.player.x - n.sprite.x; const dy = this.player.y - n.sprite.y;
    const face: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
    n.sprite.setFrame(`${face}_0`);
    const { lines, flags } = getDialogue(id, game);
    this.say(lines, () => {
      flags.forEach((f) => game.setFlag(f));
      const q = game.turnInTo(id);
      if (q?.id === 'q7') {
        // restauração da loja acontece pela flag loja_restored (onFlag)
      }
      this.time.delayedCall(600, () => n.sprite.setFrame(`${n.obj.dir}_0`));
    });
  }

  say(lines: DialogueLine[], onDone?: () => void): void {
    const ui = this.ui;
    if (!ui) { onDone?.(); return; }
    ui.showDialogue(lines, onDone);
  }

  // =========================================================================
  // efeitos e transformações
  // =========================================================================
  sparkleAt(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x + Phaser.Math.Between(-14, 14), y + Phaser.Math.Between(-10, 10), i % 2 ? 'sparkle0' : 'sparkle1').setDepth(6000);
      this.tweens.add({ targets: s, y: s.y - Phaser.Math.Between(10, 24), alpha: 0, duration: Phaser.Math.Between(400, 800), delay: i * 40, onComplete: () => s.destroy() });
    }
  }

  private lightBurst(): void {
    const g = this.add.graphics().setDepth(7000).setScrollFactor(0);
    const cam = this.cameras.main;
    g.fillStyle(0xfff2c8, 0.55);
    g.fillRect(0, 0, cam.width / cam.zoom + 1000, cam.height / cam.zoom + 1000);
    this.tweens.add({ targets: g, alpha: 0, duration: 900, onComplete: () => g.destroy() });
  }

  private glowBench(): void {
    const bench = this.interacts.find((i) => i.obj.kind === 'bench');
    if (!bench) return;
    this.sparkleAt(bench.sprite.x + 32, bench.sprite.y + 8, 10);
    this.tweens.add({ targets: bench.sprite, alpha: 0.6, duration: 500, yoyo: true, repeat: 3 });
  }

  private onFlag(name: string): void {
    if (this.def.restoredFlag === name && !this.vibrant && !this.restoring) {
      this.playRestoreAnimation(this.player.x, this.player.y);
    }
    this.refreshConditionalObjects(true);
  }

  /** Mostra/esconde props e NPCs condicionais de acordo com as flags atuais. */
  private refreshConditionalObjects(animate: boolean): void {
    for (const p of this.props) {
      const vis = this.condVisible(p.obj.showWhen, p.obj.hideWhen);
      if (vis === p.visible) continue;
      p.visible = vis;
      this.blockRects(p.obj.blocks, vis ? 1 : -1);
      (p.sprite.getData('shadow') as Phaser.GameObjects.Image | undefined)?.setVisible(vis);
      if (vis) {
        p.sprite.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: p.sprite, alpha: 1, duration: animate ? 500 : 0 });
        if (animate) this.sparkleAt(p.sprite.x + p.sprite.displayWidth / 2, p.sprite.y + p.sprite.displayHeight / 2, 3);
      } else {
        this.tweens.add({ targets: p.sprite, alpha: 0, duration: animate ? 400 : 0, onComplete: () => p.sprite.setVisible(false) });
      }
    }
    for (const n of this.npcs) {
      const vis = this.condVisible(n.obj.showWhen, n.obj.hideWhen);
      if (vis === n.visible) continue;
      n.visible = vis;
      this.blockRects([{ x: n.obj.x, y: n.obj.y, w: 1, h: 1 }], vis ? 1 : -1);
      n.sprite.setVisible(vis);
      (n.sprite.getData('shadow') as Phaser.GameObjects.Image | undefined)?.setVisible(vis);
      if (vis && animate) { n.sprite.setAlpha(0); this.tweens.add({ targets: n.sprite, alpha: 1, duration: 500 }); this.sparkleAt(n.sprite.x, n.sprite.y - 20, 5); }
    }
    for (const it of this.interacts) {
      if (it.removed && !it.sprite.visible && !game.flag(`removed_${this.mapId}_${it.obj.id}`)) {
        const vis = this.condVisible(it.obj.showWhen, it.obj.hideWhen);
        if (vis) { it.removed = false; it.sprite.setVisible(true).setAlpha(1); (it.sprite.getData('shadow') as Phaser.GameObjects.Image | undefined)?.setVisible(true); this.blockRects(it.obj.blocks, 1); if (animate) this.sparkleAt(it.sprite.x + 8, it.sprite.y + 8, 4); }
      } else if (!it.removed && it.obj.hideWhen && game.flag(it.obj.hideWhen)) {
        it.removed = true; it.sprite.setVisible(false); (it.sprite.getData('shadow') as Phaser.GameObjects.Image | undefined)?.setVisible(false); this.blockRects(it.obj.blocks, -1);
      }
      if (it.obj.kind === 'sign' && game.flag('praca_restored') && !it.done) { it.done = true; it.sprite.setTexture('signOk'); }
    }
  }

  /** Troca as texturas desbotadas pelas vibrantes em ondas a partir de um ponto. */
  playRestoreAnimation(cx: number, cy: number, onDone?: () => void): void {
    if (this.vibrant) { onDone?.(); return; }
    this.restoring = true;
    this.vibrant = true;
    sfx('restore');
    this.restoreRing(cx, cy);
    const swap = (img: Phaser.GameObjects.Image, base: string, x: number, y: number, extraSparkle: boolean) => {
      const d = Math.hypot(x - cx, y - cy);
      this.time.delayedCall(d * 3 + Phaser.Math.Between(0, 80), () => {
        if (!img.active) return;
        if (this.textures.exists(base)) img.setTexture(base);
        if (extraSparkle && Math.random() < 0.25) this.sparkleAt(x, y, 1);
        // pulso de luz no objeto restaurado
        img.setTint(0xfff2c8);
        this.time.delayedCall(140, () => { if (img.active && this.target?.ref.sprite !== img) img.clearTint(); });
      });
    };
    for (const t of this.tileImgs) swap(t, t.getData('base'), t.x + 16, t.y + 16, false);
    for (const t of this.treeImgs) swap(t, t.getData('base'), t.x, t.y - 20, true);
    for (const p of this.props) {
      const base = p.obj.texRestored ?? p.obj.tex;
      swap(p.sprite, base, p.sprite.x + p.sprite.displayWidth / 2, p.sprite.y + p.sprite.displayHeight / 2, true);
    }
    for (const it of this.interacts) {
      const base = it.done && it.obj.texDone ? it.obj.texDone : (it.obj.kind === 'fountain' && game.flag('praca_restored') ? 'fountainFlow0' : it.obj.tex ?? 'crate');
      swap(it.sprite, base, it.sprite.x + 16, it.sprite.y + 16, true);
    }
    for (const n of this.nodes) swap(n.sprite, n.sprite.getData('base'), n.sprite.x, n.sprite.y - 16, false);
    const maxD = Math.hypot(this.cols * TILE, this.rows * TILE);
    this.time.delayedCall(maxD * 3 + 300, () => {
      this.restoring = false;
      if (this.def.musicRestored) music.play(this.def.musicRestored);
      this.buildAmbient();
      onDone?.();
    });
  }

  /** Anel de luz que se expande a partir do ponto de restauração (acompanha a onda de troca de texturas). */
  private restoreRing(cx: number, cy: number): void {
    const maxD = Math.hypot(this.cols * TILE, this.rows * TILE);
    const g = this.add.graphics().setDepth(5500);
    const state = { r: 8 };
    this.tweens.add({
      targets: state, r: maxD, duration: maxD * 3, ease: 'Linear',
      onUpdate: () => {
        g.clear();
        const a = Phaser.Math.Clamp(1 - state.r / maxD, 0, 1);
        g.lineStyle(6, 0xfff2c8, 0.35 * a); g.strokeCircle(cx, cy, state.r);
        g.lineStyle(2, 0xffffff, 0.8 * a); g.strokeCircle(cx, cy, state.r);
        g.lineStyle(3, 0xffc857, 0.5 * a); g.strokeCircle(cx, cy, Math.max(0, state.r - 10));
      },
      onComplete: () => g.destroy(),
    });
    // flash suave na tela
    const flash = this.add.graphics().setDepth(7000).setScrollFactor(0);
    flash.fillStyle(0xfff2c8, 0.35);
    flash.fillRect(-2000, -2000, 6000, 6000);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });
  }

  // =========================================================================
  // efeitos ambientais (folhas, pétalas, vaga-lumes, poeira, luz da janela)
  // =========================================================================
  private buildAmbient(): void {
    for (const a of this.ambient) a.img.destroy();
    this.ambient = [];
    this.beam?.destroy(); this.beam = null;
    const mapW = this.cols * TILE; const mapH = this.rows * TILE;
    const spawn = (kind: 'leaf' | 'petal' | 'firefly' | 'mote', n: number, area: { x: number; y: number; w: number; h: number }) => {
      for (let i = 0; i < n; i++) {
        const tex = kind === 'leaf' ? `fx_leaf${i % 3}` : kind === 'petal' ? `fx_petal${i % 3}` : kind === 'firefly' ? 'fx_firefly' : 'fx_mote';
        const img = this.add.image(area.x + Math.random() * area.w, area.y + Math.random() * area.h, tex).setDepth(kind === 'mote' ? 3 : 4500).setAlpha(kind === 'firefly' ? 0.9 : 0.85);
        img.setData('area', area);
        const vx = kind === 'firefly' ? 0 : kind === 'mote' ? 2 : 10 + Math.random() * 10;
        const vy = kind === 'leaf' ? 14 + Math.random() * 10 : kind === 'petal' ? 10 + Math.random() * 8 : kind === 'mote' ? 3 : 0;
        this.ambient.push({ img, vx, vy, phase: Math.random() * Math.PI * 2, kind });
      }
    };
    const all = { x: 0, y: 0, w: mapW, h: mapH };
    if (this.mapId === 'praca') spawn(this.vibrant ? 'petal' : 'leaf', 14, all);
    if (this.mapId === 'floresta') { spawn('firefly', 12, all); spawn('leaf', 6, all); }
    if (this.mapId === 'atelier' && game.flag('window_open')) {
      // feixe de luz da janela (tile 7,1) caindo no chão
      this.beam = this.add.image(7 * TILE + 4, 1 * TILE + 26, 'fx_beam').setOrigin(0.25, 0).setDepth(3).setAlpha(this.vibrant ? 0.75 : 0.55);
      this.beam.setBlendMode(Phaser.BlendModes.ADD);
      spawn('mote', 10, { x: 7 * TILE - 10, y: 2 * TILE, w: 90, h: 110 });
    }
  }

  private updateAmbient(time: number, delta: number): void {
    if (this.ambient.length === 0 && !this.beam) return;
    const dt = delta / 1000;
    const t = time / 1000;
    for (const a of this.ambient) {
      const area = a.img.getData('area') as { x: number; y: number; w: number; h: number };
      if (a.kind === 'firefly') {
        a.img.x += Math.cos(t * 0.7 + a.phase) * 12 * dt;
        a.img.y += Math.sin(t * 1.1 + a.phase * 1.3) * 10 * dt;
        a.img.setAlpha(0.35 + 0.65 * Math.abs(Math.sin(t * 2 + a.phase)));
      } else if (a.kind === 'mote') {
        a.img.x += Math.sin(t * 0.8 + a.phase) * 4 * dt;
        a.img.y += a.vy * dt;
        a.img.setAlpha(0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + a.phase)));
      } else {
        a.img.x += (a.vx * 0.5 + Math.sin(t * 2 + a.phase) * a.vx) * dt;
        a.img.y += a.vy * dt;
        a.img.setAngle(Math.sin(t * 3 + a.phase) * 35);
      }
      if (a.img.y > area.y + area.h + 8) { a.img.y = area.y - 8; a.img.x = area.x + Math.random() * area.w; }
      if (a.img.x > area.x + area.w + 8) a.img.x = area.x - 8;
      if (a.img.x < area.x - 8) a.img.x = area.x + area.w + 8;
      if (a.img.y < area.y - 8) a.img.y = area.y + area.h;
    }
    if (this.beam) this.beam.setAlpha((this.vibrant ? 0.7 : 0.5) + 0.08 * Math.sin(t * 1.3));
    // brilhos na fonte restaurada
    if (this.mapId === 'praca' && this.vibrant) {
      this.fountainSparkleTimer += delta;
      if (this.fountainSparkleTimer > 900) {
        this.fountainSparkleTimer = 0;
        const f = this.interacts.find((i) => i.obj.kind === 'fountain');
        if (f) this.sparkleAt(f.sprite.x + 48 + Phaser.Math.Between(-30, 30), f.sprite.y + 60 + Phaser.Math.Between(-10, 10), 1);
      }
    }
  }

  /** Nuvenzinha de poeira nos pés ao andar/correr. */
  private puffAt(x: number, y: number): void {
    if (this.def.indoor && this.mapId !== 'atelier') return;
    const p = this.add.image(x + Phaser.Math.Between(-3, 3), y, 'fx_puff').setDepth(this.player.y - 1).setAlpha(0.7).setScale(0.6);
    this.tweens.add({ targets: p, alpha: 0, scale: 1.2, y: y - 6, duration: 380, onComplete: () => p.destroy() });
  }

  /** Sequência final: fragmento levado à fonte (README §15). */
  private fountainSequence(fountain: WInteract): void {
    this.setPaused(true);
    this.clearTargetTint(); this.target = null;
    this.ui?.setPrompt('');
    const fx = fountain.sprite.x + 48; const fy = fountain.sprite.y + 20;
    const frag = this.add.image(this.player.x, this.player.y - 40, 'fragmentBig').setDepth(6500);
    sfx('sparkle');
    this.tweens.add({ targets: frag, x: fx, y: fy, duration: 1400, ease: 'Sine.easeInOut', onComplete: () => {
      this.sparkleAt(fx, fy, 12);
      this.cameras.main.flash(700, 255, 240, 200);
      this.tweens.add({ targets: frag, alpha: 0, scale: 2, duration: 500, onComplete: () => frag.destroy() });
      game.setFlag('fountain_restored'); // conclui a missão 8 → flags praca_restored/free_decor, carta
      fountain.sprite.setTexture('fountainFlow0');
      this.time.delayedCall(400, () => {
        this.playRestoreAnimation(fx, fy, () => {
          this.refreshConditionalObjects(true);
          this.time.delayedCall(700, () => {
            this.setPaused(false);
            const lilo = this.npcs.find((n) => n.obj.id === 'lilo' && n.visible);
            const { lines } = getDialogue('lilo', game);
            this.say(lines, () => {
              this.say(narrator('Você recebe uma carta misteriosa, entregue por ninguém, deixada na borda da fonte.', ...TEXTS.freeDecor), () => {
                this.cameras.main.fadeOut(900, 255, 255, 255);
                this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop('UIScene'); this.scene.start('EndingScene'); });
              });
            });
            if (lilo) lilo.sprite.setFrame('south_0');
          });
        });
      });
    } });
  }

  // =========================================================================
  // decoração
  // =========================================================================
  isDecoratable(): boolean {
    if (!this.def.decoratable) return false;
    if (this.mapId === 'atelier') return game.flag('bench_repaired');
    if (this.mapId === 'loja') return game.flag('talked_amora_q5');
    return false;
  }

  toggleDecor(): void {
    if (this.decorMode) this.exitDecor();
    else this.enterDecor(null);
  }

  enterDecor(item: string | null): void {
    if (!this.isDecoratable()) { this.ui?.toast('Este lugar não pode ser decorado (ainda).'); return; }
    this.decorMode = true;
    this.decorItem = item;
    this.decorRot = 0;
    const f = this.feetTile();
    const [dx, dy] = DIR_VEC[this.dir];
    this.decorTile = { x: f.x + dx, y: f.y + dy };
    this.decorCursor.setVisible(true);
    this.idle();
    this.refreshGhost();
    this.setDecorTile(this.decorTile.x, this.decorTile.y);
    sfx('open');
    this.ui?.onDecorChanged();
  }

  exitDecor(): void {
    if (!this.decorMode) return;
    this.decorMode = false;
    this.decorItem = null;
    this.decorCursor.setVisible(false);
    this.decorGhost?.destroy();
    this.decorGhost = null;
    sfx('close');
    this.ui?.onDecorChanged();
  }

  setDecorItem(item: string | null): void {
    this.decorItem = item;
    this.decorRot = 0;
    this.refreshGhost();
    this.setDecorTile(this.decorTile.x, this.decorTile.y);
    this.ui?.onDecorChanged();
  }

  private refreshGhost(): void {
    this.decorGhost?.destroy();
    this.decorGhost = null;
    if (!this.decorItem) return;
    const item = ITEMS[this.decorItem];
    void item;
    this.decorGhost = this.add.image(0, 0, this.furnTexture(this.decorItem, this.decorRot)).setAlpha(0.65).setDepth(5001);
  }

  private setDecorTile(tx: number, ty: number): void {
    tx = Phaser.Math.Clamp(tx, 0, this.cols - 1);
    ty = Phaser.Math.Clamp(ty, 0, this.rows - 1);
    this.decorTile = { x: tx, y: ty };
    const ok = this.decorItem ? this.canPlaceAt(tx, ty, this.decorItem) : !!this.placedAt(tx, ty);
    this.decorCursor.setPosition(tx * TILE, ty * TILE).setTexture(ok ? 'cursorTile' : 'cursorTileBad');
    if (this.decorGhost) this.decorGhost.setPosition(tx * TILE + 16, ty * TILE + 16).setAlpha(ok ? 0.7 : 0.35);
  }

  private placedAt(tx: number, ty: number): WPlaced | undefined {
    return this.placed.find((p) => p.data.x === tx && p.data.y === ty);
  }

  canPlaceAt(tx: number, ty: number, item: string): boolean {
    const ch = this.charAt(tx, ty);
    if (!this.def.floorChars.includes(ch)) return false;
    if (this.placedAt(tx, ty)) return false;
    if (this.isBlocked(tx, ty)) return false;
    const f = this.feetTile();
    if (f.x === tx && f.y === ty && !ITEMS[item].walkable) return false;
    if (ITEMS[item].wall && this.charAt(tx, ty - 1) !== '#') return false;
    return true;
  }

  private updateDecor(time: number): void {
    if (this.paused) { this.actionQueued = false; this.rotateQueued = false; this.decorToggleQueued = false; this.escQueued = false; return; }
    // mover cursor pelo teclado / joystick (com repetição)
    let dx = 0; let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.keys.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;
    if (dx === 0 && dy === 0) {
      if (Math.abs(this.mobile.dx) > 0.5) dx = Math.sign(this.mobile.dx);
      else if (Math.abs(this.mobile.dy) > 0.5) dy = Math.sign(this.mobile.dy);
    }
    if ((dx !== 0 || dy !== 0) && time > this.decorMoveAt) {
      this.decorMoveAt = time + 170;
      this.setDecorTile(this.decorTile.x + dx, this.decorTile.y + dy);
    }
    if (dx === 0 && dy === 0) this.decorMoveAt = 0;

    if (time > this.inputCooldownUntil) {
      if (this.actionQueued) this.decorConfirm();
      if (this.rotateQueued) this.decorRotate();
      if (this.decorToggleQueued || this.escQueued) this.exitDecor();
    }
    this.actionQueued = false; this.rotateQueued = false; this.decorToggleQueued = false; this.escQueued = false;
  }

  decorConfirm(): void {
    const { x, y } = this.decorTile;
    const existing = this.placedAt(x, y);
    if (this.decorItem) {
      if (!this.canPlaceAt(x, y, this.decorItem)) { sfx('error'); return; }
      const p = game.place(this.mapId, this.decorItem, x, y, this.decorRot);
      if (!p) { sfx('error'); return; }
      this.addPlacedSprite(p);
      sfx('place');
      this.sparkleAt(x * TILE + 16, y * TILE + 16, 3);
      if (game.count(this.decorItem) <= 0) this.setDecorItem(null);
      else this.setDecorTile(x, y);
      this.ui?.onDecorChanged();
    } else if (existing) {
      // pegar item do chão e passar a segurá-lo
      const item = existing.data.item;
      if (!ITEMS[item].walkable) this.blockRects([{ x, y, w: 1, h: 1 }], -1);
      game.pickUp(this.mapId, existing.data.uid);
      existing.sprite.destroy();
      this.placed = this.placed.filter((p) => p !== existing);
      sfx('pickup');
      this.setDecorItem(item);
    } else {
      sfx('error');
    }
  }

  decorRotate(): void {
    if (this.decorItem) {
      this.decorRot = (this.decorRot + 1) % 4;
      this.decorGhost?.setTexture(this.furnTexture(this.decorItem, this.decorRot));
      sfx('select');
      return;
    }
    const existing = this.placedAt(this.decorTile.x, this.decorTile.y);
    if (existing) {
      game.rotatePlaced(this.mapId, existing.data.uid);
      existing.sprite.setTexture(this.furnTexture(existing.data.item, existing.data.rot));
      sfx('select');
    }
  }

  get decorInfo(): { item: string | null; rot: number } { return { item: this.decorItem, rot: this.decorRot }; }
}
