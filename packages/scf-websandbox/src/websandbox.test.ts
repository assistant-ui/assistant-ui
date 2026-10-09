import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostConnection } from "./connection";
import { CONNECT_MESSAGE, HELLO_MESSAGE } from "./frameRuntime";
import Websandbox, {
  BaseOptions,
  prepareFrameContent,
  sandboxFlags,
} from "./websandbox";

const FRAME_ORIGIN = "https://abc-h184756.scf.auiusercontent.com";

type RenderCall = {
  product: string;
  options: Record<string, unknown>;
  html: string;
  container: HTMLElement;
  opts: { signal: AbortSignal; unsafeDocumentWrite: boolean };
  resolve: (frame: ReturnType<typeof fakeFrame>) => void;
  reject: (error: unknown) => void;
};

const scf = vi.hoisted(() => ({ renders: [] as unknown[] }));

vi.mock("safe-content-frame", async (importOriginal) => {
  const actual = await importOriginal<typeof import("safe-content-frame")>();
  class SafeContentFrame {
    product: string;
    options: Record<string, unknown>;
    constructor(product: string, options: Record<string, unknown>) {
      this.product = product;
      this.options = options;
    }
    renderHtml(html: string, container: HTMLElement, opts: unknown) {
      return new Promise((resolve, reject) => {
        scf.renders.push({
          product: this.product,
          options: this.options,
          html,
          container,
          opts,
          resolve,
          reject,
        });
      });
    }
  }
  return { ...actual, SafeContentFrame };
});

const ports: MessagePort[] = [];

function fakeFrame(container: HTMLElement) {
  const iframe = document.createElement("iframe");
  container.appendChild(iframe);
  let rejectLoaded!: (error: unknown) => void;
  const loaded = new Promise<void>((_, reject) => {
    rejectLoaded = reject;
  });
  return {
    iframe,
    origin: FRAME_ORIGIN,
    sendMessage: vi.fn(),
    fullyLoadedPromiseWithTimeout: vi.fn(() => loaded),
    dispose: vi.fn(() => iframe.remove()),
    rejectLoaded,
  };
}

function lastRender() {
  return scf.renders.at(-1) as RenderCall;
}

async function renderFrame() {
  const call = lastRender();
  const frame = fakeFrame(call.container);
  call.resolve(frame);
  await vi.waitFor(() =>
    expect(frame.fullyLoadedPromiseWithTimeout).toHaveBeenCalled(),
  );
  return frame;
}

function tokenOf(html: string) {
  const match = /\.apply\(null, \["[^"]*","([0-9a-f]+)"\]\)/.exec(html);
  return match![1]!;
}

function hello(
  frame: ReturnType<typeof fakeFrame>,
  token: string,
  overrides: { origin?: string; source?: MessageEventSource | null } = {},
) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type: HELLO_MESSAGE, token },
      origin: overrides.origin ?? FRAME_ORIGIN,
      source:
        "source" in overrides ? overrides.source! : frame.iframe.contentWindow,
    }),
  );
}

/** Plays the in-frame side over the port handed to the frame. */
function connectPeer(frame: ReturnType<typeof fakeFrame>, callIndex = -1) {
  const [message, transfer] = frame.sendMessage.mock.calls.at(callIndex)!;
  expect(message).toEqual({ type: CONNECT_MESSAGE, token: expect.any(String) });
  const port = (transfer as MessagePort[])[0]!;
  ports.push(port);
  const peer = new HostConnection();
  const services = {
    runCode: vi.fn(),
    importScript: vi.fn(),
    injectStyle: vi.fn(() => "ignored"),
  };
  peer.setServiceMethods(services);
  port.onmessage = (event) => peer.handle(event.data);
  peer.attach((m) => port.postMessage(m));
  return { peer, services };
}

async function readySandbox(localApi = {}, options = {}) {
  const sandbox = Websandbox.create(localApi, options);
  const frame = await renderFrame();
  hello(frame, tokenOf(lastRender().html));
  const { peer, services } = connectPeer(frame);
  void peer.callRemoteServiceMethod("iframeInitialized");
  await expect(sandbox.promise).resolves.toBe(sandbox);
  return { sandbox, frame, peer, services };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="slot"></div>';
});

afterEach(() => {
  scf.renders.length = 0;
  for (const port of ports.splice(0)) port.close();
});

describe("prepareFrameContent", () => {
  it("places init code first, then base, and styles after the runtime", () => {
    const html = prepareFrameContent(
      {
        frameContent: "<html><head><title>x</title></head></html>",
        codeToRunBeforeInit: "window.before = 1",
        baseUrl: 'https://cdn.example/"a"&<b>/',
        initialStyles: "a::after { content: '$&' }",
      },
      "RUNTIME",
    );
    expect(html).toBe(
      "<html><head>\n" +
        "<script>window.before = 1</script>\n" +
        '<base href="https://cdn.example/&quot;a&quot;&amp;&lt;b>/"/><title>x</title>' +
        "<script>RUNTIME</script>\n" +
        "<style>a::after { content: '$&' }</style>\n" +
        "</head></html>",
    );
  });

  it("only injects the runtime by default", () => {
    expect(prepareFrameContent(BaseOptions, "RUNTIME")).toBe(
      BaseOptions.frameContent.replace(
        "</head>",
        "<script>RUNTIME</script>\n</head>",
      ),
    );
  });
});

describe("sandboxFlags", () => {
  it("splits additional attributes and adds pointer lock", () => {
    expect(
      sandboxFlags({
        sandboxAdditionalAttributes: " allow-forms  allow-popups allow-forms ",
        allowPointerLock: true,
      }),
    ).toEqual(["allow-forms", "allow-popups", "allow-pointer-lock"]);
    expect(
      sandboxFlags({
        sandboxAdditionalAttributes: "",
        allowPointerLock: false,
      }),
    ).toEqual([]);
  });
});

describe("Websandbox.create", () => {
  it("renders into document.body through Safe Content Frame by default", () => {
    const sandbox = Websandbox.create({});
    const call = lastRender();
    expect(call.product).toBe("websandbox");
    expect(call.options).toEqual({ sandbox: [] });
    expect(call.container).toBe(document.body);
    expect(call.opts.signal).toBeInstanceOf(AbortSignal);
    expect(call.opts.unsafeDocumentWrite).toBe(false);
    expect(call.html).toContain(`.apply(null, ["${window.location.origin}","`);
    expect(sandbox.iframe).toBeNull();
    expect(sandbox.origin).toBeNull();
  });

  it("maps options onto Safe Content Frame", () => {
    const container = document.getElementById("slot")!;
    Websandbox.create(
      {},
      {
        frameContainer: container,
        product: "my-product",
        sandboxAdditionalAttributes: "allow-forms",
        allowPointerLock: true,
        safeContentFrame: { useShadowDom: true, salt: "s" },
        unsafeDocumentWrite: true,
      },
    );
    const call = lastRender();
    expect(call.product).toBe("my-product");
    expect(call.options).toEqual({
      useShadowDom: true,
      salt: "s",
      sandbox: ["allow-forms", "allow-pointer-lock"],
    });
    expect(call.container).toBe(container);
    expect(call.opts.unsafeDocumentWrite).toBe(true);
  });

  it("resolves a selector container", () => {
    Websandbox.create({}, { frameContainer: "#slot" });
    expect(lastRender().container).toBe(document.getElementById("slot"));
  });

  it("does not mutate BaseOptions", () => {
    Websandbox.create({}, { frameClassName: "custom" });
    expect(BaseOptions.frameClassName).toBe("websandbox__frame");
    expect(Object.isFrozen(BaseOptions)).toBe(true);
  });

  it("throws for unsupported or invalid options", () => {
    expect(() =>
      Websandbox.create({}, { frameSrc: "https://example.com/frame.html" }),
    ).toThrow(/`frameSrc` is not supported/);
    expect(() =>
      Websandbox.create({}, { frameContent: "<html><body></body></html>" }),
    ).toThrow('Websandbox: iFrame content must have "<head>" tag.');
    expect(() => Websandbox.create({}, { frameContainer: "#missing" })).toThrow(
      "Websandbox: Cannot find container for sandbox #missing",
    );
    expect(scf.renders).toHaveLength(0);
  });

  it("applies the class name and fullscreen permission to the iframe", async () => {
    const sandbox = Websandbox.create(
      {},
      { frameClassName: "my-frame", allowFullScreen: true, loadTimeout: 1234 },
    );
    const frame = await renderFrame();
    expect(frame.iframe.className).toBe("my-frame");
    expect(frame.iframe.allow).toBe("fullscreen");
    expect(frame.iframe.allowFullscreen).toBe(true);
    expect(frame.fullyLoadedPromiseWithTimeout).toHaveBeenCalledWith(1234);
    expect(sandbox.iframe).toBe(frame.iframe);
    expect(sandbox.origin).toBe(FRAME_ORIGIN);
  });
});

describe("handshake", () => {
  it("ignores hellos from the wrong source, origin or token", async () => {
    Websandbox.create({});
    const frame = await renderFrame();
    const token = tokenOf(lastRender().html);

    hello(frame, token, { origin: "https://evil.example" });
    hello(frame, token, { source: window });
    hello(frame, "not-the-token");
    window.dispatchEvent(
      new MessageEvent("message", {
        data: null,
        origin: FRAME_ORIGIN,
        source: frame.iframe.contentWindow,
      }),
    );
    expect(frame.sendMessage).not.toHaveBeenCalled();

    hello(frame, token);
    expect(frame.sendMessage).toHaveBeenCalledWith(
      { type: CONNECT_MESSAGE, token },
      [expect.anything()],
    );
  });

  it("resolves the promise after sending the local API", async () => {
    const localApi = { add: (a: number, b: number) => a + b };
    const { sandbox, peer } = await readySandbox(localApi);
    expect(sandbox.connection.localApi).toBe(localApi);
    await peer.remoteMethodsWaitPromise;
    await expect(peer.remote["add"]!(1, 2)).resolves.toBe(3);
  });

  it("treats a null local API as empty", async () => {
    const { peer } = await readySandbox(null as never);
    await peer.remoteMethodsWaitPromise;
    expect(peer.remote).toEqual({});
  });

  it("calls methods the frame exposes", async () => {
    const { sandbox, peer } = await readySandbox();
    await peer.setLocalApi({ shout: (s: string) => s.toUpperCase() });
    await sandbox.connection.remoteMethodsWaitPromise;
    await expect(sandbox.connection.remote["shout"]!("hi")).resolves.toBe("HI");
  });

  it("connects only once", async () => {
    const { frame, sandbox, services } = await readySandbox();
    hello(frame, tokenOf(lastRender().html));
    expect(frame.sendMessage).toHaveBeenCalledTimes(1);
    await sandbox.run("still-connected");
    expect(services.runCode).toHaveBeenCalledWith("still-connected");
  });
});

describe("sandbox methods", () => {
  it("runs code strings and stringified functions", async () => {
    const { sandbox, services } = await readySandbox();
    await sandbox.run("console.log(1)");
    await sandbox.run(function named() {
      return 1;
    });
    await sandbox.run(() => 2);
    expect(services.runCode.mock.calls).toEqual([
      ["console.log(1)"],
      [expect.stringMatching(/^\(function named\(\) \{[\s\S]*\}\)\(\)$/)],
      [expect.stringMatching(/^\(\(\) => 2\)\(\)$/)],
    ]);
  });

  it("imports scripts and injects styles", async () => {
    const { sandbox, services } = await readySandbox();
    await sandbox.importScript("https://cdn.example/lib.js");
    await expect(sandbox.injectStyle("body{}")).resolves.toBeUndefined();
    expect(services.importScript).toHaveBeenCalledWith(
      "https://cdn.example/lib.js",
    );
    expect(services.injectStyle).toHaveBeenCalledWith("body{}");
  });

  it("queues calls made before the frame connects", async () => {
    const sandbox = Websandbox.create({});
    const run = sandbox.run("early()");
    const frame = await renderFrame();
    hello(frame, tokenOf(lastRender().html));
    const { services } = connectPeer(frame);
    await run;
    expect(services.runCode).toHaveBeenCalledWith("early()");
  });
});

describe("failures", () => {
  it("rejects the promise when rendering fails", async () => {
    const sandbox = Websandbox.create({});
    lastRender().reject(new Error("render failed"));
    await expect(sandbox.promise).rejects.toThrow("render failed");
  });

  it("rejects the promise when the shim reports an error", async () => {
    const sandbox = Websandbox.create({});
    const frame = await renderFrame();
    frame.rejectLoaded(
      Object.assign(new Error("bad shim"), { code: "shim-error" }),
    );
    await expect(sandbox.promise).rejects.toThrow("bad shim");
  });

  it("ignores a render timeout, which may still recover", async () => {
    const sandbox = Websandbox.create({});
    const frame = await renderFrame();
    frame.rejectLoaded(
      Object.assign(new Error("Timeout"), { code: "render-timeout" }),
    );
    hello(frame, tokenOf(lastRender().html));
    const { peer } = connectPeer(frame);
    void peer.callRemoteServiceMethod("iframeInitialized");
    await expect(sandbox.promise).resolves.toBe(sandbox);
  });
});

describe("destroy", () => {
  it("disposes the frame, stops listening and rejects calls", async () => {
    const { sandbox, frame, peer } = await readySandbox();
    await peer.setLocalApi({ never: () => new Promise(() => {}) });
    const pending = sandbox.connection.remote["never"]!();
    const signal = lastRender().opts.signal;

    sandbox.destroy();
    sandbox.destroy();

    expect(frame.dispose).toHaveBeenCalledTimes(1);
    expect(signal.aborted).toBe(true);
    expect(sandbox.iframe).toBeNull();
    await expect(pending).rejects.toThrow("Websandbox: sandbox was destroyed");
    await expect(sandbox.run("x")).rejects.toThrow(
      "Websandbox: sandbox was destroyed",
    );

    hello(frame, tokenOf(lastRender().html));
    expect(frame.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("disposes a frame that finishes rendering after destroy", async () => {
    const sandbox = Websandbox.create({});
    sandbox.destroy();
    const call = lastRender();
    const frame = fakeFrame(call.container);
    call.resolve(frame);
    await vi.waitFor(() => expect(frame.dispose).toHaveBeenCalled());
    expect(frame.fullyLoadedPromiseWithTimeout).not.toHaveBeenCalled();
  });

  it("leaves the promise pending when destroyed early", async () => {
    const sandbox = Websandbox.create({});
    sandbox.destroy();
    lastRender().reject(new DOMException("aborted", "AbortError"));
    const outcome = await Promise.race([
      sandbox.promise.then(
        () => "resolved",
        () => "rejected",
      ),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 10)),
    ]);
    expect(outcome).toBe("pending");
  });
});
