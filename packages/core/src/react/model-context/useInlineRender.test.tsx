// @vitest-environment jsdom
import { useState, type FC } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useInlineRender } from "./useInlineRender";
import type { ToolCallMessagePartProps } from "../types/MessagePartComponentTypes";

afterEach(() => cleanup());

type Props = ToolCallMessagePartProps<any, any>;

// The point of useInlineRender is a component whose identity survives a
// changing toolUI, so inner state must not be lost when toolUI swaps.
const makeToolUI = (label: string): FC<Props> =>
  function Inner() {
    const [n, setN] = useState(0);
    return (
      <button onClick={() => setN((v) => v + 1)}>
        {label}:{n}
      </button>
    );
  };

describe("useInlineRender", () => {
  it("follows toolUI changes without remounting the inner tree", async () => {
    let swap!: (fc: FC<Props>) => void;
    const identities = new Set<unknown>();

    const Host = () => {
      const [toolUI, setToolUI] = useState(() => makeToolUI("a"));
      swap = (fc) => setToolUI(() => fc);
      const ToolUI = useInlineRender(toolUI);
      identities.add(ToolUI);
      return <ToolUI {...({} as Props)} />;
    };

    render(<Host />);
    expect(screen.getByRole("button").textContent).toBe("a:0");

    await act(async () => screen.getByRole("button").click());
    expect(screen.getByRole("button").textContent).toBe("a:1");

    await act(async () => swap(makeToolUI("b")));
    // label follows the new toolUI, counter survives => no remount
    expect(screen.getByRole("button").textContent).toBe("b:1");
    expect(identities.size).toBe(1);
  });
});
