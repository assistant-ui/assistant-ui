"use client";

import "@openuidev/react-ui/layered/styles/index.css";

import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  Suggestions,
  Tools,
  defineToolkit,
  type ToolCallMessagePartComponent,
  useAui,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import {
  BuiltinActionType,
  Renderer,
  type ActionEvent,
  type OpenUIError,
} from "@openuidev/react-lang";
import { ThemeProvider, useSystemThemeMode } from "@openuidev/react-ui";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { shouldContinueAfterOpenUIPrompt } from "./openui-utils";

const parameters = z.object({
  ui: z
    .string()
    .describe("A complete OpenUI Lang program with Card as its root"),
});

type OpenUIArgs = z.infer<typeof parameters>;

type OpenUIActionResult = {
  type: string;
  message: string;
  params: Record<string, unknown>;
  formState?: Record<string, unknown>;
  formName?: string;
};

type OpenUIContentProps = {
  response: string;
  isStreaming: boolean;
  initialState?: Record<string, unknown>;
  onAction?: (event: ActionEvent) => void;
};

function OpenUIContent({
  response,
  isStreaming,
  initialState,
  onAction,
}: OpenUIContentProps) {
  const [errors, setErrors] = useState<OpenUIError[]>([]);

  return (
    <div className="w-full max-w-2xl">
      <Renderer
        response={response}
        library={openuiChatLibrary}
        isStreaming={isStreaming}
        onError={setErrors}
        {...(initialState !== undefined && { initialState })}
        {...(onAction !== undefined && { onAction })}
      />
      {!isStreaming && errors.length > 0 && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-2 rounded-lg border p-3 text-sm"
        >
          OpenUI could not render this response.
        </div>
      )}
    </div>
  );
}

function OpenUIThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSystemThemeMode();

  return <ThemeProvider mode={mode}>{children}</ThemeProvider>;
}

const OpenUIPresent: ToolCallMessagePartComponent<
  OpenUIArgs,
  { displayed: true }
> = ({ args, status }) => (
  <OpenUIContent
    response={args.ui ?? ""}
    isStreaming={status.type === "running"}
  />
);

const OpenUIPrompt: ToolCallMessagePartComponent<
  OpenUIArgs,
  OpenUIActionResult
> = ({ args, status, result, addResult }) => {
  const completed = useRef(result !== undefined);
  const onAction = (event: ActionEvent) => {
    if (
      result !== undefined ||
      completed.current ||
      event.type !== BuiltinActionType.ContinueConversation
    ) {
      return;
    }

    completed.current = true;
    addResult({
      type: event.type,
      message: event.humanFriendlyMessage,
      params: event.params,
      ...(event.formState !== undefined && { formState: event.formState }),
      ...(event.formName !== undefined && { formName: event.formName }),
    });
  };

  return (
    <OpenUIContent
      response={args.ui ?? ""}
      isStreaming={status.type === "running"}
      onAction={onAction}
      {...(result?.formState !== undefined && {
        initialState: result.formState,
      })}
    />
  );
};

const toolkit = defineToolkit({
  present_openui: {
    type: "frontend",
    display: "standalone",
    description: "Render a display-only interface from an OpenUI Lang program.",
    parameters,
    execute: async () => ({ displayed: true as const }),
    render: OpenUIPresent,
  },
  prompt_openui: {
    type: "human",
    display: "standalone",
    description:
      "Render an interactive OpenUI Lang form or choice and wait for the user to submit it.",
    parameters,
    render: OpenUIPrompt,
  },
});

function OpenUIRuntimeProvider({ children }: { children: ReactNode }) {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: "/api/openui/chat" }),
    [],
  );
  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: shouldContinueAfterOpenUIPrompt,
  });
  const aui = useAui({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Launch readiness",
        label: "as a visual scorecard",
        prompt:
          "Present a product launch readiness scorecard for Product 90%, Marketing 70%, Sales 55%, and Support 80%. Include clear status badges and the three most important next actions.",
      },
      {
        title: "Plan a team offsite",
        label: "with an interactive form",
        prompt:
          "Ask me to choose an offsite destination from Lisbon, Montreal, or Kyoto, along with trip length and budget. Use an OpenUI form and wait for me to submit it.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function OpenUIWelcome() {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center gap-1 px-4 text-center">
      <h2 className="text-xl font-semibold">OpenUI Assistant</h2>
      <p className="text-muted-foreground max-w-lg text-sm">
        Ask for a dashboard, table, form, or other interface. OpenUI streams it
        directly into the conversation.
      </p>
    </div>
  );
}

export function OpenUISample() {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <AuiProvider extends={null} config={AuiConfig({})}>
        <OpenUIThemeProvider>
          <OpenUIRuntimeProvider>
            <Thread components={{ Welcome: OpenUIWelcome }} />
          </OpenUIRuntimeProvider>
        </OpenUIThemeProvider>
      </AuiProvider>
    </SampleFrame>
  );
}
