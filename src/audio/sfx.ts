import { music } from './music';

export type SfxId = 'pickup' | 'craft' | 'place' | 'talk' | 'quest' | 'sparkle' | 'door' | 'error' | 'clean' | 'open' | 'close' | 'select' | 'restore' | 'step';

interface Note { f: number; t: number; d: number; type?: OscillatorType; g?: number }

const PATTERNS: Record<SfxId, Note[]> = {
  pickup: [{ f: 660, t: 0, d: 0.06 }, { f: 880, t: 0.06, d: 0.08 }],
  craft: [{ f: 523, t: 0, d: 0.07 }, { f: 659, t: 0.07, d: 0.07 }, { f: 784, t: 0.14, d: 0.07 }, { f: 1047, t: 0.21, d: 0.14 }],
  place: [{ f: 392, t: 0, d: 0.05, type: 'triangle' }, { f: 494, t: 0.05, d: 0.08, type: 'triangle' }],
  talk: [{ f: 740, t: 0, d: 0.03, type: 'square', g: 0.05 }],
  quest: [{ f: 659, t: 0, d: 0.1 }, { f: 784, t: 0.1, d: 0.1 }, { f: 988, t: 0.2, d: 0.1 }, { f: 1319, t: 0.3, d: 0.3 }],
  sparkle: [{ f: 1568, t: 0, d: 0.05, type: 'sine' }, { f: 2093, t: 0.05, d: 0.05, type: 'sine' }, { f: 2637, t: 0.1, d: 0.1, type: 'sine' }],
  door: [{ f: 300, t: 0, d: 0.06, type: 'triangle' }, { f: 240, t: 0.06, d: 0.1, type: 'triangle' }],
  error: [{ f: 220, t: 0, d: 0.08, type: 'square', g: 0.06 }, { f: 180, t: 0.08, d: 0.12, type: 'square', g: 0.06 }],
  clean: [{ f: 420, t: 0, d: 0.04, type: 'triangle' }, { f: 520, t: 0.04, d: 0.04, type: 'triangle' }, { f: 640, t: 0.08, d: 0.06, type: 'triangle' }],
  open: [{ f: 520, t: 0, d: 0.05, type: 'triangle' }, { f: 700, t: 0.05, d: 0.06, type: 'triangle' }],
  close: [{ f: 700, t: 0, d: 0.05, type: 'triangle' }, { f: 520, t: 0.05, d: 0.06, type: 'triangle' }],
  select: [{ f: 880, t: 0, d: 0.04, type: 'square', g: 0.05 }],
  restore: [{ f: 523, t: 0, d: 0.15 }, { f: 659, t: 0.15, d: 0.15 }, { f: 784, t: 0.3, d: 0.15 }, { f: 1047, t: 0.45, d: 0.2 }, { f: 1319, t: 0.65, d: 0.5, type: 'sine' }],
  step: [{ f: 160, t: 0, d: 0.03, type: 'triangle', g: 0.03 }],
};

export function sfx(id: SfxId): void {
  const ctx = music.ensureContext();
  const out = music.output;
  if (!ctx || !out) return;
  const now = ctx.currentTime;
  for (const n of PATTERNS[id]) {
    const osc = ctx.createOscillator();
    osc.type = n.type ?? 'square';
    osc.frequency.value = n.f;
    const g = ctx.createGain();
    const gain = n.g ?? 0.09;
    g.gain.setValueAtTime(0, now + n.t);
    g.gain.linearRampToValueAtTime(gain, now + n.t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
    osc.connect(g);
    g.connect(out);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  }
}
