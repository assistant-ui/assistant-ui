import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { ErrorPrimitiveMessage, ErrorPrimitiveRoot } from "./error";

const disposers: (() => void)[] = [];
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()));

const mount = (
  props: Parameters<typeof ErrorPrimitiveMessage>[0] = {},
  rootProps: Parameters<typeof ErrorPrimitiveRoot>[0] = {},
) => {
  let message: ThreadMessageLike = {
    id: "error-id",
    role: "assistant",
    content: [{ type: "text", text: "" }],
  };
  const makeAdapter = () => ({
    messages: [message],
    convertMessage: (value: ThreadMessageLike) => value,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({
          threads: RuntimeAdapter(new AssistantRuntimeImpl(core)),
        }),
        get children() {
          return createComponent(ThreadPrimitiveMessages, {
            get children() {
              return createComponent(ErrorPrimitiveRoot, {
                ...rootProps,
                get children() {
                  return createComponent(ErrorPrimitiveMessage, props);
                },
              });
            },
          });
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return {
    el,
    setMessage: (next: Partial<ThreadMessageLike>) => {
      message = { ...message, ...next };
      flushTapSync(() => core.setAdapter(makeAdapter()));
    },
  };
};

describe("error primitives", () => {
  it("renders the assistant error text inside an alert root", () => {
    const { el, setMessage } = mount({}, { class: "error" });
    setMessage({
      status: {
        type: "incomplete",
        reason: "error",
        error: { message: "Connection lost" },
      },
    });
    expect(el.querySelector(".error")?.textContent).toBe("Connection lost");
    expect(el.querySelector(".error")?.getAttribute("role")).toBe("alert");
  });

  it.each([
    ["string", "Connection lost", "Connection lost"],
    ["empty string", "", ""],
    ["number", 0, "0"],
    ["boolean", false, "false"],
    ["object", { code: 500 }, "[object Object]"],
    ["array", ["offline", 500], "offline,500"],
    ["null", null, "An error occurred"],
    ["missing", undefined, "An error occurred"],
  ] as const)("renders %s errors as raw text", (_name, error, expected) => {
    const { el, setMessage } = mount();
    setMessage({
      status: {
        type: "incomplete",
        reason: "error",
        ...(error === undefined ? {} : { error }),
      },
    });
    expect(el.textContent).toBe(expected);
    expect(el.querySelectorAll("div")).toHaveLength(1);
  });

  it("updates the error and clears it when the message recovers", () => {
    const { el, setMessage } = mount();
    const root = el.firstElementChild;
    expect(el.textContent).toBe("");
    setMessage({
      status: { type: "incomplete", reason: "error", error: "first" },
    });
    expect(el.textContent).toBe("first");
    setMessage({
      status: { type: "incomplete", reason: "error", error: "second" },
    });
    expect(el.textContent).toBe("second");
    setMessage({ status: { type: "complete", reason: "stop" } });
    expect(el.textContent).toBe("");
    expect(el.firstElementChild).toBe(root);
    setMessage({ status: { type: "incomplete", reason: "cancelled" } });
    expect(el.textContent).toBe("");
  });

  it("renders reactive children only while there is an error, including an empty error string", () => {
    const [label, setLabel] = createSignal("Try again");
    const children = vi.fn((): JSX.Element => label());
    const { el, setMessage } = mount({
      get children() {
        return children();
      },
    });
    expect(children).not.toHaveBeenCalled();
    setMessage({ status: { type: "incomplete", reason: "error", error: "" } });
    expect(el.textContent).toBe("Try again");
    setLabel("Retry");
    expect(el.textContent).toBe("Retry");
    setMessage({ status: { type: "complete", reason: "stop" } });
    expect(el.textContent).toBe("");
  });

  it("honors an intentionally empty children override", () => {
    const { el, setMessage } = mount({ children: null });
    setMessage({
      status: { type: "incomplete", reason: "error", error: "hidden" },
    });
    expect(el.textContent).toBe("");
  });

  it("does not render an error for a user message", () => {
    const { el, setMessage } = mount();
    setMessage({ role: "user" });
    expect(el.textContent).toBe("");
  });

  it("forwards root refs, live attributes, children and an explicit role", () => {
    const [label, setLabel] = createSignal("Error");
    const ref = vi.fn();
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = render(
      () =>
        createComponent(ErrorPrimitiveRoot, {
          ref,
          role: "status",
          get "aria-label"() {
            return label();
          },
          get children() {
            return label();
          },
        }),
      el,
    );
    disposers.push(() => {
      dispose();
      el.remove();
    });
    const root = el.querySelector("div")!;
    expect(ref.mock.calls[0]?.[0]).toBe(root);
    expect(root.getAttribute("role")).toBe("status");
    expect(root.textContent).toBe("Error");
    setLabel("Recovered");
    expect(root.getAttribute("aria-label")).toBe("Recovered");
    expect(root.textContent).toBe("Recovered");
  });
});
