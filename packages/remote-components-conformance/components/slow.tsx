// The page cannot hold back its reveal: the remote server delays this
// page's document (`?delay=ms`, default 1200; serve-pages.ts), so the host
// shows its fallback for a while.
export default function Slow() {
  return (
    <div data-probe="slow" style={{ padding: 8, background: "#ddd6fe" }}>
      Loaded slowly
    </div>
  );
}
