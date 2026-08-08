// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import type { SpeechSynthesisAdapter } from "@assistant-ui/core";
import type {
  ExternalThreadMessage,
  ExternalThreadProps,
} from "../client/ExternalThread";
import { ExternalThread } from "../client/ExternalThread";

const MESSAGES = [
  {
    id: "u1",
    role: "user",
    content: [{ type: "text", text: "hi" }],
    createdAt: new Date(0),
    attachments: [],
    metadata: { custom: {} },
  },
  {
    id: "a1",
    role: "assistant",
    content: [{ type: "text", text: "hello there" }],
    createdAt: new Date(0),
    metadata: { custom: {} },
  },
] as unknown as readonly ExternalThreadMessage[];

type FakeUtterance = {
  text: string;
  cancel: ReturnType<typeof vi.fn>;
  emit: (status: SpeechSynthesisAdapter.Status) => void;
};

const createFakeAdapter = () => {
  const utterances: FakeUtterance[] = [];
  const adapter: SpeechSynthesisAdapter = {
    speak: (text) => {
      const subscribers = new Set<() => void>();
      // mirror WebSpeechSynthesisAdapter: cancel transitions to ended and notifies synchronously
      const cancel = vi.fn(() => {
        if (utterance.status.type === "ended") return;
        utterance.status = { type: "ended", reason: "cancelled" };
        for (const subscriber of subscribers) subscriber();
      });
      const utterance: SpeechSynthesisAdapter.Utterance = {
        status: { type: "starting" },
        cancel,
        subscribe: (callback) => {
          subscribers.add(callback);
          return () => subscribers.delete(callback);
        },
      };
      utterances.push({
        text,
        cancel,
        emit: (status) => {
          utterance.status = status;
          for (const subscriber of subscribers) subscriber();
        },
      });
      return utterance;
    },
  };
  return { adapter, utterances };
};

const renderThreadWithProps = (props: Partial<ExternalThreadProps>) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC<{ props: Partial<ExternalThreadProps> }> = ({ props }) => {
    const aui = useAui({
      thread: ExternalThread({
        messages: MESSAGES,
        isRunning: false,
        ...props,
      }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };

  const view = render(<App props={props} />);
  const aui = () => captured.aui!;
  aui.rerender = (nextProps: Partial<ExternalThreadProps>) =>
    view.rerender(<App props={nextProps} />);
  aui.unmount = () => view.unmount();
  return aui;
};

describe("ExternalThread speech", () => {
  it("reports the speech capability based on adapter presence", () => {
    const withoutAdapter = renderThreadWithProps({});
    expect(withoutAdapter().thread.getState().capabilities.speech).toBe(false);

    const { adapter } = createFakeAdapter();
    const withAdapter = renderThreadWithProps({ speechAdapter: adapter });
    expect(withAdapter().thread.getState().capabilities.speech).toBe(true);
  });

  it("throws on speak when no adapter is configured", () => {
    const aui = renderThreadWithProps({});
    expect(() => aui().thread.message({ id: "a1" }).speak()).toThrow(
      "Speech adapter not configured",
    );
  });

  it("tracks utterance status in thread and message state", async () => {
    const { adapter, utterances } = createFakeAdapter();
    const aui = renderThreadWithProps({ speechAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
    });

    expect(utterances[0]!.text).toBe("hello there");
    await waitFor(() => {
      expect(aui().thread.getState().speech).toEqual({
        messageId: "a1",
        status: { type: "starting" },
      });
      expect(aui().thread.message({ id: "a1" }).getState().speech).toEqual({
        messageId: "a1",
        status: { type: "starting" },
      });
      expect(
        aui().thread.message({ id: "u1" }).getState().speech,
      ).toBeUndefined();
    });

    await act(async () => {
      utterances[0]!.emit({ type: "running" });
    });
    await waitFor(() => {
      expect(aui().thread.getState().speech).toEqual({
        messageId: "a1",
        status: { type: "running" },
      });
    });

    await act(async () => {
      utterances[0]!.emit({ type: "ended", reason: "finished" });
    });
    await waitFor(() => {
      expect(aui().thread.getState().speech).toBeUndefined();
      expect(
        aui().thread.message({ id: "a1" }).getState().speech,
      ).toBeUndefined();
    });
  });

  it("cancels the previous utterance when a new speak starts", async () => {
    const { adapter, utterances } = createFakeAdapter();
    const aui = renderThreadWithProps({ speechAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
    });
    await act(async () => {
      aui().thread.message({ id: "u1" }).speak();
    });

    expect(utterances).toHaveLength(2);
    expect(utterances[0]!.cancel).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(aui().thread.getState().speech).toEqual({
        messageId: "u1",
        status: { type: "starting" },
      });
    });

    await act(async () => {
      utterances[0]!.emit({ type: "ended", reason: "cancelled" });
    });
    expect(aui().thread.getState().speech).toEqual({
      messageId: "u1",
      status: { type: "starting" },
    });
  });

  it("stopSpeaking cancels the utterance and clears state", async () => {
    const { adapter, utterances } = createFakeAdapter();
    const aui = renderThreadWithProps({ speechAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
    });
    await act(async () => {
      aui().thread.stopSpeaking();
    });

    expect(utterances[0]!.cancel).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(aui().thread.getState().speech).toBeUndefined();
    });
    expect(() => aui().thread.stopSpeaking()).toThrow(
      "No message is being spoken",
    );
  });

  it("message stopSpeaking throws unless that message is being spoken", async () => {
    const { adapter, utterances } = createFakeAdapter();
    const aui = renderThreadWithProps({ speechAdapter: adapter });

    expect(() => aui().thread.message({ id: "a1" }).stopSpeaking()).toThrow(
      "Message is not being spoken",
    );

    // speak and stopSpeaking in the same tick, before any re-render
    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
      expect(() => aui().thread.message({ id: "u1" }).stopSpeaking()).toThrow(
        "Message is not being spoken",
      );
      aui().thread.message({ id: "a1" }).stopSpeaking();
    });

    expect(utterances[0]!.cancel).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(aui().thread.getState().speech).toBeUndefined();
    });
  });

  it("cancels the utterance when the adapter is removed", async () => {
    const { adapter, utterances } = createFakeAdapter();
    const aui = renderThreadWithProps({ speechAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
    });
    await act(async () => {
      aui.rerender({});
    });

    expect(utterances[0]!.cancel).toHaveBeenCalledTimes(1);
    expect(aui().thread.getState().capabilities.speech).toBe(false);
    await waitFor(() => {
      expect(aui().thread.getState().speech).toBeUndefined();
    });

    await act(async () => {
      utterances[0]!.emit({ type: "running" });
    });
    expect(aui().thread.getState().speech).toBeUndefined();
  });

  it("keeps the utterance alive when the adapter identity changes", async () => {
    const first = createFakeAdapter();
    const second = createFakeAdapter();
    const aui = renderThreadWithProps({ speechAdapter: first.adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
    });
    await act(async () => {
      aui.rerender({ speechAdapter: second.adapter });
    });

    expect(first.utterances[0]!.cancel).not.toHaveBeenCalled();
    expect(aui().thread.getState().speech).toEqual({
      messageId: "a1",
      status: { type: "starting" },
    });

    await act(async () => {
      aui().thread.message({ id: "u1" }).speak();
    });
    expect(first.utterances[0]!.cancel).toHaveBeenCalledTimes(1);
    expect(second.utterances[0]!.text).toBe("hi");
    await waitFor(() => {
      expect(aui().thread.getState().speech).toEqual({
        messageId: "u1",
        status: { type: "starting" },
      });
    });
  });

  it("handles utterances that end synchronously on subscribe", async () => {
    const cancel = vi.fn();
    const adapter: SpeechSynthesisAdapter = {
      speak: () => ({
        status: { type: "ended", reason: "finished" },
        cancel,
        subscribe: (callback) => {
          callback();
          return () => {};
        },
      }),
    };
    const aui = renderThreadWithProps({ speechAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
    });

    expect(aui().thread.getState().speech).toBeUndefined();
    expect(() => aui().thread.stopSpeaking()).toThrow(
      "No message is being spoken",
    );
  });

  it("cancels the utterance on unmount", async () => {
    const { adapter, utterances } = createFakeAdapter();
    const aui = renderThreadWithProps({ speechAdapter: adapter });

    await act(async () => {
      aui().thread.message({ id: "a1" }).speak();
    });
    await act(async () => {
      aui.unmount();
    });

    expect(utterances[0]!.cancel).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
