import { MapPin, Star } from "lucide-react";

export default function SliceCard({ place, index }) {
  return (
    <article className="flex min-w-[240px] max-w-[270px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm sm:min-w-[270px]">
      <div className="relative h-36 w-full overflow-hidden">
        <img
          src={place.thumbnail}
          alt={place.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 font-semibold text-black text-xs shadow-sm">
          #{index + 1}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-base">{place.name}</div>
            <div className="mt-1 text-black/60 text-sm">
              {place.description}
            </div>
          </div>
          <div className="rounded-full bg-black/5 px-2 py-1 text-black/70 text-xs">
            {place.price}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-black/70 text-sm">
          <div className="flex items-center gap-1">
            <Star strokeWidth={1.5} className="h-4 w-4 text-black" />
            <span>
              {place.rating?.toFixed ? place.rating.toFixed(1) : place.rating}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin strokeWidth={1.5} className="h-4 w-4" />
            <span>{place.city}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
