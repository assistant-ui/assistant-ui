"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { MapPinIcon, Loader2Icon } from "lucide-react";

type LocationArgs = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

type LocationResult = {
  success: boolean;
};

export const LocationToolUI = makeAssistantToolUI<LocationArgs, LocationResult>(
  {
    toolName: "show_location",
    render: function LocationUI({ args, status }) {
      if (status.type === "running" && !args.lat) {
        return (
          <div className="flex items-center gap-2 rounded-lg border p-4">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground text-sm">
              Loading location...
            </span>
          </div>
        );
      }

      const { name, address, lat, lng } = args;
      if (!lat || !lng) return null;

      const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

      return (
        <div className="my-2 overflow-hidden rounded-lg border">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <MapPinIcon className="size-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{name}</p>
              {address && (
                <p className="text-muted-foreground text-xs">{address}</p>
              )}
            </div>
          </div>
          <iframe
            title={`Map of ${name}`}
            src={mapSrc}
            className="h-[200px] w-full border-0"
          />
        </div>
      );
    },
  },
);
