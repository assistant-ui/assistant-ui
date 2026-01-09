import React from "react";
import { useMaxHeight } from "../use-max-height";
import FilmStrip from "./FilmStrip";

export default function FullscreenViewer({ album }) {
  const maxHeight = useMaxHeight() ?? undefined;
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [album?.id]);

  const photo = album?.photos?.[index];

  return (
    <div
      className="relative h-full w-full bg-white"
      style={{
        maxHeight,
        height: maxHeight,
      }}
    >
      <div className="absolute inset-0 flex flex-row overflow-hidden">
        {/* Film strip */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 hidden w-40 md:block">
          <FilmStrip album={album} selectedIndex={index} onSelect={setIndex} />
        </div>
        {/* Main photo */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center px-40 py-10">
          <div className="relative h-full w-full">
            {photo ? (
              <img
                src={photo.url}
                alt={photo.title || album.title}
                className="absolute inset-0 m-auto max-h-full max-w-full rounded-3xl border border-black/10 object-contain shadow-sm"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
