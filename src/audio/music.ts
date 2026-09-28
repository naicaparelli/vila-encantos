import { rng } from '../art/pix';

/**
 * Música procedural "16 bits": osciladores simples (quadrada/triângulo) com
 * progressões de acordes, melodia determinística por seed e um pequeno eco.
 * Cada mapa tem sua própria faixa (README §19).
 */

export type TrackId = 'title' | 'office' | 'atelier' | 'praca' | 'praca_restored' | 'floresta' | 'loja' | 'loja_restored' | 'ending';

interface TrackDef {
  bpm: number;
  root: number; // nota MIDI
  scale: number[]; // graus em semitons
  chords: number[][]; // progressão: índices de graus da escala (tríades)
  seed: number;
  lead: OscillatorType;
  leadDensity: number; // 0..1 probabilidade de nota por colcheia
  arp: boolean;
  shaker: boolean;
  padGain: number;
  leadGain: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PENTA = [0, 2, 4, 7, 9];

const TRACKS: Record<TrackId, TrackDef> = {
  title: { bpm: 80, root: 60, scale: MAJOR, chords: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], seed: 11, lead: 'triangle', leadDensity: 0.55, arp: true, shaker: false, padGain: 0.05, leadGain: 0.12 },
  office: { bpm: 66, root: 57, scale: MINOR, chords: [[0, 2, 4], [0, 2, 4], [5, 0, 2], [3, 5, 0]], seed: 3, lead: 'sine', leadDensity: 0.3, arp: false, shaker: false, padGain: 0.06, leadGain: 0.09 },
  atelier: { bpm: 84, root: 62, scale: MAJOR, chords: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], seed: 21, lead: 'triangle', leadDensity: 0.5, arp: false, shaker: true, padGain: 0.05, leadGain: 0.12 },
  praca: { bpm: 74, root: 60, scale: DORIAN, chords: [[0, 2, 4], [3, 5, 0], [0, 2, 4], [6, 1, 3]], seed: 33, lead: 'triangle', leadDensity: 0.4, arp: false, shaker: false, padGain: 0.05, leadGain: 0.1 },
  praca_restored: { bpm: 96, root: 60, scale: MAJOR, chords: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]], seed: 34, lead: 'square', leadDensity: 0.6, arp: true, shaker: true, padGain: 0.045, leadGain: 0.08 },
  floresta: { bpm: 88, root: 64, scale: PENTA, chords: [[0, 2, 4], [3, 0, 2], [1, 3, 0], [4, 1, 3]], seed: 47, lead: 'triangle', leadDensity: 0.5, arp: true, shaker: true, padGain: 0.04, leadGain: 0.11 },
  loja: { bpm: 90, root: 65, scale: LYDIAN, chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [4, 6, 1]], seed: 58, lead: 'triangle', leadDensity: 0.45, arp: false, shaker: false, padGain: 0.05, leadGain: 0.1 },
  loja_restored: { bpm: 104, root: 65, scale: MAJOR, chords: [[0, 2, 4], [3, 5, 0], [1, 3, 5], [4, 6, 1]], seed: 59, lead: 'square', leadDensity: 0.6, arp: true, shaker: true, padGain: 0.045, leadGain: 0.08 },
  ending: { bpm: 92, root: 60, scale: MAJOR, chords: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]], seed: 77, lead: 'triangle', leadDensity: 0.65, arp: true, shaker: true, padGain: 0.05, leadGain: 0.12 },
};

const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private current: TrackId | null = null;
  private def: TrackDef | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private rand: () => number = rng(1);
  private lastLead = 0;
  private melodyCache: (number | null)[] = [];
  private _muted = false;
  private baseVolume = 0.5;

  get muted(): boolean { return this._muted; }

  /** Precisa ser chamado após um gesto do usuário. */
  ensureContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this.baseVolume;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 1;
      this.musicGain.connect(this.master);
      // eco suave
      this.delay = this.ctx.createDelay(1);
      this.delay.delayTime.value = 0.28;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.28;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay);
      this.delay.connect(this.musicGain);
      const stored = localStorage.getItem('vila:muted');
      if (stored === '1') this.setMuted(true);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  get context(): AudioContext | null { return this.ctx; }
  get output(): GainNode | null { return this.master; }

  setMuted(m: boolean): void {
    this._muted = m;
    try { localStorage.setItem('vila:muted', m ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.baseVolume, this.ctx.currentTime, 0.05);
  }

  toggleMute(): boolean { this.setMuted(!this._muted); return this._muted; }

  play(id: TrackId): void {
    if (this.current === id) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stop(0.6);
    this.current = id;
    this.def = TRACKS[id];
    this.rand = rng(this.def.seed);
    this.step = 0;
    this.lastLead = 0;
    this.melodyCache = [];
    this.nextTime = ctx.currentTime + 0.1;
    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
      this.musicGain.gain.setValueAtTime(0, ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    }
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 90);
  }

  stop(fadeSec = 0.4): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeSec);
    }
    this.current = null;
    this.def = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.def || !this.musicGain) return;
    const stepDur = 60 / this.def.bpm / 4; // semicolcheia
    while (this.nextTime < this.ctx.currentTime + 0.35) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  private chordAt(step: number): number[] {
    const d = this.def!;
    const bar = Math.floor(step / 16) % d.chords.length;
    return d.chords[bar];
  }

  private degreeToMidi(degree: number, octave = 0): number {
    const d = this.def!;
    const len = d.scale.length;
    const oct = Math.floor(degree / len) + octave;
    const idx = ((degree % len) + len) % len;
    return d.root + d.scale[idx] + oct * 12;
  }

  private playStep(step: number, t: number, dur: number): void {
    const d = this.def!;
    const chord = this.chordAt(step);
    const inBar = step % 16;

    // pad: sustenta o acorde no início de cada compasso
    if (inBar === 0) {
      chord.forEach((deg, i) => this.tone(this.degreeToMidi(deg, i === 0 ? -1 : 0), t, dur * 16, 'square', d.padGain, 0.4, 0.5, true));
    }
    // baixo
    if (inBar === 0 || inBar === 8 || (inBar === 12 && this.rand() < 0.5)) {
      this.tone(this.degreeToMidi(chord[0], -2), t, dur * 6, 'triangle', 0.16, 0.01, 0.2);
    }
    // arpejo (faixas mais alegres)
    if (d.arp && inBar % 2 === 1) {
      const deg = chord[Math.floor(inBar / 2) % 3];
      this.tone(this.degreeToMidi(deg, 1), t, dur * 1.5, 'square', 0.035, 0.005, 0.08);
    }
    // melodia: decidida por colcheia (a cada 2 passos), armazenada em cache de 4 compassos para repetir motivos
    if (inBar % 2 === 0) {
      const phraseLen = 32; // colcheias em 4 compassos
      const idx = Math.floor(step / 2) % phraseLen;
      const repeat = Math.floor(step / 2 / phraseLen) % 2 === 1; // repete a frase alternadamente
      let note: number | null;
      if (repeat && this.melodyCache[idx] !== undefined) {
        note = this.melodyCache[idx];
      } else {
        note = this.pickLead(chord, inBar);
        this.melodyCache[idx] = note;
      }
      if (note !== null) {
        const len = this.rand() < 0.3 ? dur * 4 : dur * 2;
        this.tone(note, t, len, d.lead, d.leadGain, 0.01, 0.12, false, true);
      }
    }
    // "shaker" suave
    if (d.shaker && (inBar === 4 || inBar === 12)) this.noise(t, 0.05, 0.02);
  }

  private pickLead(chord: number[], inBar: number): number | null {
    const d = this.def!;
    if (this.rand() > d.leadDensity && inBar !== 0) return null;
    const len = d.scale.length;
    let deg: number;
    if (inBar === 0 || this.rand() < 0.5) {
      deg = chord[Math.floor(this.rand() * 3)];
    } else {
      const stepMove = Math.floor(this.rand() * 5) - 2;
      deg = this.lastLead + stepMove;
    }
    deg = Math.max(0, Math.min(len + 4, deg));
    this.lastLead = deg;
    return this.degreeToMidi(deg, 1);
  }

  private tone(midi: number, t: number, dur: number, type: OscillatorType, gain: number, attack: number, release: number, filtered = false, echo = false): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = midiToFreq(midi);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, Math.max(t + attack, t + dur - release));
    g.gain.linearRampToValueAtTime(0, t + dur + release);
    osc.connect(g);
    if (filtered) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      g.connect(lp);
      lp.connect(this.musicGain);
    } else {
      g.connect(this.musicGain);
    }
    if (echo && this.delay) g.connect(this.delay);
    osc.start(t);
    osc.stop(t + dur + release + 0.05);
  }

  private noise(t: number, dur: number, gain: number): void {
    if (!this.ctx || !this.musicGain) return;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(hp); hp.connect(g); g.connect(this.musicGain);
    src.start(t);
  }
}

export const music = new MusicPlayer();
