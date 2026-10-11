// @vitest-environment jsdom
import { createApp, defineComponent, h, reactive, ref, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import type { Spec } from "../types";
import {
  useSpecStream,
  type UseSpecStreamOptions,
  type UseSpecStreamResult,
} from "./useSpecStream";

const lines = [
  '{"op":"add","path":"/root","value":"main"}',
  '{"op":"add","path":"/elements/main","value":{"type":"Text","props":{"text":"a"}}}',
];
const mounted: App[] = [];
function mount(options: UseSpecStreamOptions = {}) {
  const input = reactive(options);
  return { input, result: mountDirect(input) };
}
function mountDirect(options: UseSpecStreamOptions) {
  let result!: UseSpecStreamResult;
  const app = createApp(
    defineComponent({
      setup() {
        result = useSpecStream(options);
        return () => h("div");
      },
    }),
  );
  const container = document.createElement("div");
  document.body.append(container);
  app.mount(container);
  mounted.push(app);
  return result;
}
afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount();
  document.body.replaceChildren();
});

describe("useSpecStream", () => {
  it("follows growing source and changes spec identity only for patches", () => {
    const { input, result } = mount({ source: `${lines[0]}\n` });
    const afterRoot = result.spec.value;
    expect(afterRoot.root).toBe("main");
    input.source = `${lines[0]}\n{"op":"add","path":"/elem`;
    expect(result.spec.value).toBe(afterRoot);
    input.complete = true;
    expect(result.spec.value).toBe(afterRoot);
    input.complete = false;
    input.source = `${lines.join("\n")}\n`;
    expect(result.spec.value.elements["main"]?.props).toEqual({ text: "a" });
    input.source = "something else\n";
    expect(result.spec.value.root).toBe("");
    expect(result.errors.value).toHaveLength(1);
  });

  it("applies a final line without newline when complete", () => {
    const { input, result } = mount({
      source: lines.join("\n"),
      complete: false,
    });
    expect(result.spec.value.elements["main"]).toBeUndefined();
    input.complete = true;
    expect(result.spec.value.elements["main"]).toBeDefined();
  });

  it("follows refs and getters as well as a reactive object", () => {
    const source = ref(`${lines[0]}\n`);
    const complete = ref(false);
    const result = mountDirect({ source, complete: () => complete.value });
    expect(result.spec.value.root).toBe("main");
    source.value = lines.join("\n");
    expect(result.spec.value.elements["main"]).toBeUndefined();
    complete.value = true;
    expect(result.spec.value.elements["main"]?.props).toEqual({ text: "a" });
  });

  it("supports imperative push, end, reset, and inline prose", () => {
    const { result } = mount({ mode: "inline" });
    result.push(`Intro\n${lines[0]}\n`);
    result.push(lines[1]!);
    expect(result.text.value).toBe("Intro\n");
    result.end();
    expect(result.spec.value.elements["main"]).toBeDefined();
    result.reset();
    expect(result.spec.value.root).toBe("");
  });

  it("keeps incremental identity with a fresh initial getter", () => {
    const source = ref(`${lines[0]}\n`);
    const result = mountDirect({
      source,
      initial: () => ({ root: "base", elements: {}, state: {} }),
    });
    const afterRoot = result.spec.value;
    source.value += '{"op":"add","path":"/elem';
    expect(result.spec.value).toBe(afterRoot);
    source.value = `${lines.join("\n")}\n`;
    expect(result.spec.value).not.toBe(afterRoot);
    expect(result.spec.value.elements.main?.props).toEqual({ text: "a" });
  });

  it("keeps source results ahead of push and reset, then reveals the snapshot", () => {
    const source = ref<string | undefined>(`${lines[0]}\n`);
    const mode = ref<"jsonl" | "inline">("jsonl");
    const initial: Spec = { root: "base", elements: {}, state: {} };
    const result = mountDirect({ source, mode, initial });
    const followed = result.spec.value;
    result.push(`${lines[1]}\n`);
    expect(result.spec.value).toBe(followed);
    expect(result.spec.value.elements.main).toBeUndefined();
    source.value = undefined;
    expect(result.spec.value.elements.main).toBeDefined();
    source.value = `${lines[0]}\n`;
    result.reset();
    expect(result.spec.value).toBe(followed);
    source.value = undefined;
    expect(result.spec.value).toBe(initial);
    expect(result.text.value).toBe("");
  });

  it("restarts on mode changes and reads ref initial only when parsing starts", () => {
    const source = ref("Intro\n");
    const mode = ref<"jsonl" | "inline">("jsonl");
    const complete = ref(false);
    const initial = ref<Spec>({ root: "first", elements: {}, state: {} });
    const result = mountDirect({
      source,
      mode: () => mode.value,
      complete,
      initial,
    });
    expect(result.errors.value).toHaveLength(1);
    const first = result.spec.value;
    initial.value = { root: "second", elements: {}, state: {} };
    expect(result.spec.value).toBe(first);
    mode.value = "inline";
    expect(result.errors.value).toEqual([]);
    expect(result.text.value).toBe("Intro\n");
    expect(result.spec.value.root).toBe("second");
    initial.value = { root: "third", elements: {}, state: {} };
    complete.value = true;
    expect(result.spec.value.root).toBe("third");
  });
});
