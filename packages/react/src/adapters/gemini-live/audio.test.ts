import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WORKLET_SOURCE,
  createPcmPlayer,
  createResampler,
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
  static addModule: (url: string) => Promise<void> = async () => {};
  audioWorklet = FakeContext.workletSupported
    ? { addModule: vi.fn((url: string) => FakeContext.addModule(url)) }
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
  createScriptProcessor = vi.fn(
    (_bufferSize: number, _inputChannels: number, _outputChannels: number) =>
      this.processor,
  );
  createBuffer = vi.fn((_channels: number, length: number, rate: number) => ({
    duration: length / rate,
    copyToChannel: vi.fn(),
  }));
  createBufferSource = vi.fn(() => {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  });
  resume: () => Promise<void> = vi.fn(async () => {});
  close = vi.fn(async () => {
    if (this.state === "closed")
      throw new DOMException(
        "AudioContext is already closed",
        "InvalidStateError",
      );
    this.state = "closed";
  });
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

const ramp = (start: number, length: number, scale = 1) =>
  Float32Array.from({ length }, (_, i) => (start + i) * scale);

const loadWorklet = (sampleRate: number, targetRate: number) => {
  const posted: Float32Array[] = [];
  class AudioWorkletProcessor {
    port = { postMessage: (data: Float32Array) => posted.push(data) };
  }
  let Processor:
    | (new (options: { processorOptions: { targetRate: number } }) => {
        process: (inputs: Float32Array[][]) => boolean;
      })
    | undefined;
  new Function(
    "AudioWorkletProcessor",
    "sampleRate",
    "registerProcessor",
    WORKLET_SOURCE,
  )(AudioWorkletProcessor, sampleRate, (_: string, cls: typeof Processor) => {
    Processor = cls;
  });
  const processor = new Processor!({ processorOptions: { targetRate } });
  return {
    process: (...channels: Float32Array[]) => processor.process([channels]),
    posted,
  };
};

describe("resampler", () => {
  it.each([
    [48000, 3, 1365],
    [44100, 2.75625, 1486],
  ])(
    "keeps a continuous phase across 2048-frame buffers at %i Hz",
    (rate, ratio, count) => {
      const resample = createResampler(rate / 16000);
      const out = [...resample(ramp(0, 2048)), ...resample(ramp(2048, 2048))];
      expect(out).toHaveLength(count);
      for (const [k, value] of out.entries())
        expect(value).toBeCloseTo(k * ratio, 3);
    },
  );

  it("interpolates across the boundary between buffers", () => {
    const resample = createResampler(2.5);
    expect([...resample(ramp(0, 3))]).toEqual([0]);
    expect([...resample(ramp(3, 3))]).toEqual([2.5]);
  });

  it("ignores empty buffers", () => {
    const resample = createResampler(3);
    expect(resample(new Float32Array(0))).toHaveLength(0);
    expect([...resample(ramp(0, 5))]).toEqual([0, 3]);
  });

  it("produces the same output in the worklet", () => {
    const worklet = loadWorklet(44100, 16000);
    const resample = createResampler(44100 / 16000);
    const expected: number[] = [];
    for (let block = 0; block < 32; block++) {
      const input = ramp(block * 128, 128, 1 / 4096);
      worklet.process(input);
      expected.push(...resample(input));
    }
    const out = worklet.posted.flatMap((data) => [...data]);
    expect(expected).toHaveLength(1486);
    expect(out.length).toBeGreaterThan(1486 - 320);
    expect(out.length).toBeLessThanOrEqual(1486);
    for (const [k, value] of out.entries()) {
      expect(value).toBeCloseTo(expected[k]!, 6);
      expect(value).toBeCloseTo((k * 2.75625) / 4096, 6);
    }
  });

  it("posts the worklet output in 20 ms chunks", () => {
    const worklet = loadWorklet(48000, 16000);
    for (let block = 0; block < 16; block++) worklet.process(ramp(0, 128));
    expect(worklet.posted).toHaveLength(2);
    for (const data of worklet.posted)
      expect(data.length).toBeGreaterThanOrEqual(320);
  });

  it("downmixes every input channel in the worklet", () => {
    const worklet = loadWorklet(16000, 16000);
    for (let block = 0; block < 3; block++)
      worklet.process(new Float32Array(128), new Float32Array(128).fill(0.5));
    const out = worklet.posted.flatMap((data) => [...data]);
    expect(out.length).toBeGreaterThan(0);
    for (const value of out) expect(value).toBeCloseTo(0.25, 6);
  });
});

describe("microphone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeContext.instances = [];
    FakeContext.workletSupported = true;
    FakeContext.addModule = async () => {};
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
    expect(context.createScriptProcessor).toHaveBeenCalledWith(1024, 1, 1);
    const samples = Float32Array.from([0, 0.3, 0.6, 0.9, 1.2, 1.5]);
    context.processor.onaudioprocess?.({
      inputBuffer: { getChannelData: () => samples },
    });
    expect(decodePcm16(onChunk.mock.calls[0]![0] as string)).toHaveLength(2);
    expect(FakeWorklet.instances).toHaveLength(0);
  });

  it.each([
    [48000, 3, 683],
    [44100, 2.75625, 743],
  ])(
    "keeps fallback chunks below 25 ms at %i Hz without losing samples",
    async (rate, ratio, count) => {
      FakeContext.workletSupported = false;
      installBrowser();
      vi.stubGlobal(
        "AudioContext",
        class extends FakeContext {
          constructor() {
            super({ sampleRate: rate });
          }
        },
      );
      const onChunk = vi.fn();
      await openMicrophone({ sampleRate: 16000, onChunk });
      const context = FakeContext.instances[0]!;
      const size = context.createScriptProcessor.mock.calls[0]![0];
      expect(size / rate).toBeLessThan(0.025);
      for (const start of [0, size])
        context.processor.onaudioprocess?.({
          inputBuffer: { getChannelData: () => ramp(start, size, 1 / 8192) },
        });
      const out = onChunk.mock.calls.flatMap(([base64]) => [
        ...decodePcm16(base64 as string),
      ]);
      expect(out).toHaveLength(count);
      for (const [k, value] of out.entries())
        expect(Math.abs(value - (k * ratio) / 8192)).toBeLessThan(1 / 16384);
    },
  );

  it("captures with the fallback when the worklet module is blocked", async () => {
    FakeContext.addModule = async () => {
      throw new DOMException("Blocked by CSP", "SecurityError");
    };
    const browser = installBrowser();
    const onChunk = vi.fn();
    const microphone = await openMicrophone({ sampleRate: 16000, onChunk });
    const context = FakeContext.instances[0]!;
    const handler = context.processor.onaudioprocess!;
    const event = {
      inputBuffer: {
        getChannelData: () => Float32Array.from([0, 0, 0, 0.5, 0, 0]),
      },
    };
    handler(event);
    expect(onChunk).toHaveBeenCalledWith("AAD/Pw==");
    expect(browser.track.stop).not.toHaveBeenCalled();
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:worklet");
    expect(FakeWorklet.instances).toHaveLength(0);
    microphone.setMuted(true);
    handler(event);
    expect(onChunk).toHaveBeenCalledTimes(1);
    microphone.setMuted(false);
    await microphone.close();
    handler(event);
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(context.processor.onaudioprocess).toBeNull();
    expect(browser.track.stop).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
  });

  it("stops the tracks and closes the context when both capture paths fail", async () => {
    FakeContext.addModule = async () => {
      throw new Error("bad module");
    };
    const browser = installBrowser();
    vi.stubGlobal(
      "AudioContext",
      class extends FakeContext {
        override createScriptProcessor = vi.fn(() => {
          throw new Error("processor unavailable");
        });
      },
    );
    await expect(
      openMicrophone({ sampleRate: 16000, onChunk: () => {} }),
    ).rejects.toThrow("processor unavailable");
    expect(browser.track.stop).toHaveBeenCalled();
    expect(FakeContext.instances[0]?.close).toHaveBeenCalled();
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:worklet");
    expect(FakeWorklet.instances).toHaveLength(0);
  });

  it.each([false, true])(
    "cleans up an aborted setup when the module rejects: %s",
    async (rejectModule) => {
      let finishModule!: () => void;
      FakeContext.addModule = () =>
        new Promise<void>((resolve, reject) => {
          finishModule = rejectModule
            ? () => reject(new Error("blocked module"))
            : resolve;
        });
      const browser = installBrowser();
      const controller = new AbortController();
      const opening = openMicrophone({
        sampleRate: 16000,
        onChunk: () => {},
        signal: controller.signal,
      });
      await vi.waitFor(() =>
        expect(
          FakeContext.instances[0]?.audioWorklet?.addModule,
        ).toHaveBeenCalled(),
      );
      controller.abort(new Error("cancelled"));
      finishModule();
      await expect(opening).rejects.toThrow("cancelled");
      expect(browser.track.stop).toHaveBeenCalled();
      expect(FakeContext.instances[0]?.close).toHaveBeenCalled();
      expect(
        FakeContext.instances[0]?.createScriptProcessor,
      ).not.toHaveBeenCalled();
      expect(FakeWorklet.instances).toHaveLength(0);
    },
  );

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

  it("drops worklet messages that arrive after close", async () => {
    installBrowser();
    const onChunk = vi.fn();
    const microphone = await openMicrophone({ sampleRate: 16000, onChunk });
    const worklet = FakeWorklet.instances[0]!;
    const handler = worklet.port.onmessage;
    await microphone.close();
    expect(worklet.port.onmessage).toBeNull();
    handler?.({ data: Float32Array.from([0.5]) });
    expect(onChunk).not.toHaveBeenCalled();
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

  it("rejects without requesting permission when already aborted", async () => {
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
    expect(browser.getUserMedia).not.toHaveBeenCalled();
    expect(FakeContext.instances).toHaveLength(0);
  });

  it.each(["granted", "denied"])(
    "cancels a pending permission request before it is %s",
    async (permission) => {
      const browser = installBrowser();
      let grant!: (
        stream: Awaited<ReturnType<typeof browser.getUserMedia>>,
      ) => void;
      let deny!: (reason: unknown) => void;
      browser.getUserMedia.mockReturnValue(
        new Promise((resolve, reject) => {
          grant = resolve;
          deny = reject;
        }),
      );
      const controller = new AbortController();
      const onError = vi.fn();
      const opening = openMicrophone({
        sampleRate: 16000,
        onChunk: () => {},
        signal: controller.signal,
      }).catch(onError);
      const reason = new Error("cancelled");
      controller.abort(reason);
      try {
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(onError).toHaveBeenCalledWith(reason);
        expect(FakeContext.instances).toHaveLength(0);
      } finally {
        if (permission === "granted")
          grant({
            getTracks: () => [browser.track],
            getAudioTracks: () => [browser.track],
          });
        else deny(new DOMException("Permission denied", "NotAllowedError"));
        await opening;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      expect(onError).toHaveBeenCalledTimes(1);
      expect(browser.track.stop).toHaveBeenCalledTimes(
        permission === "granted" ? 1 : 0,
      );
      expect(FakeContext.instances).toHaveLength(0);
    },
  );

  it("shares pending microphone cleanup across repeated close calls", async () => {
    const browser = installBrowser();
    const microphone = await openMicrophone({
      sampleRate: 16000,
      onChunk: () => {},
    });
    const context = FakeContext.instances[0]!;
    let finishClose!: () => void;
    context.close.mockImplementation(() => {
      if (context.state === "closed")
        return Promise.reject(
          new DOMException("Already closed", "InvalidStateError"),
        );
      context.state = "closed";
      return new Promise<void>((resolve) => {
        finishClose = resolve;
      });
    });
    const settled = vi.fn();
    const first = microphone.close().then(settled);
    const second = microphone.close().then(settled);
    const both = Promise.allSettled([first, second]);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    finishClose();
    expect(await both).toEqual([
      { status: "fulfilled", value: undefined },
      { status: "fulfilled", value: undefined },
    ]);
    await expect(microphone.close()).resolves.toBeUndefined();
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(browser.track.stop).toHaveBeenCalledTimes(1);
  });

  it("releases a stream when cancellation wins just after permission resolves", async () => {
    const browser = installBrowser();
    let grant!: (
      stream: Awaited<ReturnType<typeof browser.getUserMedia>>,
    ) => void;
    browser.getUserMedia.mockReturnValue(
      new Promise((resolve) => {
        grant = resolve;
      }),
    );
    const controller = new AbortController();
    const opening = openMicrophone({
      sampleRate: 16000,
      onChunk: () => {},
      signal: controller.signal,
    });
    const reason = new Error("cancelled");
    grant({
      getTracks: () => [browser.track],
      getAudioTracks: () => [browser.track],
    });
    queueMicrotask(() => controller.abort(reason));
    await expect(opening).rejects.toBe(reason);
    expect(browser.track.stop).toHaveBeenCalledTimes(1);
  });

  it.each(["resume", "worklet"])(
    "releases the microphone without waiting for pending %s",
    async (stage) => {
      const browser = installBrowser();
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      if (stage === "worklet") FakeContext.addModule = () => pending;
      else
        vi.stubGlobal(
          "AudioContext",
          class extends FakeContext {
            override state = "suspended";
            override resume = () => pending;
          },
        );
      const controller = new AbortController();
      const onError = vi.fn();
      const opening = openMicrophone({
        sampleRate: 16000,
        onChunk: () => {},
        signal: controller.signal,
      }).catch(onError);
      await new Promise<void>((resolve) => setImmediate(resolve));
      const context = FakeContext.instances[0]!;
      const reason = new Error("cancelled");
      controller.abort(reason);
      try {
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(onError).toHaveBeenCalledWith(reason);
        expect(browser.track.stop).toHaveBeenCalledTimes(1);
        expect(context.state).toBe("closed");
      } finally {
        finish();
        await opening;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      expect(FakeWorklet.instances).toHaveLength(0);
      expect(context.createScriptProcessor).not.toHaveBeenCalled();
      expect(context.close).toHaveBeenCalledTimes(1);
      if (stage === "worklet")
        expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:worklet");
    },
  );
});

describe("playback", () => {
  afterEach(() => {
    vi.useRealTimers();
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

  it("copies the decoded samples into the buffer", () => {
    const { player, context } = setup();
    const samples = Float32Array.from([0.5, -0.25]);
    player.enqueue(encodePcm16(samples));
    const buffer = context.createBuffer.mock.results[0]!.value;
    expect(context.createBuffer).toHaveBeenCalledWith(1, 2, 24000);
    const copied = buffer.copyToChannel.mock.calls[0]![0] as Float32Array;
    expect(copied[0]).toBeCloseTo(0.5, 3);
    expect(copied[1]).toBeCloseTo(-0.25, 3);
    expect(buffer.copyToChannel).toHaveBeenCalledWith(copied, 0);
  });

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

  it("shares pending playback cleanup across repeated close calls", async () => {
    const { player, context } = setup();
    player.enqueue(chunk(2400));
    let finishClose!: () => void;
    context.close.mockImplementation(() => {
      if (context.state === "closed")
        return Promise.reject(
          new DOMException("Already closed", "InvalidStateError"),
        );
      context.state = "closed";
      return new Promise<void>((resolve) => {
        finishClose = resolve;
      });
    });
    const settled = vi.fn();
    const first = player.close().then(settled);
    const second = player.close().then(settled);
    const both = Promise.allSettled([first, second]);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    finishClose();
    expect(await both).toEqual([
      { status: "fulfilled", value: undefined },
      { status: "fulfilled", value: undefined },
    ]);
    await expect(player.close()).resolves.toBeUndefined();
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(context.sources[0]?.stop).toHaveBeenCalledTimes(1);
  });

  it("handles a pending resume rejected when playback closes", async () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    const { player, context } = setup(onIdle);
    let rejectResume!: (reason: unknown) => void;
    const resume = new Promise<void>((_resolve, reject) => {
      rejectResume = reject;
    });
    context.state = "suspended";
    context.resume = () => resume;
    context.close.mockImplementation(async () => {
      context.state = "closed";
      rejectResume(
        new DOMException("AudioContext closed", "InvalidStateError"),
      );
    });
    player.enqueue(chunk(2400));
    await player.close();
    await vi.advanceTimersByTimeAsync(1000);
    expect(context.state).toBe("closed");
    expect(player.isPlaying()).toBe(false);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("does not report idle for a source that ends after close", async () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    const { player, context } = setup(onIdle);
    player.enqueue(chunk(2400));
    await player.close();
    expect(context.sources[0]?.onended).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onIdle).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
