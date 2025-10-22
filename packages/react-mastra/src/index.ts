// Main runtime hooks - Real Mastra Integration
export { useMastraRuntime, useMastraExtras } from "./useMastraRuntime";
export { useMastraMessages } from "./useMastraMessages";

// Advanced feature hooks - Real Mastra APIs
export { useMastraMemory } from "./useMastraMemory";
export {
  useMastraWorkflows,
  useMastraWorkflowInterrupt,
} from "./useMastraWorkflows";

// Message processing components
export {
  MastraMessageConverter,
  LegacyMastraMessageConverter,
} from "./convertMastraMessages";
export { MastraMessageAccumulator } from "./MastraMessageAccumulator";

// Chunk processing utilities
export {
  appendMastraChunk,
  parsePartialToolCall,
  isMastraPartialMessage,
  getMastraMessageStatus,
  extractMastraToolCalls,
  extractMastraToolResults,
} from "./appendMastraChunk";

// Core types
export type {
  MastraMessage,
  MastraContent,
  MastraToolCall,
  MastraToolResult,
  MastraEvent as MastraCoreEvent,
  MastraRuntimeConfig,
  MastraRuntimeExtras,
  MastraMessagesConfig,
  MastraStreamCallback,
  MastraInterruptState,
  MastraThreadState,
  MastraMessageStatus,
  MastraToolCallStatus,
  MastraImageContent,
  MastraFileContent,
} from "./types";

// Advanced feature types - Real Mastra APIs only
export type {
  MastraMemoryConfig,
  MastraMemoryQuery,
  MastraMemoryResult,
  MastraWorkflowConfig,
  MastraWorkflowState,
  MastraWorkflowInterrupt,
  MastraWorkflowTransition,
  MastraWorkflowCommand,
  MastraToolConfig,
  MastraToolExecutor,
  MastraToolExecution,
  MastraRetryPolicy,
  MastraEvent,
  MastraEventHandler,
} from "./types";

// Production and monitoring exports - Phase 5
export {
  performHealthCheck,
  checkHealthThresholds,
  createHealthMonitor,
} from "./health";
export type { MastraHealthCheck, HealthCheckOptions } from "./health";

// Enums and symbols
export { MastraKnownEventTypes, MastraRuntimeExtrasSymbol } from "./types";
