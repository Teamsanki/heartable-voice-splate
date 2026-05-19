export type VoiceFilter =
  | "None"
  | "Romantic Reverb"
  | "Echo"
  | "Slow"
  | "Bass Boost"
  | "Sad Vibe";

export const FILTERS: VoiceFilter[] = [
  "None",
  "Romantic Reverb",
  "Echo",
  "Slow",
  "Bass Boost",
  "Sad Vibe",
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
