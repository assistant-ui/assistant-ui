"use client";

import { memo } from "react";
import {
  UtensilsCrossed,
  Coffee,
  Landmark,
  Trees,
  ShoppingBag,
  Ticket,
  Mountain,
  Train,
  MapPin,
  Star,
  Heart,
  Info,
} from "lucide-react";
import type { POI, POICategory } from "./schema";
import { CATEGORY_LABELS } from "./schema";
import {
  cn,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./_adapter";

const CATEGORY_ICONS: Record<POICategory, typeof MapPin> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  museum: Landmark,
  park: Trees,
  shopping: ShoppingBag,
  entertainment: Ticket,
  landmark: Mountain,
  transit: Train,
  other: MapPin,
};

interface POICardProps {
  poi: POI;
  isSelected: boolean;
  isFavorite: boolean;
  variant: "compact" | "expanded";
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export const POICard = memo(function POICard({
  poi,
  isSelected,
  isFavorite,
  variant,
  onSelect,
  onToggleFavorite,
  onViewDetails,
}: POICardProps) {
  const CategoryIcon = CATEGORY_ICONS[poi.category];

  if (variant === "compact") {
    return (
      <button
        onClick={() => onSelect(poi.id)}
        className={cn(
          "group relative flex h-[88px] w-44 shrink-0 snap-start flex-col rounded-xl border p-3 text-left transition-all duration-150",
          "bg-card hover:bg-card/90 active:scale-[0.97]",
          isSelected
            ? "border-primary shadow-md ring-2 ring-primary/20"
            : "border-border/60 shadow-sm hover:border-border",
        )}
      >
        <div className="flex items-start justify-between gap-1.5">
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 font-medium text-[11px]"
          >
            <CategoryIcon className="size-3" />
            {CATEGORY_LABELS[poi.category]}
          </Badge>
          {isFavorite && (
            <Heart className="size-3.5 shrink-0 fill-rose-500 text-rose-500" />
          )}
        </div>
        <span className="mt-1.5 line-clamp-2 font-medium text-sm leading-snug tracking-tight">
          {poi.name}
        </span>
        {poi.rating !== undefined && (
          <div className="mt-auto flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="text-muted-foreground text-xs tabular-nums">
              {poi.rating.toFixed(1)}
            </span>
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-xl p-2.5 transition-colors duration-150",
        "hover:bg-accent/50 active:bg-accent/70",
        isSelected && "bg-accent",
      )}
    >
      <Avatar className="size-14 shrink-0 rounded-lg">
        <AvatarImage
          src={poi.imageUrl}
          alt={poi.name}
          className="object-cover"
        />
        <AvatarFallback className="rounded-lg">
          <CategoryIcon className="size-6 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => onSelect(poi.id)}
            className="min-w-0 flex-1 text-left"
          >
            <h3 className="truncate font-medium text-sm tracking-tight">
              {poi.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[11px]">
                <CategoryIcon className="size-3" />
                {CATEGORY_LABELS[poi.category]}
              </Badge>
              {poi.rating !== undefined && (
                <Badge
                  variant="secondary"
                  className="h-5 gap-1 px-1.5 text-[11px]"
                >
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {poi.rating.toFixed(1)}
                </Badge>
              )}
            </div>
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(poi.id);
                }}
              >
                <Heart
                  className={cn(
                    "size-4 transition-all duration-200",
                    isFavorite
                      ? "scale-110 fill-rose-500 text-rose-500"
                      : "text-muted-foreground hover:text-rose-500",
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="z-[1001]">
              {isFavorite ? "Remove from favorites" : "Add to favorites"}
            </TooltipContent>
          </Tooltip>
        </div>

        {poi.description && (
          <p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {poi.description}
          </p>
        )}

        {poi.address && (
          <p className="mt-1 line-clamp-2 text-muted-foreground/80 text-xs">
            {poi.address}
          </p>
        )}

        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1.5 h-8 gap-1.5 self-start rounded-lg px-2.5 text-muted-foreground text-xs transition-all hover:text-foreground active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(poi.id);
            }}
          >
            <Info className="size-3.5" />
            View details
          </Button>
        )}
      </div>
    </div>
  );
});
