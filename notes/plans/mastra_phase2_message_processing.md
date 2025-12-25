# Phase 2: Mastra Message Processing System Implementation Plan

## Overview

This phase implements the core message processing system for the Mastra integration, enabling reliable communication between Mastra agents and assistant-ui's standardized message architecture. The focus is on converting Mastra's message formats to assistant-ui's ThreadMessage system, handling streaming responses, and providing robust message accumulation for real-time chat interfaces.

**Goal**: Implement robust message handling and conversion that enables reliable communication between Mastra and assistant-ui.

**Dependencies**: Phase 1 (Foundation Package Infrastructure) must be completed, providing the basic package structure, core runtime hook, and type definitions.

**Estimated Complexity**: High - Involves complex streaming logic, message format conversion, and error handling patterns.

**Risk Level**: Medium - Well-established patterns exist from AI SDK and LangGraph integrations, but Mastra's unique message features require careful handling.

## Current State Analysis

**What exists now**:
- Phase 1 provides basic package structure and core runtime hook
- Mastra integration currently uses generic `useDataStreamRuntime()` with no message-specific processing
- Users must manually handle Mastra's message format and streaming protocol

**What's missing**:
- Dedicated message converter for Mastra → assistant-ui format transformation
- Message accumulator for handling streaming responses and chunk assembly
- Tool call processing and aggregation logic
- Error handling specific to Mastra's agent system
- Comprehensive type definitions for Mastra message formats

**Key constraints discovered**:
- Must follow established patterns from AI SDK and LangGraph integrations
- Must handle Mastra's unique content types (reasoning, tool calls, metadata)
- Must support streaming protocol via `result.toDataStreamResponse()`
- Must maintain compatibility with existing assistant-ui UI components

## Desired End State

After Phase 2 completion, the Mastra integration will have:

1. **Complete Message Conversion System**: Bidirectional conversion between Mastra and assistant-ui message formats
2. **Robust Streaming Support**: Real-time message assembly from Mastra's streaming protocol
3. **Tool Call Integration**: Full support for Mastra's dynamic tool calling system
4. **Error Handling**: Comprehensive error mapping and recovery mechanisms
5. **Type Safety**: Complete TypeScript definitions for all Mastra message concepts
6. **Test Coverage**: Comprehensive test suite ensuring message processing reliability

**Verification**: The system will successfully handle real Mastra agent responses, displaying messages correctly in assistant-ui components with proper streaming, tool execution, and error handling.

## Key Discoveries from Research

### Existing Pattern Analysis
- **AI SDK Pattern**: Uses `AISDKMessageConverter.useThreadMessages` for real-time conversion with direct part mapping
- **LangGraph Pattern**: Uses event-driven accumulation with `LangGraphMessageAccumulator` and chunk appending
- **Data Stream Pattern**: Uses pipeline processing with chained transformers for decoding and accumulation

### Mastra Message Format Requirements
- **Message Types**: system, human, assistant, tool with role mapping required
- **Content Structure**: Mixed string content and structured content arrays need special handling
- **Tool Integration**: Dynamic tool registration with streaming argument accumulation
- **Streaming Protocol**: Uses `result.toDataStreamResponse()` compatible with assistant-ui's existing decoders

### Critical Technical Decisions
- **Follow LangGraph Pattern**: Event-driven accumulation better suits Mastra's agent system
- **Map-Based Storage**: Use Map<string, TMessage> for efficient chunk accumulation
- **UUID Generation**: Ensure all messages have consistent IDs for proper accumulation
- **Error Integration**: Map Mastra errors to assistant-ui's incomplete status system

## What We're NOT Doing in Phase 2

- **Advanced Feature Integration**: Memory, workflows, and orchestration are Phase 3
- **CLI Integration**: Package installation and setup tools are Phase 4
- **Example Applications**: Demo applications and documentation are Phase 4
- **Performance Optimization**: Advanced caching and optimization are Phase 5
- **Production Monitoring**: Observability and metrics are Phase 5

## Implementation Approach

Follow the established **event-driven accumulation pattern** from LangGraph integration, adapted for Mastra's specific message format and streaming protocol. The approach involves:

1. **Type-First Development**: Define comprehensive TypeScript types for all Mastra message concepts
2. **Converter Implementation**: Create `MastraMessageConverter` using `unstable_createMessageConverter`
3. **Accumulator Pattern**: Implement `MastraMessageAccumulator` for streaming message assembly
4. **Chunk Processing**: Handle partial messages, tool call aggregation, and status updates
5. **Integration Testing**: Comprehensive test coverage with mocked Mastra responses
6. **Error Handling**: Robust error mapping and recovery mechanisms

## Phase 2 Implementation Components

### Component 1: Enhanced Type Definitions
**File**: `packages/react-mastra/src/types.ts` (extends Phase 1 foundation)

**Purpose**: Expand the basic type definitions from Phase 1 to include comprehensive message processing types.

**Dependencies**: Phase 1 basic types package

**Implementation Notes**:
- Extend existing `MastraMessage` and `MastraContent` types
- Add detailed tool call and result types
- Define streaming event types and accumulators
- Add conversion utility types

**Test Requirements**: Type compilation validation, usage examples

### Component 2: Message Converter Implementation
**File**: `packages/react-mastra/src/convertMastraMessages.ts`

**Purpose**: Convert Mastra message formats to assistant-ui ThreadMessage format using established conversion patterns.

**Dependencies**: Enhanced type definitions, core assistant-ui types

**Implementation Notes**:
- Use `unstable_createMessageConverter` for consistency with other integrations
- Handle role mapping: human→user, system→system, assistant→assistant, tool→tool
- Process both string content and structured content arrays
- Convert Mastra content types to assistant-ui message parts
- Preserve metadata and custom annotations
- Handle timestamp conversion and ID generation

**Key Functions**:
```typescript
export const MastraMessageConverter = unstable_createMessageConverter(
  (message: MastraMessage): ThreadMessage => {
    // Conversion logic
  }
);

const convertMastraContentToParts = (content: MastraContent[]): MessagePart[] => {
  // Content type conversion
};
```

**Test Requirements**: Unit tests for all message type conversions, edge case handling, metadata preservation

### Component 3: Message Accumulator
**File**: `packages/react-mastra/src/MastraMessageAccumulator.ts`

**Purpose**: Manage streaming message state and assembly using map-based accumulation pattern.

**Dependencies**: Enhanced type definitions, message converter

**Implementation Notes**:
- Follow `LangGraphMessageAccumulator` pattern with Map<string, TMessage> storage
- Ensure UUID v4 generation for messages without IDs
- Implement message merging and chunk accumulation logic
- Handle partial message updates and completion
- Support message status tracking (running, complete, incomplete)

**Key Methods**:
```typescript
export class MastraMessageAccumulator<TMessage extends { id?: string }> {
  private messagesMap = new Map<string, TMessage>();

  addMessages(newMessages: TMessage[]): TMessage[];
  getMessages(): TMessage[];
  private ensureMessageId(message: TMessage): TMessage;
  private appendMessage(previous: TMessage | undefined, current: TMessage): TMessage;
}
```

**Test Requirements**: Message accumulation tests, ID generation tests, chunk merging tests

### Component 4: Chunk Processing Utilities
**File**: `packages/react-mastra/src/appendMastraChunk.ts`

**Purpose**: Handle streaming chunk processing and partial message updates.

**Dependencies**: Message accumulator, type definitions

**Implementation Notes**:
- Handle text chunk accumulation with proper concatenation
- Aggregate tool call chunks with partial JSON parsing
- Process status updates and error information
- Support reasoning content accumulation
- Handle metadata updates during streaming

**Key Functions**:
```typescript
export const appendMastraChunk = (
  existing: MastraMessage,
  chunk: Partial<MastraMessage>
): MastraMessage => {
  // Chunk merging logic
};

const parsePartialToolCall = (chunk: Partial<MastraToolCall>): MastraToolCall => {
  // Tool call chunk processing
};
```

**Test Requirements**: Chunk processing tests, partial JSON handling, error scenarios

### Component 5: Runtime Hook Integration
**File**: `packages/react-mastra/src/useMastraRuntime.ts` (extends Phase 1 foundation)

**Purpose**: Integrate message processing system with the core runtime hook from Phase 1.

**Dependencies**: Message converter, accumulator, chunk processing, Phase 1 runtime hook

**Implementation Notes**:
- Extend Phase 1 runtime hook with message processing integration
- Use `MastraMessageConverter.useThreadMessages` for real-time conversion
- Integrate `MastraMessageAccumulator` for streaming state management
- Handle message operations: onNew, onEdit, onReload
- Implement error handling and status updates
- Support tool result processing and callback handling

**Key Integrations**:
```typescript
export const useMastraRuntime = (config: MastraRuntimeConfig): AssistantRuntime => {
  const messages = MastraMessageConverter.useThreadMessages({
    isRunning: /* Mastra streaming state */,
    messages: /* Mastra messages */,
  });

  return useExternalStoreRuntime({
    messages,
    onNew: handleNewMessage,
    onEdit: handleEditMessage,
    onReload: handleReloadMessage,
    adapters: config.adapters
  });
};
```

**Test Requirements**: Runtime integration tests, message flow tests, error handling tests

### Component 6: Message Processing Hook
**File**: `packages/react-mastra/src/useMastraMessages.ts`

**Purpose**: Dedicated hook for handling Mastra message streaming and state management.

**Dependencies**: Message accumulator, chunk processing, type definitions

**Implementation Notes**:
- Follow `useLangGraphMessages` pattern for event-driven processing
- Handle Mastra-specific event types (message/partial, message/complete, error, interrupt)
- Integrate with `MastraMessageAccumulator` for state management
- Process streaming events and update message state
- Handle error conditions and status updates

**Key Features**:
```typescript
export const useMastraMessages = (
  streamCallback: MastraStreamCallback,
  config?: MastraMessagesConfig
) => {
  const [messages, setMessages] = useState<MastraMessage[]>([]);
  const [accumulator] = useState(() => new MastraMessageAccumulator());

  const processEvent = useCallback((event: MastraEvent) => {
    switch (event.event) {
      case MastraKnownEventTypes.MessagePartial:
      case MastraKnownEventTypes.MessageComplete:
        setMessages(accumulator.addMessages(event.data));
        break;
      case MastraKnownEventTypes.Error:
        handleError(event.data);
        break;
    }
  }, [accumulator]);

  return { messages, processEvent, isRunning };
};
```

**Test Requirements**: Streaming tests, event handling tests, state management tests

### Component 7: Testing Infrastructure
**Files**:
- `packages/react-mastra/src/convertMastraMessages.test.ts`
- `packages/react-mastra/src/MastraMessageAccumulator.test.ts`
- `packages/react-mastra/src/useMastraMessages.test.ts`
- `packages/react-mastra/src/testUtils.ts`

**Purpose**: Comprehensive test coverage for all message processing components.

**Dependencies**: All message processing components

**Implementation Notes**:
- Create mock Mastra message factories for consistent testing
- Test all message type conversions and edge cases
- Verify streaming behavior and chunk accumulation
- Test error handling and recovery scenarios
- Performance tests for large message handling

**Test Utilities**:
```typescript
export const mockMastraStreamCallbackFactory = (
  events: Array<MastraEvent>,
) => async function* () {
  for (const event of events) {
    yield event;
  }
};

export const createMockMastraMessage = (overrides = {}): MastraMessage => ({
  id: "mastra-test-id",
  type: "assistant",
  content: [{ type: "text", text: "Mastra response" }],
  timestamp: new Date().toISOString(),
  ...overrides,
});
```

## Integration Points

### Assistant-UI Core Integration
- **ThreadMessage System**: Full compatibility through proper message conversion
- **Runtime Architecture**: Integration with `useExternalStoreRuntime` and core message handling
- **Tool UI Components**: Support for Mastra tool calls and result display
- **Message Primitives**: Compatibility with all standard message part types

### External Mastra Integration
- **Agent Streaming**: Handle `result.toDataStreamResponse()` format
- **Tool System**: Support dynamic tool registration and execution
- **Error Protocol**: Map Mastra error types to assistant-ui status system
- **Metadata System**: Preserve agent-specific annotations and context

### Data Flow Architecture
1. **Mastra Agent** → Streaming Response → **useMastraMessages**
2. **useMastraMessages** → Event Processing → **MastraMessageAccumulator**
3. **MastraMessageAccumulator** → Message Assembly → **MastraMessageConverter**
4. **MastraMessageConverter** → Format Conversion → **useMastraRuntime**
5. **useMastraRuntime** → ThreadMessage → **Assistant-UI Components**

## Success Criteria

### Automated Verification:
- [ ] Package builds successfully: `pnpm run build` in packages/react-mastra
- [ ] All unit tests pass: `pnpm run test` in packages/react-mastra
- [ ] TypeScript compilation passes: `pnpm run typecheck` in packages/react-mastra
- [ ] Linting passes: `pnpm run lint` in packages/react-mastra
- [ ] Message conversion tests cover all Mastra message types
- [ ] Streaming accumulator tests handle chunk processing correctly
- [ ] Error handling tests cover all failure scenarios

### Manual Verification:
- [ ] Mastra agent responses display correctly in assistant-ui Thread component
- [ ] Streaming messages accumulate properly during real-time generation
- [ ] Tool calls execute and display results correctly
- [ ] Error messages show appropriate status and user-friendly text
- [ ] Message metadata and annotations are preserved in the UI
- [ ] Complex messages with mixed content types render correctly
- [ ] Performance is acceptable for long conversations with many messages

## Risk Mitigation

### Technical Risks:
1. **Mastra Protocol Changes**: Mitigate by implementing flexible event handling and version-compatible parsing
2. **Message Format Complexity**: Reduce risk by following established patterns from AI SDK and LangGraph integrations
3. **Streaming Edge Cases**: Address through comprehensive testing with various streaming scenarios
4. **Tool Call Complexity**: Mitigate by implementing robust JSON parsing and error recovery

### External Dependencies:
1. **Mastra API Changes**: Build abstraction layer to isolate from protocol changes
2. **Assistant-UI Core Changes**: Maintain compatibility through proper interface implementation
3. **Type Definition Drift**: Regular updates to match Mastra core library changes

### Rollback Strategies:
1. **Feature Flags**: Implement feature flags to enable/disable message processing components
2. **Fallback to Generic**: Maintain ability to fall back to generic `useDataStreamRuntime` if issues arise
3. **Gradual Rollout**: Test with individual message types before full integration

## Dependencies and Prerequisites

### Phase 1 Completion:
- Package structure and build configuration must be complete
- Basic type definitions must be implemented
- Core runtime hook foundation must exist
- Basic integration with `useExternalStoreRuntime` must work

### External Dependencies:
- **@mastra/core**: Latest stable version with agent streaming support
- **@mastra/memory**: For future memory integration (Phase 3)
- **assistant-stream**: For streaming protocol handling
- **@assistant-ui/react**: Core package with ThreadMessage types

### Development Environment:
- Node.js 18+ and pnpm package manager
- TypeScript 5+ with strict type checking
- Vitest for unit testing
- Access to Mastra agent for integration testing

### Knowledge Requirements:
- Understanding of assistant-ui message architecture
- Familiarity with Mastra agent system and streaming protocol
- Experience with streaming data processing and accumulation patterns
- Knowledge of TypeScript generic programming and type conversion

## Testing Strategy

### Unit Tests:
- **Message Converter**: Test all Mastra message types to ThreadMessage conversions
- **Message Accumulator**: Test chunk processing, ID generation, and message merging
- **Chunk Processing**: Test partial message updates and tool call aggregation
- **Error Handling**: Test error mapping and recovery mechanisms

### Integration Tests:
- **Runtime Integration**: Test complete message flow from Mastra to UI components
- **Streaming Behavior**: Test real-time message assembly and state updates
- **Tool Execution**: Test tool call processing and result handling
- **Error Scenarios**: Test error propagation and user experience

### Performance Tests:
- **Large Messages**: Test handling of messages with extensive content
- **Long Conversations**: Test memory usage and performance with many messages
- **Rapid Streaming**: Test performance under high-frequency message updates

### Manual Testing Steps:
1. **Basic Message Flow**: Send simple messages and verify display
2. **Complex Content**: Test messages with reasoning, tool calls, and mixed content
3. **Streaming Behavior**: Watch real-time message generation and accumulation
4. **Error Handling**: Trigger various error conditions and verify user experience
5. **Tool Interaction**: Execute tools and verify result processing and display
6. **Long Conversations**: Maintain extended conversation to test memory and performance

## Performance Considerations

### Memory Management:
- **Message Accumulation**: Implement efficient cleanup of completed streaming messages
- **Tool Call Storage**: Optimize storage of partial tool call arguments
- **Large Content Handling**: Implement streaming for large text or image content

### Processing Efficiency:
- **Event Processing**: Optimize event handling for high-frequency streaming
- **Type Conversion**: Minimize overhead in message format conversion
- **State Updates**: Batch state updates to reduce re-renders

### Scalability:
- **Concurrent Messages**: Support multiple simultaneous message streams
- **Memory Usage**: Monitor and optimize memory usage for long conversations
- **CPU Usage**: Optimize JSON parsing and message processing

## Migration Notes

### Backward Compatibility:
- Maintain compatibility with existing Phase 1 components
- Ensure smooth upgrade path from generic to dedicated integration
- Preserve existing message data and conversation history

### Data Migration:
- No data migration required for this phase
- Message processing is stateless and backward compatible
- Existing conversations should continue to work seamlessly

## References

- **Phase 1 Plan**: `notes/plans/mastra_phase1_foundation.md`
- **Research Documents**: `notes/research/mastra_integration_*.md`
- **AI SDK Integration**: `packages/react-ai-sdk/src/ui/utils/convertMessage.ts:143-211`
- **LangGraph Integration**: `packages/react-langgraph/src/useLangGraphMessages.ts:64-200`
- **Message Accumulator Pattern**: `packages/react-langgraph/src/LangGraphMessageAccumulator.ts:8-48`
- **ThreadMessage Types**: `packages/react/src/types/AssistantTypes.ts:95-152`
- **Test Patterns**: `packages/react-langgraph/src/useLangGraphMessages.test.ts:1-710`

---

**Next Steps**: This plan provides the detailed technical implementation roadmap for Phase 2. After completion, Phase 3 will focus on integrating Mastra's advanced features (memory, workflows, orchestration) using the solid message processing foundation established in this phase.