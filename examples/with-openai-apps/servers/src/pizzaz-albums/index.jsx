import React from "react";
import { createRoot } from "react-dom/client";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import albumsData from "./albums.json";
import { useMaxHeight } from "../use-max-height";
import { useOpenAiGlobal } from "../use-openai-global";
import FullscreenViewer from "./FullscreenViewer";
import AlbumCard from "./AlbumCard";
import { Button } from "@openai/apps-sdk-ui/components/Button";

function AlbumsCarousel({ onSelect }) {
  const albums = albumsData?.albums || [];
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
    dragFree: false,
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  React.useEffect(() => {
    if (!emblaApi) return;
    const updateButtons = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi]);

  return (
    <div className="antialiased relative w-full text-black py-5 select-none">
      <div className="overflow-hidden max-sm:mx-5" ref={emblaRef}>
        <div className="flex gap-5 items-stretch">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className={
          "pointer-events-none absolute inset-y-0 left-0 w-3 z-[5] transition-opacity duration-200 " +
          (canPrev ? "opacity-100" : "opacity-0")
        }
      >
        <div
          className="h-full w-full border-l border-black/15 bg-gradient-to-r from-black/10 to-transparent"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
          }}
        />
      </div>
      <div
        aria-hidden
        className={
          "pointer-events-none absolute inset-y-0 right-0 w-3 z-[5] transition-opacity duration-200 " +
          (canNext ? "opacity-100" : "opacity-0")
        }
      >
        <div
          className="h-full w-full border-r border-black/15 bg-gradient-to-l from-black/10 to-transparent"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
          }}
        />
      </div>
      {canPrev && (
        <Button
          aria-label="Previous"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 shadow-lg"
          color="secondary"
          size="sm"
          variant="soft"
          uniform
          onClick={() => emblaApi && emblaApi.scrollPrev()}
          type="button"
        >
          <ArrowLeft
            strokeWidth={1.5}
            className="h-4.5 w-4.5"
            aria-hidden="true"
          />
        </Button>
      )}
      {canNext && (
        <Button
          aria-label="Next"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 shadow-lg"
          color="secondary"
          size="sm"
          variant="soft"
          uniform
          onClick={() => emblaApi && emblaApi.scrollNext()}
          type="button"
        >
          <ArrowRight
            strokeWidth={1.5}
            className="h-4.5 w-4.5"
            aria-hidden="true"
          />
        </Button>
      )}
    </div>
  );
}

function App() {
  const displayMode = useOpenAiGlobal("displayMode");
  const [selectedAlbum, setSelectedAlbum] = React.useState(null);
  const maxHeight = useMaxHeight() ?? undefined;

  const handleSelectAlbum = (album) => {
    setSelectedAlbum(album);
    if (window?.webplus?.requestDisplayMode) {
      window.webplus.requestDisplayMode({ mode: "fullscreen" });
    }
  };

  return (
    <div
      className="relative antialiased w-full"
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
      }}
    >
      {displayMode !== "fullscreen" && (
        <AlbumsCarousel onSelect={handleSelectAlbum} />
      )}

      {displayMode === "fullscreen" && selectedAlbum && (
        <FullscreenViewer album={selectedAlbum} />
      )}
    </div>
  );
}

createRoot(document.getElementById("pizzaz-albums-root")).render(<App />);
