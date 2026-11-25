"use client";

import { useEffect, useState, type RefObject } from "react";

type Box = {
  key: string;
  name: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

/** A part's `data-slot` as the component it names in the file: "user-message" is `UserMessage`. */
export const componentName = (slot: string) =>
  slot
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

function measure(root: HTMLElement): Box[] {
  const origin = root.getBoundingClientRect();
  return [...root.querySelectorAll<HTMLElement>("[data-slot]")].flatMap(
    (element, index) => {
      const rect = element.getBoundingClientRect();
      const slot = element.dataset["slot"];
      if (!slot || rect.width === 0 || rect.height === 0) return [];
      return [
        {
          key: `${slot}-${index}`,
          name: componentName(slot),
          top: rect.top - origin.top,
          left: rect.left - origin.left,
          width: rect.width,
          height: rect.height,
        },
      ];
    },
  );
}

/**
 * Outlines every `data-slot` part inside `container` and names its component.
 * It sits beside the container rather than in it, so drawing the outlines does
 * not count as a change to what it watches.
 */
export function PartsOverlay({
  container,
  onSelect,
}: {
  container: RefObject<HTMLElement | null>;
  onSelect: (name: string) => void;
}) {
  const [boxes, setBoxes] = useState<Box[]>([]);

  useEffect(() => {
    const root = container.current;
    if (!root) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setBoxes(measure(root)));
    };

    update();
    const resize = new ResizeObserver(update);
    resize.observe(root);
    const mutation = new MutationObserver(update);
    mutation.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    root.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      root.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [container]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {boxes.map((box) => (
        <div
          key={box.key}
          className="absolute rounded-md"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            boxShadow: "inset 0 0 0 1px var(--color-blue-500)",
          }}
        >
          <button
            type="button"
            onClick={() => onSelect(box.name)}
            aria-label={`Show ${box.name} in the code`}
            className="pointer-events-auto absolute right-1.5 rounded-sm bg-blue-600 px-1.5 py-px font-mono text-[11px] font-medium text-white"
            style={{ top: box.top < 10 ? 4 : -9 }}
          >
            {box.name}
          </button>
        </div>
      ))}
    </div>
  );
}
