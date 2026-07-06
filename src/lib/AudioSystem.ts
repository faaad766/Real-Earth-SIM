// Web Audio API ambient sound synthesis
const BIOME_CONFIGS: Record<string, { baseFreq: number; filterFreq: number; label: string }> = {
  tropical_rainforest: { baseFreq: 200, filterFreq: 800, label: 'forest' },
  temperate_forest: { baseFreq: 150, filterFreq: 600, label: 'forest' },
  grassland: { baseFreq: 80, filterFreq: 400, label: 'wind' },
  desert: { baseFreq: 40, filterFreq: 200, label: 'arid' },
  tundra: { baseFreq: 60, filterFreq: 150, label: 'arctic' },
  alpine: { baseFreq: 100, filterFreq: 300, label: 'mountain' },
  ocean: { baseFreq: 120, filterFreq: 250, label: 'ocean' },
  coastal: { baseFreq: 130, filterFreq: 300, label: 'coastal' },
  river: { baseFreq: 180, filterFreq: 600, label: 'river' },
  wetland: { baseFreq: 160, filterFreq: 500, label: 'wetland' },
  lake: { baseFreq: 140, filterFreq: 400, label: 'lake' },
};

export class AudioSystemClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private biomeGain: GainNode | null = null;
  private currentBiome = '';
  private noiseSource: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private oscillators: OscillatorNode[] = [];
  enabled = false;
  volume = 0.5;

  private initContext(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    this.biomeGain = this.ctx.createGain();
    this.biomeGain.gain.value = 0.3;
    this.biomeGain.connect(this.masterGain);
  }

  private createWhiteNoise(duration = 2): AudioBuffer {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    return buffer;
  }

  private startBiomeAmbience(biome: string): void {
    const cfg = BIOME_CONFIGS[biome] ?? BIOME_CONFIGS.grassland;
    const ctx = this.ctx!;

    // Stop previous
    this.stopCurrentAmbience();

    // White noise for wind/water
    const buffer = this.createWhiteNoise(4);
    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'bandpass';
    this.filterNode.frequency.value = cfg.filterFreq;
    this.filterNode.Q.value = 0.5;

    this.noiseSource.connect(this.filterNode);
    this.filterNode.connect(this.biomeGain!);
    this.noiseSource.start();

    // Subtle tone oscillator
    const osc = ctx.createOscillator();
    osc.frequency.value = cfg.baseFreq;
    osc.type = 'sine';
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.03;
    osc.connect(oscGain);
    oscGain.connect(this.biomeGain!);
    osc.start();
    this.oscillators.push(osc);
  }

  private stopCurrentAmbience(): void {
    try {
      this.noiseSource?.stop();
      this.noiseSource?.disconnect();
      for (const osc of this.oscillators) { osc.stop(); osc.disconnect(); }
      this.oscillators = [];
    } catch { /* ignore */ }
    this.noiseSource = null;
  }

  setBiome(biome: string): void {
    if (biome === this.currentBiome || !this.enabled) return;
    this.currentBiome = biome;
    if (this.ctx) this.startBiomeAmbience(biome);
  }

  enable(): void {
    this.enabled = true;
    this.initContext();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    if (this.currentBiome) this.startBiomeAmbience(this.currentBiome);
  }

  disable(): void {
    this.enabled = false;
    this.stopCurrentAmbience();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.1);
  }

  playEvent(type: 'extinction' | 'speciation' | 'disaster'): void {
    if (!this.enabled || !this.ctx) return;
    const freq = type === 'extinction' ? 220 : type === 'speciation' ? 440 : 110;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }
}

export const AudioSystem = new AudioSystemClass();
