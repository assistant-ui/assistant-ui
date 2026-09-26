import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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

const showModal = HTMLDialogElement.prototype.showModal;
const close = HTMLDialogElement.prototype.close;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterAll(() => {
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
});

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

  it("navigates with arrow keys and buttons and disables navigation at the ends", () => {
    render(<ImageGallery images={images} maxVisible={8} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open image: Image 1" }),
    );
    const previous = screen.getByRole("button", { name: "Previous image" });
    const next = screen.getByRole("button", { name: "Next image" });
    expect(previous.getAttribute("disabled")).toBe("");

    fireEvent.click(next);
    expect(screen.getByText("2 / 8")).toBeTruthy();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 8")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Open image: Image 8" }),
    );
    expect(
      screen
        .getByRole("button", { name: "Next image" })
        .getAttribute("disabled"),
    ).toBe("");
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("7 / 8")).toBeTruthy();
  });

  it("returns focus to the tile after Escape or close", () => {
    render(<ImageGallery images={images} />);
    const tile = screen.getByRole("button", { name: "Open image: Image 1" });

    fireEvent.click(tile);
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(document.activeElement).toBe(tile);

    fireEvent.click(tile);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.activeElement).toBe(tile);
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
