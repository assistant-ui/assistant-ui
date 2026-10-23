import { Sparkline } from "diagrammatic";

const DATA = [3, 5, 4, 7, 6, 9, 8, 11, 10, 13];

export default function SparklineSizes() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs">
        12px text <Sparkline data={DATA} />
      </p>
      <p className="text-base">
        16px text <Sparkline data={DATA} />
      </p>
      <p className="text-2xl">
        24px text <Sparkline data={DATA} />
      </p>
      <p className="text-sm">
        A fixed size <Sparkline data={DATA} width={120} height={32} />
      </p>
    </div>
  );
}
