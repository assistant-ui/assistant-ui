import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AudioPlayer, VideoPlayer } from "./media-player";

const originalMediaErrorDescriptor = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  "error",
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalMediaErrorDescriptor) {
    Object.defineProperty(
      HTMLMediaElement.prototype,
      "error",
      originalMediaErrorDescriptor,
    );
  } else {
    Reflect.deleteProperty(HTMLMediaElement.prototype, "error");
  }
});

describe("AudioPlayer", () => {
  it("swaps play and pause labels", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => undefined);

    render(
      <AudioPlayer src="https://example.com/briefing.mp3" title="Briefing" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Play Briefing" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Pause Briefing" }),
      ).toBeTruthy();
    });
    expect(play).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Pause Briefing" }));

    expect(pause).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Play Briefing" })).toBeTruthy();
  });

  it("formats its current time and metadata duration", () => {
    const { container } = render(
      <AudioPlayer
        src="https://example.com/briefing.mp3"
        title="Briefing"
        durationMs={64_000}
      />,
    );
    const audio = container.querySelector("audio")!;
    const seek = screen.getByRole("slider", { name: "Seek" });

    expect(seek.getAttribute("aria-valuetext")).toBe("0:00 of 1:04");

    Object.defineProperty(audio, "duration", {
      configurable: true,
      value: 125,
    });
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      value: 12,
    });
    fireEvent.loadedMetadata(audio);
    fireEvent.timeUpdate(audio);

    expect(seek.getAttribute("aria-valuetext")).toBe("0:12 of 2:05");
    expect(screen.getByText("0:12 / 2:05")).toBeTruthy();
  });

  it("seeks the media element", () => {
    const { container } = render(
      <AudioPlayer
        src="https://example.com/briefing.mp3"
        durationMs={64_000}
      />,
    );
    const audio = container.querySelector("audio")!;

    fireEvent.change(screen.getByRole("slider", { name: "Seek" }), {
      target: { value: "12" },
    });

    expect(audio.currentTime).toBe(12);
    expect(screen.getByText("0:12 / 1:04")).toBeTruthy();
  });

  it("stays playable when a pause interrupts a pending play", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("The play() request was interrupted.", "AbortError"),
    );

    render(
      <AudioPlayer src="https://example.com/briefing.mp3" title="Briefing" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play Briefing" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Play Briefing",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("reads metadata that loaded before hydration", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      HTMLMediaElement.HAVE_METADATA,
    );
    vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(5);

    render(<AudioPlayer src="https://example.com/tone.mp3" title="Tone" />);

    await waitFor(() => {
      expect(screen.getByText("0:00 / 0:05")).toBeTruthy();
    });
  });

  it("disables its controls when playback failed before hydration", async () => {
    Object.defineProperty(HTMLMediaElement.prototype, "error", {
      configurable: true,
      value: { code: 4 },
    });

    render(<AudioPlayer src="https://example.com/missing.mp3" />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "Can't play this audio",
      );
    });
    expect(
      (screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("disables its controls when playback fails", () => {
    const { container } = render(
      <AudioPlayer src="https://example.com/missing.mp3" />,
    );

    fireEvent.error(container.querySelector("audio")!);

    expect(screen.getByRole("alert").textContent).toBe("Can't play this audio");
    expect(
      (screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("slider", { name: "Seek" }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });
});

describe("VideoPlayer", () => {
  it.each([
    ["16:9", "aspect-video"],
    ["4:3", "aspect-[4/3]"],
    ["1:1", "aspect-square"],
    ["9:16", "aspect-[9/16]"],
  ] as const)("frames %s video with %s", (ratio, ratioClassName) => {
    const { container } = render(
      <VideoPlayer src="https://example.com/clip.mp4" ratio={ratio} />,
    );

    expect(
      container.querySelector('[data-slot="video-player"] div')?.className,
    ).toContain(ratioClassName);
  });

  it("reads metadata that loaded before hydration", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      HTMLMediaElement.HAVE_METADATA,
    );
    vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(65);

    render(<VideoPlayer src="https://example.com/clip.mp4" title="Clip" />);

    await waitFor(() => {
      expect(screen.getByText("1:05")).toBeTruthy();
    });
  });

  it("keeps the automatic ratio unframed and never autoplays", () => {
    const { container } = render(
      <VideoPlayer src="https://example.com/clip.mp4" ratio="auto" />,
    );
    const frame = container.querySelector('[data-slot="video-player"] div')!;
    const video = container.querySelector("video")!;

    expect(frame.className).not.toMatch(/aspect-/);
    expect(video.hasAttribute("autoplay")).toBe(false);
  });
});
