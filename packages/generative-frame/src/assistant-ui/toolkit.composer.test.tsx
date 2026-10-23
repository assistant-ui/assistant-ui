import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessageByIndexProvider,
  MessagePrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import { afterEach, expect, it, vi } from "vitest";
import { createWidgetToolkit } from "./toolkit";

const mocks = vi.hoisted(() => ({
  widgetProps: [] as { onPrompt?: (text: string) => void }[],
}));

vi.mock("../react/useWidget", async (importOriginal) => {
  const { useState } = await import("react");
  return {
    ...(await importOriginal<typeof import("../react/useWidget")>()),
    useWidget: (options: { onPrompt?: (text: string) => void }) => {
      mocks.widgetProps.push(options);
      const [widget] = useState(() => ({
        code: "",
        ended: false,
        write(chunk: string) {
          this.code += chunk;
        },
        async end() {
          this.ended = true;
          return { size: { width: 600, height: 120 }, blank: false };
        },
        async replace(code: string) {
          this.code = code;
          this.ended = true;
          return { size: { width: 600, height: 120 }, blank: false };
        },
        on: () => () => {},
        inspect: async () => ({ errors: [], console: [] }),
      }));
      return { ref: () => {}, widget };
    },
  };
});

afterEach(() => {
  cleanup();
  mocks.widgetProps.length = 0;
});

const args = { title: "w", widget_code: "<p>Plans</p>" };
const messages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: "a",
        toolName: "show_widget",
        args,
        argsText: JSON.stringify(args),
      },
    ],
  },
];

const App = ({ ShowWidget }: { ShowWidget: ToolCallMessagePartComponent }) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message: ThreadMessageLike) => message,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageByIndexProvider index={0}>
        <MessagePrimitive.Parts
          components={{ tools: { by_name: { show_widget: ShowWidget } } }}
        />
      </MessageByIndexProvider>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input aria-label="Message" />
      </ComposerPrimitive.Root>
    </AssistantRuntimeProvider>
  );
};

const renderWidget = () => {
  const { toolkit } = createWidgetToolkit();
  const entries = toolkit as unknown as Record<
    string,
    { render: ToolCallMessagePartComponent }
  >;
  render(<App ShowWidget={entries["show_widget"]!.render} />);
  const onPrompt = mocks.widgetProps.at(-1)?.onPrompt;
  if (!onPrompt) throw new Error("expected the widget to receive onPrompt");
  return {
    onPrompt,
    input: screen.getByLabelText("Message") as HTMLTextAreaElement,
  };
};

it("fills the thread composer from a widget rendered inside a message", () => {
  const { onPrompt, input } = renderWidget();

  act(() => onPrompt("Compare the plans"));

  expect(input.value).toBe("Compare the plans");
});

it("keeps the user's draft when a widget prompt arrives", () => {
  const { onPrompt, input } = renderWidget();
  fireEvent.change(input, { target: { value: "Which plan fits?" } });

  act(() => onPrompt("Compare the plans"));

  expect(input.value).toBe("Which plan fits? Compare the plans");
});
