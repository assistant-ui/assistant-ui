"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ErrorPrimitive,
  AuiIf,
  useAuiState,
  Tools,
  Suggestions,
} from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { SendHorizontal, SquareIcon } from "lucide-react";
import {
  createPlaygroundChatToolkit,
  type PartialBuilderConfig,
} from "@/lib/playground-chat-toolkit";
import { useAui, AuiProvider } from "@assistant-ui/store";
import type { BuilderConfig } from "./types";
import { applyDiff } from "@/lib/playground-url-state";
import { anonymousSessionFetch } from "@/lib/anonymous-session-client";
import { createPlaygroundChatFetch } from "@/lib/playground-chat-fetch";

const PLAYGROUND_SUGGESTIONS = [
  {
    title: "Make it look like",
    label: "ChatGPT",
    prompt: "Make it look like ChatGPT",
  },
  {
    title: "Switch to",
    label: "dark mode",
    prompt: "Switch to dark mode with blue accents",
  },
  {
    title: "Enable all",
    label: "features",
    prompt: "Enable all features like attachments, avatars, and feedback",
  },
];

// --- Context (shares runtime between mobile sheet + desktop sidebar) ---

type PlaygroundChatContextValue = {
  runtime: ReturnType<typeof useChatRuntime>;
  aui: ReturnType<typeof useAui>;
  anonymousLimitReached: boolean;
  authenticationAvailable: boolean;
};

const PlaygroundChatContext = createContext<PlaygroundChatContextValue | null>(
  null,
);

function usePlaygroundChat() {
  const ctx = useContext(PlaygroundChatContext);
  if (!ctx)
    throw new Error(
      "usePlaygroundChat must be used within PlaygroundChatProvider",
    );
  return ctx;
}

// --- Provider (plain context, no AssistantRuntimeProvider) ---

interface PlaygroundChatProviderProps {
  config: BuilderConfig;
  setConfig: (config: BuilderConfig) => void;
  children: ReactNode;
}

interface PlaygroundChatProviderInnerProps extends PlaygroundChatProviderProps {
  parentAui: ReturnType<typeof useAui>;
  authenticationAvailable: boolean;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
}

export function PlaygroundChatProvider(props: PlaygroundChatProviderProps) {
  const parentAui = useAui();
  const authenticationAvailable = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
  );

  return (
    <AuiProvider value={null}>
      {authenticationAvailable ? (
        <AuthenticatedPlaygroundChatProviderInner
          {...props}
          parentAui={parentAui}
        />
      ) : (
        <PlaygroundChatProviderInner
          {...props}
          parentAui={parentAui}
          authenticationAvailable={false}
          isAuthLoaded
          isSignedIn={false}
        />
      )}
    </AuiProvider>
  );
}

function AuthenticatedPlaygroundChatProviderInner(
  props: PlaygroundChatProviderProps & {
    parentAui: ReturnType<typeof useAui>;
  },
) {
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <PlaygroundChatProviderInner
      {...props}
      authenticationAvailable
      isAuthLoaded={isLoaded}
      isSignedIn={Boolean(isSignedIn)}
    />
  );
}

function PlaygroundChatProviderInner({
  config,
  setConfig,
  children,
  parentAui,
  authenticationAvailable,
  isAuthLoaded,
  isSignedIn,
}: PlaygroundChatProviderInnerProps) {
  const [anonymousLimitReached, setAnonymousLimitReached] = useState(false);
  const isSignedInRef = useRef(false);
  const retriedAfterAuthRef = useRef(false);
  isSignedInRef.current = isAuthLoaded && isSignedIn;

  const configRef = useRef(config);
  configRef.current = config;

  const onConfigUpdate = useCallback(
    (update: PartialBuilderConfig) => {
      const { customCSS, ...rest } = update;
      const merged = applyDiff(
        rest as Record<string, unknown>,
        configRef.current,
      );
      if (customCSS !== undefined) {
        merged.customCSS = customCSS
          ? [configRef.current.customCSS, customCSS].filter(Boolean).join("\n")
          : "";
      }
      setConfig(merged);
    },
    [setConfig],
  );

  const toolkit = useMemo(
    () => createPlaygroundChatToolkit(onConfigUpdate),
    [onConfigUpdate],
  );

  const playgroundFetch = useMemo(
    () =>
      createPlaygroundChatFetch({
        isSignedIn: () => isSignedInRef.current,
        onAnonymousLimit: () => {
          retriedAfterAuthRef.current = false;
          setAnonymousLimitReached(true);
        },
        anonymousFetch: anonymousSessionFetch,
      }),
    [],
  );

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/playground-chat",
        fetch: playgroundFetch,
        prepareSendMessagesRequest: async (options) => ({
          body: {
            ...options.body,
            messages: options.messages,
            builderConfig: configRef.current,
          },
        }),
      }),
    [playgroundFetch],
  );

  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const aui = useAui({
    tools: Tools({ toolkit }),
    suggestions: Suggestions(PLAYGROUND_SUGGESTIONS),
  });

  useEffect(() => {
    if (
      !isAuthLoaded ||
      !isSignedIn ||
      !anonymousLimitReached ||
      retriedAfterAuthRef.current
    ) {
      return;
    }

    retriedAfterAuthRef.current = true;
    setAnonymousLimitReached(false);
    const messages = runtime.thread.getState().messages;
    const lastMessage = messages.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.status?.type === "incomplete"
    ) {
      runtime.thread.getMessageById(lastMessage.id).reload();
    }
  }, [anonymousLimitReached, isAuthLoaded, isSignedIn, runtime]);

  const value = useMemo(
    () => ({
      runtime,
      aui,
      anonymousLimitReached,
      authenticationAvailable,
    }),
    [anonymousLimitReached, authenticationAvailable, runtime, aui],
  );

  return (
    <PlaygroundChatContext.Provider value={value}>
      <AuiProvider value={parentAui}>{children}</AuiProvider>
    </PlaygroundChatContext.Provider>
  );
}

// --- Thread UI (each mount creates its own AssistantRuntimeProvider scope) ---

export function PlaygroundChatThread({
  onRunningChange,
}: {
  onRunningChange?: (isRunning: boolean) => void;
}) {
  const { runtime, aui, anonymousLimitReached, authenticationAvailable } =
    usePlaygroundChat();

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {onRunningChange && <RunningObserver onRunningChange={onRunningChange} />}
      <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
        <ThreadPrimitive.Viewport className="flex flex-1 scrollbar-none flex-col gap-3 overflow-y-auto px-3 pt-3">
          <ThreadPrimitive.Empty>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
              <div>
                <p className="text-sm font-medium">
                  Describe how you want your chat to look
                </p>
                <p className="text-muted-foreground text-xs">
                  e.g. &quot;make it look like ChatGPT&quot; or &quot;use dark
                  mode with rounded corners&quot;
                </p>
              </div>
              <div className="flex w-full max-w-56 flex-col gap-2">
                {PLAYGROUND_SUGGESTIONS.map((s) => (
                  <ThreadPrimitive.Suggestion
                    key={s.prompt}
                    prompt={s.prompt}
                    send
                    className="hover:bg-muted rounded-lg border px-3 py-2 text-left text-xs transition-colors"
                  >
                    <span className="font-medium">{s.title}</span>{" "}
                    <span className="text-muted-foreground">{s.label}</span>
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />

          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto">
            {anonymousLimitReached && (
              <AnonymousLimitBanner
                authenticationAvailable={authenticationAvailable}
              />
            )}
            <Composer disabled={anonymousLimitReached} />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

/** Bridges runtime state to the parent; resets on unmount. */
function RunningObserver({
  onRunningChange,
}: {
  onRunningChange: (isRunning: boolean) => void;
}) {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  useEffect(() => {
    onRunningChange(isRunning);
    return () => onRunningChange(false);
  }, [isRunning, onRunningChange]);
  return null;
}

function AnonymousLimitBanner({
  authenticationAvailable,
}: {
  authenticationAvailable: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnPath = `${pathname}${query ? `?${query}` : ""}`;

  return (
    <div
      role="alert"
      className="border-border bg-muted/60 mx-2 rounded-lg border p-3 text-xs"
    >
      <p className="font-medium">You reached the anonymous Playground limit.</p>
      <p className="text-muted-foreground mt-1">
        {authenticationAvailable
          ? "Create a free account or sign in to continue this request."
          : "Please try again after the daily limit resets."}
      </p>
      {authenticationAvailable && (
        <div className="mt-3 flex gap-2">
          <SignUpButton mode="modal" fallbackRedirectUrl={returnPath}>
            <button
              type="button"
              className="bg-foreground text-background rounded-md px-2.5 py-1.5 font-medium"
            >
              Create account
            </button>
          </SignUpButton>
          <SignInButton mode="modal" fallbackRedirectUrl={returnPath}>
            <button
              type="button"
              className="border-border bg-background rounded-md border px-2.5 py-1.5 font-medium"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      )}
    </div>
  );
}

function Composer({ disabled }: { disabled: boolean }) {
  return (
    <ComposerPrimitive.Root className="py-2">
      <div className="border-border bg-background focus-within:border-foreground/60 rounded-lg border transition-colors">
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder="Describe a change..."
            className="placeholder:text-muted-foreground field-sizing-content max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 focus:outline-none"
            rows={1}
            disabled={disabled}
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-end px-1.5 pb-1.5">
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send
              disabled={disabled}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors disabled:opacity-30"
            >
              <SendHorizontal className="size-4" />
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <ComposerPrimitive.Cancel className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors">
              <SquareIcon className="size-3.5 fill-current" />
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="bg-foreground/5 max-w-[85%] rounded-lg px-3 py-2 text-sm">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="px-3 py-2 text-sm">
      <MessagePrimitive.Content />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-2 text-xs dark:text-red-200">
          <ErrorPrimitive.Message className="line-clamp-2" />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}
