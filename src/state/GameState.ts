import Phaser from 'phaser';
import { SAVE_KEY, REGROW_SECONDS, type Species } from '../config';
import { ITEMS, type ItemAttrs } from '../data/items';
import { RECIPES, RECIPE_UNLOCKS } from '../data/recipes';
import type { MapId } from '../data/maps';
import { QUESTS, QUEST_ORDER, type QuestDef } from '../data/quests';

export interface PlacedItem {
  uid: string;
  item: string;
  x: number;
  y: number;
  rot: number; // 0..3 (quartos de volta)
}

export interface SaveData {
  version: number;
  species: Species;
  introSeen: boolean;
  inventory: Record<string, number>;
  flags: string[];
  counters: Record<string, number>;
  recipes: string[];
  activeQuests: string[];
  doneQuests: string[];
  placed: Record<string, PlacedItem[]>;
  /** id do nó → timestamp (ms) em que volta a ficar disponível. */
  nodes: Record<string, number>;
  map: MapId;
  x: number;
  y: number;
  /** Posição exata em pixels (opcional; `x`/`y` em tiles são o fallback). */
  px?: number;
  py?: number;
  memories: string[];
  encantos: string[];
  materialsSeen: string[];
  playTimeMs: number;
  savedAt: number;
}

function defaultSave(species: Species): SaveData {
  return {
    version: 1,
    species,
    introSeen: false,
    inventory: {},
    flags: [],
    counters: {},
    recipes: [],
    activeQuests: [],
    doneQuests: [],
    placed: {},
    nodes: {},
    map: 'atelier',
    x: 6,
    y: 8,
    memories: [],
    encantos: [],
    materialsSeen: [],
    playTimeMs: 0,
    savedAt: Date.now(),
  };
}

/**
 * Estado global do jogo. Emite eventos para a UI:
 *  - 'changed'         qualquer alteração
 *  - 'toast'           (texto, ícone?)
 *  - 'quest-started'   (QuestDef)
 *  - 'quest-completed' (QuestDef)
 *  - 'recipes-unlocked'(ids[])
 *  - 'flag'            (nome)
 */
class GameState extends Phaser.Events.EventEmitter {
  data: SaveData = defaultSave('coelho');
  private saveTimer: number | null = null;

  // ------------------------------------------------------------- persistência
  hasSave(): boolean {
    try { return localStorage.getItem(SAVE_KEY) !== null; } catch { return false; }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as SaveData;
      this.data = { ...defaultSave(parsed.species), ...parsed };
      return true;
    } catch {
      return false;
    }
  }

  newGame(species: Species): void {
    this.data = defaultSave(species);
    this.save();
  }

  save(): void {
    this.data.savedAt = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch { /* armazenamento indisponível */ }
  }

  /** Agenda um save (evita gravar dezenas de vezes por segundo). */
  scheduleSave(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = window.setTimeout(() => { this.saveTimer = null; this.save(); }, 400);
  }

  deleteSave(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }

  private touch(): void {
    this.emit('changed');
    this.scheduleSave();
  }

  // ------------------------------------------------------------- inventário
  count(item: string): number { return this.data.inventory[item] ?? 0; }

  addItem(item: string, n = 1, silent = false): void {
    this.data.inventory[item] = this.count(item) + n;
    if (ITEMS[item]?.kind === 'material' && !this.data.materialsSeen.includes(item)) this.data.materialsSeen.push(item);
    if (!silent) this.emit('toast', `+${n} ${ITEMS[item]?.name ?? item}`, ITEMS[item]?.icon);
    this.touch();
    this.checkQuests();
  }

  removeItem(item: string, n = 1): boolean {
    if (this.count(item) < n) return false;
    this.data.inventory[item] = this.count(item) - n;
    if (this.data.inventory[item] <= 0) delete this.data.inventory[item];
    this.touch();
    return true;
  }

  hasAll(ingredients: Record<string, number>): boolean {
    return Object.entries(ingredients).every(([id, n]) => this.count(id) >= n);
  }

  // ------------------------------------------------------------- flags e contadores
  flag(name: string): boolean { return this.data.flags.includes(name); }

  setFlag(name: string): void {
    if (this.flag(name)) return;
    this.data.flags.push(name);
    this.emit('flag', name);
    this.touch();
    this.checkQuests();
  }

  counter(name: string): number { return this.data.counters[name] ?? 0; }

  inc(name: string, n = 1): void {
    this.data.counters[name] = this.counter(name) + n;
    this.touch();
    this.checkQuests();
  }

  // ------------------------------------------------------------- receitas
  recipeKnown(id: string): boolean { return this.data.recipes.includes(id); }

  unlockRecipes(group: string): void {
    const ids = RECIPE_UNLOCKS[group] ?? [];
    const fresh = ids.filter((id) => !this.recipeKnown(id));
    if (fresh.length === 0) return;
    this.data.recipes.push(...fresh);
    this.emit('recipes-unlocked', fresh);
    this.touch();
  }

  canCraft(recipeId: string): boolean {
    const r = RECIPES[recipeId];
    return !!r && this.recipeKnown(recipeId) && this.hasAll(r.ingredients);
  }

  craft(recipeId: string): boolean {
    const r = RECIPES[recipeId];
    if (!r || !this.canCraft(recipeId)) return false;
    for (const [id, n] of Object.entries(r.ingredients)) this.removeItem(id, n);
    this.addItem(r.result, r.count);
    this.inc(`crafted_${r.result}`, r.count);
    return true;
  }

  // ------------------------------------------------------------- nós de coleta
  nodeReadyAt(id: string): number { return this.data.nodes[id] ?? 0; }
  nodeAvailable(id: string): boolean { return Date.now() >= this.nodeReadyAt(id); }

  harvestNode(id: string, material: string, amount: number): void {
    const secs = REGROW_SECONDS[material] ?? 60;
    this.data.nodes[id] = Date.now() + secs * 1000;
    this.addItem(material, amount);
  }

  // ------------------------------------------------------------- decoração
  placedIn(map: MapId): PlacedItem[] { return this.data.placed[map] ?? []; }

  place(map: MapId, item: string, x: number, y: number, rot: number): PlacedItem | null {
    if (!this.removeItem(item, 1)) return null;
    const p: PlacedItem = { uid: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, item, x, y, rot };
    if (!this.data.placed[map]) this.data.placed[map] = [];
    this.data.placed[map].push(p);
    this.inc(`placed_${item}`);
    this.touch();
    this.checkQuests();
    return p;
  }

  pickUp(map: MapId, uid: string): boolean {
    const list = this.placedIn(map);
    const idx = list.findIndex((p) => p.uid === uid);
    if (idx < 0) return false;
    const [p] = list.splice(idx, 1);
    this.addItem(p.item, 1, true);
    this.touch();
    this.checkQuests();
    return true;
  }

  rotatePlaced(map: MapId, uid: string): void {
    const p = this.placedIn(map).find((q) => q.uid === uid);
    if (!p) return;
    p.rot = (p.rot + 1) % 4;
    this.touch();
  }

  placedCount(map: MapId, item: string): number {
    return this.placedIn(map).filter((p) => p.item === item).length;
  }

  attrsIn(map: MapId): Required<ItemAttrs> {
    const total = { aconchego: 0, iluminacao: 0, natural: 0 };
    for (const p of this.placedIn(map)) {
      const a = ITEMS[p.item]?.attrs ?? {};
      total.aconchego += a.aconchego ?? 0;
      total.iluminacao += a.iluminacao ?? 0;
      total.natural += a.natural ?? 0;
    }
    return total;
  }

  // ------------------------------------------------------------- missões
  get activeQuests(): QuestDef[] { return this.data.activeQuests.map((id) => QUESTS[id]).filter(Boolean); }
  get currentQuest(): QuestDef | null { return this.activeQuests[0] ?? null; }
  questDone(id: string): boolean { return this.data.doneQuests.includes(id); }
  questActive(id: string): boolean { return this.data.activeQuests.includes(id); }

  startQuest(id: string): void {
    if (this.questActive(id) || this.questDone(id)) return;
    const q = QUESTS[id];
    if (!q) return;
    this.data.activeQuests.push(id);
    q.onStart?.(this);
    this.emit('quest-started', q);
    this.touch();
    this.checkQuests();
  }

  /** Todos os objetivos concluídos (ainda pode exigir entrega a um NPC). */
  questObjectivesDone(id: string): boolean {
    const q = QUESTS[id];
    return !!q && q.objectives.every((o) => o.check(this).done);
  }

  /** Verifica missões ativas e conclui as que não exigem entrega. */
  checkQuests(): void {
    for (const id of [...this.data.activeQuests]) {
      const q = QUESTS[id];
      if (!q || q.turnIn) continue;
      if (this.questObjectivesDone(id)) this.completeQuest(id);
    }
  }

  /** Tenta entregar a missão a um NPC. Retorna a missão concluída, se houver. */
  turnInTo(npc: string): QuestDef | null {
    for (const id of [...this.data.activeQuests]) {
      const q = QUESTS[id];
      if (q?.turnIn === npc && this.questObjectivesDone(id)) { this.completeQuest(id); return q; }
    }
    return null;
  }

  completeQuest(id: string): void {
    const q = QUESTS[id];
    if (!q || this.questDone(id)) return;
    this.data.activeQuests = this.data.activeQuests.filter((a) => a !== id);
    this.data.doneQuests.push(id);
    if (q.memory && !this.data.memories.includes(q.memory)) this.data.memories.push(q.memory);
    q.onComplete?.(this);
    this.emit('quest-completed', q);
    this.touch();
    const idx = QUEST_ORDER.indexOf(id);
    const next = QUEST_ORDER[idx + 1];
    if (next) this.startQuest(next);
  }

  addEncanto(name: string): void {
    if (!this.data.encantos.includes(name)) this.data.encantos.push(name);
    this.touch();
  }

  // ------------------------------------------------------------- posição
  setPosition(map: MapId, x: number, y: number, px?: number, py?: number): void {
    this.data.map = map;
    this.data.x = x;
    this.data.y = y;
    this.data.px = px;
    this.data.py = py;
    this.scheduleSave();
  }
}

export const game = new GameState();
export type { GameState };
