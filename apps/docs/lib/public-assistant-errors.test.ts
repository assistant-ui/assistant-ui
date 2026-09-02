import { describe, expect, it } from "vitest";
import {
  PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE,
  describePublicAssistantError,
  publicAssistantLimitMessage,
} from "./public-assistant-errors";

describe("describePublicAssistantError", () => {
  it("recognises every limit message the public routes emit", () => {
    for (const subject of [
      "Rate",
      "Daily usage",
      "Anonymous session",
      "Template download usage",
    ]) {
      expect(
        describePublicAssistantError(publicAssistantLimitMessage(subject)),
      ).toMatch(/rate limited/);
    }
    expect(describePublicAssistantError("429 Too Many Requests")).toMatch(
      /rate limited/,
    );
  });

  it("recognises the unavailable response and gateway wording", () => {
    expect(
      describePublicAssistantError(PUBLIC_ASSISTANT_UNAVAILABLE_MESSAGE),
    ).toMatch(/temporarily unavailable/);
    expect(describePublicAssistantError("503 Service Unavailable")).toMatch(
      /temporarily unavailable/,
    );
  });

  it("leaves other errors to the default error rail", () => {
    expect(
      describePublicAssistantError("Failed to fetch the chat response."),
    ).toBeUndefined();
  });
});
