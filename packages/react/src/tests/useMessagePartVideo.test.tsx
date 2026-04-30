// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { expect, it } from "vitest";
import { AssistantRuntimeProvider } from "../context";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { useMessagePartVideo } from "../primitives/messagePart/useMessagePartVideo";
import * as MessagePrimitive from "../primitives/message";
import * as ThreadPrimitive from "../primitives/thread";
import type { ChatModelAdapter, ThreadMessageLike } from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const messages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "video",
        url: "https://cdn.example.com/video.mp4",
        mimeType: "video/mp4",
        filename: "video.mp4",
        posterUrl: "https://cdn.example.com/poster.jpg",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
];

const RuntimeProvider: FC<PropsWithChildren> = ({ children }) => {
  const runtime = useLocalRuntime(noOpAdapter, { initialMessages: messages });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const VideoProbe: FC = () => {
  const video = useMessagePartVideo();
  return <span data-testid="video-url">{video.url}</span>;
};

it("returns the current video message part", async () => {
  render(
    <RuntimeProvider>
      <ThreadPrimitive.Messages
        components={{
          Message: () => (
            <MessagePrimitive.Parts components={{ Video: VideoProbe }} />
          ),
        }}
      />
    </RuntimeProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("video-url").textContent).toBe(
      "https://cdn.example.com/video.mp4",
    );
  });
});
