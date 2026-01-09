export default function FilmStrip({ album, selectedIndex, onSelect }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-5 overflow-auto p-5">
      {album.photos.map((photo, idx) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelect?.(idx)}
          className={
            "pointer-events-auto block w-full cursor-pointer rounded-[10px] border p-[1px] transition-[colors,opacity]" +
            (idx === selectedIndex
              ? "border-black"
              : "border-black/0 opacity-60 hover:border-black/30 hover:opacity-100")
          }
        >
          <div className="aspect-[5/3] w-full overflow-hidden rounded-lg">
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
