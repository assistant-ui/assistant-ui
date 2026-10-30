export const encodePcm16 = (samples: Float32Array): string => {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

export const decodePcm16 = (base64: string): Float32Array<ArrayBuffer> => {
  const binary = atob(base64);
  const samples = new Float32Array(new ArrayBuffer((binary.length >> 1) * 4));
  const view = new DataView(new ArrayBuffer(samples.length * 2));
  for (let i = 0; i < samples.length * 2; i++)
    view.setUint8(i, binary.charCodeAt(i));
  for (let i = 0; i < samples.length; i++)
    samples[i] = view.getInt16(i * 2, true) / 0x8000;
  return samples;
};

export const readLevel = (analyser: AnalyserNode): number => {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (const v of data) {
    const centered = (v - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(1, Math.sqrt(sum / data.length) * 2);
};

export type MicrophoneCapture = {
  setMuted: (muted: boolean) => void;
  level: () => number;
  close: () => Promise<void>;
};

const WORKLET_SOURCE = `
class PcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / options.processorOptions.targetRate;
    this.phase = 0;
    this.last = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const out = [];
    let i = this.phase;
    while (i < input.length) {
      const index = Math.floor(i);
      const next = index + 1 < input.length ? input[index + 1] : input[index];
      const prev = index >= 0 ? input[index] : this.last;
      out.push(prev + (next - prev) * (i - index));
      i += this.ratio;
    }
    this.phase = i - input.length;
    this.last = input[input.length - 1];
    if (out.length) this.port.postMessage(Float32Array.from(out));
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
`;

const resample = (input: Float32Array, ratio: number): Float32Array => {
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const next = input[Math.min(index + 1, input.length - 1)]!;
    out[i] = input[index]! + (next - input[index]!) * (position - index);
  }
  return out;
};

export const openMicrophone = async (options: {
  sampleRate: number;
  onChunk: (base64: string) => void;
  signal?: AbortSignal;
}): Promise<MicrophoneCapture> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (options.signal?.aborted) {
    stream.getTracks().forEach((track) => track.stop());
    throw options.signal.reason;
  }
  const context = new AudioContext();
  if (context.state === "suspended") await context.resume();
  const ratio = context.sampleRate / options.sampleRate;
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  let muted = false;
  const push = (samples: Float32Array) => {
    if (!muted) options.onChunk(encodePcm16(samples));
  };

  let node: AudioNode;
  if (context.audioWorklet) {
    const url = URL.createObjectURL(
      new Blob([WORKLET_SOURCE], { type: "text/javascript" }),
    );
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const worklet = new AudioWorkletNode(context, "pcm-capture", {
      processorOptions: { targetRate: options.sampleRate },
    });
    worklet.port.onmessage = (event) => push(event.data as Float32Array);
    node = worklet;
  } else {
    const processor = context.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (event) =>
      push(resample(event.inputBuffer.getChannelData(0), ratio));
    node = processor;
  }
  analyser.connect(node);
  node.connect(context.destination);

  return {
    setMuted: (value) => {
      muted = value;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !value;
      });
    },
    level: () => readLevel(analyser),
    close: async () => {
      node.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await context.close();
    },
  };
};

export type PcmPlayer = {
  enqueue: (base64: string) => void;
  clear: () => void;
  isPlaying: () => boolean;
  level: () => number;
  close: () => Promise<void>;
};

const IDLE_GRACE_MS = 100;

export const createPcmPlayer = (options: {
  sampleRate: number;
  onIdle?: () => void;
}): PcmPlayer => {
  const context = new AudioContext({ sampleRate: options.sampleRate });
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.connect(context.destination);
  const sources = new Set<AudioBufferSourceNode>();
  let cursor = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (sources.size === 0) options.onIdle?.();
    }, IDLE_GRACE_MS);
  };

  return {
    enqueue: (base64) => {
      const samples = decodePcm16(base64);
      if (samples.length === 0) return;
      const buffer = context.createBuffer(
        1,
        samples.length,
        options.sampleRate,
      );
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      const start = Math.max(context.currentTime, cursor);
      source.start(start);
      cursor = start + buffer.duration;
      sources.add(source);
      source.onended = () => {
        sources.delete(source);
        if (sources.size === 0) scheduleIdle();
      };
      clearTimeout(idleTimer);
      if (context.state === "suspended") void context.resume();
    },
    clear: () => {
      clearTimeout(idleTimer);
      for (const source of sources) {
        source.onended = null;
        source.stop();
      }
      sources.clear();
      cursor = 0;
    },
    isPlaying: () => sources.size > 0,
    level: () => readLevel(analyser),
    close: async () => {
      clearTimeout(idleTimer);
      for (const source of sources) source.stop();
      sources.clear();
      await context.close();
    },
  };
};
