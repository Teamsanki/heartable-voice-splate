export type VoiceFilter =
  | "None"
  | "Romantic Reverb"
  | "Echo"
  | "Slow"
  | "Bass Boost"
  | "Sad Vibe"
  | "Autotune"
  | "Telephone"
  | "Underwater"
  | "Megaphone"
  | "Whisper"
  | "Alien"
  | "Stadium"
  | "8-Bit"
  | "Slow-Mo"
  | "Fast-Fwd";

export const FILTERS: VoiceFilter[] = [
  "None",
  "Romantic Reverb",
  "Echo",
  "Slow",
  "Bass Boost",
  "Sad Vibe",
  "Autotune",
  "Telephone",
  "Underwater",
  "Megaphone",
  "Whisper",
  "Alien",
  "Stadium",
  "8-Bit",
  "Slow-Mo",
  "Fast-Fwd",
];

// Build a simple impulse response for reverb
function makeImpulse(ctx: AudioContext, dur: number, decay: number) {
  const rate = ctx.sampleRate;
  const len = rate * dur;
  const impulse = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const ch = impulse.getChannelData(c);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return impulse;
}

/**
 * Apply a filter to a HTMLAudioElement playback chain. Returns the AudioContext
 * (caller should keep it alive while the audio plays, then close).
 */
export function applyFilter(
  audio: HTMLAudioElement,
  filter: VoiceFilter,
): { ctx: AudioContext; cleanup: () => void } {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new AC();
  const src = ctx.createMediaElementSource(audio);
  let last: AudioNode = src;

  switch (filter) {
    case "Slow": {
      audio.playbackRate = 0.78;
      break;
    }
    case "Slow-Mo": {
      audio.playbackRate = 0.65;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 3000;
      last.connect(lp); last = lp;
      break;
    }
    case "Fast-Fwd": {
      audio.playbackRate = 1.5;
      break;
    }
    case "Echo": {
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.28;
      const fb = ctx.createGain();
      fb.gain.value = 0.45;
      delay.connect(fb).connect(delay);
      last.connect(delay);
      const mix = ctx.createGain();
      last.connect(mix);
      delay.connect(mix);
      last = mix;
      break;
    }
    case "Stadium": {
      const conv = ctx.createConvolver();
      conv.buffer = makeImpulse(ctx, 5, 1.5);
      const wet = ctx.createGain(); wet.gain.value = 0.7;
      const dry = ctx.createGain(); dry.gain.value = 0.5;
      last.connect(dry); last.connect(conv); conv.connect(wet);
      const mix = ctx.createGain();
      dry.connect(mix); wet.connect(mix);
      last = mix;
      break;
    }
    case "Telephone": {
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3000;
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * 3); }
      dist.curve = curve;
      last.connect(hp); hp.connect(lp); lp.connect(dist); last = dist;
      break;
    }
    case "Underwater": {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
      const delay = ctx.createDelay(); delay.delayTime.value = 0.03;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.4;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain); lfoGain.connect(delay.delayTime); lfo.start();
      last.connect(lp); lp.connect(delay); last = delay;
      break;
    }
    case "Megaphone": {
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 4;
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.4); }
      dist.curve = curve;
      const gain = ctx.createGain(); gain.gain.value = 1.4;
      last.connect(bp); bp.connect(dist); dist.connect(gain); last = gain;
      break;
    }
    case "Whisper": {
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2000;
      const gain = ctx.createGain(); gain.gain.value = 1.6;
      last.connect(hp); hp.connect(gain); last = gain;
      break;
    }
    case "Alien": {
      // Ring modulator via gain modulated by osc
      const osc = ctx.createOscillator(); osc.frequency.value = 60;
      const ringGain = ctx.createGain(); ringGain.gain.value = 0;
      osc.connect(ringGain.gain); osc.start();
      last.connect(ringGain); last = ringGain;
      break;
    }
    case "8-Bit": {
      // crude bitcrusher via WaveShaper quantization
      const shaper = ctx.createWaveShaper();
      const steps = 8;
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 512) - 1;
        curve[i] = Math.round(x * steps) / steps;
      }
      shaper.curve = curve;
      last.connect(shaper); last = shaper;
      break;
    }
    case "Autotune": {
      // Approximate: high-Q comb + slight upward pitch via playbackRate
      audio.playbackRate = 1.04;
      const delay = ctx.createDelay(); delay.delayTime.value = 0.005;
      const fb = ctx.createGain(); fb.gain.value = 0.7;
      delay.connect(fb).connect(delay);
      const mix = ctx.createGain();
      last.connect(mix); last.connect(delay); delay.connect(mix);
      const peak = ctx.createBiquadFilter();
      peak.type = "peaking"; peak.frequency.value = 1200; peak.Q.value = 6; peak.gain.value = 6;
      mix.connect(peak); last = peak;
      break;
    }
    case "Romantic Reverb": {
      const conv = ctx.createConvolver();
      conv.buffer = makeImpulse(ctx, 2.4, 2.2);
      const wet = ctx.createGain();
      wet.gain.value = 0.55;
      const dry = ctx.createGain();
      dry.gain.value = 0.7;
      last.connect(dry);
      last.connect(conv);
      conv.connect(wet);
      const mix = ctx.createGain();
      dry.connect(mix);
      wet.connect(mix);
      last = mix;
      break;
    }
    case "Bass Boost": {
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 200;
      bass.gain.value = 14;
      last.connect(bass);
      last = bass;
      break;
    }
    case "Sad Vibe": {
      audio.playbackRate = 0.88;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1600;
      const conv = ctx.createConvolver();
      conv.buffer = makeImpulse(ctx, 3, 3);
      const wet = ctx.createGain();
      wet.gain.value = 0.4;
      last.connect(lp);
      const dry = ctx.createGain();
      dry.gain.value = 0.6;
      lp.connect(dry);
      lp.connect(conv);
      conv.connect(wet);
      const mix = ctx.createGain();
      dry.connect(mix);
      wet.connect(mix);
      last = mix;
      break;
    }
    case "None":
    default:
      break;
  }

  last.connect(ctx.destination);

  return {
    ctx,
    cleanup: () => {
      ctx.close().catch(() => {});
    },
  };
}
