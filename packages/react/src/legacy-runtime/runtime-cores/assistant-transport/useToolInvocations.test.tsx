/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToolInvocations } from "./useToolInvocations";
import type { AssistantTransportState } from "./types";

describe("useToolInvocations", () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy?.mockRestore();
  });

  it("should NOT throw an error when tool call argsText is reordered (semantically equivalent)", () => {
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();
    const getTools = () => undefined;

    //Start with a truly initial state (no messages)
    const emptyState: AssistantTransportState = {
      isRunning: false,
      messages: [],
    };

    const { rerender } = renderHook(
      ({ state }) =>
        useToolInvocations({ state, getTools, onResult, setToolStatuses }),
      { initialProps: { state: emptyState } },
    );

    // Rerender with the first part of the tool call (incomplete args)
    const incompleteState: AssistantTransportState = {
      isRunning: true,
      messages: [
        {
          id: "msg1",
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "tool123",
              toolName: "testTool",
              argsText: '{"name":"Test Operation Alpha","type":"equity"',
              args: {},
            },
          ],
        } as any,
      ],
    };
    rerender({ state: incompleteState });

    //Rerender with the complete state
    const completeState: AssistantTransportState = {
      isRunning: true,
      messages: [
        {
          id: "msg1",
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "tool123",
              toolName: "testTool",
              argsText:
                '{"name":"Test Operation Alpha","type":"equity","surface":150}',
              args: {
                name: "Test Operation Alpha",
                type: "equity",
                surface: 150,
              },
            },
          ],
        } as any,
      ],
    };
    rerender({ state: completeState });

    // Rerender with the final state (same data, but reordered)
    const finalReorderedState: AssistantTransportState = {
      isRunning: true,
      messages: [
        {
          id: "msg1",
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "tool123",
              toolName: "testTool",
              argsText:
                '{"name":"Test Operation Alpha","surface":150,"type":"equity"}',
              args: {
                name: "Test Operation Alpha",
                surface: 150,
                type: "equity",
              },
            },
          ],
        } as any,
      ],
    };

    //This should NOT throw the "can only be appended" error
    expect(() => rerender({ state: finalReorderedState })).not.toThrow();

    expect(() => rerender({ state: finalReorderedState })).not.toThrow(
      "Tool call argsText can only be appended, not updated",
    );
  });

  it("should throw an error when incomplete argsText is actually modified (not just reordered)", () => {
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();
    const getTools = () => undefined;

    const emptyState: AssistantTransportState = {
      isRunning: false,
      messages: [],
    };

    const { rerender } = renderHook(
      ({ state }) =>
        useToolInvocations({ state, getTools, onResult, setToolStatuses }),
      { initialProps: { state: emptyState } },
    );

    // Start with incomplete JSON
    const incompleteState: AssistantTransportState = {
      isRunning: true,
      messages: [
        {
          id: "msg1",
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "tool123",
              toolName: "testTool",
              argsText: '{"name":"Test"',
              args: {},
            },
          ],
        } as any,
      ],
    };
    rerender({ state: incompleteState });

    // Try to update with completely different incomplete content (not appending)
    const invalidUpdateState: AssistantTransportState = {
      isRunning: true,
      messages: [
        {
          id: "msg1",
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "tool123",
              toolName: "testTool",
              argsText: '{"name":"Different"',
              args: {},
            },
          ],
        } as any,
      ],
    };

    // This SHOULD throw because it's not appending, it's replacing
    expect(() => rerender({ state: invalidUpdateState })).toThrow(
      "Tool call argsText can only be appended, not updated",
    );
  });

  it("should handle complete JSON with different content (not just reordering)", () => {
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();
    const getTools = () => undefined;

    const emptyState: AssistantTransportState = {
      isRunning: false,
      messages: [],
    };

    const { rerender } = renderHook(
      ({ state }) =>
        useToolInvocations({ state, getTools, onResult, setToolStatuses }),
      { initialProps: { state: emptyState } },
    );

    // First complete JSON
    const firstCompleteState: AssistantTransportState = {
      isRunning: true,
      messages: [
        {
          id: "msg1",
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "tool123",
              toolName: "testTool",
              argsText: '{"name":"Test","value":100}',
              args: { name: "Test", value: 100 },
            },
          ],
        } as any,
      ],
    };
    rerender({ state: firstCompleteState });

    // Second complete JSON with DIFFERENT content (not reordered)
    const secondCompleteState: AssistantTransportState = {
      isRunning: true,
      messages: [
        {
          id: "msg1",
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "tool123",
              toolName: "testTool",
              argsText: '{"name":"Test","value":200}',
              args: { name: "Test", value: 200 },
            },
          ],
        } as any,
      ],
    };

    // Should not throw (handles gracefully)
    expect(() => rerender({ state: secondCompleteState })).not.toThrow();
  });

  it("should properly stream incomplete JSON through to completion", () => {
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();
    const getTools = () => undefined;

    const emptyState: AssistantTransportState = {
      isRunning: false,
      messages: [],
    };

    const { rerender } = renderHook(
      ({ state }) =>
        useToolInvocations({ state, getTools, onResult, setToolStatuses }),
      { initialProps: { state: emptyState } },
    );

    // Stream: empty -> partial -> more -> complete
    const states = [
      '{"name":',
      '{"name":"Test",',
      '{"name":"Test","type":',
      '{"name":"Test","type":"equity","surface":150}',
    ];

    states.forEach((argsText) => {
      const state: AssistantTransportState = {
        isRunning: true,
        messages: [
          {
            id: "msg1",
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "tool123",
                toolName: "testTool",
                argsText,
                args: {},
              },
            ],
          } as any,
        ],
      };

      expect(() => rerender({ state })).not.toThrow();
    });
  });

  it("should NOT crash when complete JSON arguments are reordered", () => {
    const onResult = vi.fn();
    const setToolStatuses = vi.fn();
    const getTools = () => undefined;

    const emptyState: AssistantTransportState = {
      isRunning: false,
      messages: [],
    };

    const { rerender } = renderHook(
      ({ state }) =>
        useToolInvocations({ state, getTools, onResult, setToolStatuses }),
      { initialProps: { state: emptyState } },
    );

    // Incomplete JSON arrives
    rerender({
      state: {
        isRunning: true,
        messages: [
          {
            id: "msg1",
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "tool123",
                toolName: "create_shape",
                argsText: '{"name":"Operation Alpha","type":"rect',
                args: {},
              },
            ],
          } as any,
        ],
      },
    });

    // First complete JSON arrives
    rerender({
      state: {
        isRunning: true,
        messages: [
          {
            id: "msg1",
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "tool123",
                toolName: "create_shape",
                argsText:
                  '{"name":"Operation Alpha","type":"rectangle","surface":150}',
                args: {
                  name: "Operation Alpha",
                  type: "rectangle",
                  surface: 150,
                },
              },
            ],
          } as any,
        ],
      },
    });

    //  Same JSON but with keys reordered (this was causing the crash)
    expect(() =>
      rerender({
        state: {
          isRunning: true,
          messages: [
            {
              id: "msg1",
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolCallId: "tool123",
                  toolName: "create_shape",
                  argsText:
                    '{"name":"Operation Alpha","surface":150,"type":"rectangle"}',
                  args: {
                    name: "Operation Alpha",
                    surface: 150,
                    type: "rectangle",
                  },
                },
              ],
            } as any,
          ],
        },
      }),
    ).not.toThrow();
  });
});
