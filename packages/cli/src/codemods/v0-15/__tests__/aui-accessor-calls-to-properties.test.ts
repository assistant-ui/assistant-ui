import { describe, it, expect } from "vitest";
import jscodeshift, { type API } from "jscodeshift";
import transform from "../aui-accessor-calls-to-properties";

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

describe("aui-accessor-calls-to-properties", () => {
  it("rewrites nullary accessor calls on a useAui variable", () => {
    const input = `
const client = useAui();
client.thread().cancelRun();
const state = client.composer().getState();
`;
    const expected = `
const client = useAui();
client.thread.cancelRun();
const state = client.composer.getState();
`;
    expect(applyTransform(input)?.trim()).toBe(expected.trim());
  });

  it("rewrites only the accessor call in chained expressions", () => {
    const input = `
const aui = useAui();
const part = aui.message().part({ index: 0 });
aui.message().composer().send();
`;
    const expected = `
const aui = useAui();
const part = aui.message.part({ index: 0 });
aui.message.composer().send();
`;
    expect(applyTransform(input)?.trim()).toBe(expected.trim());
  });

  it("rewrites identifiers named aui without a declaration", () => {
    const input = `
const Derived = {
  get: (aui) => aui.thread().message({ index: 0 }),
};
`;
    const expected = `
const Derived = {
  get: (aui) => aui.thread.message({ index: 0 }),
};
`;
    expect(applyTransform(input)?.trim()).toBe(expected.trim());
  });

  it("rewrites parameters typed AssistantClient", () => {
    const input = `
const getItem = (client: AssistantClient) => client.threadListItem().getState();
`;
    const expected = `
const getItem = (client: AssistantClient) => client.threadListItem.getState();
`;
    expect(applyTransform(input)?.trim()).toBe(expected.trim());
  });

  it("leaves calls with arguments untouched", () => {
    const input = `
const aui = useAui();
const t = aui.threads().thread({ id: "t1" });
`;
    const expected = `
const aui = useAui();
const t = aui.threads.thread({ id: "t1" });
`;
    expect(applyTransform(input)?.trim()).toBe(expected.trim());
  });

  it("does not rewrite unknown receivers", () => {
    const input = `
toolkit.tools();
message.composer().send();
ref.current.thread().getState();
`;
    expect(applyTransform(input)).toBeNull();
  });

  it("does not rewrite non-scope member calls on aui", () => {
    const input = `
const aui = useAui();
aui.subscribe(() => {});
aui.on("thread.updated", () => {});
`;
    expect(applyTransform(input)).toBeNull();
  });

  it("returns null when nothing changes", () => {
    expect(applyTransform(`const x = 1;`)).toBeNull();
  });
});
