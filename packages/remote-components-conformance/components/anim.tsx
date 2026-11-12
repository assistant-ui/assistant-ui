/** Height animates with a CSS transition when `open` changes. */
export default function Anim({ open = false }: { open?: boolean }) {
  return (
    <div
      data-probe="anim"
      style={{
        height: open ? 160 : 40,
        transition: "height 400ms linear",
        background: "#bae6fd",
        overflow: "hidden",
      }}
    >
      Animated panel
    </div>
  );
}
