import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Pressable, Text, type PressableProps } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Primitive } from "./Primitive";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) => {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

const received: Record<string, unknown>[] = [];

const Capture = (props: Record<string, unknown>) => {
  received.push(props);
  return null;
};

const lastReceived = () => received[received.length - 1]!;

describe("Primitive.Pressable", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    received.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mount = async (node: ReactNode) => {
    await act(async () => {
      root.render(node);
    });
  };

  it("renders a Pressable without asChild", async () => {
    const onPress = vi.fn();
    await mount(
      <Primitive.Pressable
        testID="t"
        accessibilityRole="button"
        onPress={onPress}
      >
        <Text>x</Text>
      </Primitive.Pressable>,
    );

    const el = container.querySelector('[data-testid="t"]')!;
    expect(el.getAttribute("role")).toBe("button");
    await act(async () => click(el));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders the child as the only press target with asChild", async () => {
    await mount(
      <Primitive.Pressable asChild accessibilityRole="button" onPress={vi.fn()}>
        <Pressable testID="kit">
          <Text>x</Text>
        </Pressable>
      </Primitive.Pressable>,
    );

    const buttons = container.querySelectorAll('[role="button"]');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.getAttribute("data-testid")).toBe("kit");
  });

  it("runs the child's handler before its own", async () => {
    const calls: string[] = [];
    await mount(
      <Primitive.Pressable asChild onPress={() => calls.push("primitive")}>
        <Pressable testID="kit" onPress={() => calls.push("child")}>
          <Text>x</Text>
        </Pressable>
      </Primitive.Pressable>,
    );

    await act(async () =>
      click(container.querySelector('[data-testid="kit"]')!),
    );
    expect(calls).toEqual(["child", "primitive"]);
  });

  it("keeps its handler when the child's is missing or undefined", async () => {
    const onPress = vi.fn();
    await mount(
      <Primitive.Pressable asChild onPress={onPress}>
        <Capture onPress={undefined} />
      </Primitive.Pressable>,
    );

    expect(lastReceived()["onPress"]).toBe(onPress);
  });

  it("lets the child's other props win and passes the rest through", async () => {
    await mount(
      <Primitive.Pressable
        asChild
        accessibilityRole="button"
        disabled
        testID="primitive"
      >
        <Capture accessibilityRole="link" testID="kit" />
      </Primitive.Pressable>,
    );

    expect(lastReceived()).toMatchObject({
      accessibilityRole: "link",
      testID: "kit",
      disabled: true,
    });
  });

  it("combines styles, resolving pressed-state functions", async () => {
    const slotStyle = { padding: 4 };
    const childStyle: PressableProps["style"] = ({ pressed }) => ({
      opacity: pressed ? 0.5 : 1,
    });
    await mount(
      <Primitive.Pressable asChild style={slotStyle}>
        <Capture style={childStyle} />
      </Primitive.Pressable>,
    );

    const style = lastReceived()["style"] as (state: {
      pressed: boolean;
    }) => unknown;
    expect(style({ pressed: true })).toEqual([
      { padding: 4 },
      { opacity: 0.5 },
    ]);
    expect(style({ pressed: false })).toEqual([{ padding: 4 }, { opacity: 1 }]);
  });

  it("combines plain styles into an array and keeps a lone style as is", async () => {
    const childStyle = { margin: 2 };
    await mount(
      <>
        <Primitive.Pressable asChild style={{ padding: 4 }}>
          <Capture style={childStyle} />
        </Primitive.Pressable>
        <Primitive.Pressable asChild>
          <Capture style={childStyle} />
        </Primitive.Pressable>
      </>,
    );

    expect(received.at(-2)!["style"]).toEqual([{ padding: 4 }, { margin: 2 }]);
    expect(received.at(-1)!["style"]).toBe(childStyle);
  });

  it("joins class names", async () => {
    await mount(
      <Primitive.Pressable asChild {...{ className: "primitive" }}>
        <Capture className="kit" />
      </Primitive.Pressable>,
    );

    expect(lastReceived()["className"]).toBe("primitive kit");
  });

  it("composes its ref with the child's ref", async () => {
    const primitiveRef = createRef<unknown>();
    const childRef = createRef<unknown>();
    await mount(
      <Primitive.Pressable asChild ref={primitiveRef as never}>
        <Pressable testID="kit" ref={childRef as never}>
          <Text>x</Text>
        </Pressable>
      </Primitive.Pressable>,
    );

    expect(childRef.current).not.toBeNull();
    expect(primitiveRef.current).toBe(childRef.current);
  });

  it("renders nothing for a child that is not an element", async () => {
    await mount(<Primitive.Pressable asChild>text</Primitive.Pressable>);

    expect(container.innerHTML).toBe("");
  });

  it("throws for more than one child", () => {
    expect(() =>
      renderToStaticMarkup(
        <Primitive.Pressable asChild>
          <Text>a</Text>
          <Text>b</Text>
        </Primitive.Pressable>,
      ),
    ).toThrow();
  });
});
