# Assistant UI - Complete API Reference

**assistant-ui** is an open source TypeScript/React library for AI chat interfaces. It provides primitive components, runtime management, and integrations with popular AI frameworks.

## Overview

The library consists of several packages:
- `@assistant-ui/react` - Core React components and runtime
- `@assistant-ui/react-ai-sdk` - Vercel AI SDK integration
- `assistant-stream` - Streaming utilities for AI responses
- `@assistant-ui/react-langgraph` - LangGraph integration
- `@assistant-ui/cloud` - Cloud service integration
- `@assistant-ui/react-markdown` - Markdown rendering
- `@assistant-ui/react-syntax-highlighter` - Code syntax highlighting
- `@assistant-ui/react-hook-form` - Form integration with AI

## Installation

```bash
npm install @assistant-ui/react
# Additional packages as needed
npm install @assistant-ui/react-ai-sdk
npm install assistant-stream
npm install @assistant-ui/react-langgraph
```

## Quick Start

```typescript
import { useLocalRuntime, AssistantRuntimeProvider, Thread } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

// Basic setup with AI SDK
const MyApp = () => {
  const runtime = useChatRuntime({
    api: '/api/chat',
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
};
```


---

# @assistant-ui/react - Core Package

## React Hooks

### Context Hooks
```typescript
// Assistant-level hooks
import { useAssistantRuntime, useToolUIs, useToolUIsStore } from '@assistant-ui/react';

// Thread-level hooks
import { 
  useThreadRuntime, 
  useThread, 
  useThreadComposer, 
  useThreadModelContext,
  useThreadList 
} from '@assistant-ui/react';

// Message-level hooks
import { 
  useMessageRuntime, 
  useMessage, 
  useEditComposer, 
  useMessageUtils,
  useMessageUtilsStore 
} from '@assistant-ui/react';

// Message part hooks
import { 
  useMessagePartRuntime, 
  useMessagePart, 
  useMessagePartText,
  useMessagePartReasoning,
  useMessagePartSource,
  useMessagePartFile,
  useMessagePartImage 
} from '@assistant-ui/react';

// Composer hooks
import { useComposerRuntime, useComposer } from '@assistant-ui/react';

// Attachment hooks
import { useAttachment, useAttachmentRuntime } from '@assistant-ui/react';

// Thread list hooks
import { useThreadListItemRuntime, useThreadListItem } from '@assistant-ui/react';

// Viewport hooks
import { 
  useThreadViewport, 
  useThreadViewportStore, 
  useThreadViewportAutoScroll 
} from '@assistant-ui/react';
```

### Runtime Hooks
```typescript
// Local runtime
import { useLocalRuntime, useLocalThreadRuntime } from '@assistant-ui/react';

// External store runtime
import { useExternalStoreRuntime, useExternalMessageConverter } from '@assistant-ui/react';

// Cloud runtime
import { useCloudThreadListRuntime } from '@assistant-ui/react';
```

### Model Context Hooks
```typescript
import { 
  useAssistantInstructions, 
  useAssistantTool, 
  useAssistantToolUI, 
  useInlineRender 
} from '@assistant-ui/react';
```

## React Components & Primitives

### Action Bar
```typescript
import { ActionBarPrimitive } from '@assistant-ui/react';

<ActionBarPrimitive.Root>
  <ActionBarPrimitive.Copy />
  <ActionBarPrimitive.Reload />
  <ActionBarPrimitive.Edit />
  <ActionBarPrimitive.Speak />
  <ActionBarPrimitive.StopSpeaking />
  <ActionBarPrimitive.FeedbackPositive />
  <ActionBarPrimitive.FeedbackNegative />
</ActionBarPrimitive.Root>
```

### Assistant Modal
```typescript
import { AssistantModalPrimitive } from '@assistant-ui/react';

<AssistantModalPrimitive.Root>
  <AssistantModalPrimitive.Trigger />
  <AssistantModalPrimitive.Content />
  <AssistantModalPrimitive.Anchor />
</AssistantModalPrimitive.Root>
```

### Attachment
```typescript
import { AttachmentPrimitive } from '@assistant-ui/react';

<AttachmentPrimitive.Root>
  <AttachmentPrimitive.Name />
  <AttachmentPrimitive.Thumb />
  <AttachmentPrimitive.Remove />
</AttachmentPrimitive.Root>
```

### Branch Picker
```typescript
import { BranchPickerPrimitive } from '@assistant-ui/react';

<BranchPickerPrimitive.Root>
  <BranchPickerPrimitive.Previous />
  <BranchPickerPrimitive.Next />
  <BranchPickerPrimitive.Count />
  <BranchPickerPrimitive.Number />
</BranchPickerPrimitive.Root>
```

### Composer
```typescript
import { ComposerPrimitive } from '@assistant-ui/react';

<ComposerPrimitive.Root>
  <ComposerPrimitive.Input />
  <ComposerPrimitive.Send />
  <ComposerPrimitive.Cancel />
  <ComposerPrimitive.AddAttachment />
  <ComposerPrimitive.Attachments />
  <ComposerPrimitive.If />
</ComposerPrimitive.Root>
```

### Message
```typescript
import { MessagePrimitive } from '@assistant-ui/react';

<MessagePrimitive.Root>
  <MessagePrimitive.Parts />
  <MessagePrimitive.Attachments />
  <MessagePrimitive.If />
  <MessagePrimitive.Error />
</MessagePrimitive.Root>
```

### Message Parts
```typescript
import { MessagePartPrimitive } from '@assistant-ui/react';

<MessagePartPrimitive.Text />
<MessagePartPrimitive.Image />
<MessagePartPrimitive.InProgress />
```

### Thread
```typescript
import { ThreadPrimitive } from '@assistant-ui/react';

<ThreadPrimitive.Root>
  <ThreadPrimitive.Empty />
  <ThreadPrimitive.If />
  <ThreadPrimitive.Viewport>
    <ThreadPrimitive.Messages />
  </ThreadPrimitive.Viewport>
  <ThreadPrimitive.ScrollToBottom />
  <ThreadPrimitive.Suggestion />
</ThreadPrimitive.Root>
```

### Thread List
```typescript
import { ThreadListPrimitive } from '@assistant-ui/react';

<ThreadListPrimitive.Root>
  <ThreadListPrimitive.New />
  <ThreadListPrimitive.Items />
</ThreadListPrimitive.Root>
```

### Thread List Item
```typescript
import { ThreadListItemPrimitive } from '@assistant-ui/react';

<ThreadListItemPrimitive.Root>
  <ThreadListItemPrimitive.Title />
</ThreadListItemPrimitive.Root>
```

### Error
```typescript
import { ErrorPrimitive } from '@assistant-ui/react';

<ErrorPrimitive.Root>
  <ErrorPrimitive.Message />
</ErrorPrimitive.Root>
```

## Context Providers

```typescript
import { AssistantRuntimeProvider, TextMessagePartProvider } from '@assistant-ui/react';

<AssistantRuntimeProvider runtime={runtime}>
  <TextMessagePartProvider>
    {/* Your components */}
  </TextMessagePartProvider>
</AssistantRuntimeProvider>
```

## Key Types

### Runtime Types
```typescript
import type {
  AssistantRuntime,
  ThreadRuntime,
  ThreadState,
  MessageRuntime,
  MessageState,
  MessagePartRuntime,
  MessagePartState,
  ComposerRuntime,
  ThreadComposerRuntime,
  EditComposerRuntime,
  AttachmentRuntime,
  AttachmentState,
  ThreadListRuntime,
  ThreadListState,
  ThreadListItemRuntime,
  ThreadListItemState,
} from '@assistant-ui/react';
```

### Message & Content Types
```typescript
import type {
  // Attachment types
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  AttachmentStatus,
  
  // Message types
  AppendMessage,
  TextMessagePart,
  ReasoningMessagePart,
  SourceMessagePart,
  ImageMessagePart,
  FileMessagePart,
  Unstable_AudioMessagePart,
  ToolCallMessagePart,
  MessageStatus,
  MessagePartStatus,
  ToolCallMessagePartStatus,
  
  // Thread message types
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  ThreadSystemMessage,
  ThreadAssistantMessage,
  ThreadUserMessage,
  ThreadMessage,
} from '@assistant-ui/react';
```

### Component Types
```typescript
import type {
  EmptyMessagePartComponent,
  TextMessagePartComponent,
  ReasoningMessagePartComponent,
  SourceMessagePartComponent,
  ImageMessagePartComponent,
  FileMessagePartComponent,
  Unstable_AudioMessagePartComponent,
  ToolCallMessagePartComponent,
} from '@assistant-ui/react';
```

### Model Context Types
```typescript
import type {
  ModelContext,
  ModelContextProvider,
  AssistantTool,
  AssistantToolUI,
  AssistantToolProps,
  AssistantToolUIProps,
  Tool,
} from '@assistant-ui/react';
```

### Runtime Options
```typescript
import type {
  LocalRuntimeOptions,
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  ChatModelRunUpdate,
  ExternalStoreAdapter,
  ExternalStoreMessageConverter,
  ExternalStoreThreadListAdapter,
  ExternalStoreThreadData,
  ThreadMessageLike,
} from '@assistant-ui/react';
```

## Model Context & Tools

```typescript
import { makeAssistantTool, makeAssistantToolUI, makeAssistantVisible, tool } from '@assistant-ui/react';

// Define a tool
const weatherTool = makeAssistantTool({
  toolName: 'get_weather',
  description: 'Get weather information',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // Tool implementation
    return { temperature: 72, condition: 'sunny' };
  },
});

// Define tool UI
const WeatherUI = makeAssistantToolUI({
  toolName: 'get_weather',
  render: ({ result }) => (
    <div>Weather: {result.temperature}°F, {result.condition}</div>
  ),
});
```

## External Store Integration

```typescript
import { 
  useExternalStoreRuntime, 
  getExternalStoreMessage, 
  getExternalStoreMessages,
  unstable_convertExternalMessages,
  unstable_createMessageConverter 
} from '@assistant-ui/react';

const runtime = useExternalStoreRuntime({
  messages: externalMessages,
  onNew: async (message) => {
    // Handle new message
  },
});
```


---

# @assistant-ui/react-ai-sdk - AI SDK Integration

## Installation
```bash
npm install @assistant-ui/react-ai-sdk
```

## Chat Runtime Hook

```typescript
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

const runtime = useChatRuntime({
  api: '/api/chat',
  onResponse: (response) => console.log('Response:', response),
  onFinish: (message) => console.log('Finished:', message),
  onError: (error) => console.error('Error:', error),
  onCancel: () => console.log('Cancelled'),
  credentials: 'include',
  headers: { 'Custom-Header': 'value' },
  body: { customData: 'value' },
  sendExtraMessageFields: true,
});
```

## Vercel AI SDK Integration

### useChat Integration
```typescript
import { useChat } from '@ai-sdk/react';
import { useVercelUseChatRuntime } from '@assistant-ui/react-ai-sdk';

const chat = useChat({ api: '/api/chat' });
const runtime = useVercelUseChatRuntime(chat, {
  adapters: {
    // Custom adapters
  },
  unstable_joinStrategy: 'concat-content', // or 'none'
});
```

### useAssistant Integration
```typescript
import { useAssistant } from '@ai-sdk/react';
import { useVercelUseAssistantRuntime } from '@assistant-ui/react-ai-sdk';

const assistant = useAssistant({ api: '/api/assistant' });
const runtime = useVercelUseAssistantRuntime(assistant);
```

## RSC (React Server Components) Integration

```typescript
import { useVercelRSCRuntime, RSCDisplay } from '@assistant-ui/react-ai-sdk';

const runtime = useVercelRSCRuntime({
  messages: rscMessages,
  onNew: async (message) => {
    // Handle new message
  },
});

// Display RSC messages
<RSCDisplay message={rscMessage} />
```

## Message Converters

```typescript
import { 
  toLanguageModelMessages, 
  fromLanguageModelTools, 
  toLanguageModelTools,
  getVercelAIMessages 
} from '@assistant-ui/react-ai-sdk';

// Convert to language model format
const lmMessages = toLanguageModelMessages(threadMessages, {
  unstable_includeId: true,
});

// Convert tools
const tools = fromLanguageModelTools(languageModelTools);
const lmTools = toLanguageModelTools(assistantTools);

// Get Vercel AI messages
const aiMessages = getVercelAIMessages(threadMessage);
```

## Dangerous In-Browser Runtime

```typescript
import { useDangerousInBrowserRuntime } from '@assistant-ui/react-ai-sdk';
import { openai } from '@ai-sdk/openai';

const runtime = useDangerousInBrowserRuntime({
  model: openai('gpt-4'),
  apiKey: process.env.OPENAI_API_KEY,
  system: 'You are a helpful assistant.',
  tools: {
    get_weather: weatherTool,
  },
  toolChoice: 'auto',
  maxTokens: 1000,
  temperature: 0.7,
  onFinish: (result) => console.log('Finished:', result),
});
```

## Frontend Tools

```typescript
import { frontendTools } from '@assistant-ui/react-ai-sdk';

const tools = frontendTools({
  calculate: {
    description: 'Perform calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string' },
      },
      required: ['expression'],
    },
  },
});
```

## Types

```typescript
import type {
  UseChatRuntimeOptions,
  UseCloudRuntimeOptions,
  VercelUseChatAdapter,
  VercelRSCAdapter,
  VercelRSCMessage,
  DangerousInBrowserRuntimeOptions,
  CreateEdgeRuntimeAPIOptions,
  LanguageModelV1CallSettings,
} from '@assistant-ui/react-ai-sdk';
```


---

# assistant-stream - Streaming Utilities

## Installation
```bash
npm install assistant-stream
```

## Core Stream Functions

```typescript
import { 
  createAssistantStream, 
  createAssistantStreamController, 
  createAssistantStreamResponse 
} from 'assistant-stream';

// Create stream with callback
const stream = createAssistantStream(async (controller) => {
  controller.appendText('Hello ');
  controller.appendText('world!');
  controller.close();
});

// Create stream with controller
const [stream, controller] = createAssistantStreamController();

// Create HTTP response
const response = createAssistantStreamResponse(async (controller) => {
  // Stream implementation
});
```

## Stream Controller

```typescript
// Text streaming
controller.appendText('Hello world');
controller.appendReasoning('Thinking...');

// File and source parts
controller.appendSource({ url: 'https://example.com', title: 'Example' });
controller.appendFile({ name: 'file.pdf', type: 'application/pdf' });

// Advanced parts
const textController = controller.addTextPart();
textController.append('Streaming text');
textController.close();

const toolController = controller.addToolCallPart({
  toolCallId: 'call_123',
  toolName: 'get_weather',
});
toolController.argsText.append('{"location": "NYC"}');
toolController.setResponse({ result: 'Sunny, 72°F' });
toolController.close();

// Stream operations
controller.enqueue(chunk);
controller.merge(otherStream);
controller.close();
```

## Message Accumulation

```typescript
import { AssistantMessageAccumulator, AssistantMessageStream } from 'assistant-stream';

// Transform stream to messages
const messageStream = stream.pipeThrough(new AssistantMessageAccumulator());

// Use message stream
const messageStreamInstance = new AssistantMessageStream(stream);
for await (const message of messageStreamInstance) {
  console.log('Message:', message);
}
```

## Serialization

```typescript
import { 
  DataStreamEncoder, 
  DataStreamDecoder, 
  PlainTextEncoder, 
  PlainTextDecoder 
} from 'assistant-stream';

// Data stream serialization
const encoded = stream.pipeThrough(new DataStreamEncoder());
const decoded = encodedStream.pipeThrough(new DataStreamDecoder());

// Plain text serialization
const textEncoded = stream.pipeThrough(new PlainTextEncoder());
const textDecoded = textStream.pipeThrough(new PlainTextDecoder());
```

## Tool System

```typescript
import { 
  toolResultStream, 
  unstable_runPendingTools, 
  ToolResponse, 
  ToolExecutionStream 
} from 'assistant-stream';

// Define tools
const tools = {
  get_weather: {
    description: 'Get weather information',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
      },
    },
    execute: async ({ location }) => {
      return { temperature: 72, condition: 'sunny' };
    },
  },
};

// Run pending tools
const updatedMessage = await unstable_runPendingTools(message, tools);

// Stream tool results
const resultStream = toolResultStream(message, tools);

// Tool response
const response = new ToolResponse({ result: 'Success' });
```

## Object Streaming

```typescript
import { 
  createObjectStream, 
  ObjectStreamResponse, 
  fromObjectStreamResponse 
} from 'assistant-stream';

// Create object stream
const objectStream = createObjectStream({
  object: { name: 'John', age: 30 },
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
  },
});

// Object stream response
const response = new ObjectStreamResponse(objectStream);

// From response
const stream = fromObjectStreamResponse(response);
```

## AI SDK Integration

```typescript
import { fromStreamText, fromStreamObject } from 'assistant-stream/ai-sdk';

// From AI SDK text stream
const assistantStream = fromStreamText(aiTextStream);

// From AI SDK object stream
const assistantStream = fromStreamObject(aiObjectStream, 'tool_name');
```

## Utilities

```typescript
import { 
  parsePartialJsonObject, 
  getPartialJsonObjectFieldState, 
  asAsyncIterableStream 
} from 'assistant-stream/utils';

// JSON parsing
const partialObject = parsePartialJsonObject('{"name": "John", "age"');
const fieldState = getPartialJsonObjectFieldState(jsonText, ['name']);

// Async iteration
const asyncIterable = asAsyncIterableStream(stream);
for await (const chunk of asyncIterable) {
  console.log('Chunk:', chunk);
}
```

## Types

```typescript
import type {
  AssistantStream,
  AssistantStreamChunk,
  AssistantStreamController,
  AssistantMessage,
  AssistantMessagePart,
  AssistantMessageStatus,
  Tool,
  ToolCallReader,
  ToolCallArgsReader,
  ToolCallResponseReader,
  ToolResponse,
  ToolResponseLike,
  TextStreamController,
  ToolCallStreamController,
  ObjectStreamChunk,
  ReadonlyJSONValue,
  ReadonlyJSONObject,
  ReadonlyJSONArray,
  AsyncIterableStream,
} from 'assistant-stream';
```


---

# @assistant-ui/react-langgraph - LangGraph Integration

## Installation
```bash
npm install @assistant-ui/react-langgraph
```

## Main Runtime Hook

```typescript
import { useLangGraphRuntime } from '@assistant-ui/react-langgraph';

const runtime = useLangGraphRuntime({
  stream: async (messages, config) => {
    // Your LangGraph streaming implementation
    const response = await fetch('/api/langgraph', {
      method: 'POST',
      body: JSON.stringify({ messages, config }),
      signal: config.abortSignal,
    });
    
    return streamLangGraphEvents(response);
  },
  threadId: 'thread-123', // deprecated
  autoCancelPendingToolCalls: true,
  unstable_allowCancellation: true,
  onSwitchToThread: async (threadId) => {
    // Load thread data
    return {
      messages: await loadMessages(threadId),
      interrupts: await loadInterrupts(threadId),
    };
  },
  adapters: {
    attachments: attachmentAdapter,
    speech: speechAdapter,
    feedback: feedbackAdapter,
  },
  eventHandlers: {
    onMetadata: (metadata) => console.log('Metadata:', metadata),
    onInfo: (info) => console.log('Info:', info),
    onError: (error) => console.error('Error:', error),
    onCustomEvent: (type, data) => console.log('Custom:', type, data),
  },
});
```

## Message Management

```typescript
import { useLangGraphMessages } from '@assistant-ui/react-langgraph';

const {
  interrupt,
  messages,
  sendMessage,
  cancel,
  setInterrupt,
  setMessages,
} = useLangGraphMessages({
  stream: langGraphStreamCallback,
  appendMessage: (prev, curr) => {
    // Custom message merging logic
    return { ...prev, ...curr };
  },
  eventHandlers: {
    onMetadata: (metadata) => console.log('Metadata:', metadata),
    onError: (error) => console.error('Error:', error),
  },
});

// Send messages
await sendMessage(messages, {
  command: { resume: 'continue' },
  runConfig: { configurable: { thread_id: 'thread-123' } },
});

// Cancel current operation
cancel();

// Handle interrupts
if (interrupt) {
  console.log('Interrupted at:', interrupt.when);
  console.log('Resumable:', interrupt.resumable);
  setInterrupt(undefined); // Clear interrupt
}
```

## Interrupt Management

```typescript
import { useLangGraphInterruptState } from '@assistant-ui/react-langgraph';

const interrupt = useLangGraphInterruptState();

if (interrupt) {
  return (
    <div>
      <p>Execution interrupted at: {interrupt.when}</p>
      {interrupt.resumable && (
        <button onClick={() => sendCommand({ resume: 'continue' })}>
          Resume
        </button>
      )}
    </div>
  );
}
```

## Commands

```typescript
import { useLangGraphSendCommand } from '@assistant-ui/react-langgraph';

const sendCommand = useLangGraphSendCommand();

// Resume execution
const handleResume = () => {
  sendCommand({ resume: 'continue' });
};

// Custom command
const handleCustomCommand = () => {
  sendCommand({ resume: 'custom_action' });
};
```

## Message Conversion

```typescript
import { 
  convertLangChainMessages, 
  appendLangChainChunk, 
  LangGraphMessageAccumulator 
} from '@assistant-ui/react-langgraph';

// Convert LangChain messages to assistant-ui format
const convertedMessages = langChainMessages.map(convertLangChainMessages);

// Append message chunks
const mergedMessage = appendLangChainChunk(previousMessage, newChunk);

// Use message accumulator
const accumulator = new LangGraphMessageAccumulator({
  initialMessages: [],
  appendMessage: appendLangChainChunk,
});

const updatedMessages = accumulator.addMessages(newMessages);
```

## Types

```typescript
import type {
  LangChainMessage,
  LangGraphInterruptState,
  LangGraphCommand,
  LangGraphSendMessageConfig,
  LangGraphStreamCallback,
  LangGraphMessagesEvent,
  LangChainToolCall,
  LangChainToolCallChunk,
  OnMetadataEventCallback,
  OnInfoEventCallback,
  OnErrorEventCallback,
  OnCustomEventCallback,
} from '@assistant-ui/react-langgraph';

// LangChain message types
type LangChainMessage = 
  | { id?: string; type: 'system'; content: string; }
  | { id?: string; type: 'human'; content: UserMessageContent; }
  | { id?: string; type: 'tool'; content: string; tool_call_id: string; name: string; }
  | { id?: string; type: 'ai'; content: AssistantMessageContent; tool_calls?: LangChainToolCall[]; };

// Interrupt state
type LangGraphInterruptState = {
  value?: any;
  resumable?: boolean;
  when: string;
  ns?: string[];
};

// Stream callback
type LangGraphStreamCallback<TMessage> = (
  messages: TMessage[],
  config: LangGraphSendMessageConfig & { abortSignal: AbortSignal }
) => Promise<AsyncGenerator<LangGraphMessagesEvent<TMessage>>> | AsyncGenerator<LangGraphMessagesEvent<TMessage>>;
```

## Event Types

```typescript
// Known event types
enum LangGraphKnownEventTypes {
  Messages = 'messages',
  MessagesPartial = 'messages/partial', 
  MessagesComplete = 'messages/complete',
  Metadata = 'metadata',
  Updates = 'updates',
  Info = 'info',
  Error = 'error'
}

// Event structure
type LangGraphMessagesEvent<TMessage> = {
  event: EventType;
  data: TMessage[] | any;
};
```

## Usage Example

```typescript
import { useLangGraphRuntime } from '@assistant-ui/react-langgraph';
import { AssistantRuntimeProvider, Thread } from '@assistant-ui/react';

const LangGraphChat = () => {
  const runtime = useLangGraphRuntime({
    stream: async (messages, { abortSignal }) => {
      const response = await fetch('/api/langgraph/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: abortSignal,
      });
      
      return parseLangGraphStream(response.body);
    },
    eventHandlers: {
      onError: (error) => console.error('LangGraph error:', error),
      onMetadata: (metadata) => console.log('Metadata:', metadata),
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
};
```


---

# Additional Packages

## @assistant-ui/cloud - Cloud Integration

```bash
npm install assistant-cloud
```

```typescript
import { AssistantCloud } from 'assistant-cloud';
import type { CloudMessage } from 'assistant-cloud';

// Initialize cloud client
const cloud = new AssistantCloud({
  apiKey: 'your-api-key',
  baseURL: 'https://api.assistant-ui.com',
});

// Thread management
const threads = cloud.threads;
const thread = await threads.create();
const messages = await threads.messages.list(thread.id);

// Authentication
const tokens = cloud.auth.tokens;
const token = await tokens.create();

// File management
const files = cloud.files;
const file = await files.upload(fileData);

// Run management
const runs = cloud.runs;
const run = await runs.create(thread.id, { assistant_id: 'asst_123' });
```

## @assistant-ui/react-markdown - Markdown Rendering

```bash
npm install @assistant-ui/react-markdown
```

```typescript
import { 
  MarkdownTextPrimitive, 
  useIsMarkdownCodeBlock,
  unstable_memoizeMarkdownComponents 
} from '@assistant-ui/react-markdown';
import type { 
  MarkdownTextPrimitiveProps, 
  CodeHeaderProps, 
  SyntaxHighlighterProps 
} from '@assistant-ui/react-markdown';

// Basic markdown rendering
<MarkdownTextPrimitive>
  # Hello World
  This is **bold** text.
</MarkdownTextPrimitive>

// Advanced configuration
<MarkdownTextPrimitive
  className="markdown-content"
  smooth={true}
  components={{
    SyntaxHighlighter: ({ language, code }) => (
      <pre><code className={`language-${language}`}>{code}</code></pre>
    ),
    CodeHeader: ({ language, code }) => (
      <div className="code-header">
        <span>{language}</span>
        <button onClick={() => navigator.clipboard.writeText(code)}>Copy</button>
      </div>
    ),
  }}
  componentsByLanguage={{
    javascript: {
      SyntaxHighlighter: JavaScriptHighlighter,
      CodeHeader: JavaScriptHeader,
    },
  }}
/>

// Hook for code block detection
const isCodeBlock = useIsMarkdownCodeBlock();

// Memoize components for performance
const memoizedComponents = unstable_memoizeMarkdownComponents({
  SyntaxHighlighter: MyHighlighter,
  CodeHeader: MyHeader,
});
```

## @assistant-ui/react-syntax-highlighter - Code Highlighting

```bash
npm install @assistant-ui/react-syntax-highlighter
```

```typescript
// Light version (smaller bundle)
import { 
  makeLightSyntaxHighlighter,
  makeLightAsyncSyntaxHighlighter,
  makePrismLightSyntaxHighlighter,
  makePrismAsyncLightSyntaxHighlighter 
} from '@assistant-ui/react-syntax-highlighter';

// Full version (all languages)
import { 
  makeSyntaxHighlighter,
  makePrismSyntaxHighlighter,
  makePrismAsyncSyntaxHighlighter 
} from '@assistant-ui/react-syntax-highlighter/full';

// Create syntax highlighter
const SyntaxHighlighter = makeLightSyntaxHighlighter({
  theme: 'github',
  languages: ['javascript', 'typescript', 'python'],
});

// Async version for code splitting
const AsyncSyntaxHighlighter = makeLightAsyncSyntaxHighlighter({
  theme: 'github',
  languages: ['javascript', 'typescript'],
});

// Prism-based highlighter
const PrismHighlighter = makePrismLightSyntaxHighlighter({
  theme: 'prism',
  languages: ['javascript', 'typescript'],
});

// Usage in markdown
<MarkdownTextPrimitive
  components={{
    SyntaxHighlighter,
  }}
>
  ```javascript
  console.log('Hello, world!');
  ```
</MarkdownTextPrimitive>
```

## @assistant-ui/react-hook-form - Form Integration

```bash
npm install @assistant-ui/react-hook-form
```

```typescript
import { useAssistantForm, formTools } from '@assistant-ui/react-hook-form';
import type { UseAssistantFormProps } from '@assistant-ui/react-hook-form';
import { z } from 'zod';

// Form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18 or older'),
});

// Enhanced form with AI integration
const MyForm = () => {
  const form = useAssistantForm({
    schema: formSchema,
    defaultValues: {
      name: '',
      email: '',
      age: 18,
    },
    assistant: {
      tools: {
        set_form_field: {
          render: ({ args }) => (
            <div>Setting {args.name} to {args.value}</div>
          ),
        },
        submit_form: {
          render: () => (
            <div>Submitting form...</div>
          ),
        },
      },
    },
  });

  const onSubmit = (data) => {
    console.log('Form submitted:', data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} placeholder="Name" />
      <input {...form.register('email')} placeholder="Email" />
      <input {...form.register('age')} type="number" placeholder="Age" />
      <button type="submit">Submit</button>
    </form>
  );
};

// Available form tools
const tools = {
  set_form_field: formTools.set_form_field, // Sets a form field value
  submit_form: formTools.submit_form,       // Submits the form
};
```

---

# Complete Usage Examples

## Basic Chat Application

```typescript
import { AssistantRuntimeProvider, Thread } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

const ChatApp = () => {
  const runtime = useChatRuntime({
    api: '/api/chat',
    onFinish: (message) => console.log('Message finished:', message),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-screen flex flex-col">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
```

## Custom UI with Primitives

```typescript
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
} from '@assistant-ui/react';

const CustomChat = () => {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <ThreadPrimitive.Messages>
          <MessagePrimitive.Root className="mb-4">
            <MessagePrimitive.Parts />
            <ActionBarPrimitive.Root className="flex gap-2 mt-2">
              <ActionBarPrimitive.Copy />
              <ActionBarPrimitive.Reload />
            </ActionBarPrimitive.Root>
          </MessagePrimitive.Root>
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>
      
      <ComposerPrimitive.Root className="border-t p-4">
        <ComposerPrimitive.Input 
          className="w-full p-2 border rounded" 
          placeholder="Type your message..."
        />
        <ComposerPrimitive.Send className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
          Send
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
};
```

## Tool Integration

```typescript
import { makeAssistantTool, makeAssistantToolUI } from '@assistant-ui/react';
import { z } from 'zod';

// Define tool
const weatherTool = makeAssistantTool({
  toolName: 'get_weather',
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().describe('The city and state/country'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ location, unit }) => {
    const response = await fetch(`/api/weather?location=${location}&unit=${unit}`);
    return response.json();
  },
});

// Define tool UI
const WeatherUI = makeAssistantToolUI({
  toolName: 'get_weather',
  render: ({ args, result, status }) => {
    if (status === 'running') {
      return <div>Getting weather for {args.location}...</div>;
    }
    
    if (status === 'complete' && result) {
      return (
        <div className="weather-card">
          <h3>Weather in {args.location}</h3>
          <p>Temperature: {result.temperature}°{args.unit}</p>
          <p>Condition: {result.condition}</p>
        </div>
      );
    }
    
    return <div>Failed to get weather data</div>;
  },
});

// Use in app
const App = () => {
  const runtime = useLocalRuntime({
    adapters: {
      chatModel: myChatModelAdapter,
    },
    tools: {
      get_weather: weatherTool,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <WeatherUI />
      <Thread />
    </AssistantRuntimeProvider>
  );
};
```

## Multi-Modal Chat with Attachments

```typescript
import {
  ThreadPrimitive,
  ComposerPrimitive,
  AttachmentPrimitive,
  MessagePrimitive,
} from '@assistant-ui/react';

const MultiModalChat = () => {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport>
        <ThreadPrimitive.Messages>
          <MessagePrimitive.Root>
            <MessagePrimitive.Attachments>
              <AttachmentPrimitive.Root>
                <AttachmentPrimitive.Thumb />
                <AttachmentPrimitive.Name />
                <AttachmentPrimitive.Remove />
              </AttachmentPrimitive.Root>
            </MessagePrimitive.Attachments>
            <MessagePrimitive.Parts />
          </MessagePrimitive.Root>
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>
      
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Attachments />
        <ComposerPrimitive.Input />
        <ComposerPrimitive.AddAttachment />
        <ComposerPrimitive.Send />
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
};
```

This comprehensive API reference covers all major aspects of the assistant-ui library ecosystem, providing developers with the information needed to build sophisticated AI chat interfaces.

