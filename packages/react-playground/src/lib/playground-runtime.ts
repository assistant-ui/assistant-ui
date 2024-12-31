import {
  AddToolResultOptions,
  AppendMessage,
  EdgeChatAdapter,
  EdgeRuntimeOptions,
  EdgeRuntimeRequestOptions,
  fromCoreMessages,
  fromLanguageModelTools,
  ModelConfig,
  ModelConfigProvider,
  TextContentPart,
  ThreadAssistantContentPart,
  ThreadUserContentPart,
  Tool,
  ToolCallContentPart,
  ThreadMessage,
  ThreadAssistantMessage,
  ChatModelAdapter,
  Unsubscribe,
  ChatModelRunResult,
  CoreMessage,
  fromCoreMessage,
  INTERNAL,
  ThreadSuggestion,
  ThreadRuntime,
  AssistantRuntime,
} from "@assistant-ui/react";
import { LanguageModelV1FunctionTool } from "@ai-sdk/provider";
import { useMemo, useState } from "react";
import { create } from "zustand";
import { StartRunConfig } from "@assistant-ui/react/runtimes/core/ThreadRuntimeCore";

const {
  BaseAssistantRuntimeCore,
  ProxyConfigProvider,
  generateId,
  DefaultThreadComposerRuntimeCore,
  AssistantRuntimeImpl,
  ThreadRuntimeImpl,
} = INTERNAL;

const makeModelConfigStore = () =>
  create<ModelConfig>(() => ({
    system: "",
    tools: {},
    callSettings: {
      temperature: 1,
      maxTokens: 256,
    },
    config: {},
  }));

type PlaygroundThreadFactory = () => PlaygroundThreadRuntimeCore;

const EMPTY_ARRAY = [] as never[];

class PlaygroundThreadListRuntimeCore
  implements INTERNAL.ThreadListRuntimeCore
{
  private _mainThread: PlaygroundThreadRuntimeCore;

  public get mainThreadId() {
    return "default";
  }

  public get newThreadId() {
    return undefined;
  }

  public get threadIds() {
    return EMPTY_ARRAY;
  }

  public get archivedThreadIds() {
    return EMPTY_ARRAY;
  }

  constructor(private threadFactory: PlaygroundThreadFactory) {
    this._mainThread = this.threadFactory();
  }

  public getMainThreadRuntimeCore() {
    return this._mainThread;
  }

  public getItemById(id: string) {
    if (id !== "default") return undefined;

    return {
      threadId: "default",
      state: "regular",
      runtime: this._mainThread,
    } as const;
  }

  public switchToThread(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async switchToNewThread(): Promise<void> {
    this._mainThread = this.threadFactory();
    this.notifySubscribers();
  }

  public rename(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public archive(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public unarchive(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public delete(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private _subscriptions = new Set<() => void>();

  private notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }
}

class PlaygroundRuntimeCore extends BaseAssistantRuntimeCore {
  public readonly threadList;

  constructor(
    adapter: ChatModelAdapter,
    initialMessages: readonly CoreMessage[],
  ) {
    super();

    this.threadList = new PlaygroundThreadListRuntimeCore(() => {
      const thread = new PlaygroundThreadRuntimeCore(
        this._proxyConfigProvider,
        fromCoreMessages(initialMessages),
        adapter,
      );
      initialMessages = [];
      return thread;
    });
  }

  public override registerModelConfigProvider(
    provider: ModelConfigProvider,
  ): Unsubscribe {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }
}

const CAPABILITIES = Object.freeze({
  switchToBranch: false,
  edit: false,
  reload: false,
  cancel: true,
  unstable_copy: true,
  speech: false,
  attachments: false,
  feedback: false,
});

const EMPTY_BRANCHES: readonly string[] = Object.freeze([]);

export class PlaygroundThreadRuntimeCore implements INTERNAL.ThreadRuntimeCore {
  public get metadata() {
    return { isMain: true, threadId: "default", state: "regular" } as const;
  }

  private _subscriptions = new Set<() => void>();

  private abortController: AbortController | null = null;

  public tools: Record<string, Tool<any, any>> = {};

  public readonly isDisabled = false;
  public readonly capabilities = CAPABILITIES;
  public readonly extras = undefined;
  public readonly suggestions: readonly ThreadSuggestion[] = [];
  public readonly speech = undefined;
  public readonly adapters = undefined;

  private configProvider = new ProxyConfigProvider();

  public readonly composer = new DefaultThreadComposerRuntimeCore(this);

  public getEditComposer() {
    return undefined;
  }

  public beginEdit() {
    throw new Error("Playground does not support edit mode.");
  }

  constructor(
    configProvider: ModelConfigProvider,
    private _messages: ThreadMessage[],
    public readonly adapter: ChatModelAdapter,
  ) {
    this.configProvider.registerModelConfigProvider(configProvider);
    this.configProvider.registerModelConfigProvider({
      getModelConfig: () => this.useModelConfig.getState(),
    });
  }

  public getModelConfig() {
    return this.configProvider.getModelConfig();
  }

  public setRequestData({
    apiKey,
    baseUrl,
    modelName,
    messages,
    system,
    tools,
    ...callSettings
  }: EdgeRuntimeRequestOptions) {
    this.setMessages(fromCoreMessages(messages));
    const config: ModelConfig = {
      system,
      tools: tools
        ? fromLanguageModelTools(tools as LanguageModelV1FunctionTool[])
        : undefined,
      callSettings,
      config: {
        apiKey,
        baseUrl,
        modelName,
      },
    };
    this.useModelConfig.setState(config);
  }

  public readonly useModelConfig = makeModelConfigStore();

  public get messages() {
    return this._messages;
  }

  private setMessages(messages: ThreadMessage[]) {
    this._messages = messages;
    this.notifySubscribers();
  }

  public getBranches(): readonly string[] {
    // no need to implement this for the playground
    return EMPTY_BRANCHES;
  }

  public switchToBranch(): void {
    // no need to implement this for the playground
    throw new Error("Branch switching is not supported.");
  }

  public async append({ parentId, ...message }: AppendMessage): Promise<void> {
    if (parentId !== (this.messages.at(-1)?.id ?? null))
      throw new Error("Message editing is not supported..");

    this.setMessages([...this.messages, fromCoreMessage(message)]);
  }

  public async startRun({ runConfig }: StartRunConfig): Promise<void> {
    let message: ThreadAssistantMessage = {
      id: generateId(),
      role: "assistant",
      status: { type: "running" },
      content: [],
      metadata: { steps: [], custom: {} },
      createdAt: new Date(),
    };

    this.abortController?.abort();
    this.abortController = new AbortController();

    const messages = this.messages;
    this.setMessages([...this.messages, message]);

    const updateMessage = (m: Partial<ChatModelRunResult>) => {
      message = {
        ...message,
        content: m.content ?? message.content,
        status: m.status ?? message.status,
        metadata: {
          steps: m.metadata?.steps ?? message.metadata?.steps,
          custom: m.metadata?.custom ?? message.metadata?.custom,
        },
      };
      this.setMessages([...this.messages.slice(0, -1), message]);
    };

    try {
      const promiseOrGenerator = this.adapter.run({
        messages,
        runConfig: runConfig ?? {},
        abortSignal: this.abortController.signal,
        config: this.configProvider.getModelConfig(),
      });

      if (Symbol.asyncIterator in promiseOrGenerator) {
        for await (const r of promiseOrGenerator) {
          updateMessage(r);
        }
      } else {
        updateMessage(await promiseOrGenerator);
      }

      this.abortController = null;

      if (message.status.type === "running") {
        updateMessage({
          status: { type: "complete", reason: "unknown" },
        });
      }
    } catch (e) {
      this.abortController = null;

      // TODO this should be handled by the run result stream
      if (e instanceof Error && e.name === "AbortError") {
        updateMessage({
          status: { type: "incomplete", reason: "cancelled" },
        });
      } else {
        updateMessage({
          status: { type: "incomplete", reason: "error", error: e },
        });

        throw e;
      }
    }
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  public cancelRun(): void {
    if (!this.abortController) return;

    this.abortController.abort();
    this.abortController = null;
  }

  public speak(): never {
    throw new Error("PlaygroundRuntime does not support speaking.");
  }

  public stopSpeaking(): never {
    throw new Error("PlaygroundRuntime does not support speaking.");
  }

  public getSubmittedFeedback() {
    return undefined;
  }

  public submitFeedback(): never {
    throw new Error("PlaygroundRuntime does not support feedback.");
  }

  public unstable_on() {
    // events not supported in playground
    return () => {};
  }

  public deleteMessage(messageId: string) {
    this.setMessages(this.messages.filter((m) => m.id !== messageId));
  }

  public setMessageText({
    messageId,
    contentPart,
    text,
  }: {
    messageId: string;
    contentPart: TextContentPart;
    text: string;
  }) {
    this.setMessages(
      this.messages.map((m) => {
        if (m.id === messageId) {
          let found = false;
          const newContent = m.content.map((part) => {
            if (part === contentPart) {
              if (part.type !== "text")
                throw new Error("Tried to set text for non-text content part.");
              found = true;
              return { ...part, text };
            }
            return part;
          });

          if (!found)
            throw new Error(
              "Tried to set text for content part that does not exist.",
            );

          return {
            ...m,
            content: newContent,
          } as ThreadMessage;
        }
        return m;
      }),
    );
  }

  public deleteContentPart(
    messageId: string,
    part: ThreadUserContentPart | ThreadAssistantContentPart,
  ) {
    this.setMessages(
      this.messages.map((m) => {
        if (m.id === messageId) {
          const newContent = m.content.filter((p) => p !== part);

          return {
            ...m,
            content: newContent,
          } as ThreadMessage;
        }
        return m;
      }),
    );
  }

  public addTool({
    messageId,
    toolName,
  }: {
    messageId: string;
    toolName: string;
  }) {
    this.setMessages(
      this.messages.map((m) => {
        if (m.id === messageId) {
          const newContent = [
            ...m.content,
            {
              type: "tool-call",
              toolCallId: generateId(),
              toolName,
              argsText: "",
              args: {},
            } satisfies ToolCallContentPart,
          ];

          return {
            ...m,
            content: newContent,
          } as ThreadMessage;
        }
        return m;
      }),
    );
  }

  public addToolResult({
    messageId,
    toolCallId,
    result,
  }: AddToolResultOptions) {
    this.setMessages(
      this.messages.map((m) => {
        if (m.id === messageId) {
          let found = false;
          const newContent = m.content.map((part) => {
            if (part.type !== "tool-call") return part;
            if (part.toolCallId === toolCallId) {
              found = true;
              return {
                ...part,
                result,
              };
            }
            return part;
          });
          if (!found)
            throw new Error(
              "Tried to add tool result for tool call that does not exist.",
            );

          return {
            ...m,
            content: newContent,
          } as ThreadMessage;
        }
        return m;
      }),
    );
  }

  public setToolArgs({
    messageId,
    toolCallId,
    args,
  }: {
    messageId: string;
    toolCallId: string;
    args: any;
  }) {
    this.setMessages(
      this.messages.map((m) => {
        if (m.id === messageId) {
          let found = false;
          const newContent = m.content.map((part) => {
            if (part.type !== "tool-call") return part;
            if (part.toolCallId === toolCallId) {
              found = true;
              return {
                ...part,
                args,
              };
            }
            return part;
          });
          if (!found)
            throw new Error(
              "Tried to set tool args for tool call that does not exist.",
            );

          return {
            ...m,
            content: newContent,
          } as ThreadMessage;
        }
        return m;
      }),
    );
  }

  public setRole({
    messageId,
    role,
  }: {
    messageId: string;
    role: "user" | "assistant" | "system";
  }) {
    this.setMessages(
      this.messages.map((m) => {
        if (m.id === messageId) {
          return {
            ...m,
            role,
            ...(role === "assistant"
              ? {
                  status: m.status ?? { type: "complete", reason: "unknown" },
                }
              : undefined),
            content: m.content
              .filter((part) => {
                const assistantAllowed =
                  role === "assistant" || part.type !== "tool-call"; // tool call parts are only allowed in assistant messages
                const userAllowed = role === "user" || part.type !== "image"; // image parts are only allowed in user messages
                const systemAllowed = role === "system" || part.type === "text"; // system messages only allow text parts

                return assistantAllowed && userAllowed && systemAllowed;
              })
              .filter((_, idx) => role !== "system" || idx === 0), // system messages only allow one part
          } as ThreadMessage;
        }
        return m;
      }),
    );
  }

  public addImage({ image, messageId }: { image: string; messageId: string }) {
    this.setMessages(
      this.messages.map((m) => {
        if (m.id === messageId) {
          if (m.role !== "user")
            throw new Error(
              "Tried to add image to a non-user message. This is likely an internal bug in assistant-ui.",
            );

          return {
            ...m,
            content: [
              ...m.content,
              { type: "image", image } satisfies ThreadUserContentPart,
            ],
          };
        }
        return m;
      }),
    );
  }

  public import() {
    throw new Error("Playground does not support importing messages.");
  }

  public export(): never {
    throw new Error("Playground does not support exporting messages.");
  }

  public getMessageById(messageId: string) {
    const idx = this.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return undefined;
    return {
      message: this.messages[idx]!,
      parentId: this.messages[idx - 1]?.id ?? null,
    };
  }
}

export type PlaygroundThreadRuntime = ThreadRuntime & {
  useModelConfig: PlaygroundThreadRuntimeCore["useModelConfig"];
  addImage: PlaygroundThreadRuntimeCore["addImage"];
  addTool: PlaygroundThreadRuntimeCore["addTool"];
  deleteMessage: PlaygroundThreadRuntimeCore["deleteMessage"];
  setRole: PlaygroundThreadRuntimeCore["setRole"];
  setRequestData: (options: EdgeRuntimeRequestOptions) => void;
  setMessageText: PlaygroundThreadRuntimeCore["setMessageText"];
  deleteContentPart: PlaygroundThreadRuntimeCore["deleteContentPart"];
};

class PlaygroundThreadRuntimeImpl
  extends ThreadRuntimeImpl
  implements PlaygroundThreadRuntime
{
  constructor(
    private binding: INTERNAL.ThreadRuntimeCoreBinding,
    threadListItemBinding: INTERNAL.ThreadListItemRuntimeBinding,
  ) {
    super(binding, threadListItemBinding);
  }

  private _getState() {
    return this.binding.getState() as PlaygroundThreadRuntimeCore;
  }

  public setRequestData(options: EdgeRuntimeRequestOptions) {
    return this._getState().setRequestData(options);
  }

  public addImage(options: { image: string; messageId: string }) {
    return this._getState().addImage(options);
  }

  public deleteMessage(messageId: string) {
    return this._getState().deleteMessage(messageId);
  }

  public setRole(options: {
    messageId: string;
    role: "user" | "assistant" | "system";
  }) {
    return this._getState().setRole(options);
  }

  public addTool(options: { messageId: string; toolName: string }) {
    return this._getState().addTool(options);
  }

  public setMessageText(options: {
    messageId: string;
    contentPart: TextContentPart;
    text: string;
  }) {
    return this._getState().setMessageText(options);
  }

  public deleteContentPart(messageId: string, part: ThreadUserContentPart) {
    return this._getState().deleteContentPart(messageId, part);
  }

  public get useModelConfig() {
    return this._getState().useModelConfig;
  }
}

export type PlaygroundRuntime = AssistantRuntime & {
  thread: PlaygroundThreadRuntime;
};

class PlaygroundRuntimeImpl
  extends AssistantRuntimeImpl
  implements PlaygroundRuntime
{
  public override get thread() {
    return super.thread as PlaygroundThreadRuntime;
  }

  public static override create(_core: PlaygroundRuntimeCore) {
    return new PlaygroundRuntimeImpl(
      _core,
      PlaygroundThreadRuntimeImpl,
    ) as PlaygroundRuntime;
  }
}

export const usePlaygroundRuntime = ({
  initialMessages = [],
  ...options
}: EdgeRuntimeOptions) => {
  const [runtime] = useState(
    () =>
      new PlaygroundRuntimeCore(new EdgeChatAdapter(options), initialMessages),
  );

  return useMemo(() => PlaygroundRuntimeImpl.create(runtime), [runtime]);
};
