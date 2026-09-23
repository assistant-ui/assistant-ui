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
  it("resolves parameter defaults outside the function body", () => {
    const output = applyTransform(`const client = useAui();
function worker(value = client.thread()) { var client = other(); return client.thread(); }`);
    expect(output).toContain("value = client.thread)");
    expect(output).toContain("return client.thread();");
  });

  it("does not let a body client capture an unrelated parameter default", () => {
    const output = applyTransform(`const client = other();
function worker(value = client.thread()) { var client = useAui(); return client.thread(); }`);
    expect(output).toContain("value = client.thread())");
    expect(output).toContain("return client.thread;");
  });

  it("preserves unrelated namespace bindings", () => {
    const output = applyTransform(`const client = useAui();
namespace Local { export const client = other(); client.thread(); }
client.thread();`);
    expect(output).toContain("export const client = other(); client.thread();");
    expect(output).toContain("\nclient.thread;");
  });

  it.each([
    "const read = ({ aui }) => aui.thread();",
    "const read = (aui = fallback) => aui.thread();",
    "class Reader { constructor(private aui: AssistantClient) { aui.thread(); } }",
  ])("retains supported parameter wrappers: %s", (source) => {
    expect(applyTransform(source)).toContain("aui.thread;");
  });
  it.each([
    "function worker(client: { thread(): string }) { return client.thread(); }",
    "function worker() { const client = other(); return client.thread(); }",
    "{ const client = other(); client.thread(); }",
    "{ const { client } = other(); client.thread(); }",
    "for (const client of others) { client.thread(); }",
    "try {} catch (client) { client.thread(); }",
    "const worker = { run(client) { return client.thread(); } };",
    "function worker() { if (ready) { var client = other(); } return client.thread(); }",
    "switch (kind) { case 1: const client = other(); client.thread(); }",
  ])("preserves a different binding: %s", (unrelated) => {
    const output = applyTransform(
      `const client = useAui();\n${unrelated}\nclient.thread();`,
    );
    expect(output).toContain(unrelated);
    expect(output).toContain("\nclient.thread;");
  });

  it("does not treat a known unrelated aui binding as an implicit client", () => {
    expect(applyTransform("const aui = other(); aui.thread();")).toBeNull();
    expect(
      applyTransform(
        "function worker(aui: OtherClient) { return aui.thread(); }",
      ),
    ).toBeNull();
  });

  it("keeps references to a recognized client in nested closures", () => {
    expect(
      applyTransform(
        "const client = useAui(); const read = () => client.thread();",
      ),
    ).toContain("() => client.thread;");
  });

  it("recognizes an aliased assistant hook without matching a foreign hook", () => {
    const input = `import { useAui as useClient } from "@assistant-ui/react";
import { useAui } from "./other";
const client = useClient();
const other = useAui();
client.thread();
other.thread();`;
    const output = applyTransform(input);
    expect(output).toContain("client.thread;");
    expect(output).toContain("other.thread();");
  });

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
    expect(applyTransform(expected)).toBeNull();
  });

  it("resolves the switch discriminant outside the case declarations", () => {
    const output = applyTransform(`const client = useAui();
switch (client.thread()) { case 1: const client = other(); client.thread(); }`);
    expect(output).toContain("switch (client.thread)");
    expect(output).toContain("const client = other(); client.thread();");
  });

  it("migrates typed method parameters without touching another method", () => {
    const output = applyTransform(`const readers = {
  chat(client: AssistantClient) { return client.thread(); },
  other(client: Other) { return client.thread(); },
};`);
    expect(output).toContain(
      "chat(client: AssistantClient) { return client.thread; }",
    );
    expect(output).toContain(
      "other(client: Other) { return client.thread(); }",
    );
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
