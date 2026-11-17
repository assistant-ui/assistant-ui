// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type {
  AttachmentAdapter,
  AssistantRuntime,
  DictationAdapter,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  SpeechSynthesisAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { ComposerPrimitive, ThreadPrimitive } from "../index";

const dictation: DictationAdapter = {
  listen: () => ({
    status: { type: "running" },
    stop: async () => {},
    cancel: () => {},
    onSpeechStart: () => () => {},
    onSpeechEnd: () => () => {},
    onSpeech: () => () => {},
  }),
};

const adapters = {
  attachments: {} as AttachmentAdapter,
  dictation,
  feedback: {} as FeedbackAdapter,
  speech: {} as SpeechSynthesisAdapter,
  voice: {} as RealtimeVoiceAdapter,
};

const App = ({
  onRuntime,
}: {
  onRuntime?: (runtime: AssistantRuntime) => void;
}) => {
  const runtime = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    convertMessage: (message) => message,
    onNew: async () => {},
    adapters:
      typeof window !== "undefined" && "SpeechRecognition" in window
        ? adapters
        : undefined,
  });
  onRuntime?.(runtime);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root>
        <ComposerPrimitive.Root>
          <ComposerPrimitive.Dictate aria-label="Speak">
            Mic
          </ComposerPrimitive.Dictate>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
};

const renderOnServer = (node: ReactNode) => {
  vi.stubGlobal("window", undefined);
  vi.stubGlobal("document", undefined);
  try {
    return renderToString(node);
  } finally {
    vi.unstubAllGlobals();
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("hydrates a browser-only dictation adapter without a disabled button mismatch", async () => {
  let serverRuntime: AssistantRuntime | undefined;
  const html = renderOnServer(
    <App onRuntime={(runtime) => (serverRuntime = runtime)} />,
  );
  expect(serverRuntime!.thread.getState().capabilities).toMatchObject({
    attachments: false,
    dictation: false,
    feedback: false,
    speech: false,
    voice: false,
  });
  expect(html).toContain('aria-label="Speak" disabled=""');

  const previousSpeechRecognition = Object.getOwnPropertyDescriptor(
    window,
    "SpeechRecognition",
  );
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: class {},
  });
  const container = document.createElement("div");
  container.innerHTML = html;
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  let clientRuntime: AssistantRuntime | undefined;
  let root: ReturnType<typeof hydrateRoot> | undefined;

  try {
    await act(async () => {
      root = hydrateRoot(
        container,
        <App onRuntime={(runtime) => (clientRuntime = runtime)} />,
      );
    });

    expect({
      capabilities: {
        attachments: clientRuntime!.thread.getState().capabilities.attachments,
        dictation: clientRuntime!.thread.getState().capabilities.dictation,
        feedback: clientRuntime!.thread.getState().capabilities.feedback,
        speech: clientRuntime!.thread.getState().capabilities.speech,
        voice: clientRuntime!.thread.getState().capabilities.voice,
      },
      disabled: container.querySelector<HTMLButtonElement>("button")!.disabled,
      hydrationMismatch: errors.mock.calls
        .flat()
        .join(" ")
        .includes("hydrated"),
    }).toEqual({
      capabilities: {
        attachments: true,
        dictation: true,
        feedback: true,
        speech: true,
        voice: true,
      },
      disabled: false,
      hydrationMismatch: false,
    });
  } finally {
    await act(async () => root?.unmount());
    if (previousSpeechRecognition) {
      Object.defineProperty(
        window,
        "SpeechRecognition",
        previousSpeechRecognition,
      );
    } else {
      Reflect.deleteProperty(window, "SpeechRecognition");
    }
  }
});

it("keeps adapter capabilities available on client-only renders", async () => {
  const previousSpeechRecognition = Object.getOwnPropertyDescriptor(
    window,
    "SpeechRecognition",
  );
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: class {},
  });
  const container = document.createElement("div");
  let clientDictationCapability: boolean | undefined;
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <App
          onRuntime={(runtime) => {
            clientDictationCapability =
              runtime.thread.getState().capabilities.dictation;
          }}
        />,
      );
    });

    expect(clientDictationCapability).toBe(true);
    expect(container.querySelector<HTMLButtonElement>("button")!.disabled).toBe(
      false,
    );
  } finally {
    await act(async () => root.unmount());
    if (previousSpeechRecognition) {
      Object.defineProperty(
        window,
        "SpeechRecognition",
        previousSpeechRecognition,
      );
    } else {
      Reflect.deleteProperty(window, "SpeechRecognition");
    }
  }
});
