import { describe, it, expect } from "vitest";
import type {
  UserLocation,
  ToolResponseMetadata,
  ToolInvocationMessages,
  ToolMetadata,
  ToolAnnotations,
  UploadFileResponse,
  GetFileDownloadUrlResponse,
  View,
  AUIGlobals,
} from "../types/protocol";
import { DEFAULT_GLOBALS } from "../runtime/bridge-script";

describe("Protocol Types - UserLocation", () => {
  it("accepts valid user location data", () => {
    const location: UserLocation = {
      city: "San Francisco",
      region: "CA",
      country: "US",
      timezone: "America/Los_Angeles",
      latitude: 37.7749,
      longitude: -122.4194,
    };

    expect(location.city).toBe("San Francisco");
    expect(location.latitude).toBe(37.7749);
  });

  it("accepts partial user location data", () => {
    const location: UserLocation = {
      country: "US",
      timezone: "America/New_York",
    };

    expect(location.country).toBe("US");
    expect(location.timezone).toBe("America/New_York");
    expect(location.city).toBeUndefined();
  });

  it("accepts empty user location", () => {
    const location: UserLocation = {};
    expect(Object.keys(location)).toHaveLength(0);
  });
});

describe("Protocol Types - ToolResponseMetadata", () => {
  it("accepts complete metadata", () => {
    const metadata: ToolResponseMetadata = {
      widgetSessionId: "session-123",
      closeWidget: true,
      prefersBorder: false,
      customProperty: "custom-value",
    };

    expect(metadata.widgetSessionId).toBe("session-123");
    expect(metadata.closeWidget).toBe(true);
    expect(metadata.prefersBorder).toBe(false);
    expect(metadata.customProperty).toBe("custom-value");
  });

  it("accepts minimal metadata", () => {
    const metadata: ToolResponseMetadata = {};
    expect(Object.keys(metadata)).toHaveLength(0);
  });

  it("allows additional properties", () => {
    const metadata: ToolResponseMetadata = {
      additionalKey: "additional-value",
      numericValue: 42,
      booleanValue: true,
    };

    expect(metadata.additionalKey).toBe("additional-value");
    expect(metadata.numericValue).toBe(42);
    expect(metadata.booleanValue).toBe(true);
  });
});

describe("Protocol Types - ToolInvocationMessages", () => {
  it("accepts complete tool invocation messages", () => {
    const messages: ToolInvocationMessages = {
      invoking: "Loading data...",
      invoked: "Data loaded successfully",
    };

    expect(messages.invoking).toBe("Loading data...");
    expect(messages.invoked).toBe("Data loaded successfully");
  });

  it("accepts partial tool invocation messages", () => {
    const messages: ToolInvocationMessages = {
      invoking: "Processing...",
    };

    expect(messages.invoking).toBe("Processing...");
    expect(messages.invoked).toBeUndefined();
  });

  it("accepts empty tool invocation messages", () => {
    const messages: ToolInvocationMessages = {};
    expect(Object.keys(messages)).toHaveLength(0);
  });

  it("accepts exactly 64 character messages", () => {
    const exactly64 = "a".repeat(64);
    const messages: ToolInvocationMessages = {
      invoking: exactly64,
      invoked: exactly64,
    };

    expect(messages.invoking).toBe(exactly64);
    expect(messages.invoked).toBe(exactly64);
  });
});

describe("Protocol Types - ToolMetadata", () => {
  it("accepts complete tool metadata", () => {
    const metadata: ToolMetadata = {
      visibility: "public",
      widgetAccessible: true,
      fileParams: ["image", "document"],
    };

    expect(metadata.visibility).toBe("public");
    expect(metadata.widgetAccessible).toBe(true);
    expect(metadata.fileParams).toEqual(["image", "document"]);
  });

  it("accepts partial tool metadata", () => {
    const metadata: ToolMetadata = {
      visibility: "private",
    };

    expect(metadata.visibility).toBe("private");
    expect(metadata.widgetAccessible).toBeUndefined();
    expect(metadata.fileParams).toBeUndefined();
  });

  it("accepts empty tool metadata", () => {
    const metadata: ToolMetadata = {};
    expect(Object.keys(metadata)).toHaveLength(0);
  });
});

describe("Protocol Types - ToolAnnotations (ChatGPT Apps SDK API)", () => {
  it("accepts complete tool annotations", () => {
    const annotations: ToolAnnotations = {
      readOnlyHint: true,
      destructiveHint: false,
      completionMessage: "Operation completed successfully",
    };

    expect(annotations.readOnlyHint).toBe(true);
    expect(annotations.destructiveHint).toBe(false);
    expect(annotations.completionMessage).toBe(
      "Operation completed successfully",
    );
  });

  it("accepts partial tool annotations", () => {
    const annotations: ToolAnnotations = {
      readOnlyHint: true,
    };

    expect(annotations.readOnlyHint).toBe(true);
    expect(annotations.destructiveHint).toBeUndefined();
    expect(annotations.completionMessage).toBeUndefined();
  });

  it("accepts empty tool annotations", () => {
    const annotations: ToolAnnotations = {};
    expect(Object.keys(annotations)).toHaveLength(0);
  });

  it("accepts boolean hints", () => {
    const annotations: ToolAnnotations = {
      readOnlyHint: false,
      destructiveHint: true,
    };

    expect(annotations.readOnlyHint).toBe(false);
    expect(annotations.destructiveHint).toBe(true);
  });

  it("accepts string completion message", () => {
    const annotations: ToolAnnotations = {
      completionMessage: "Task completed successfully",
    };

    expect(annotations.completionMessage).toBe("Task completed successfully");
  });
});

describe("Protocol Types - File Handling Responses", () => {
  it("accepts valid UploadFileResponse", () => {
    const response: UploadFileResponse = {
      fileId: "file-abc-123-xyz-789",
    };

    expect(response.fileId).toBe("file-abc-123-xyz-789");
  });

  it("accepts valid GetFileDownloadUrlResponse", () => {
    const response: GetFileDownloadUrlResponse = {
      downloadUrl: "https://example.com/files/download/file-abc-123-xyz-789",
    };

    expect(response.downloadUrl).toBe(
      "https://example.com/files/download/file-abc-123-xyz-789",
    );
  });
});

describe("View type", () => {
  it("accepts modal mode with params", () => {
    const view: View = {
      mode: "modal",
      params: { title: "Test Modal" },
    };
    expect(view.mode).toBe("modal");
    expect(view.params).toEqual({ title: "Test Modal" });
  });

  it("accepts inline mode with null params", () => {
    const view: View = {
      mode: "inline",
      params: null,
    };
    expect(view.mode).toBe("inline");
    expect(view.params).toBeNull();
  });
});

describe("AUIGlobals with new properties", () => {
  it("includes previousDisplayMode", () => {
    const globals: AUIGlobals = {
      ...DEFAULT_GLOBALS,
      previousDisplayMode: "inline",
    };
    expect(globals.previousDisplayMode).toBe("inline");
  });

  it("includes view", () => {
    const globals: AUIGlobals = {
      ...DEFAULT_GLOBALS,
      view: { mode: "modal", params: null },
    };
    expect(globals.view?.mode).toBe("modal");
  });
});
