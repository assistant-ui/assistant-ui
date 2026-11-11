import { describe, expect, it, vi } from "vitest";
import type { CheckoutClient } from "setup-agent";
import {
  agentBriefing,
  boxed,
  clipboardCommands,
  copyToClipboard,
  createSetupId,
  DEFAULT_DOCS_URL,
  DEFAULT_SETUP_APP_URL,
  DEFAULT_SETUP_SERVER,
  parseCatalog,
  parseProducts,
  resolveEndpoints,
  resolveProducts,
  setupPageUrl,
  setupPrompt,
  startSetup,
} from "./setup-session";

describe("parseProducts", () => {
  it("defaults to assistant-ui and dedupes a list", () => {
    expect(parseProducts(undefined)).toEqual(["assistant-ui"]);
    expect(parseProducts(" ")).toEqual(["assistant-ui"]);
    expect(parseProducts("assistant-ui, cloud,cloud")).toEqual([
      "assistant-ui",
      "cloud",
    ]);
  });

  it("accepts slugs with path segments and refuses what is not a slug", () => {
    expect(parseProducts("guides/latex")).toEqual(["guides/latex"]);
    expect(() => parseProducts("cloud;rm")).toThrow('"cloud;rm"');
    expect(() => parseProducts("../etc")).toThrow('"../etc"');
    expect(() => parseProducts("guides//x")).toThrow('"guides//x"');
  });
});

describe("resolveProducts", () => {
  const catalog = `# assistant-ui catalog

## assistant-ui

Slug: assistant-ui
Kind: Library

## Assistant Cloud

Slug: cloud

- Thread persistence that saves during streaming

## Guides and elements

- react-app: React project (https://docs.test/docs/installation.md, agent time 2–5 min)
- guides/latex: LaTeX math (https://docs.test/docs/guides/latex.md, agent time 2–5 min)
`;

  it("reads names of products, guides and elements from the catalog", () => {
    expect([...parseCatalog(catalog)]).toEqual([
      ["assistant-ui", "assistant-ui"],
      ["cloud", "Assistant Cloud"],
      ["react-app", "React project"],
      ["guides/latex", "LaTeX math"],
    ]);
  });

  it("names products and points each at its install guide", async () => {
    await expect(
      resolveProducts(["cloud"], "https://docs.test", async () =>
        parseCatalog(catalog),
      ),
    ).resolves.toEqual([
      {
        slug: "cloud",
        name: "Assistant Cloud",
        guide: "https://docs.test/install.md?items=cloud",
      },
    ]);
  });

  it("refuses a product the catalog does not list", async () => {
    await expect(
      resolveProducts(["nope"], "https://docs.test", async () =>
        parseCatalog(catalog),
      ),
    ).rejects.toThrow(
      'unknown product "nope"; pick from assistant-ui, cloud, react-app, guides/latex',
    );
  });

  it("falls back to the slug when the catalog is unreachable", async () => {
    await expect(
      resolveProducts(
        ["assistant-ui"],
        "https://docs.test",
        async () => undefined,
      ),
    ).resolves.toEqual([
      {
        slug: "assistant-ui",
        name: "assistant-ui",
        guide: "https://docs.test/install.md?items=assistant-ui",
      },
    ]);
  });
});

describe("resolveEndpoints", () => {
  it("uses production unless a flag or the environment says otherwise", () => {
    expect(resolveEndpoints({}, {})).toEqual({
      docsUrl: "https://www.assistant-ui.com",
      setupServer: "https://checkout.assistant-ui.com",
      setupAppUrl: "https://setup.assistant-ui.com",
    });
    expect(
      resolveEndpoints(
        { setupServer: "http://localhost:8791/" },
        {
          ASSISTANT_UI_DOCS_URL: "http://localhost:3000",
          ASSISTANT_UI_SETUP_APP_URL: "http://localhost:3011",
        },
      ),
    ).toEqual({
      docsUrl: "http://localhost:3000",
      setupServer: "http://localhost:8791",
      setupAppUrl: "http://localhost:3011",
    });
  });

  it("opens the browser on the setup app and meets the agent on the setup worker by default", () => {
    expect(DEFAULT_SETUP_APP_URL).toBe("https://setup.assistant-ui.com");
    expect(DEFAULT_SETUP_SERVER).toBe("https://checkout.assistant-ui.com");
    expect(DEFAULT_DOCS_URL).toBe("https://www.assistant-ui.com");
    expect(setupPageUrl(DEFAULT_SETUP_APP_URL, "abcd1234", "efgh5678")).toBe(
      "https://setup.assistant-ui.com/#link=abcd1234&setup=efgh5678",
    );
  });

  it("refuses plain http off this machine", () => {
    expect(() => resolveEndpoints({ docsUrl: "http://evil.test" }, {})).toThrow(
      "https",
    );
  });
});

describe("startSetup", () => {
  it("creates the setup on a new link and begins its plan", async () => {
    const calls: [string, unknown][] = [];
    const dispose = vi.fn();
    const commands = new Proxy(
      {},
      {
        get: (_, name: string) => async (params: unknown) => {
          calls.push([name, params]);
        },
      },
    );
    const connect = vi.fn(
      async () => ({ commands, dispose }) as unknown as CheckoutClient,
    );
    const products = [{ slug: "assistant-ui", name: "assistant-ui" }];
    const setup = await startSetup({
      endpoints: {
        docsUrl: "https://docs.test",
        setupServer: "https://checkout.test",
        setupAppUrl: "https://setup.test",
      },
      products,
      env: { CLAUDECODE: "1" },
      connect,
    });
    expect(setup.linkId).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(setup.agentUrl).toBe(`https://checkout.test/${setup.linkId}`);
    expect(connect).toHaveBeenCalledWith(setup.agentUrl);
    expect(setup.browserUrl).toBe(
      `https://setup.test/#link=${setup.linkId}&setup=${setup.setupId}`,
    );
    expect(calls).toEqual([
      ["checkout/create", { id: setup.setupId, products }],
      ["checkout/begin-plan", undefined],
      ["agent/intro", { kind: "claude" }],
    ]);
    expect(dispose).toHaveBeenCalled();
  });
});

describe("agentBriefing", () => {
  const setup = {
    linkId: "abc",
    setupId: "def",
    agentUrl: "https://setup.test/abc",
    browserUrl: setupPageUrl("https://setup.test", "abc", "def"),
    products: [{ slug: "assistant-ui", name: "assistant-ui" }],
  };

  it("gives the page, the playbook without a Begin plan handoff, and the setup", () => {
    const briefing = agentBriefing(setup, true);
    expect(briefing).toMatch(
      /^The setup opened in the user's browser at\n {2}https:\/\/setup\.test\/#link=abc&setup=def\n/,
    );
    expect(briefing).toContain("npx setup-agent https://setup.test/abc stream");
    expect(briefing).not.toContain("click Begin plan");
    expect(briefing).toContain('"status":"planning"');
  });

  it("asks the agent to share the link when the browser was not opened", () => {
    const briefing = agentBriefing(setup, false);
    expect(briefing).toMatch(
      /^Ask the user to open the setup in their browser at/,
    );
    expect(briefing).toContain(`"Open ${setup.browserUrl} to follow`);
    expect(briefing).not.toContain("I opened the assistant-ui setup");
  });
});

describe("the prompt for a person", () => {
  it("is the bare prompt, naming the command only for products other than the default", () => {
    expect(setupPrompt()).toBe("set up assistant-ui");
    expect(setupPrompt(["assistant-ui"])).toBe(setupPrompt());
    expect(setupPrompt(["assistant-ui", "cloud"])).toBe(
      "set up assistant-ui with `npx assistant-ui@latest setup --products assistant-ui,cloud`",
    );
  });

  it("draws the prompt in a box", () => {
    expect(boxed("hi", 1)).toBe(
      ["┌────┐", "│    │", "│ hi │", "│    │", "└────┘"].join("\n"),
    );
  });

  it("copies with the platform's clipboard command", async () => {
    expect(clipboardCommands("darwin", {})).toEqual([
      { command: "pbcopy", args: [] },
    ]);
    expect(clipboardCommands("win32", {})[0]?.command).toBe("clip");
    expect(
      clipboardCommands("linux", { WAYLAND_DISPLAY: "wayland-0" }).map(
        (entry) => entry.command,
      ),
    ).toEqual(["wl-copy", "xclip", "xsel"]);
    expect(
      clipboardCommands("linux", {}).map((entry) => entry.command),
    ).toEqual(["xclip", "xsel", "wl-copy"]);
  });

  it.skipIf(process.platform === "win32")(
    "tries the next clipboard command when one fails",
    async () => {
      expect(
        await copyToClipboard("x", [
          { command: "no-such-clipboard-xyz", args: [] },
          { command: "false", args: [] },
          { command: "cat", args: [] },
        ]),
      ).toBe(true);
      expect(await copyToClipboard("x", [{ command: "false", args: [] }])).toBe(
        false,
      );
    },
  );
});

describe("createSetupId", () => {
  it("uses the browser's alphabet and length", () => {
    expect(createSetupId()).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(createSetupId()).not.toBe(createSetupId());
  });
});
