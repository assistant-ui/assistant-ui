import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TtftBar } from "./TtftBar";

describe("TtftBar", () => {
  it("reads the first token time as a duration from the stream start", () => {
    const html = renderToStaticMarkup(
      <TtftBar
        timing={{
          streamStartTime: 1_700_000_000_000,
          firstTokenTime: 150,
          totalStreamTime: 900,
        }}
      />,
    );

    expect(html).toContain("TTFT 150ms");
    expect(html).toContain("750ms stream");
  });
});
