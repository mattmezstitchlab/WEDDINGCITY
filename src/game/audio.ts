import { reportDiagnostic } from './diagnostics';
// Procedural Web Audio Engine for WEDDING CITY (Synthesizes live wedding orchestration & DJ beats)

class WeddingAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private beatInterval: number | null = null;
  private currentMode: 'silent' | 'ceremony' | 'cocktail' | 'dinner' | 'first_dance' | 'club' = 'silent';

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.beatInterval) {
      window.clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // UI Click sound
  public playClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // Neural data wave swoosh / propagation
  public playNeuralWave() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.22);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.45);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.14, this.ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.46);
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // DJ Track Drop & Upvote Chime
  public playTrackUpvote() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.08, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.22);
      });
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // DJ Scratch / Smart AI Harmonize sound
  public playDjHarmonize() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // Chaos Import Matrix extraction sound
  public playImportChaos() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [330, 440, 554, 659, 880, 1108].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.08, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.2);
      });
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // Camera Flash
  public playCameraFlash() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // Champagne glass clink
  public playChampagneClink() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(2380, now + 0.4);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // Wedding Bells / Chime Melody
  public playWeddingChimes() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.12);
        gain.gain.setValueAtTime(0.12, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.55);
      });
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // Conflict Alert
  public playConflictAlert() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [440, 370, 440].forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + i * 0.1);
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.15);
      });
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }

  // Success Resolution
  public playResolveSuccess() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0.09, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } catch (error) {
      // Audio is non-critical, but a permanently blocked AudioContext must be
      // visible to the System Nerve rather than silently degrading to silence.
      reportDiagnostic({ source: 'audio', severity: 'warning', code: 'audio_playback_failed', error });
    }
  }
}

export const weddingAudio = new WeddingAudioEngine();
