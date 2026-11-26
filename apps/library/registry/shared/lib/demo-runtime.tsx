"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  Suggestions,
  InMemoryThreadListAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type DictationAdapter,
  type FeedbackAdapter,
  type SuggestionAdapter,
  type SpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
  WebSpeechSynthesisAdapter,
} from "@assistant-ui/react";
import { runScript } from "@/registry/shared/lib/demo-script";

type RunResult = ChatModelRunResult;

/**
 * The scripted replies from demo-script, as a web runtime adapter. It times
 * each reply as it plays and attaches the result as the message's timing, the
 * way the AI SDK runtime does for real replies.
 */
const scriptedAdapter: ChatModelAdapter = {
  async *run(options) {
    const streamStartTime = Date.now();
    let firstTokenTime: number | undefined;
    let totalChunks = 0;
    let last: RunResult | undefined;
    const script = runScript(options) as AsyncGenerator<RunResult, void>;
    for await (const result of script) {
      totalChunks++;
      firstTokenTime ??= Date.now() - streamStartTime;
      last = result;
      yield result;
    }
    if (!last) return;
    yield {
      ...last,
      metadata: {
        ...last.metadata,
        timing: {
          streamStartTime,
          ...(firstTokenTime !== undefined && { firstTokenTime }),
          totalStreamTime: Date.now() - streamStartTime,
          totalChunks,
          toolCallCount: 0,
        },
      },
    };
  },
};

/**
 * The starter prompts on an empty chat. Each shows `title` and `label` and
 * sends `prompt`; plain strings work too. These match what the demo answers.
 */
export const STARTERS = [
  {
    title: "Write a debounce hook",
    label: "in TypeScript",
    prompt: "Write a debounce hook in TypeScript.",
  },
  {
    title: "Compare React and Vue",
    label: "in a table",
    prompt: "Compare React and Vue in a table.",
  },
  {
    title: "What can you do?",
    label: "",
    prompt: "What can you do?",
  },
  {
    title: "Show an error",
    label: "mid-reply",
    prompt: "Show me an error.",
  },
];

/** After a reply, offers the starters this chat has not sent yet as follow-ups. */
export const followUpAdapter: SuggestionAdapter = {
  async generate({ messages }) {
    const sent = new Set(
      messages
        .filter((message) => message.role === "user")
        .flatMap((message) =>
          message.content.map((part) =>
            part.type === "text" ? part.text : "",
          ),
        ),
    );
    return STARTERS.filter((starter) => !sent.has(starter.prompt));
  },
};

const EMPTY_CONFIG = AuiConfig({});

export const STARTER_CONFIG = AuiConfig({
  suggestions: Suggestions(STARTERS),
});

/**
 * Turns on the thumbs up and down on replies. The runtime keeps the rating on
 * the message, which marks the pressed thumb; send it on from `submit` (the
 * message, `type`, and any `comment`) to wherever you collect feedback.
 */
export const feedbackAdapter: FeedbackAdapter = {
  submit: () => {},
};

type BrowserSpeechAdapters = {
  dictation?: DictationAdapter;
  speech?: SpeechSynthesisAdapter;
};

const NO_SPEECH: BrowserSpeechAdapters = {};

let speechAdapters: BrowserSpeechAdapters | undefined;

const subscribeSpeech = () => () => {};
const speechServerSnapshot = () => NO_SPEECH;

/** Built once. The snapshot must keep returning this same object. */
const speechSnapshot = (): BrowserSpeechAdapters => {
  speechAdapters ??= {
    ...(WebSpeechDictationAdapter.isSupported() && {
      dictation: new WebSpeechDictationAdapter(),
    }),
    ...("speechSynthesis" in window && {
      speech: new WebSpeechSynthesisAdapter(),
    }),
  };
  return speechAdapters;
};

/**
 * The browser's speech recognition and speech synthesis as runtime adapters:
 * dictation shows the composer's mic, speech shows "Read aloud" on replies.
 * The server snapshot stays empty so both renders match, and the client
 * snapshot supplies whichever of the two this browser has.
 */
export function useBrowserSpeech(): BrowserSpeechAdapters {
  return useSyncExternalStore(
    subscribeSpeech,
    speechSnapshot,
    speechServerSnapshot,
  );
}

/**
 * Wraps a block in the scripted runtime, with conversations kept in memory.
 * It starts from an empty scope, so it works inside a page that has an
 * assistant of its own.
 */
export function DemoRuntimeProvider({ children }: { children: ReactNode }) {
  return (
    <AuiProvider extends={null} config={EMPTY_CONFIG}>
      <DemoRuntime>{children}</DemoRuntime>
    </AuiProvider>
  );
}

function DemoRuntime({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => new InMemoryThreadListAdapter(), []);
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function DemoThreadRuntime() {
      const speech = useBrowserSpeech();
      return useLocalRuntime(scriptedAdapter, {
        adapters: {
          ...speech,
          feedback: feedbackAdapter,
          suggestion: followUpAdapter,
        },
      });
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={STARTER_CONFIG}>
      {children}
    </AssistantRuntimeProvider>
  );
}
