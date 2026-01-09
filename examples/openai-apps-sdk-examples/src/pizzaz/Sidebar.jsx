import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useOpenAiGlobal } from "../use-openai-global";
import { Settings2, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";

function PlaceListItem({ place, isSelected, onClick }) {
  return (
    <div
      className={
        "cursor-pointer select-none rounded-2xl px-3 hover:bg-black/5" +
        (isSelected ? "bg-black/5" : "")
      }
    >
      <div
        className={`border-b ${
          isSelected ? "border-black/0" : "border-black/5"
        } hover:border-black/0`}
      >
        <div
          className="flex w-full cursor-pointer items-center gap-3 py-3 text-left transition"
          onClick={onClick}
        >
          <Image
            src={place.thumbnail}
            alt={place.name}
            className="h-16 w-16 flex-none rounded-lg object-cover"
          />
          <div className="min-w-0 text-left">
            <div className="truncate font-medium">{place.name}</div>
            <div className="truncate text-black/50 text-xs">
              {place.description}
            </div>
            <div className="mt-1 flex items-center gap-1 text-black/50 text-xs">
              <Star className="h-3 w-3" aria-hidden="true" />
              {place.rating.toFixed(1)}
              {place.price ? <span className="">· {place.price}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ places, selectedId, onSelect }) {
  const [emblaRef] = useEmblaCarousel({ dragFree: true, loop: false });
  const displayMode = useOpenAiGlobal("displayMode");
  const forceMobile = displayMode !== "fullscreen";
  const scrollRef = React.useRef(null);
  const [showBottomFade, setShowBottomFade] = React.useState(false);

  const updateBottomFadeVisibility = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom =
      Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
    setShowBottomFade(!atBottom);
  }, []);

  React.useEffect(() => {
    updateBottomFadeVisibility();
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateBottomFadeVisibility();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateBottomFadeVisibility);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateBottomFadeVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  return (
    <>
      {/* Desktop/Tablet sidebar */}
      <div
        className={`${
          forceMobile ? "hidden" : ""
        } pointer-events-auto absolute inset-y-0 bottom-4 left-0 z-20 w-[340px] max-w-[75%]`}
      >
        <div
          ref={scrollRef}
          className="relative h-full overflow-y-auto bg-white px-2 text-black"
        >
          <div className="sticky top-0 flex flex-row items-center justify-between bg-white px-3 py-4 font-medium text-md">
            {places.length} results
            <Button
              variant="ghost"
              color="secondary"
              size="sm"
              uniform
              aria-label="Filter"
            >
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <div>
            {places.map((place) => (
              <PlaceListItem
                key={place.id}
                place={place}
                isSelected={
                  displayMode === "fullscreen" && selectedId === place.id
                }
                onClick={() => onSelect(place)}
              />
            ))}
          </div>
        </div>
        <AnimatePresence>
          {showBottomFade && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-9"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="h-full w-full border-black/50 border-b bg-gradient-to-t from-black/15 to-black/0"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0) 100%)",
                  maskImage:
                    "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0) 100%)",
                }}
                aria-hidden
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile bottom carousel */}
      <div
        className={`${
          forceMobile ? "" : "hidden"
        } pointer-events-auto absolute inset-x-0 bottom-0 z-20`}
      >
        <div className="pt-2 text-black">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-3 px-3 py-3">
              {places.map((place) => (
                <div className="w-full max-w-[330px] rounded-2xl bg-white shadow-xl ring ring-black/10">
                  <PlaceListItem
                    key={place.id}
                    place={place}
                    isSelected={
                      displayMode === "fullscreen" && selectedId === place.id
                    }
                    onClick={() => onSelect(place)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
