import type { PiClientEventBody } from "./types";

const KNOWN_PI_CLIENT_EVENT_TYPES = {
  snapshot: true,
  agent_start: true,
  agent_end: true,
  agent_settled: true,
  turn_start: true,
  turn_end: true,
  message_start: true,
  message_update: true,
  message_end: true,
  tool_execution_start: true,
  tool_execution_update: true,
  tool_execution_end: true,
  queue_update: true,
  compaction_start: true,
  compaction_end: true,
  entry_appended: true,
  auto_retry_start: true,
  auto_retry_end: true,
  session_info_changed: true,
  thinking_level_changed: true,
  context_usage: true,
  extension_ui_request: true,
  extension_ui_resolved: true,
  error: true,
} satisfies Record<PiClientEventBody["type"], true>;

export const isKnownPiClientEventType = (
  type: string,
): type is PiClientEventBody["type"] =>
  Object.prototype.hasOwnProperty.call(KNOWN_PI_CLIENT_EVENT_TYPES, type);
