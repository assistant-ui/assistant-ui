import { useState } from "react";
import { useOverlay } from "@assistant-ui/remote-components-react";

export default function DialogTrigger() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("none");
  useOverlay(
    open,
    (o, reason) => {
      setOpen(o);
      if (!o && reason) setResult(`dismissed:${reason}`);
    },
    {
      kind: "dialog",
      src: "../confirm/",
      label: "Confirm action",
      props: {
        message: "Type a value and confirm.",
        onConfirm: async (v: string) => {
          setResult(`confirmed:${v}`);
          setOpen(false);
        },
        onCancel: async () => {
          setResult("cancelled");
          setOpen(false);
        },
      },
    },
  );
  return (
    <div style={{ padding: 4 }}>
      <button data-probe="open-dialog" onClick={() => setOpen(true)}>
        Open dialog
      </button>{" "}
      <span data-probe="result">{result}</span>
    </div>
  );
}
