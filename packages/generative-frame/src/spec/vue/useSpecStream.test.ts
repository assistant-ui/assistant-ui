// @vitest-environment jsdom
import { createApp, defineComponent, h, reactive, ref, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";
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
  let result!: UseSpecStreamResult;
  const app = createApp(
    defineComponent({
      setup() {
        result = useSpecStream(input);
        return () => h("div");
      },
    }),
  );
  const container = document.createElement("div");
  document.body.append(container);
  app.mount(container);
  mounted.push(app);
  return { input, result };
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
    let result!: UseSpecStreamResult;
    const app = createApp(
      defineComponent({
        setup() {
          result = useSpecStream({ source, complete: () => complete.value });
          return () => h("div");
        },
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    app.mount(container);
    mounted.push(app);
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
});
