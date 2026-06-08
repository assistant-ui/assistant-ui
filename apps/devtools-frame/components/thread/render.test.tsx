import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThreadDetails } from "./ThreadDetails";
import type { ThreadPreview } from "./types";

describe("ThreadDetails composer queue", () => {
  it("renders the pending message queue and canSend", () => {
    const thread: ThreadPreview = {
      messages: [],
      suggestions: [],
      capabilities: [],
      composer: {
        textLength: 0,
        attachments: [],
        canSend: false,
        queue: [
          { id: "q1", prompt: "queued one" },
          { id: "q2", prompt: "queued two" },
        ],
      },
    };

    const html = renderToStaticMarkup(<ThreadDetails thread={thread} />);
    expect(html).toContain("Message queue (2)");
    expect(html).toContain("queued one");
    expect(html).toContain("queued two");
    expect(html).toContain("Can send");
  });

  it("omits the queue section when empty", () => {
    const thread: ThreadPreview = {
      messages: [],
      suggestions: [],
      capabilities: [],
      composer: { textLength: 0, attachments: [], queue: [] },
    };

    const html = renderToStaticMarkup(<ThreadDetails thread={thread} />);
    expect(html).not.toContain("Message queue");
  });
});
