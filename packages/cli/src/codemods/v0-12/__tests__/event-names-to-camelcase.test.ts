import { describe, expect, it } from "vitest";
import jscodeshift, { API } from "jscodeshift";
import transform from "../event-names-to-camelcase";

const j = jscodeshift.withParser("tsx");

function applyTransform(source: string): string | null {
  const fileInfo = {
    path: "test.tsx",
    source,
  };

  const api: API = {
    jscodeshift: j,
    j,
    stats: () => {},
    report: () => {},
  };

  return transform(fileInfo, api, {});
}

function expectTransform(input: string, expectedOutput: string) {
  const output = applyTransform(input);
  expect(output?.trim()).toBe(expectedOutput.trim());
}

function expectNoChange(input: string) {
  const output = applyTransform(input);
  expect(output).toBeNull();
}

describe("event-names-to-camelcase codemod", () => {
  it("should migrate thread.run-start to thread.runStart", () => {
    expectTransform(
      `useAuiEvent("thread.run-start", () => console.log("started"));`,
      `useAuiEvent("thread.runStart", () => console.log("started"));`,
    );
  });

  it("should migrate thread.run-end to thread.runEnd", () => {
    expectTransform(
      `useAuiEvent("thread.run-end", () => console.log("ended"));`,
      `useAuiEvent("thread.runEnd", () => console.log("ended"));`,
    );
  });

  it("should migrate thread.model-context-update to thread.modelContextUpdate", () => {
    expectTransform(
      `useAuiEvent("thread.model-context-update", () => console.log("updated"));`,
      `useAuiEvent("thread.modelContextUpdate", () => console.log("updated"));`,
    );
  });

  it("should migrate composer.attachment-add to composer.attachmentAdd", () => {
    expectTransform(
      `useAuiEvent("composer.attachment-add", () => console.log("added"));`,
      `useAuiEvent("composer.attachmentAdd", () => console.log("added"));`,
    );
  });

  it("should migrate thread-list-item.switched-to to threadListItem.switchedTo", () => {
    expectTransform(
      `useAuiEvent("thread-list-item.switched-to", () => console.log("switched"));`,
      `useAuiEvent("threadListItem.switchedTo", () => console.log("switched"));`,
    );
  });

  it("should migrate thread-list-item.switched-away to threadListItem.switchedAway", () => {
    expectTransform(
      `useAuiEvent("thread-list-item.switched-away", () => console.log("switched away"));`,
      `useAuiEvent("threadListItem.switchedAway", () => console.log("switched away"));`,
    );
  });

  it("should not change events that are already in camelCase", () => {
    expectNoChange(
      `useAuiEvent("thread.initialize", () => console.log("initialized"));`,
    );

    expectNoChange(`useAuiEvent("composer.send", () => console.log("sent"));`);
  });

  it("should handle multiple event listeners in one file", () => {
    expectTransform(
      `
function MyComponent() {
  useAuiEvent("thread.run-start", () => console.log("started"));
  useAuiEvent("thread.run-end", () => console.log("ended"));
  useAuiEvent("composer.attachment-add", () => console.log("added"));
}
`,
      `
function MyComponent() {
  useAuiEvent("thread.runStart", () => console.log("started"));
  useAuiEvent("thread.runEnd", () => console.log("ended"));
  useAuiEvent("composer.attachmentAdd", () => console.log("added"));
}
`,
    );
  });

  it("should handle event names in object format", () => {
    expectTransform(
      `useAuiEvent({ event: "thread.run-start", scope: "*" }, () => console.log("started"));`,
      `useAuiEvent({ event: "thread.runStart", scope: "*" }, () => console.log("started"));`,
    );
  });

  it("should only transform exact string matches", () => {
    // Only exact matches are transformed, not substrings
    expectNoChange(`const message = "The thread.run-start event is great!";`);

    // But exact matches anywhere are transformed
    expectTransform(
      `const eventName = "thread.run-start";`,
      `const eventName = "thread.runStart";`,
    );
  });

  it("should handle template literals", () => {
    expectTransform(
      "const event = `thread.run-start`;",
      "const event = `thread.runStart`;",
    );
  });
});
