import { Text } from "ink";
import { useScrollable } from "./useScrollable";

export type ScrollScrollbarProps = {
  char?:
    | {
        track?: string | undefined;
        thumb?: string | undefined;
      }
    | undefined;
  color?:
    | {
        track?: string | undefined;
        thumb?: string | undefined;
      }
    | undefined;
};

const repeatRows = (char: string, rows: number) => {
  return Array.from({ length: rows }, () => char).join("\n");
};

const renderText = (value: string, textColor?: string) => {
  return textColor ? (
    <Text color={textColor}>{value}</Text>
  ) : (
    <Text>{value}</Text>
  );
};

export const ScrollScrollbar = ({ char, color }: ScrollScrollbarProps) => {
  const { viewportHeight, contentHeight, scrollOffset, maxScrollOffset } =
    useScrollable();

  const track = char?.track ?? "|";
  const thumb = char?.thumb ?? "#";
  const rows = Math.max(0, viewportHeight);

  if (rows === 0) return null;

  if (contentHeight <= viewportHeight || maxScrollOffset === 0) {
    return renderText(repeatRows(track, rows), color?.track);
  }

  const thumbHeight = Math.max(
    1,
    Math.round((viewportHeight / contentHeight) * viewportHeight),
  );
  const thumbTop = Math.round(
    (scrollOffset / maxScrollOffset) *
      Math.max(0, viewportHeight - thumbHeight),
  );

  const bottomTrackRows = Math.max(0, rows - thumbTop - thumbHeight);
  const topTrack = repeatRows(track, thumbTop);
  const thumbOutput = repeatRows(thumb, thumbHeight);
  const bottomTrack = repeatRows(track, bottomTrackRows);

  return (
    <>
      {topTrack ? renderText(`${topTrack}\n`, color?.track) : null}
      {renderText(`${thumbOutput}${bottomTrack ? "\n" : ""}`, color?.thumb)}
      {bottomTrack ? renderText(bottomTrack, color?.track) : null}
    </>
  );
};

ScrollScrollbar.displayName = "ScrollPrimitive.Scrollbar";

export namespace ScrollScrollbar {
  export type Props = ScrollScrollbarProps;
}
