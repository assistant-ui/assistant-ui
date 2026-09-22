// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect } from "vitest";
import { useAui, AuiProvider } from "@assistant-ui/store";
import {
  ExternalThread,
  type ExternalThreadProps,
} from "../store/clients/external-thread";

const renderThread = (props: ExternalThreadProps) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC<{ threadProps: ExternalThreadProps }> = ({ threadProps }) => {
    const aui = useAui({ thread: ExternalThread(threadProps) });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };
  const utils = render(<App threadProps={props} />);
  return {
    aui: () => captured.aui!,
    rerender: (next: ExternalThreadProps) =>
      utils.rerender(<App threadProps={next} />),
  };
};

const userMessage = (id: string) =>
  ({
    id,
    role: "user",
    content: [{ type: "text", text: "hi" }],
    createdAt: new Date(0),
    metadata: { custom: {} },
  }) as unknown as ExternalThreadProps["messages"][number];

describe("ExternalThread isLast", () => {
  const messages = [userMessage("m1"), userMessage("m2")];

  it("agrees between the thread's message list and the message client", () => {
    const t = renderThread({ messages });

    expect(
      t
        .aui()
        .thread.getState()
        .messages.map((m) => m.isLast),
    ).toEqual([false, true]);

    expect(t.aui().thread.message({ index: 0 }).getState().isLast).toBe(false);
    expect(t.aui().thread.message({ index: 1 }).getState().isLast).toBe(true);
    expect(t.aui().thread.message({ id: "m2" }).getState().isLast).toBe(true);
  });

  it("moves to the new message when the thread grows", () => {
    const t = renderThread({ messages });

    t.rerender({ messages: [...messages, userMessage("m3")] });

    expect(t.aui().thread.message({ id: "m2" }).getState().isLast).toBe(false);
    expect(t.aui().thread.message({ id: "m3" }).getState().isLast).toBe(true);
  });
});
