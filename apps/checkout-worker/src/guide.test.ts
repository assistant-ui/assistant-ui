import { describe, expect, it } from "vitest";
import worker from "./index";
import { buildGuide, respondToGuideRequest, type GuideContext } from "./guide";

const CONTEXTS: GuideContext[] = (
  ["user", "agent", "agent-stream"] as const
).flatMap((started) => [true, false].map((opened) => ({ started, opened })));
const briefing = (context: GuideContext) => buildGuide(context).texts.briefing!;

describe("buildGuide", () => {
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

  it("asks contextual entry points before the plan", () => {
    const text = briefing({ started: "user", opened: true });
    expect(text).toContain("only 1–3 sensible alternatives");
    expect(text.indexOf("--entry-points")).toBeLessThan(
      text.indexOf("plan --file"),
    );
  });
});

describe("GET /<link>/guide", () => {
  const get = (query: string) =>
    worker.fetch(new Request(`https://checkout.test/session/guide?${query}`), {
      CHECKOUT: {
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
    for (const query of ["", "protocol=abc", "protocol=1.5"])
      expect(respondToGuideRequest(new URLSearchParams(query)).status).toBe(
        400,
      );
  });
});
