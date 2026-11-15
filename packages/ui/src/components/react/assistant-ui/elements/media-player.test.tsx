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

describe("remote media", () => {
  it("sets a remote audio source only when the user presses play", () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const { container } = render(
      <AudioPlayer
        src="https://media.example/a.mp3"
        artwork="https://media.example/cover.png"
      />,
    );
    const audio = container.querySelector("audio")!;

    expect(audio.hasAttribute("src")).toBe(false);
    expect(audio.getAttribute("preload")).toBe("none");
    expect(container.querySelector("img")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));

    expect(audio.getAttribute("src")).toBe("https://media.example/a.mp3");
    expect(play).toHaveBeenCalledOnce();
  });

  it("drops a played remote source when the source changes", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    const { container, rerender } = render(
      <AudioPlayer src="https://media.example/a.mp3" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
    rerender(<AudioPlayer src="https://media.example/b.mp3" />);

    expect(container.querySelector("audio")!.hasAttribute("src")).toBe(false);
  });

  it("preloads an allowed remote audio source and artwork", () => {
    const { container } = render(
      <AudioPlayer
        src="https://media.example/a.mp3"
        artwork="https://media.example/cover.png"
        mediaOrigins={["https://media.example"]}
      />,
    );
    const audio = container.querySelector("audio")!;

    expect(audio.getAttribute("src")).toBe("https://media.example/a.mp3");
    expect(audio.getAttribute("preload")).toBe("metadata");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://media.example/cover.png",
    );
  });

  it("preloads local and allowed sources", () => {
    const { container } = render(
      <>
        <AudioPlayer src="/a.mp3" artwork="/cover.png" />
        <VideoPlayer
          src="https://media.example/v.mp4"
          poster="https://media.example/poster.png"
          mediaOrigins={["https://media.example"]}
        />
      </>,
    );

    expect(container.querySelector("audio")?.getAttribute("preload")).toBe(
      "metadata",
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/cover.png",
    );
    const video = container.querySelector("video")!;
    expect(video.getAttribute("preload")).toBe("metadata");
    expect(video.getAttribute("poster")).toBe(
      "https://media.example/poster.png",
    );
  });

  it("holds a remote video and its poster until the user presses play", () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const { container } = render(
      <VideoPlayer
        src="https://media.example/v.mp4"
        poster="https://media.example/poster.png"
        title="Clip"
      />,
    );
    const video = container.querySelector("video")!;

    expect(video.hasAttribute("src")).toBe(false);
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.hasAttribute("poster")).toBe(false);
    expect(video.hasAttribute("controls")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Play Clip" }));

    expect(video.getAttribute("src")).toBe("https://media.example/v.mp4");
    expect(video.hasAttribute("controls")).toBe(true);
    expect(play).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Play Clip" })).toBeNull();
  });
});
