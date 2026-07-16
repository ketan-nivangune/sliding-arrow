export class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // AudioContext is initialized on first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public enable() {
    this.enabled = true;
    this.initContext();
  }

  public disable() {
    this.enabled = false;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number) {
    if (!this.enabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playTap() {
    this.initContext();
    // A short, pleasing "pop" for a successful tap
    this.playTone(600, 'sine', 0.1, 0.3);
  }

  public playMove() {
    this.initContext();
    // A quick whoosh or click when arrow starts moving
    this.playTone(800, 'triangle', 0.05, 0.1);
  }

  public playCollision() {
    this.initContext();
    // A low thud for collision
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playClear() {
    this.initContext();
    // A high-pitched ding for line clear
    this.playTone(1200, 'sine', 0.3, 0.2);
    setTimeout(() => {
      this.playTone(1600, 'sine', 0.4, 0.2);
    }, 100);
  }

  public playWin() {
    this.initContext();
    this.playTone(800, 'sine', 0.2, 0.2);
    setTimeout(() => this.playTone(1000, 'sine', 0.2, 0.2), 200);
    setTimeout(() => this.playTone(1200, 'sine', 0.4, 0.2), 400);
  }

  public playLose() {
    this.initContext();
    this.playTone(300, 'sawtooth', 0.3, 0.2);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.5, 0.2), 300);
  }
}

export const soundManager = new SoundManager();
