import React from "react";
import { Star } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

export default function PlaceCard({ place }) {
  if (!place) return null;
  return (
    <div className="min-w-[220px] select-none max-w-[220px] w-[65vw] sm:w-[220px] self-stretch flex flex-col">
      <div className="w-full">
        <Image
          src={place.thumbnail}
          alt={place.name}
          className="w-full aspect-square rounded-2xl object-cover ring ring-black/5 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]"
        />
      </div>
      <div className="mt-3 flex flex-col flex-1">
        <div className="text-base font-medium truncate line-clamp-1">
          {place.name}
        </div>
        <div className="text-xs mt-1 text-black/60 flex items-center gap-1">
          <Star className="h-3 w-3" aria-hidden="true" />
          {place.rating?.toFixed ? place.rating.toFixed(1) : place.rating}
          {place.price ? <span>· {place.price}</span> : null}
          <span>· San Francisco</span>
        </div>
        {place.description ? (
          <div className="text-sm mt-2 text-black/80 flex-auto">
            {place.description}
          </div>
        ) : null}
        <div className="mt-5">
          <Button color="primary" size="sm" variant="solid">
            Learn more
          </Button>
        </div>
      </div>
    </div>
  );
}
