import { RemoteComponent } from "@assistant-ui/remote-components-host-react";

/**
 * A remote that is itself a host: renders another remote inside. The inner
 * remote is on http://localhost:5181, a different origin from the outer
 * one (127.0.0.1:5181) and from the conformance host (localhost:5180).
 */
export default function Nest({
  inner = "card",
  body = "Inner remote body text that wraps.",
}: {
  inner?: string;
  body?: string;
}) {
  return (
    <div
      data-probe="nest"
      style={{
        padding: 8,
        border: "1px solid #94a3b8",
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <span data-probe="label">Outer</span>
      <RemoteComponent
        src={`http://localhost:5181/${inner}/`}
        style={{ flex: 1 }}
        body={body}
      />
    </div>
  );
}
