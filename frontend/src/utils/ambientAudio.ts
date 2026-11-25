// Pure Web Audio API sensory ambience: soft midnight rain + warm candle/velvet drone (0 KB external assets)

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private running = false;

  isRunning() {
    return this.running;
  }

  toggle(): boolean {
    if (this.running) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  start() {
    if (this.running) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.16, this.ctx.currentTime + 1.4);
    this.masterGain.connect(this.ctx.destination);

    // 1. Soft brown-ish rain noise behind cathedral window
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 1.8;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 340;
    rainFilter.Q.value = 0.7;

    const rainGain = this.ctx.createGain();
    rainGain.gain.value = 0.45;

    noise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.masterGain);
    noise.start();

    // 2. Warm low velvet pad (A2 + E3 subtle harmonic)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 110;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 164.81;

    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 220;

    const padGain = this.ctx.createGain();
    padGain.gain.value = 0.14;

    osc1.connect(padFilter);
    osc2.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.masterGain);
    osc1.start();
    osc2.start();

    this.running = true;
  }

  stop() {
    if (!this.running || !this.ctx || !this.masterGain) return;
    try {
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
      const ctxRef = this.ctx;
      setTimeout(() => {
        ctxRef.close().catch(() => {});
      }, 450);
    } catch {
      // ignore
    }
    this.ctx = null;
    this.masterGain = null;
    this.running = false;
  }

  playBurnWhoosh() {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const bufferSize = ctx.sampleRate * 0.9;
      const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.35));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.85);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      setTimeout(() => ctx.close().catch(() => {}), 1000);
    } catch {
      // ignore
    }
  }
}

export const ambientAudio = new AmbientAudioEngine();
