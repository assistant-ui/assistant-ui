"use client";

import {
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* What is drawn over a picture, in the picture's own pixels                  */
/* -------------------------------------------------------------------------- */

export type Point = { x: number; y: number };

export type Shape = "line" | "arrow" | "rect" | "ellipse";

export type Mark =
  | { kind: "path"; points: readonly Point[]; color: string; width: number }
  | { kind: Shape; from: Point; to: Point; color: string; width: number }
  | { kind: "text"; at: Point; text: string; color: string; size: number }
  | { kind: "pin"; at: Point; number: number; size: number };

/** What a press on the picture does. */
export type Tool = "pen" | Shape | "text" | "pin" | "eraser" | "none";

export type Size = { width: number; height: number };

export type SurfaceHandle = {
  /** The marks as SVG, for `rasterize`. */
  markup: () => string;
};

const pointsOf = (points: readonly Point[]) =>
  points.map((point) => `${point.x},${point.y}`).join(" ");

/* The two barbs of an arrow's head, drawn back from its tip. */
function barbs(from: Point, to: Point, width: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = width * 4;
  return [angle + Math.PI * 0.82, angle - Math.PI * 0.82].map((turn) => ({
    x: to.x + Math.cos(turn) * length,
    y: to.y + Math.sin(turn) * length,
  }));
}

function MarkShape({ mark }: { mark: Mark }) {
  if (mark.kind === "text")
    return (
      <text
        x={mark.at.x}
        y={mark.at.y}
        fill={mark.color}
        fontSize={mark.size}
        fontFamily="sans-serif"
        fontWeight={600}
        dominantBaseline="middle"
      >
        {mark.text}
      </text>
    );

  if (mark.kind === "pin")
    return (
      <g>
        <circle
          cx={mark.at.x}
          cy={mark.at.y}
          r={mark.size}
          fill="#2563eb"
          stroke="#ffffff"
          strokeWidth={mark.size / 8}
        />
        <text
          x={mark.at.x}
          y={mark.at.y}
          fill="#ffffff"
          fontSize={mark.size * 1.1}
          fontFamily="sans-serif"
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {mark.number}
        </text>
      </g>
    );

  const stroke = {
    fill: "none",
    stroke: mark.color,
    strokeWidth: mark.width,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  if (mark.kind === "path") {
    // A press with no drag is a dot.
    const [first] = mark.points;
    const points =
      mark.points.length === 1 && first ? [first, first] : mark.points;
    return <polyline points={pointsOf(points)} {...stroke} />;
  }

  const { from, to } = mark;
  if (mark.kind === "rect")
    return (
      <rect
        x={Math.min(from.x, to.x)}
        y={Math.min(from.y, to.y)}
        width={Math.abs(to.x - from.x)}
        height={Math.abs(to.y - from.y)}
        {...stroke}
      />
    );
  if (mark.kind === "ellipse")
    return (
      <ellipse
        cx={(from.x + to.x) / 2}
        cy={(from.y + to.y) / 2}
        rx={Math.abs(to.x - from.x) / 2}
        ry={Math.abs(to.y - from.y) / 2}
        {...stroke}
      />
    );

  const [left, right] = barbs(from, to, mark.width);
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} {...stroke} />
      {mark.kind === "arrow" && left && right && (
        <polyline points={pointsOf([left, to, right])} {...stroke} />
      )}
    </g>
  );
}

/*
 * The layer over the picture that takes the pointer. It draws in the
 * picture's pixels whatever size the picture is shown at, so what is sent to
 * the model lines up with it.
 */
export function Surface({
  ref,
  size,
  marks,
  tool,
  color,
  width,
  onAdd,
  onRemove,
  onPoint,
  className,
}: {
  ref: Ref<SurfaceHandle>;
  size: Size;
  marks: readonly Mark[];
  tool: Tool;
  color: string;
  width: number;
  onAdd: (mark: Mark) => void;
  onRemove: (index: number) => void;
  /** A press with the text or pin tool, which the editor answers with a field. */
  onPoint: (point: Point) => void;
  className?: string;
}) {
  const marksRef = useRef<SVGGElement>(null);
  const [draft, setDraft] = useState<Mark | null>(null);

  useImperativeHandle(ref, () => ({
    markup: () => marksRef.current?.innerHTML ?? "",
  }));

  const pointOf = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * size.width,
      y: ((event.clientY - box.top) / box.height) * size.height,
    };
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || tool === "none" || tool === "eraser") return;
    const point = pointOf(event);
    if (tool === "text" || tool === "pin") return onPoint(point);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft(
      tool === "pen"
        ? { kind: "path", points: [point], color, width }
        : { kind: tool, from: point, to: point, color, width },
    );
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!draft) return;
    const point = pointOf(event);
    setDraft(
      draft.kind === "path"
        ? { ...draft, points: [...draft.points, point] }
        : draft.kind === "text" || draft.kind === "pin"
          ? draft
          : { ...draft, to: point },
    );
  };

  const finish = () => {
    if (draft) onAdd(draft);
    setDraft(null);
  };

  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      // A press here leaves the focus where it is, so a field the press opens keeps it.
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      className={cn(
        "absolute inset-0 size-full touch-none select-none",
        tool === "none"
          ? "pointer-events-none"
          : tool === "eraser"
            ? "cursor-pointer"
            : tool === "text"
              ? "cursor-text"
              : "cursor-crosshair",
        className,
      )}
    >
      <g ref={marksRef}>
        {marks.map((mark, index) => (
          <g
            // Marks are only added at the end or removed, so a mark keeps its place.
            key={index}
            {...(tool === "eraser" && {
              onPointerDown: () => onRemove(index),
            })}
          >
            <MarkShape mark={mark} />
          </g>
        ))}
      </g>
      {draft && <MarkShape mark={draft} />}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Turning marks into the picture the model is sent                           */
/* -------------------------------------------------------------------------- */

/**
 * A PNG the size of the picture. As a drawing it holds the marks on a clear
 * background; as a mask it is solid except where the marks are, which is the
 * area the model may change.
 */
export async function rasterize(markup: string, size: Size, mask = false) {
  const { width, height } = size;
  const body = mask
    ? `<mask id="kept"><rect width="100%" height="100%" fill="#fff"/>${markup}</mask><rect width="100%" height="100%" mask="url(#kept)"/>`
    : markup;
  const image = new window.Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}
