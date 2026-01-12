import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createRoot } from "react-dom/client";
import markers from "./markers.json";
import { AnimatePresence } from "framer-motion";
import Inspector from "./Inspector";
import Sidebar from "./Sidebar";
import { useOpenAiGlobal } from "../use-openai-global";
import { useMaxHeight } from "../use-max-height";
import { Maximize2 } from "lucide-react";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  BrowserRouter,
  Outlet,
} from "react-router-dom";
import { Button } from "@openai/apps-sdk-ui/components/Button";

mapboxgl.accessToken =
  "pk.eyJ1IjoiZXJpY25pbmciLCJhIjoiY21icXlubWM1MDRiczJvb2xwM2p0amNyayJ9.n-3O6JI5nOp_Lw96ZO5vJQ";

function fitMapToMarkers(map, coords) {
  if (!map || !coords.length) return;
  if (coords.length === 1) {
    map.flyTo({ center: coords[0], zoom: 12 });
    return;
  }
  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new mapboxgl.LngLatBounds(coords[0], coords[0])
  );
  map.fitBounds(bounds, { padding: 60, animate: true });
}

export default function App() {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerObjs = useRef([]);
  const places = markers?.places || [];
  const markerCoords = places.map((p) => p.coords);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedId = React.useMemo(() => {
    const match = location?.pathname?.match(/(?:^|\/)place\/([^/]+)/);
    return match && match[1] ? match[1] : null;
  }, [location?.pathname]);
  const selectedPlace = places.find((p) => p.id === selectedId) || null;
  const [viewState, setViewState] = useState(() => ({
    center: markerCoords.length > 0 ? markerCoords[0] : [0, 0],
    zoom: markerCoords.length > 0 ? 12 : 2,
  }));
  const displayMode = useOpenAiGlobal("displayMode");
  const allowInspector = displayMode === "fullscreen";
  const maxHeight = useMaxHeight() ?? undefined;

  useEffect(() => {
    if (mapObj.current) return;
    mapObj.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: markerCoords.length > 0 ? markerCoords[0] : [0, 0],
      zoom: markerCoords.length > 0 ? 12 : 2,
      attributionControl: false,
    });
    addAllMarkers(places);
    setTimeout(() => {
      fitMapToMarkers(mapObj.current, markerCoords);
    }, 0);
    // after first paint
    requestAnimationFrame(() => mapObj.current.resize());

    // or keep it in sync with window resizes
    window.addEventListener("resize", mapObj.current.resize);

    return () => {
      window.removeEventListener("resize", mapObj.current.resize);
      mapObj.current.remove();
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!mapObj.current) return;
    const handler = () => {
      const c = mapObj.current.getCenter();
      setViewState({ center: [c.lng, c.lat], zoom: mapObj.current.getZoom() });
    };
    mapObj.current.on("moveend", handler);
    return () => {
      mapObj.current.off("moveend", handler);
    };
  }, []);

  function addAllMarkers(placesList) {
    markerObjs.current.forEach((m) => m.remove());
    markerObjs.current = [];
    placesList.forEach((place) => {
      const marker = new mapboxgl.Marker({
        color: "#F46C21",
      })
        .setLngLat(place.coords)
        .addTo(mapObj.current);
      const el = marker.getElement();
      if (el) {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
          navigate(`/place/${place.id}`);
          panTo(place.coords, { offsetForInspector: true });
        });
      }
      markerObjs.current.push(marker);
    });
  }

  function getInspectorOffsetPx() {
    if (displayMode !== "fullscreen") return 0;
    if (typeof window === "undefined") return 0;
    const isXlUp =
      window.matchMedia && window.matchMedia("(min-width: 1280px)").matches;
    const el = document.querySelector(".pizzaz-inspector");
    const w = el ? el.getBoundingClientRect().width : 360;
    const half = Math.round(w / 2);
    // xl: inspector on right → negative x offset; lg: inspector on left → positive x offset
    return isXlUp ? -half : half;
  }

  function panTo(
    coord,
    { offsetForInspector } = { offsetForInspector: false }
  ) {
    if (!mapObj.current) return;
    const inspectorOffset = offsetForInspector ? getInspectorOffsetPx() : 0;
    const flyOpts = {
      center: coord,
      zoom: 14,
      speed: 1.2,
      curve: 1.6,
    };
    if (inspectorOffset) {
      flyOpts.offset = [inspectorOffset, 0];
    }
    mapObj.current.flyTo(flyOpts);
  }

  useEffect(() => {
    if (!mapObj.current) return;
    addAllMarkers(places);
  }, [places]);

  // Pan the map when the selected place changes via routing
  useEffect(() => {
    if (!mapObj.current || !selectedPlace) return;
    panTo(selectedPlace.coords, { offsetForInspector: true });
  }, [selectedId]);

  // Ensure Mapbox resizes when container maxHeight/display mode changes
  useEffect(() => {
    if (!mapObj.current) return;
    mapObj.current.resize();
  }, [maxHeight, displayMode]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.oai &&
      typeof window.oai.widget.setState === "function"
    ) {
      window.oai.widget.setState({
        center: viewState.center,
        zoom: viewState.zoom,
        markers: markerCoords,
      });
    }
  }, [viewState, markerCoords]);

  return (
    <>
      <div
        style={{
          maxHeight,
          height: displayMode === "fullscreen" ? maxHeight - 40 : 480,
        }}
        className={
          "relative antialiased w-full min-h-[480px] overflow-hidden " +
          (displayMode === "fullscreen"
            ? "rounded-none border-0"
            : "border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl")
        }
      >
        <Outlet />
        {displayMode !== "fullscreen" && (
          <Button
            aria-label="Enter fullscreen"
            className="absolute top-4 right-4 z-30 shadow-lg pointer-events-auto bg-white text-black"
            color="secondary"
            size="sm"
            variant="soft"
            uniform
            onClick={() => {
              if (selectedId) {
                navigate("..", { replace: true });
              }
              if (window?.webplus?.requestDisplayMode) {
                window.webplus.requestDisplayMode({ mode: "fullscreen" });
              }
            }}
          >
            <Maximize2
              strokeWidth={1.5}
              className="h-4.5 w-4.5"
              aria-hidden="true"
            />
          </Button>
        )}
        {/* Sidebar */}
        <Sidebar
          places={places}
          selectedId={selectedId}
          onSelect={(place) => {
            navigate(`/place/${place.id}`);
            panTo(place.coords, { offsetForInspector: true });
          }}
        />

        {/* Inspector (right) */}
        <AnimatePresence>
          {allowInspector && selectedPlace && (
            <Inspector
              key={selectedPlace.id}
              place={selectedPlace}
              onClose={() => navigate("..")}
            />
          )}
        </AnimatePresence>

        {/* Map */}
        <div
          className={
            "absolute inset-0 overflow-hidden" +
            (displayMode === "fullscreen"
              ? " left-[340px] right-2 top-2 bottom-4 border border-black/10 rounded-3xl"
              : "")
          }
        >
          <div
            ref={mapRef}
            className="w-full h-full absolute bottom-0 left-0 right-0"
            style={{
              maxHeight,
              height: displayMode === "fullscreen" ? maxHeight : undefined,
            }}
          />
        </div>
      </div>

      {/* Suggestion chips (bottom, fullscreen) */}
      {displayMode === "fullscreen" && (
        <div className="hidden antialiased md:flex absolute inset-x-0 bottom-2 z-30 justify-center pointer-events-none">
          <div className="flex gap-3 pointer-events-auto">
            {["Open now", "Top rated", "Vegetarian friendly"].map((label) => (
              <Button
                key={label}
                color="secondary"
                variant="soft"
                size="sm"
                className="font-base"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function RouterRoot() {
  return (
    <Routes>
      <Route path="*" element={<App />}>
        <Route path="place/:placeId" element={<></>} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("pizzaz-root")).render(
  <BrowserRouter>
    <RouterRoot />
  </BrowserRouter>
);
