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

export const WORKLET_SOURCE = `
class PcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / options.processorOptions.targetRate;
    this.chunk = Math.round(options.processorOptions.targetRate / 50);
    this.position = 0;
    this.last = 0;
    this.pending = [];
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0 || channels[0].length === 0) return true;
    const input = channels[0].slice();
    for (let c = 1; c < channels.length; c++)
      for (let i = 0; i < input.length; i++) input[i] += channels[c][i];
    if (channels.length > 1)
      for (let i = 0; i < input.length; i++) input[i] /= channels.length;
    while (this.position < input.length - 1) {
      const index = Math.floor(this.position);
      const prev = index < 0 ? this.last : input[index];
      const next = input[index + 1];
      this.pending.push(prev + (next - prev) * (this.position - index));
      this.position += this.ratio;
    }
    this.position -= input.length;
    this.last = input[input.length - 1];
    if (this.pending.length >= this.chunk) {
      this.port.postMessage(Float32Array.from(this.pending));
      this.pending = [];
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
`;

export const createResampler = (ratio: number) => {
  let position = 0;
  let last = 0;
  return (input: Float32Array): Float32Array => {
    if (input.length === 0) return new Float32Array(0);
    const out: number[] = [];
    while (position < input.length - 1) {
      const index = Math.floor(position);
      const prev = index < 0 ? last : input[index]!;
      const next = input[index + 1]!;
      out.push(prev + (next - prev) * (position - index));
      position += ratio;
    }
    position -= input.length;
    last = input[input.length - 1]!;
    return Float32Array.from(out);
  };
};

export const openMicrophone = async (options: {
  sampleRate: number;
  onChunk: (base64: string) => void;
  signal?: AbortSignal;
}): Promise<MicrophoneCapture> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop());
  const throwIfAborted = () => {
    if (options.signal?.aborted) throw options.signal.reason;
  };
  let context: AudioContext | undefined;
  try {
    throwIfAborted();
    context = new AudioContext();
    if (context.state === "suspended") await context.resume();
    throwIfAborted();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    let muted = false;
    let closed = false;
    const push = (samples: Float32Array) => {
      if (!muted && !closed && samples.length)
        options.onChunk(encodePcm16(samples));
    };

    let node: AudioNode;
    let detach = () => {};
    if (context.audioWorklet) {
      const url = URL.createObjectURL(
        new Blob([WORKLET_SOURCE], { type: "text/javascript" }),
      );
      try {
        await context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      throwIfAborted();
      const worklet = new AudioWorkletNode(context, "pcm-capture", {
        processorOptions: { targetRate: options.sampleRate },
      });
      worklet.port.onmessage = (event) => push(event.data as Float32Array);
      detach = () => {
        worklet.port.onmessage = null;
      };
      node = worklet;
    } else {
      const resample = createResampler(context.sampleRate / options.sampleRate);
      const processor = context.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (event) =>
        push(resample(event.inputBuffer.getChannelData(0)));
      detach = () => {
        processor.onaudioprocess = null;
      };
      node = processor;
    }
    analyser.connect(node);
    node.connect(context.destination);
    const opened = context;

    return {
      setMuted: (value) => {
        muted = value;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !value;
        });
      },
      level: () => readLevel(analyser),
      close: async () => {
        closed = true;
        detach();
        node.disconnect();
        source.disconnect();
        stopTracks();
        await opened.close();
      },
    };
  } catch (error) {
    stopTracks();
    await context?.close().catch(() => {});
    throw error;
  }
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
      for (const source of sources) {
        source.onended = null;
        source.stop();
      }
      sources.clear();
      await context.close();
    },
  };
};
