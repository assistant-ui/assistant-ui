// @vitest-environment jsdom

// Data part rendering contract: global renderers > global fallbacks >
// inline `components.data` config, exercised through the real store.

import { render, screen, waitFor } from "@testing-library/react";
import {
  useEffect,
  type FC,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { describe, expect, it } from "vitest";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../context";
import * as MessagePrimitive from "../primitives/message";
import * as ThreadPrimitive from "../primitives/thread";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import {
  useAssistantDataUI,
  type ChatModelAdapter,
  type DataMessagePartComponent,
  type ThreadMessageLike,
} from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const dataMessages = (name: string): ThreadMessageLike[] => [
  {
    role: "assistant",
    content: [{ type: "data", name, data: { value: 42 } }],
    status: { type: "complete", reason: "stop" },
  },
];

const labeled =
  (label: string): DataMessagePartComponent =>
  ({ name, data }) => (
    <span data-testid={label}>
      {name}:{(data as { value: number }).value}
    </span>
  );

const RuntimeProvider: FC<
  PropsWithChildren<{ messages: ThreadMessageLike[] }>
> = ({ children, messages }) => {
  const runtime = useLocalRuntime(noOpAdapter, { initialMessages: messages });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const GlobalDataUI: FC<{ name: string; render: DataMessagePartComponent }> = ({
  name,
  render,
}) => {
  useAssistantDataUI({ name, render });
  return null;
};

const GlobalFallbackDataUI: FC<{ render: DataMessagePartComponent }> = ({
  render,
}) => {
  const aui = useAui();
  useEffect(() => aui.dataRenderers.setFallbackDataUI(render), [aui, render]);
  return null;
};

const renderThread = (
  messages: ThreadMessageLike[],
  Message: FC,
  extra?: ReactNode,
) =>
  render(
    <RuntimeProvider messages={messages}>
      {extra}
      <ThreadPrimitive.Messages components={{ Message }} />
    </RuntimeProvider>,
  );

describe("data part rendering", () => {
  it("renders a data part via the inline by_name config with its name and data", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts
        components={{ data: { by_name: { chart: labeled("inline") } } }}
      />
    );

    renderThread(dataMessages("chart"), Message);

    await waitFor(() => {
      expect(screen.getByTestId("inline").textContent).toBe("chart:42");
    });
  });

  it("uses the inline Fallback for unmatched names and renders nothing without one", async () => {
    const Message: FC = () => (
      <div data-testid="host">
        <MessagePrimitive.Parts
          components={{
            data: { by_name: { other: labeled("named") } },
          }}
        />
      </div>
    );

    renderThread(dataMessages("chart"), Message);
    await waitFor(() => {
      expect(screen.getByTestId("host").textContent).toBe("");
    });

    const MessageWithFallback: FC = () => (
      <MessagePrimitive.Parts
        components={{
          data: {
            by_name: { other: labeled("named") },
            Fallback: labeled("inline-fallback"),
          },
        }}
      />
    );
    renderThread(dataMessages("chart"), MessageWithFallback);
    await waitFor(() => {
      expect(screen.getByTestId("inline-fallback").textContent).toBe(
        "chart:42",
      );
    });
  });

  it("prefers a globally registered renderer over the inline by_name config", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts
        components={{ data: { by_name: { chart: labeled("inline") } } }}
      />
    );

    renderThread(
      dataMessages("chart"),
      Message,
      <GlobalDataUI name="chart" render={labeled("global")} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("global").textContent).toBe("chart:42");
    });
    expect(screen.queryByTestId("inline")).toBeNull();
  });

  it("resolves global fallbacks above inline fallbacks but below named matches", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts
        components={{ data: { Fallback: labeled("inline-fallback") } }}
      />
    );

    renderThread(
      dataMessages("chart"),
      Message,
      <GlobalFallbackDataUI render={labeled("global-fallback")} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("global-fallback").textContent).toBe(
        "chart:42",
      );
    });
    expect(screen.queryByTestId("inline-fallback")).toBeNull();

    renderThread(
      dataMessages("chart"),
      Message,
      <>
        <GlobalFallbackDataUI render={labeled("global-fallback-2")} />
        <GlobalDataUI name="chart" render={labeled("global-named")} />
      </>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("global-named").textContent).toBe("chart:42");
    });
  });

  it("restores the inline renderer when the registering component unmounts", async () => {
    const Message: FC = () => (
      <MessagePrimitive.Parts
        components={{ data: { by_name: { chart: labeled("inline") } } }}
      />
    );

    const view = render(
      <RuntimeProvider messages={dataMessages("chart")}>
        <GlobalDataUI name="chart" render={labeled("global")} />
        <ThreadPrimitive.Messages components={{ Message }} />
      </RuntimeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("global")).toBeTruthy();
    });

    view.rerender(
      <RuntimeProvider messages={dataMessages("chart")}>
        <ThreadPrimitive.Messages components={{ Message }} />
      </RuntimeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("inline").textContent).toBe("chart:42");
    });
    expect(screen.queryByTestId("global")).toBeNull();
  });
});
