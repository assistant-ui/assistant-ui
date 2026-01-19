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
        "rounded-2xl px-3 select-none hover:bg-black/5 cursor-pointer" +
        (isSelected ? " bg-black/5" : "")
      }
    >
      <div
        className={`border-b ${
          isSelected ? "border-black/0" : "border-black/5"
        } hover:border-black/0`}
      >
        <div
          className="w-full text-left py-3 transition flex gap-3 items-center cursor-pointer"
          onClick={onClick}
        >
          <Image
            src={place.thumbnail}
            alt={place.name}
            className="h-16 w-16 rounded-lg object-cover flex-none"
          />
          <div className="min-w-0 text-left">
            <div className="font-medium truncate">{place.name}</div>
            <div className="text-xs text-black/50 truncate">
              {place.description}
            </div>
            <div className="text-xs mt-1 text-black/50 flex items-center gap-1">
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
        } absolute inset-y-0 bottom-4 left-0 z-20 w-[340px] max-w-[75%] pointer-events-auto`}
      >
        <div
          ref={scrollRef}
          className="relative px-2 h-full overflow-y-auto bg-white text-black"
        >
          <div className="flex justify-between flex-row items-center px-3 sticky bg-white top-0 py-4 text-md font-medium">
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
              className="pointer-events-none absolute inset-x-0 bottom-0 h-9 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="w-full h-full bg-gradient-to-t border-b border-black/50 from-black/15 to-black/0"
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
        } absolute inset-x-0 bottom-0 z-20 pointer-events-auto`}
      >
        <div className="pt-2 text-black">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="px-3 py-3 flex gap-3">
              {places.map((place) => (
                <div className="ring ring-black/10 max-w-[330px] w-full shadow-xl rounded-2xl bg-white">
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
