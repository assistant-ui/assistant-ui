import { useState } from "react";

/** Overlay content for a dialog. */
export default function Confirm({
  message = "Are you sure?",
  onConfirm,
  onCancel,
}: {
  message?: string;
  onConfirm?: (value: string) => Promise<void>;
  onCancel?: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  return (
    <div
      style={{
        background: "Canvas",
        color: "CanvasText",
        padding: 16,
        borderRadius: 8,
        width: 280,
      }}
    >
      <p style={{ marginTop: 0 }}>{message}</p>
      <input
        data-probe="dialog-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type here"
      />
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button data-probe="ok" onClick={() => void onConfirm?.(value)}>
          OK
        </button>
        <button data-probe="cancel" onClick={() => void onCancel?.()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
