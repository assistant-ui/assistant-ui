/** Uses container queries and container units against the host's containers. */
export default function Cq() {
  return (
    <div data-probe="cq">
      <style>{`
        .cq-box { padding: 8px; background: #fde68a; }
        @container (min-width: 400px) { .cq-box { background: #a7f3d0; padding: 16px; } }
        @container panel (min-width: 450px) { .cq-title { font-size: 20px; } }
        .cq-w { width: 50cqw; height: 10px; background: #6366f1; }
      `}</style>
      <div className="cq-box">
        <div className="cq-title" data-probe="title">
          Container query
        </div>
        <div className="cq-w" data-probe="cqw" />
      </div>
    </div>
  );
}
