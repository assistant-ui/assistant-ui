import { describe, expect, it } from "vitest";
import { parseGuide } from "setup-agent";
import worker from "./index";
import { buildGuide, respondToGuideRequest, type GuideContext } from "./guide";

const CONTEXTS: GuideContext[] = (
  ["user", "agent", "agent-stream"] as const
).flatMap((started) => [true, false].map((opened) => ({ started, opened })));
const briefing = (context: GuideContext) => buildGuide(context).texts.briefing!;

describe("buildGuide", () => {
  it("serves a guide the CLI accepts unchanged, for every context", () => {
    for (const context of CONTEXTS) {
      const guide = buildGuide(context);
      expect(parseGuide(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
    }
  });

  it("serves only text and the CLI's three local actions, for every context", () => {
    for (const context of CONTEXTS) {
      const guide = buildGuide(context);
      expect(guide.protocol).toBe(1);
      expect(guide.intro).toEqual([
        { action: "announce-agent" },
        { action: "print", text: "briefing" },
        { action: "print", text: "intro.status-heading" },
        { action: "print-status" },
      ]);
      for (const step of guide.intro)
        if (step.action === "print")
          expect(guide.texts[step.text]).toBeTypeOf("string");
      for (const text of Object.values(guide.texts))
        // oxlint-disable-next-line no-control-regex
        expect(text).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
    }
  });

  it("tells the agent to run the setup to the end and block on answers", () => {
    for (const context of CONTEXTS) {
      const text = briefing(context);
      expect(text).toContain("Run the setup to the end in one go.");
      expect(text).toContain("never end your turn to wait for an answer");
      expect(text).toContain("{{cmd}} {{url}} wait <input-id>\n");
      expect(text).toContain('never repeat an "ask" or "plan"');
      expect(text).not.toMatch(/\b(?:cart|shop|checkout|purchase)\b/i);
      // The icon pack is the CLI's, which validates icons against it.
      expect(text).toContain("from this pack: {{icons}}.");
    }
  });

  it("waits for the setup page to start the plan only for a setup the user opened", () => {
    for (const context of CONTEXTS)
      expect(briefing(context)).not.toContain("click Begin plan");
    expect(briefing({ started: "user", opened: true })).toContain(
      "{{cmd}} {{url}} wait start\nKeep the stream running while you wait.",
    );
    expect(briefing({ started: "agent", opened: true })).toContain(
      "there is no Begin plan click to wait for",
    );
    // Without a browser, every stream command the agent is told to run keeps --no-open.
    for (const started of ["agent", "agent-stream"] as const)
      expect(briefing({ started, opened: false })).not.toMatch(
        /\{\{url\}\} stream(?! --no-open)/,
      );
  });

  it("says the agent started the install itself, and how to stop it", () => {
    for (const opened of [true, false]) {
      const text = buildGuide({ started: "agent-stream", opened }).texts[
        "stream.briefing"
      ]!;
      expect(text).toContain(
        "You started it with {{cmd}} to install what the user asked for",
      );
      expect(text).toContain("To stop setup, end this process");
      expect(text).toContain("Do not pkill by a pattern");
    }
  });

  it("gives the user the setup page link to open on their own device when no browser opens here", () => {
    const guide = buildGuide({ started: "agent-stream", opened: false });
    expect(guide.texts["stream.briefing"]).toContain(
      "Give the user {{browserUrl}} now: they can open it on any device",
    );
    expect(guide.texts.briefing).toContain(
      "the user follows it on the setup page from any device",
    );
    expect(guide.texts["stream.ask.no-browser"]).toContain(
      "give them {{page}} to open on any device",
    );
    // The user answers in the agent's conversation, never "the terminal" they may not see.
    for (const context of CONTEXTS)
      for (const key of [
        "stream.ask.recently-opened",
        "stream.ask.browser-closed",
        "stream.ask.no-browser",
      ]) {
        const text = buildGuide(context).texts[key]!;
        expect(text).toContain("in your own conversation");
        expect(text).not.toContain("terminal");
      }
  });

  it("tells an unattended agent to decide, approve its own plan and list what is left, ahead of every ask", () => {
    const guide = buildGuide({
      started: "agent-stream",
      opened: false,
      unattended: true,
    });
    expect(guide.texts.briefing).toMatch(/^Nobody answers this setup/);
    expect(guide.texts.briefing).toContain(
      '"{{cmd}} {{url}} answer plan approve"',
    );
    expect(guide.texts.briefing).toContain('a "To finish" list');
    expect(guide.texts["stream.briefing"]).toContain(
      "Nobody answers this setup (--unattended)",
    );
    expect(
      buildGuide({ started: "agent-stream", opened: false }).texts.briefing,
    ).not.toContain("Nobody answers this setup");
    // Unattended opens no browser, even when the CLI could open one.
    expect(
      buildGuide({ started: "agent-stream", opened: true, unattended: true }),
    ).toEqual(guide);
  });

  it("offers to go on unattended once nobody has come for a while", () => {
    const text = buildGuide({ started: "agent-stream", opened: true }).texts[
      "stream.unattended"
    ]!;
    expect(text).toContain("{{minutes}} minutes");
    expect(text).toContain('"answer plan approve"');
    expect(text).toContain("Otherwise keep waiting for the user.");
  });

  it("asks contextual entry points before the plan", () => {
    const text = briefing({ started: "user", opened: true });
    expect(text).toContain("only 1–3 sensible alternatives");
    const ask = text.search(
      /^\s*\{\{cmd\}\} \{\{url\}\} ask "[^"\n]+" --entry-points /m,
    );
    const plan = text.search(/^\s*\{\{cmd\}\} \{\{url\}\} plan --file /m);
    expect(ask).toBeGreaterThanOrEqual(0);
    expect(plan).toBeGreaterThan(ask);
  });
});

describe("GET /<link>/guide", () => {
  const get = (query: string) =>
    worker.fetch(new Request(`https://checkout.test/session1/guide?${query}`), {
      CHECKOUT: {
        idFromName: () => {
          throw new Error("the guide needs no durable object");
        },
        get: () => {
          throw new Error("the guide needs no durable object");
        },
      },
      NEW_LINKS: {
        limit: () => {
          throw new Error("the guide needs no durable object");
        },
      },
      SETUP_STATS: {
        idFromName: () => {
          throw new Error("the guide needs no durable object");
        },
        get: () => {
          throw new Error("the guide needs no durable object");
        },
      },
    });

  it("serves the guide for the CLI's protocol without touching the setup", async () => {
    const response = await get("protocol=1&started=agent&opened=0");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(
      buildGuide({ started: "agent", opened: false }),
    );
  });

  it("answers 426 to another protocol and 400 to a malformed request", async () => {
    expect((await get("protocol=1234567")).status).toBe(426);
    const retired = await get("protocol=0");
    expect(retired.status).toBe(426);
    expect(await retired.json()).toEqual({
      error: "unsupported-protocol",
      supported: [1],
    });
    expect(
      respondToGuideRequest(new URLSearchParams("protocol=1&started=robot"))
        .status,
    ).toBe(400);
    expect(
      respondToGuideRequest(
        new URLSearchParams("protocol=1&started=agent-stream&unattended=1"),
      ).body,
    ).toEqual(
      buildGuide({ started: "agent-stream", opened: true, unattended: true }),
    );
    for (const query of [
      "",
      "protocol=abc",
      "protocol=1.5",
      "protocol=1&unattended=yes",
    ])
      expect(respondToGuideRequest(new URLSearchParams(query)).status).toBe(
        400,
      );
  });
});
