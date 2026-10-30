import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPcmPlayer,
  decodePcm16,
  encodePcm16,
  openMicrophone,
  readLevel,
} from "./audio";

class FakeTrack {
  enabled = true;
  stop = vi.fn();
}

class FakeSource {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeWorklet {
  static instances: FakeWorklet[] = [];
  port: { onmessage: ((event: { data: unknown }) => void) | null } = {
    onmessage: null,
  };
  connect = vi.fn();
  disconnect = vi.fn();
  options: unknown;
  constructor(_context: unknown, _name: string, options?: unknown) {
    this.options = options;
    FakeWorklet.instances.push(this);
  }
}

class FakeContext {
  static instances: FakeContext[] = [];
  static workletSupported = true;
  currentTime = 0;
  state = "running";
  sampleRate: number;
  sources: FakeSource[] = [];
  destination = {};
  audioWorklet = FakeContext.workletSupported
    ? { addModule: vi.fn(async () => {}) }
    : undefined;
  mediaSource = { connect: vi.fn(), disconnect: vi.fn() };
  processor = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null as ((event: unknown) => void) | null,
  };
  analyser = { fftSize: 0, connect: vi.fn(), getByteTimeDomainData: vi.fn() };
  constructor(options?: { sampleRate: number }) {
    this.sampleRate = options?.sampleRate ?? 48000;
    FakeContext.instances.push(this);
  }
  createAnalyser = vi.fn(() => this.analyser);
  createMediaStreamSource = vi.fn(() => this.mediaSource);
  createScriptProcessor = vi.fn(() => this.processor);
  createBuffer = vi.fn((_channels: number, length: number, rate: number) => ({
    duration: length / rate,
    copyToChannel: vi.fn(),
  }));
  createBufferSource = vi.fn(() => {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  });
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
}

const installBrowser = () => {
  const track = new FakeTrack();
  const getUserMedia = vi.fn(async () => ({
    getTracks: () => [track],
    getAudioTracks: () => [track],
  }));
  const createObjectURL = vi.fn(() => "blob:worklet");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("AudioWorkletNode", FakeWorklet);
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  return { track, getUserMedia, createObjectURL, revokeObjectURL };
};

const chunk = (length: number) =>
  encodePcm16(new Float32Array(length).fill(0.1));

describe("pcm", () => {
  it("round-trips samples through little-endian int16", () => {
    const samples = Float32Array.from({ length: 1000 }, (_, i) =>
      Math.sin(i / 10),
    );
    const decoded = decodePcm16(encodePcm16(samples));
    expect(decoded.length).toBe(1000);
    for (let i = 0; i < samples.length; i++) {
      expect(Math.abs(decoded[i]! - samples[i]!)).toBeLessThan(2 / 32768);
    }
  });
  it("clamps out-of-range samples", () => {
    const decoded = decodePcm16(encodePcm16(Float32Array.from([2, -2])));
    expect(decoded[0]).toBeCloseTo(1, 3);
    expect(decoded[1]).toBe(-1);
  });
  it("round-trips an empty buffer", () => {
    expect(encodePcm16(new Float32Array(0))).toBe("");
    expect(decodePcm16("").length).toBe(0);
  });
  it("encodes buffers longer than one fromCharCode chunk", () => {
    const samples = new Float32Array(40000).fill(0.5);
    expect(decodePcm16(encodePcm16(samples)).length).toBe(40000);
  });
});
describe("level", () => {
  const analyser = (fill: (i: number) => number) =>
    ({
      fftSize: 256,
      getByteTimeDomainData: (data: Uint8Array) => {
        for (let i = 0; i < data.length; i++) data[i] = fill(i);
      },
    }) as unknown as AnalyserNode;
  it("is 0 for silence", () => {
    expect(readLevel(analyser(() => 128))).toBe(0);
  });
  it("is 1 for a full-swing square wave", () => {
    expect(readLevel(analyser((i) => (i % 2 ? 255 : 0)))).toBe(1);
  });
  it("never exceeds 1", () => {
    expect(readLevel(analyser(() => 255))).toBeLessThanOrEqual(1);
  });
});

describe("microphone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeContext.instances = [];
    FakeContext.workletSupported = true;
    FakeWorklet.instances = [];
  });

  it("requests the microphone and opens a context at the device rate", async () => {
    const browser = installBrowser();
    await openMicrophone({ sampleRate: 16000, onChunk: () => {} });
    expect(browser.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(FakeContext.instances[0]?.sampleRate).toBe(48000);
  });

  it("resumes a suspended capture context", async () => {
    installBrowser();
    vi.stubGlobal(
      "AudioContext",
      class extends FakeContext {
        override state = "suspended";
      },
    );
    await openMicrophone({ sampleRate: 16000, onChunk: () => {} });
    expect(FakeContext.instances[0]?.resume).toHaveBeenCalled();
  });

  it("passes the target rate to the worklet", async () => {
    installBrowser();
    await openMicrophone({ sampleRate: 16000, onChunk: () => {} });
    expect(FakeWorklet.instances[0]?.options).toEqual({
      processorOptions: { targetRate: 16000 },
    });
  });

  it("loads the worklet from a blob url and revokes it", async () => {
    const browser = installBrowser();
    await openMicrophone({ sampleRate: 16000, onChunk: () => {} });
    expect(
      FakeContext.instances[0]?.audioWorklet?.addModule,
    ).toHaveBeenCalledWith("blob:worklet");
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:worklet");
  });

  it("forwards worklet chunks as base64", async () => {
    installBrowser();
    const onChunk = vi.fn();
    await openMicrophone({ sampleRate: 16000, onChunk });
    const samples = Float32Array.from([0.5, -0.5]);
    FakeWorklet.instances[0]?.port.onmessage?.({ data: samples });
    expect(onChunk).toHaveBeenCalledWith(encodePcm16(samples));
  });

  it("falls back to a script processor without worklet support", async () => {
    FakeContext.workletSupported = false;
    installBrowser();
    const onChunk = vi.fn();
    await openMicrophone({ sampleRate: 16000, onChunk });
    const context = FakeContext.instances[0]!;
    expect(context.createScriptProcessor).toHaveBeenCalledWith(2048, 1, 1);
    const samples = Float32Array.from([0, 0.3, 0.6, 0.9, 1.2, 1.5]);
    context.processor.onaudioprocess?.({
      inputBuffer: { getChannelData: () => samples },
    });
    expect(decodePcm16(onChunk.mock.calls[0]![0] as string)).toHaveLength(2);
    expect(FakeWorklet.instances).toHaveLength(0);
  });

  it("mutes by disabling the track and dropping chunks", async () => {
    const browser = installBrowser();
    const onChunk = vi.fn();
    const microphone = await openMicrophone({ sampleRate: 16000, onChunk });
    const samples = Float32Array.from([0.5]);
    microphone.setMuted(true);
    expect(browser.track.enabled).toBe(false);
    FakeWorklet.instances[0]?.port.onmessage?.({ data: samples });
    expect(onChunk).not.toHaveBeenCalled();
    microphone.setMuted(false);
    expect(browser.track.enabled).toBe(true);
    FakeWorklet.instances[0]?.port.onmessage?.({ data: samples });
    expect(onChunk).toHaveBeenCalledTimes(1);
  });

  it("closes the graph, the tracks, and the context", async () => {
    const browser = installBrowser();
    const microphone = await openMicrophone({
      sampleRate: 16000,
      onChunk: () => {},
    });
    await microphone.close();
    const context = FakeContext.instances[0]!;
    expect(FakeWorklet.instances[0]?.disconnect).toHaveBeenCalled();
    expect(context.mediaSource.disconnect).toHaveBeenCalled();
    expect(browser.track.stop).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
  });

  it("stops the tracks and rejects when already aborted", async () => {
    const browser = installBrowser();
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));
    await expect(
      openMicrophone({
        sampleRate: 16000,
        onChunk: () => {},
        signal: controller.signal,
      }),
    ).rejects.toThrow("cancelled");
    expect(browser.track.stop).toHaveBeenCalled();
    expect(FakeContext.instances).toHaveLength(0);
  });
});

describe("playback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeContext.instances = [];
  });

  const setup = (onIdle?: () => void) => {
    vi.stubGlobal("AudioContext", FakeContext);
    const player = createPcmPlayer(
      onIdle ? { sampleRate: 24000, onIdle } : { sampleRate: 24000 },
    );
    return { player, context: FakeContext.instances[0]! };
  };

  it("schedules chunks back to back from the current time", () => {
    const { player, context } = setup();
    context.currentTime = 1;
    player.enqueue(chunk(2400));
    player.enqueue(chunk(2400));
    expect(context.sources[0]?.start).toHaveBeenCalledWith(1);
    expect(context.sources[1]?.start).toHaveBeenCalledWith(1.1);
  });

  it("never schedules in the past", () => {
    const { player, context } = setup();
    player.enqueue(chunk(2400));
    context.currentTime = 5;
    player.enqueue(chunk(2400));
    expect(context.sources[1]?.start).toHaveBeenCalledWith(5);
  });

  it("reports playing until the last source ends", () => {
    const { player, context } = setup();
    player.enqueue(chunk(2400));
    expect(player.isPlaying()).toBe(true);
    context.sources[0]?.onended?.();
    expect(player.isPlaying()).toBe(false);
  });

  it("calls onIdle once after the queue drains", () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    const { player, context } = setup(onIdle);
    player.enqueue(chunk(2400));
    player.enqueue(chunk(2400));
    context.sources[0]?.onended?.();
    vi.advanceTimersByTime(200);
    expect(onIdle).not.toHaveBeenCalled();
    context.sources[1]?.onended?.();
    vi.advanceTimersByTime(200);
    expect(onIdle).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does not report idle across a short gap between chunks", () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    const { player, context } = setup(onIdle);
    player.enqueue(chunk(2400));
    context.sources[0]?.onended?.();
    vi.advanceTimersByTime(50);
    player.enqueue(chunk(2400));
    vi.advanceTimersByTime(200);
    expect(onIdle).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("clear stops every source and resets the cursor", () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    const { player, context } = setup(onIdle);
    player.enqueue(chunk(2400));
    player.enqueue(chunk(2400));
    player.clear();
    expect(context.sources[0]?.stop).toHaveBeenCalled();
    expect(context.sources[1]?.stop).toHaveBeenCalled();
    expect(player.isPlaying()).toBe(false);
    vi.advanceTimersByTime(200);
    expect(onIdle).not.toHaveBeenCalled();
    context.currentTime = 0.05;
    player.enqueue(chunk(2400));
    expect(context.sources[2]?.start).toHaveBeenCalledWith(0.05);
    vi.useRealTimers();
  });

  it("skips empty chunks", () => {
    const { player, context } = setup();
    player.enqueue("");
    expect(context.createBufferSource).not.toHaveBeenCalled();
    expect(player.isPlaying()).toBe(false);
  });

  it("resumes a suspended context on enqueue", () => {
    const { player, context } = setup();
    context.state = "suspended";
    player.enqueue(chunk(2400));
    expect(context.resume).toHaveBeenCalled();
  });

  it("close stops sources and closes the context", async () => {
    const { player, context } = setup();
    player.enqueue(chunk(2400));
    await player.close();
    expect(context.sources[0]?.stop).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
  });
});
