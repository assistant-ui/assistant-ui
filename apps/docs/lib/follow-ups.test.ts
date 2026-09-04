import { describe, expect, it } from "vitest";
import { parseFollowUpSuggestions } from "./follow-ups";

describe("parseFollowUpSuggestions", () => {
  it("normalizes lines, omits duplicates, and keeps the requested count", () => {
    expect(
      parseFollowUpSuggestions(
        " - \"Ask a deeper question\"\n2. “Draw a diagram”\n• Ask a deeper question\n\n(3) 'Remember this preference'\n4. Omit this",
        3,
      ),
    ).toEqual([
      "Ask a deeper question",
      "Draw a diagram",
      "Remember this preference",
    ]);
  });
});
