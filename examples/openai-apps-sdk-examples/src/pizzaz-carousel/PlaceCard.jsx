import { Star } from "lucide-react";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

export default function PlaceCard({ place }) {
  if (!place) return null;
  return (
    <div className="flex w-[65vw] min-w-[220px] max-w-[220px] select-none flex-col self-stretch sm:w-[220px]">
      <div className="w-full">
        <Image
          src={place.thumbnail}
          alt={place.name}
          className="aspect-square w-full rounded-2xl object-cover shadow-[0px_2px_6px_rgba(0,0,0,0.06)] ring ring-black/5"
        />
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <div className="line-clamp-1 truncate font-medium text-base">
          {place.name}
        </div>
        <div className="mt-1 flex items-center gap-1 text-black/60 text-xs">
          <Star className="h-3 w-3" aria-hidden="true" />
          {place.rating?.toFixed ? place.rating.toFixed(1) : place.rating}
          {place.price ? <span>· {place.price}</span> : null}
          <span>· San Francisco</span>
        </div>
        {place.description ? (
          <div className="mt-2 flex-auto text-black/80 text-sm">
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
