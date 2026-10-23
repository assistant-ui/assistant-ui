"use client";

import { Zoom } from "diagrammatic/interactive";
import { DotWorldMap } from "diagrammatic/world";

export default function ZoomableDotMap() {
  return (
    <Zoom max={6} className="overflow-hidden rounded-md">
      {(view) => (
        <DotWorldMap
          title="Edge locations in Europe"
          groups={{
            edge: [
              "GB",
              "IE",
              "FR",
              "DE",
              "NL",
              "ES",
              "IT",
              "SE",
              "PL",
              "CH",
              "AT",
            ],
          }}
          view={view}
        />
      )}
    </Zoom>
  );
}
