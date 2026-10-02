/**
 * Procedural WebAudio ambience: filtered-noise wind loop + soft footstep
 * thumps. OFF by default; the UI toggle calls start()/stop().
 * No audio files, no downloads.
 */

class AmbientAudio {
  private ctx: AudioContext | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private running = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const AC = window.AudioContext;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  /** Start the wind loop. Safe to call repeatedly. */
  start(): void {
    if (this.running || typeof window === "undefined") return;
    const ctx = this.ensure();
    void ctx.resume();

    // 2s of looping brown-ish noise through a wandering lowpass = wind
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.value = 420;
    this.windFilter.Q.value = 0.6;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0;
    this.windGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2.5);

    // slow LFO on the filter = gusts
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(this.windFilter.frequency);
    lfo.start();

    src.connect(this.windFilter).connect(this.windGain).connect(ctx.destination);
    src.start();

    this.running = true;
  }

  stop(): void {
    if (!this.running || !this.ctx || !this.windGain) return;
    const ctx = this.ctx;
    this.windGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    const g = this.windGain;
    window.setTimeout(() => g.disconnect(), 800);
    this.windGain = null;
    this.windFilter = null;
    this.running = false;
  }

  /** Soft footstep thump; intensity 0..1. No-op unless running. */
  footstep(intensity = 0.5): void {
    if (!this.running || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11 * intensity + 0.001, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  get isRunning(): boolean {
    return this.running;
  }
}

export const ambientAudio = new AmbientAudio();
