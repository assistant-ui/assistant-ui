import { describe, expect, it } from "vitest";
import { parseGuide, type GuideContext } from "setup-agent";
import worker from "./index";
import { buildGuide, respondToGuideRequest } from "./guide";

const CONTEXTS: GuideContext[] = (
  ["user", "agent", "agent-stream"] as const
).flatMap((started) => [true, false].map((opened) => ({ started, opened })));
const briefing = (context: GuideContext) => buildGuide(context).texts.briefing;

describe("buildGuide", () => {
  it("serves a guide the CLI accepts unchanged, for every context", () => {
    for (const context of CONTEXTS) {
      const guide = buildGuide(context);
      expect(parseGuide(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
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
    expect(briefing({ started: "agent-stream", opened: false })).toContain(
      "{{cmd}} {{url}} stream --no-open",
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
  });
});
