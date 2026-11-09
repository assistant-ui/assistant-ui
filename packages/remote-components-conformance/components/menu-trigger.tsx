import { useRef, useState } from "react";
import { useOverlay } from "@assistant-ui/remote-components-react";

export default function MenuTrigger({
  align = "left",
  items = ["Apple", "Banana", "Cherry", "Dragonfruit"],
  side = "bottom",
  offset,
  label,
}: {
  align?: "left" | "right";
  items?: string[];
  /** These can change while the menu is open (overlay-popover-options). */
  side?: "top" | "bottom";
  offset?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("none");
  const [lastReason, setLastReason] = useState("");
  const ref = useRef<HTMLButtonElement>(null);
  useOverlay(
    open,
    (o, reason) => {
      setOpen(o);
      if (reason) setLastReason(reason);
    },
    {
      kind: "popover",
      src: "../menu/",
      anchorRef: ref,
      placement: { side, align: "start" },
      ...(offset !== undefined ? { offset } : {}),
      ...(label !== undefined ? { label } : {}),
      matchAnchorWidth: true,
      props: {
        items,
        onSelect: async (item: string) => {
          setSelected(item);
          setOpen(false);
        },
      },
    },
  );
  return (
    <div style={{ textAlign: align, padding: 4 }}>
      <button ref={ref} data-probe="trigger" onClick={() => setOpen((o) => !o)}>
        Open menu
      </button>
      <div>
        Selected: <span data-probe="selected">{selected}</span>{" "}
        <span data-probe="reason">{lastReason}</span>
      </div>
    </div>
  );
}
