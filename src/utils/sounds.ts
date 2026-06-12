import { AudioPlayer, createAudioPlayer } from 'expo-audio';

/**
 * Tiny synthesized sound effects, embedded as base64 WAV data URIs so the
 * prototype ships zero binary assets. Each is a short PCM tone:
 *  - tick:    600 Hz blip (countdown under 5s)
 *  - correct: rising 880->1320 Hz chirp
 *  - wrong:   falling 330->165 Hz buzz
 *  - cheer:   layered noise burst + major chord (crowd-ish swell)
 */
type SoundName = 'tick' | 'correct' | 'wrong' | 'cheer';

const SAMPLE_RATE = 22050;

function encodeWav(samples: Float32Array): string {
  const dataLength: number = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataLength, true);

  for (let index = 0; index < samples.length; index += 1) {
    const clamped: number = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, clamped * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  // btoa is available in Hermes / React Native runtime.
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function synthesize(name: SoundName): string {
  const make = (durationSeconds: number, generator: (t: number, progress: number) => number): Float32Array => {
    const sampleCount: number = Math.floor(SAMPLE_RATE * durationSeconds);
    const samples = new Float32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
      const t: number = index / SAMPLE_RATE;
      const progress: number = index / sampleCount;
      // Quick fade in/out to avoid clicks.
      const envelope: number = Math.min(1, progress * 20, (1 - progress) * 4);
      samples[index] = generator(t, progress) * envelope * 0.5;
    }
    return samples;
  };

  switch (name) {
    case 'tick':
      return encodeWav(make(0.07, (t) => Math.sin(2 * Math.PI * 600 * t)));
    case 'correct':
      return encodeWav(
        make(0.25, (t, progress) => Math.sin(2 * Math.PI * (880 + 440 * progress) * t)),
      );
    case 'wrong':
      return encodeWav(
        make(0.3, (t, progress) => Math.sin(2 * Math.PI * (330 - 165 * progress) * t) * 0.9),
      );
    case 'cheer':
      return encodeWav(
        make(0.9, (t, progress) => {
          const chord: number =
            Math.sin(2 * Math.PI * 523 * t) + Math.sin(2 * Math.PI * 659 * t) + Math.sin(2 * Math.PI * 784 * t);
          const crowdNoise: number = (Math.random() * 2 - 1) * (1 - progress) * 0.8;
          return chord * 0.2 + crowdNoise;
        }),
      );
    default:
      return encodeWav(make(0.05, () => 0));
  }
}

const playerCache = new Map<SoundName, AudioPlayer>();

/**
 * Fire-and-forget playback. Sound is flavor, not gameplay: any failure is
 * logged and swallowed so audio problems can never interrupt a round.
 */
export function playSound(name: SoundName): void {
  try {
    let player: AudioPlayer | undefined = playerCache.get(name);
    if (!player) {
      player = createAudioPlayer({ uri: synthesize(name) });
      playerCache.set(name, player);
    }
    player.seekTo(0);
    player.play();
  } catch (error) {
    console.warn(`Sound '${name}' failed to play`, error);
  }
}
