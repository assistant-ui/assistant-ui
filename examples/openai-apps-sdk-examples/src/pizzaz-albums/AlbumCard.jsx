import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Image } from "@openai/apps-sdk-ui/components/Image";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";

function AlbumCard({ album, onSelect }) {
  return (
    <Button
      type="button"
      variant="ghost"
      color="secondary"
      pill={false}
      className="group relative h-auto min-h-0 w-[272px] flex-shrink-0 gap-0 rounded-none bg-white p-0 text-left shadow-none before:hidden"
      onClick={() => onSelect?.(album)}
    >
      <div className="flex w-full flex-col gap-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg">
          <Image
            src={album.cover}
            alt={album.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <Badge
            variant="soft"
            color="secondary"
            size="sm"
            pill
            className="absolute top-3 left-3 bg-white/50 backdrop-blur-sm"
          >
            Featured
          </Badge>
        </div>
        <div className="px-1.5">
          <div className="truncate font-medium text-base">{album.title}</div>
          <div className="mt-0.5 font-normal text-black/60 text-sm">
            {album.photos.length} photos
          </div>
        </div>
      </div>
    </Button>
  );
}

export default AlbumCard;
