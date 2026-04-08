import { describe, it, expect, vi } from "vitest";
import { createA2uiMessageHandler } from "../bridge/ag-ui-bridge";

describe("createA2uiMessageHandler", () => {
  it("should forward a2ui: prefixed events as parsed messages", () => {
    const processMessage = vi.fn();
    const handler = createA2uiMessageHandler(processMessage);

    handler({ name: "a2ui:createSurface", value: { surfaceId: "s1" } });

    expect(processMessage).toHaveBeenCalledWith({
      type: "createSurface",
      surfaceId: "s1",
    });
  });

  it("should ignore non-a2ui events", () => {
    const processMessage = vi.fn();
    const handler = createA2uiMessageHandler(processMessage);

    handler({ name: "other:event", value: {} });
    expect(processMessage).not.toHaveBeenCalled();
  });

  it("should parse updateComponents events", () => {
    const processMessage = vi.fn();
    const handler = createA2uiMessageHandler(processMessage);

    handler({
      name: "a2ui:updateComponents",
      value: { surfaceId: "s1", components: [{ type: "Button", id: "b1" }] },
    });

    expect(processMessage).toHaveBeenCalledWith({
      type: "updateComponents",
      surfaceId: "s1",
      components: [{ type: "Button", id: "b1" }],
    });
  });

  it("should parse updateDataModel events", () => {
    const processMessage = vi.fn();
    const handler = createA2uiMessageHandler(processMessage);

    handler({
      name: "a2ui:updateDataModel",
      value: { surfaceId: "s1", path: "/name", value: "Tokyo" },
    });

    expect(processMessage).toHaveBeenCalledWith({
      type: "updateDataModel",
      surfaceId: "s1",
      path: "/name",
      value: "Tokyo",
    });
  });

  it("should parse deleteSurface events", () => {
    const processMessage = vi.fn();
    const handler = createA2uiMessageHandler(processMessage);

    handler({ name: "a2ui:deleteSurface", value: { surfaceId: "s1" } });
    expect(processMessage).toHaveBeenCalledWith({
      type: "deleteSurface",
      surfaceId: "s1",
    });
  });

  it("should drop invalid payloads silently", () => {
    const processMessage = vi.fn();
    const handler = createA2uiMessageHandler(processMessage);

    handler({ name: "a2ui:createSurface", value: "not-an-object" });
    expect(processMessage).not.toHaveBeenCalled();
  });

  it("should drop events with invalid type suffix", () => {
    const processMessage = vi.fn();
    const handler = createA2uiMessageHandler(processMessage);

    handler({ name: "a2ui:unknownType", value: { surfaceId: "s1" } });
    expect(processMessage).not.toHaveBeenCalled();
  });
});
