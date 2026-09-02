import { describe, expect, it } from "vitest";
import {
  PUBLIC_ASSISTANT_LIMITS,
  PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE,
  describePublicAssistantError,
  publicAssistantLimitMessage,
  unwrapErrorEnvelope,
} from "./public-assistant-errors";

describe("unwrapErrorEnvelope", () => {
  it("returns the envelope's error string and leaves plain text alone", () => {
    expect(
      unwrapErrorEnvelope(
        JSON.stringify({
          error: "A valid anonymous browser session is required.",
        }),
      ),
    ).toBe("A valid anonymous browser session is required.");
    expect(unwrapErrorEnvelope("Failed to fetch the chat response.")).toBe(
      "Failed to fetch the chat response.",
    );
    expect(unwrapErrorEnvelope("{not json")).toBe("{not json");
  });
});

describe("describePublicAssistantError", () => {
  it("recognises every limit message the public routes emit", () => {
    for (const subject of PUBLIC_ASSISTANT_LIMITS) {
      expect(
        describePublicAssistantError(publicAssistantLimitMessage(subject)),
      ).toMatch(/rate limited/);
    }
    expect(describePublicAssistantError("429 Too Many Requests")).toMatch(
      /rate limited/,
    );
  });

  it("reads a JSON error envelope before matching", () => {
    expect(
      describePublicAssistantError(
        JSON.stringify({ error: publicAssistantLimitMessage("Rate") }),
      ),
    ).toMatch(/rate limited/);
    expect(
      describePublicAssistantError(
        JSON.stringify({
          error: "Anonymous session protection is not configured.",
        }),
      ),
    ).toBeUndefined();
  });

  it("recognises the unavailable response and gateway wording", () => {
    expect(
      describePublicAssistantError(PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE),
    ).toMatch(/temporarily unavailable/);
    expect(describePublicAssistantError("503 Service Unavailable")).toMatch(
      /temporarily unavailable/,
    );
  });

  it("leaves model and transport errors to the default error rail", () => {
    expect(
      describePublicAssistantError("Failed to fetch the chat response."),
    ).toBeUndefined();
    expect(
      describePublicAssistantError("context length limit exceeded"),
    ).toBeUndefined();
  });
});
