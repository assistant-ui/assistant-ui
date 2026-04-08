"use client";

import { useEffect, useRef } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useA2ui } from "@assistant-ui/react-a2ui";
import { dismissOtherSurfaces } from "./surface-utils";

type Result = {
  cuisine: string;
  location: string;
  restaurants: {
    id: string;
    name: string;
    rating: number;
    distance: string;
    price: string;
    specialty: string;
  }[];
};

export const RestaurantToolUI = makeAssistantToolUI<
  { cuisine: string; location: string },
  Result
>({
  toolName: "show_restaurants",
  render: ({ result }) => {
    const { processMessage } = useA2ui();
    const created = useRef(false);

    useEffect(() => {
      if (!result || created.current) return;
      created.current = true;

      dismissOtherSurfaces(processMessage, "restaurants");
      processMessage({ type: "createSurface", surfaceId: "restaurants" });
      processMessage({
        type: "updateComponents",
        surfaceId: "restaurants",
        components: [
          {
            type: "Card",
            id: "rest-card",
            props: {
              title: `${result.cuisine} Restaurants`,
              subtitle: `Near ${result.location}`,
            },
          },
          ...result.restaurants.map((r) => ({
            type: "Row",
            id: r.id,
            props: {
              label: r.name,
              detail: `${r.rating} -- ${r.distance} -- ${r.price}`,
              price: r.specialty,
              highlight: r.rating >= 4.7,
            },
          })),
          { type: "Divider", id: "rest-divider" },
          {
            type: "Text",
            id: "rest-note",
            props: { value: "Click a restaurant to see more details" },
          },
        ],
      });
    }, [result, processMessage]);

    if (!result)
      return (
        <p className="text-muted-foreground text-sm">
          Searching restaurants...
        </p>
      );
    return (
      <p className="text-muted-foreground text-sm">
        Found {result.restaurants.length} {result.cuisine} restaurants near{" "}
        {result.location}. Check the sidebar for details.
      </p>
    );
  },
});
