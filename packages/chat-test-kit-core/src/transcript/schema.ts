export const transcriptSchema = JSON.parse(`{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://assistant-ui.com/schema/chat-test-kit/transcript-v0.json",
  "title": "Transcript v0",
  "type": "object",
  "required": ["version", "turns", "injections"],
  "additionalProperties": false,
  "properties": {
    "version": { "const": "0" },
    "turns": { "type": "array", "items": { "$ref": "#/$defs/Turn" } },
    "injections": {
      "type": "array",
      "items": { "$ref": "#/$defs/Injection" }
    }
  },
  "$defs": {
    "ContentPart": {
      "oneOf": [
        { "$ref": "#/$defs/TextPart" },
        { "$ref": "#/$defs/ToolCallPart" }
      ]
    },
    "TextPart": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "text"],
      "properties": {
        "type": { "const": "text" },
        "text": { "type": "string" }
      }
    },
    "ToolCallPart": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "toolCallId", "toolName", "args", "argsText"],
      "properties": {
        "type": { "const": "tool-call" },
        "toolCallId": { "type": "string" },
        "toolName": { "type": "string" },
        "args": { "type": "object" },
        "argsText": { "type": "string" }
      }
    },
    "Turn": {
      "oneOf": [
        { "$ref": "#/$defs/UserTurn" },
        { "$ref": "#/$defs/AssistantStreamTurn" },
        { "$ref": "#/$defs/AssistantToolCallTurn" },
        { "$ref": "#/$defs/ToolResultTurn" },
        { "$ref": "#/$defs/DelayTurn" },
        { "$ref": "#/$defs/MetadataTurn" }
      ]
    },
    "UserTurn": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "content"],
      "properties": {
        "kind": { "const": "user" },
        "content": {
          "type": "array",
          "items": { "$ref": "#/$defs/ContentPart" }
        }
      }
    },
    "AssistantStreamTurn": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "text", "chunks"],
      "properties": {
        "kind": { "const": "assistantStream" },
        "text": { "type": "string" },
        "chunks": { "type": "array", "items": { "type": "string" } },
        "interChunkDelayMs": { "type": "integer", "minimum": 0 },
        "finish": {
          "type": "object",
          "additionalProperties": false,
          "required": ["reason"],
          "properties": {
            "reason": { "enum": ["stop", "abort", "error"] }
          }
        }
      }
    },
    "AssistantToolCallTurn": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "toolCallId", "name", "args", "argsText"],
      "properties": {
        "kind": { "const": "assistantToolCall" },
        "toolCallId": { "type": "string" },
        "name": { "type": "string" },
        "args": { "type": "object" },
        "argsText": { "type": "string" }
      }
    },
    "ToolResultTurn": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "toolCallId", "value"],
      "properties": {
        "kind": { "const": "toolResult" },
        "toolCallId": { "type": "string" },
        "value": {}
      }
    },
    "DelayTurn": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "ms"],
      "properties": {
        "kind": { "const": "delay" },
        "ms": { "type": "integer", "minimum": 0 }
      }
    },
    "MetadataTurn": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "data"],
      "properties": {
        "kind": { "const": "metadata" },
        "data": { "type": "object" }
      }
    },
    "InjectionPosition": {
      "type": "object",
      "additionalProperties": false,
      "required": ["turnIndex"],
      "properties": {
        "turnIndex": { "type": "integer", "minimum": 0 },
        "afterChunk": { "type": "integer", "minimum": 0 }
      }
    },
    "Injection": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["kind", "at"],
          "properties": {
            "kind": { "enum": ["cancel", "abortAndRestart"] },
            "at": { "$ref": "#/$defs/InjectionPosition" }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["kind", "at"],
          "properties": {
            "kind": { "const": "interrupt" },
            "at": { "$ref": "#/$defs/InjectionPosition" },
            "reason": { "type": "string" }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["kind", "at", "message"],
          "properties": {
            "kind": { "const": "transportError" },
            "at": { "$ref": "#/$defs/InjectionPosition" },
            "code": { "type": "integer" },
            "message": { "type": "string" }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["kind", "at"],
          "properties": {
            "kind": { "const": "disconnect" },
            "at": {
              "allOf": [
                { "$ref": "#/$defs/InjectionPosition" },
                { "type": "object", "required": ["afterChunk"] }
              ]
            }
          }
        }
      ]
    }
  }
}`);
