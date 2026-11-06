import { describe, expect, it } from "vitest";
import type { OverlayOpenParams } from "@assistant-ui/remote-components-protocol";
import { overlayParamsWith } from "./overlays.js";

const open: OverlayOpenParams = {
  id: "o1",
  kind: "popover",
  content: { src: "https://r.example/menu/", props: { v: {} } },
  placement: { side: "bottom", align: "start" },
  offset: 4,
  label: "Menu",
};

describe("overlayParamsWith", () => {
  it("applies changed options and keeps kind and content", () => {
    const next = overlayParamsWith(open, {
      id: "o1",
      placement: { side: "top", align: "end" },
      offset: 8,
      label: "Actions",
      matchAnchorWidth: true,
    });
    expect(next).toEqual({
      ...open,
      placement: { side: "top", align: "end" },
      offset: 8,
      label: "Actions",
      matchAnchorWidth: true,
    });
    expect(next.content).toBe(open.content);
  });

  it("returns the same object when nothing changed", () => {
    expect(overlayParamsWith(open, { id: "o1" })).toBe(open);
    expect(
      overlayParamsWith(open, {
        id: "o1",
        placement: { side: "bottom", align: "start" },
        offset: 4,
        label: "Menu",
      }),
    ).toBe(open);
  });
});
