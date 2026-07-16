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

  private playSwoosh(duration: number, vol: number) {
    if (!this.enabled || !this.ctx) return;

    // Create a buffer for white noise
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to shape the noise into a "wind/swoosh" sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    
    // Create an oscillator for a low-end "punch/thump" at the start
    const punchOsc = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punchOsc.type = 'sine';
    punchOsc.frequency.setValueAtTime(120, this.ctx.currentTime);
    punchOsc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);
    
    punchGain.gain.setValueAtTime(vol * 1.5, this.ctx.currentTime);
    punchGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    punchOsc.connect(punchGain);
    punchGain.connect(this.ctx.destination);
    punchOsc.start();
    punchOsc.stop(this.ctx.currentTime + 0.15);
    
    // Frequency sweep to simulate object passing through air
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + (duration * 0.3));
    filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + duration);
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    
    // Envelope to fade in and fade out the swoosh smoothly
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + (duration * 0.1));
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  public playTap() {
    this.initContext();
    // A tiny, crisp swoosh for tapping
    this.playSwoosh(0.1, 0.3);
  }

  public playMove() {
    this.initContext();
    // A highly satisfying airy swoosh for sliding arrows
    this.playSwoosh(0.35, 0.6);
  }

  public playCollision() {
    this.initContext();
    if (!this.enabled || !this.ctx) return;
    
    // A sharp, woody "clack/bump" for arrows colliding
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);

    // Add a tiny noise burst for the impact click
    const bufferSize = this.ctx.sampleRate * 0.05; // 50ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    noise.start();
  }

  public playClear() {
    // Removed old bell sound
  }

  public playWin() {}
  public playLose() {}

  public playPopupWin() {
    this.initContext();
    if (!this.enabled || !this.ctx) return;
    
    // Play a majestic shimmering chord (C Major: C, E, G, C)
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    const duration = 1.5;
    
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      }, i * 100); // Stagger the notes like a harp glissando
    });
  }

  public playPopupLose() {
    this.initContext();
    if (!this.enabled || !this.ctx) return;
    
    // A low, descending groan
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }
}

export const soundManager = new SoundManager();
