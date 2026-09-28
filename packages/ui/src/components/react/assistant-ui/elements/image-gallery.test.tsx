import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageGallery, type GalleryImage } from "./image-gallery";

const images: readonly GalleryImage[] = Array.from(
  { length: 8 },
  (_, index) => ({
    id: `${index + 1}`,
    src: `https://example.com/${index + 1}.png`,
    alt: `Image ${index + 1}`,
    caption: `Caption ${index + 1}`,
  }),
);

afterEach(cleanup);

describe("ImageGallery", () => {
  it("labels every visible image tile", () => {
    render(<ImageGallery images={images} />);

    expect(
      screen.getByRole("button", { name: "Open image: Image 1" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open image: Image 6" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Open image: Image 7" }),
    ).toBeNull();
  });

  it("puts overflow on the final visible tile and opens that image", () => {
    const onOpen = vi.fn();
    render(<ImageGallery images={images} maxVisible={3} onOpen={onOpen} />);

    expect(screen.getByText("+5")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Open image: Image 3" }),
    );

    expect(onOpen).toHaveBeenCalledWith("3");
    expect(screen.getByText("3 / 8")).toBeTruthy();
  });

  it("opens the lightbox with the clicked image and closes on Close", async () => {
    render(<ImageGallery images={images} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open image: Image 1" }),
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("Image 1")).toBeTruthy();
    expect(screen.getByText("1 / 8")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("navigates with arrow keys and buttons and disables navigation at the ends", async () => {
    render(<ImageGallery images={images} maxVisible={8} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open image: Image 1" }),
    );
    const previous = screen.getByRole("button", { name: "Previous image" });
    const next = screen.getByRole("button", { name: "Next image" });
    expect(previous.getAttribute("disabled")).toBe("");

    fireEvent.click(next);
    expect(screen.getByText("2 / 8")).toBeTruthy();
    fireEvent.keyDown(next, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 8")).toBeTruthy();

    // The dialog is modal, so the background grid is inert; close it before
    // opening a different tile, as a real pointer user would have to.
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(
      screen.getByRole("button", { name: "Open image: Image 8" }),
    );
    const last = screen.getByRole("button", { name: "Next image" });
    expect(last.getAttribute("disabled")).toBe("");
    fireEvent.keyDown(screen.getByRole("button", { name: "Close" }), {
      key: "ArrowLeft",
    });
    expect(screen.getByText("7 / 8")).toBeTruthy();
  });

  it("returns focus to the tile after Escape or Close", async () => {
    render(<ImageGallery images={images} />);
    const tile = screen.getByRole("button", { name: "Open image: Image 1" });

    fireEvent.click(tile);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(tile);
    });

    fireEvent.click(tile);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(tile);
    });
  });

  it("does not link an unsafe image source", () => {
    render(
      <ImageGallery
        images={[
          {
            ...images[0]!,
            source: { label: "Untrusted source", url: "javascript:alert(1)" },
          },
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open image: Image 1" }),
    );

    expect(screen.queryByRole("link", { name: "Untrusted source" })).toBeNull();
    expect(screen.getByText("Untrusted source")).toBeTruthy();
  });
});
