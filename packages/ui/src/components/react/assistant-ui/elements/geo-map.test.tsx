import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const leaflet = vi.hoisted(() => ({
  divIcon: vi.fn(),
  latLngBounds: vi.fn(),
  map: vi.fn(),
  marker: vi.fn(),
  polyline: vi.fn(),
  tileLayer: vi.fn(),
}));

vi.mock("leaflet", () => leaflet);
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import { GeoMap, type GeoMapPlace } from "./geo-map";

const PLACES: readonly GeoMapPlace[] = [
  {
    id: "library",
    lat: 1.2966,
    lng: 103.7764,
    label: "Central Library",
    description: "The quiet starting point.",
  },
  {
    id: "museum",
    lat: 1.2974,
    lng: 103.776,
    label: "Museum",
  },
];

let mapInstance: {
  fitBounds: ReturnType<typeof vi.fn>;
  panTo: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  setView: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mapInstance = {
    fitBounds: vi.fn(),
    panTo: vi.fn(),
    remove: vi.fn(),
    setView: vi.fn(),
  };
  leaflet.map.mockReturnValue(mapInstance);
  leaflet.latLngBounds.mockReturnValue({});
  leaflet.divIcon.mockReturnValue({});
  leaflet.tileLayer.mockImplementation(() => {
    const layer = { addTo: vi.fn() };
    layer.addTo.mockReturnValue(layer);
    return layer;
  });
  leaflet.polyline.mockImplementation(() => {
    const line = { addTo: vi.fn() };
    line.addTo.mockReturnValue(line);
    return line;
  });
  leaflet.marker.mockImplementation(() => {
    const marker = { addTo: vi.fn(), on: vi.fn(), setIcon: vi.fn() };
    marker.addTo.mockReturnValue(marker);
    marker.on.mockReturnValue(marker);
    return marker;
  });
});

afterEach(cleanup);

describe("GeoMap", () => {
  it("renders a server placeholder before Leaflet loads", () => {
    const markup = renderToString(<GeoMap places={PLACES} height={320} />);

    expect(markup).toContain("Loading map");
    expect(markup).toContain("height:320px");
    expect(leaflet.map).not.toHaveBeenCalled();
  });

  it("renders the place list and selects an uncontrolled place", async () => {
    const onSelect = vi.fn();
    render(<GeoMap places={PLACES} onSelect={onSelect} />);

    await waitFor(() => expect(leaflet.map).toHaveBeenCalledTimes(1));
    const museum = screen.getByRole("button", { name: /Museum/ });
    fireEvent.click(museum);

    expect(onSelect).toHaveBeenCalledWith("museum");
    expect(museum.getAttribute("aria-current")).toBe("true");
    expect(mapInstance.panTo).toHaveBeenCalledWith([1.2974, 103.776]);
  });

  it("skips places and route points outside geographic bounds", async () => {
    render(
      <GeoMap
        places={[
          PLACES[0],
          { id: "north", lat: 92, lng: 103.78, label: "Outside" },
        ]}
        routes={[
          {
            id: "invalid-route",
            points: [
              [1.2966, 103.7764],
              [1.3, 200],
            ],
          },
        ]}
      />,
    );

    await waitFor(() => expect(leaflet.map).toHaveBeenCalledTimes(1));

    expect(screen.queryByText("Outside")).toBeNull();
    expect(leaflet.marker).toHaveBeenCalledTimes(1);
    expect(leaflet.polyline).not.toHaveBeenCalled();
  });

  it("draws the default OpenStreetMap tiles in ink for each theme", async () => {
    const { container, rerender } = render(
      <GeoMap places={PLACES} theme="light" />,
    );

    await waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledTimes(1));
    expect(leaflet.tileLayer.mock.calls[0]?.[0]).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    const frame = () =>
      container.querySelector<HTMLElement>('[role="region"]')!;
    expect(frame().getAttribute("data-theme")).toBe("light");
    expect(frame().className).toContain("grayscale");
    expect(frame().className).not.toContain("invert");

    rerender(<GeoMap places={PLACES} theme="dark" />);
    expect(frame().getAttribute("data-theme")).toBe("dark");
    expect(frame().className).toContain("invert");
    expect(leaflet.tileLayer).toHaveBeenCalledTimes(1);
  });

  it("leaves custom tiles as the provider draws them", async () => {
    const { container } = render(
      <GeoMap
        places={PLACES}
        tileUrl="https://tiles.example.com/{z}/{x}/{y}.png"
        attribution="© Example Maps"
      />,
    );

    await waitFor(() => expect(leaflet.tileLayer).toHaveBeenCalledTimes(1));
    expect(leaflet.tileLayer.mock.calls[0]?.[1]).toMatchObject({
      attribution: "© Example Maps",
    });
    expect(container.querySelector('[role="region"]')?.className).not.toContain(
      "grayscale",
    );
  });

  it("removes its Leaflet map on unmount", async () => {
    const { unmount } = render(<GeoMap places={PLACES} />);

    await waitFor(() => expect(leaflet.map).toHaveBeenCalledTimes(1));
    unmount();

    expect(mapInstance.remove).toHaveBeenCalledTimes(1);
  });
});
