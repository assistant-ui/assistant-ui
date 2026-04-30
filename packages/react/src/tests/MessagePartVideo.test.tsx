// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, FC, PropsWithChildren } from "react";
import { expect, it } from "vitest";
import { AssistantRuntimeProvider } from "../context";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { MessagePartPrimitiveVideo } from "../primitives/messagePart/MessagePartVideo";
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

const TestVideoPart = () => <MessagePartPrimitiveVideo data-testid="video" />;

const TestMessage = () => (
  <MessagePrimitive.Parts
    components={{
      Video: TestVideoPart,
    }}
  />
);

const CustomVideo = forwardRef<
  HTMLVideoElement,
  ComponentPropsWithoutRef<"video">
>((props, ref) => <video data-testid="custom-video" {...props} ref={ref} />);
CustomVideo.displayName = "CustomVideo";

it("renders a video element for the current video part", async () => {
  render(
    <RuntimeProvider>
      <ThreadPrimitive.Messages
        components={{
          Message: TestMessage,
        }}
      />
    </RuntimeProvider>,
  );

  await waitFor(() => {
    const video = screen.getByTestId("video");
    expect(video.getAttribute("src")).toBe("https://cdn.example.com/video.mp4");
    expect(video.getAttribute("poster")).toBe(
      "https://cdn.example.com/poster.jpg",
    );
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.getAttribute("preload")).toBe("metadata");
  });
});

it("supports asChild composition with a custom video component", async () => {
  const CustomVideoPart = () => (
    <MessagePartPrimitiveVideo asChild>
      <CustomVideo />
    </MessagePartPrimitiveVideo>
  );

  const CustomMessage = () => (
    <MessagePrimitive.Parts
      components={{
        Video: CustomVideoPart,
      }}
    />
  );

  render(
    <RuntimeProvider>
      <ThreadPrimitive.Messages
        components={{
          Message: CustomMessage,
        }}
      />
    </RuntimeProvider>,
  );

  await waitFor(() => {
    const video = screen.getByTestId("custom-video");
    expect(video.getAttribute("src")).toBe("https://cdn.example.com/video.mp4");
    expect(video.getAttribute("poster")).toBe(
      "https://cdn.example.com/poster.jpg",
    );
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.hasAttribute("asChild")).toBe(false);
  });
});
