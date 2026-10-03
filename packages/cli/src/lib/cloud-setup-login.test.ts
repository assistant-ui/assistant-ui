import { afterEach, describe, expect, it, vi } from "vitest";
import { connectCloudLoginSetup, setupLoginUrl } from "./cloud-setup-login";

const fixture = vi.hoisted(() => ({
  state: {
    version: 2,
    id: "session-a",
    status: "planning",
    inputs: [] as {
      id: string;
      status: string;
      preset?: string;
      help?: { href?: string };
    }[],
  } as
    | {
        version: number;
        id: string | null;
        status: string;
        inputs: {
          id: string;
          status: string;
          preset?: string;
          help?: { href?: string };
        }[];
      }
    | undefined,
  status: "connected",
  listeners: new Set<() => void>(),
  ask: vi.fn(),
  answer: vi.fn(),
  dispose: vi.fn(),
  transport: vi.fn(),
}));
vi.mock("statewire", async (importOriginal) => ({
  ...(await importOriginal<typeof import("statewire")>()),
  StatewireHttp: (...args: unknown[]) => fixture.transport(...args),
  StatewireClient: class {
    get state() {
      return fixture.state;
    }
    get connection() {
      return { status: fixture.status };
    }
    commands = { "agent/ask": fixture.ask, "checkout/answer": fixture.answer };
    subscribe = (listener: () => void) => {
      fixture.listeners.add(listener);
      return () => fixture.listeners.delete(listener);
    };
    dispose = fixture.dispose;
  },
}));

const issuer = "https://accounts.assistant-ui.com";
const authorization = () => ({
  deviceCode: "private-device-code",
  userCode: "ABCD-EFGH",
  verificationUri: `${issuer}/device`,
  verificationUriComplete: `${issuer}/device?user_code=ABCD-EFGH&device_code=do-not-forward`,
  expiresAt: Date.now() + 60_000,
  intervalMs: 5_000,
  resource: `${issuer}/api/auth`,
});
const update = () => {
  for (const listener of fixture.listeners) listener();
};
afterEach(() => {
  fixture.state = {
    version: 2,
    id: "session-a",
    status: "planning",
    inputs: [],
  };
  fixture.status = "connected";
  fixture.listeners.clear();
  vi.useRealTimers();
});

describe("cloud setup device login", () => {
  it("shares only the public code, trusted approval URL, expiration and attempt", () => {
    const url = new URL(setupLoginUrl(authorization(), issuer));
    expect(url.origin).toBe(issuer);
    expect([...url.searchParams.keys()]).toEqual([
      "user_code",
      "setup_attempt",
      "setup_expires",
    ]);
    expect(url.searchParams.get("user_code")).toBe("ABCD-EFGH");
    expect(url.searchParams.get("setup_attempt")).toMatch(/^[0-9a-f-]{36}$/);
    expect(url.href).not.toContain("private-device-code");
    expect(url.href).not.toContain("device_code");
  });
  it.each([
    {
      verificationUriComplete:
        "https://accounts.assistant-ui.com.evil.test/device?user_code=ABCD-EFGH",
    },
    { verificationUriComplete: `${issuer}/device?user_code=WRONG` },
    {
      verificationUriComplete: `${issuer}/device?user_code=ABCD-EFGH&user_code=SECOND`,
    },
    { verificationUriComplete: `${issuer}/device?user_code=ABCD-EFGH#token` },
    { expiresAt: 1 },
    { expiresAt: Date.now() + 60 * 60_000 },
  ])("rejects unexpected approval metadata %j", (patch) => {
    expect(() =>
      setupLoginUrl({ ...authorization(), ...patch }, issuer),
    ).toThrow("invalid device approval link");
  });
  it("rejects arbitrary issuers and malformed attempt identifiers", () => {
    expect(() =>
      setupLoginUrl(authorization(), "https://accounts.other.test"),
    ).toThrow();
    expect(() =>
      setupLoginUrl(authorization(), issuer, "../redirect"),
    ).toThrow();
  });
  it("publishes a reserved input and sends only terminal status after CLI approval", async () => {
    fixture.ask.mockResolvedValue({ inputId: "q1" });
    fixture.answer.mockResolvedValue(undefined);
    const bridge = await connectCloudLoginSetup(
      "https://checkout.test/session-a",
    );
    await bridge.publish(authorization(), issuer);
    expect(fixture.ask).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: "text",
        preset: "assistant-ui-cli-login",
      }),
    );
    const call = fixture.ask.mock.lastCall![0];
    expect(JSON.stringify(call)).not.toContain("private-device-code");
    await bridge.complete("signed-in");
    expect(fixture.answer).toHaveBeenLastCalledWith({
      inputId: "q1",
      answer: "signed-in",
    });
    await bridge.dispose();
    expect(fixture.listeners.size).toBe(0);
  });
  it("ignores a forged answer, but cancels a dismissed input", async () => {
    fixture.ask.mockResolvedValue({ inputId: "q2" });
    const bridge = await connectCloudLoginSetup(
      "http://127.0.0.1:8791/session-a",
    );
    await bridge.publish(authorization(), issuer);
    fixture.state!.inputs = [{ id: "q2", status: "answered" }];
    update();
    expect(bridge.signal.aborted).toBe(false);
    fixture.state!.inputs[0]!.status = "dismissed";
    update();
    expect(bridge.signal.aborted).toBe(true);
    const count = fixture.ask.mock.calls.length;
    await expect(bridge.publish(authorization(), issuer)).rejects.toThrow(
      "cancelled",
    );
    expect(fixture.ask.mock.calls.length).toBe(count);
    await bridge.dispose();
  });
  it.each(["cancelled", "done"])(
    "cancels when the checkout becomes %s",
    async (status) => {
      const bridge = await connectCloudLoginSetup(
        "https://checkout.test/session-a",
      );
      fixture.state!.status = status;
      update();
      expect(bridge.signal.aborted).toBe(true);
      await bridge.dispose();
    },
  );
  it("cancels when the original session is replaced", async () => {
    const bridge = await connectCloudLoginSetup(
      "https://checkout.test/session-a",
    );
    fixture.state!.id = "session-b";
    update();
    expect(bridge.signal.aborted).toBe(true);
    await bridge.dispose();
  });
  it("disposes a connection that never supplies a snapshot before its deadline", async () => {
    fixture.state = undefined;
    fixture.status = "connecting";
    const deadline = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValueOnce(deadline.signal);
    const count = fixture.dispose.mock.calls.length;
    try {
      const connection = connectCloudLoginSetup(
        "https://checkout.test/session-a",
      );
      deadline.abort(new Error("snapshot timeout"));
      await expect(connection).rejects.toThrow("snapshot timeout");
      expect(fixture.dispose.mock.calls.length).toBe(count + 1);
      expect(fixture.listeners.size).toBe(0);
    } finally {
      timeout.mockRestore();
    }
  });
  it("observes dismissal even when it arrives before the ask response", async () => {
    let finish!: (result: { inputId: string }) => void;
    fixture.ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const bridge = await connectCloudLoginSetup(
      "https://checkout.test/session-a",
    );
    const publishing = bridge.publish(authorization(), issuer);
    fixture.state!.inputs = [{ id: "q3", status: "dismissed" }];
    update();
    finish({ inputId: "q3" });
    await expect(publishing).rejects.toThrow("cancelled");
    expect(bridge.signal.aborted).toBe(true);
    await bridge.dispose();
  });
  it("reconciles an accepted prompt from its snapshot when the ask acknowledgment times out", async () => {
    let finish!: (result: { inputId: string }) => void;
    fixture.ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    fixture.answer.mockResolvedValue(undefined);
    const bridge = await connectCloudLoginSetup(
      "https://checkout.test/session-a",
    );
    const deadline = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValueOnce(deadline.signal);
    const publishing = bridge.publish(authorization(), issuer);
    const href = fixture.ask.mock.lastCall![0].help.href;
    fixture.state!.inputs = [
      {
        id: "late",
        status: "pending",
        preset: "assistant-ui-cli-login",
        help: { href },
      },
    ];
    update();
    deadline.abort(new Error("ask timeout"));
    await expect(publishing).rejects.toThrow("ask timeout");
    expect(fixture.answer).toHaveBeenLastCalledWith({
      inputId: "late",
      answer: "failed",
    });
    const disposing = bridge.dispose();
    finish({ inputId: "late" });
    await disposing;
    expect(fixture.ask).toHaveBeenCalledOnce();
    expect(fixture.answer).toHaveBeenCalledOnce();
    expect(fixture.listeners.size).toBe(0);
    timeout.mockRestore();
  });
  it("reconciles a late accepted prompt after cancellation without replaying the ask", async () => {
    let finish!: (result: { inputId: string }) => void;
    fixture.ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    fixture.answer.mockResolvedValue(undefined);
    const bridge = await connectCloudLoginSetup(
      "https://checkout.test/session-a",
    );
    const deadline = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValueOnce(deadline.signal);
    const publishing = bridge.publish(authorization(), issuer);
    deadline.abort(new Error("ask timeout"));
    await expect(publishing).rejects.toThrow("ask timeout");
    await bridge.complete("cancelled");
    const disposing = bridge.dispose();
    finish({ inputId: "late" });
    await disposing;
    expect(fixture.answer).toHaveBeenLastCalledWith({
      inputId: "late",
      answer: "cancelled",
    });
    expect(fixture.ask).toHaveBeenCalledOnce();
    timeout.mockRestore();
  });
  it("never reconciles a late acknowledgment into a replacement session with reused input IDs", async () => {
    let finish!: (result: { inputId: string }) => void;
    fixture.ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const bridge = await connectCloudLoginSetup(
      "https://checkout.test/session-a",
    );
    const publishing = bridge.publish(authorization(), issuer);
    fixture.state!.id = "session-b";
    fixture.state!.inputs = [{ id: "q1", status: "pending" }];
    update();
    await expect(publishing).rejects.toThrow("cancelled");
    await bridge.complete("cancelled");
    const disposing = bridge.dispose();
    finish({ inputId: "q1" });
    await disposing;
    expect(fixture.answer).not.toHaveBeenCalled();
  });
  it("disposes a stopped connection before requesting a device grant", async () => {
    fixture.state = undefined;
    fixture.status = "stopped";
    const count = fixture.dispose.mock.calls.length;
    await expect(
      connectCloudLoginSetup("https://checkout.test/session-a"),
    ).rejects.toThrow("stopped");
    expect(fixture.dispose.mock.calls.length).toBe(count + 1);
    expect(fixture.listeners.size).toBe(0);
  });
  it.each([
    "https://user:pass@checkout.test/session",
    "http://remote.test/session",
    "https://checkout.test/session?token=x",
  ])("rejects unsafe setup targets %s", async (url) => {
    await expect(connectCloudLoginSetup(url)).rejects.toThrow("HTTPS");
  });
});
