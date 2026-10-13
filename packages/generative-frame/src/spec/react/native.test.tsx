// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { Text, View } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Spec } from "../types";
import { createSpecStream } from "../stream";
import { SpecRenderer } from "../react.native";
import type { SpecComponents } from "./SpecRenderer";

afterEach(cleanup);

const components: SpecComponents = {
  Stack: ({ children }) => <View>{children}</View>,
  Label: ({ props }) => <Text>{String(props["text"])}</Text>,
  Boom: () => {
    throw new Error("kaboom");
  },
};

const spec = (elements: Spec["elements"]): Spec => ({
  root: "main",
  elements,
  state: {},
});

describe("SpecRenderer for React Native", () => {
  it("renders a pending child with a React Native placeholder", () => {
    const view = render(
      <SpecRenderer
        streaming
        components={components}
        spec={spec({
          main: { type: "Stack", children: ["late"] },
        })}
      />,
    );
    expect(
      view.container.querySelector(
        '[data-testid="gf-spec-placeholder-pending"]',
      ),
    ).not.toBeNull();
    expect(
      view.container.querySelector("[data-gf-spec-placeholder]"),
    ).toBeNull();
  });

  it.each([false, true])(
    "hides an unfinished visibility condition until streamed state enables it (negated: %s)",
    (negated) => {
      const stream = createSpecStream({
        initial: {
          root: "main",
          state: { open: negated },
          elements: {
            main: {
              type: "Label",
              props: { text: "Visible" },
              visible: negated ? { not: {} } : {},
            },
          },
        },
      });
      const view = render(
        <SpecRenderer components={components} spec={stream.spec} streaming />,
      );
      expect(view.container.textContent).toBe("");
      stream.push(
        JSON.stringify({
          op: "add",
          path: `/elements/main/visible${negated ? "/not" : ""}/$state`,
          value: "/open",
        }) + "\n",
      );
      view.rerender(
        <SpecRenderer components={components} spec={stream.spec} streaming />,
      );
      expect(view.container.textContent).toBe("");
      stream.push(
        JSON.stringify({
          op: "replace",
          path: "/state/open",
          value: !negated,
        }) + "\n",
      );
      view.rerender(
        <SpecRenderer components={components} spec={stream.spec} streaming />,
      );
      expect(view.container.textContent).toBe("Visible");
      stream.push(
        JSON.stringify({ op: "replace", path: "/state/open", value: negated }) +
          "\n",
      );
      view.rerender(
        <SpecRenderer components={components} spec={stream.spec} />,
      );
      expect(view.container.textContent).toBe("");
    },
  );

  it("names an unknown type and a failed element in React Native placeholders", () => {
    const onError = vi.fn();
    const view = render(
      <SpecRenderer
        components={components}
        onError={onError}
        spec={spec({
          main: { type: "Stack", children: ["missing", "boom", "ok"] },
          missing: { type: "Nope" },
          boom: { type: "Boom" },
          ok: { type: "Label", props: { text: "fine" } },
        })}
      />,
    );
    const unknown = view.container.querySelector(
      '[data-testid="gf-spec-placeholder-unknown-type"]',
    );
    const failed = view.container.querySelector(
      '[data-testid="gf-spec-placeholder-error"]',
    );
    expect(unknown?.textContent).toContain("Nope");
    expect(failed?.textContent).toContain("kaboom");
    expect(view.container.textContent).toContain("fine");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("uses a placeholder the app passes instead", () => {
    const view = render(
      <SpecRenderer
        streaming
        components={components}
        placeholder={({ reason }) => <Text>custom {reason}</Text>}
        spec={spec({ main: { type: "Stack", children: ["late"] } })}
      />,
    );
    expect(view.container.textContent).toBe("custom pending");
  });
});
