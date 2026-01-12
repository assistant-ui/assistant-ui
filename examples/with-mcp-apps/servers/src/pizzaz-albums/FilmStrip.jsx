import React from "react";

export default function FilmStrip({ album, selectedIndex, onSelect }) {
  return (
    <div className="h-full w-full overflow-auto flex flex-col items-center justify-center p-5 space-y-5">
      {album.photos.map((photo, idx) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect?.(idx)}
          className={
            "block w-full p-[1px] pointer-events-auto rounded-[10px] cursor-pointer border transition-[colors,opacity] " +
            (idx === selectedIndex
              ? "border-black"
              : "border-black/0 hover:border-black/30 opacity-60 hover:opacity-100")
          }
        >
          <div className="aspect-[5/3] rounded-lg overflow-hidden w-full">
            <img
              src={photo.url}
              alt={photo.title || `Photo ${idx + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </button>
      ))}
    </div>
  );
}
