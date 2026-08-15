import { Bullet } from "diagrammatic";

export function BulletDemo() {
  return (
    <div className="mx-auto flex w-full max-w-80 flex-col gap-2">
      <Bullet value={128} target={140} bands={[60, 110, 160]} label="rev" />
      <Bullet value={104} target={90} bands={[50, 95, 160]} label="nps" />
    </div>
  );
}
