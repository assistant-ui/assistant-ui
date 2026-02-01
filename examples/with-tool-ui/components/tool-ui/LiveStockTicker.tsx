import { useEffect, useState } from "react";

export function LiveStockTicker({ initialData }: { initialData: any }) {
  const [price, setPrice] = useState(parseFloat(initialData?.price || "100"));
  const [priceHistory, setPriceHistory] = useState<number[]>([
    parseFloat(initialData?.price || "100"),
  ]);
  const [tickCount, setTickCount] = useState(0);

  const basePrice = parseFloat(initialData?.price || "100");

  // LIVE UPDATES
  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((prev) => {
        // Random walk: small movements up/down
        const movement = (Math.random() - 0.5) * 2;
        const newPrice = Math.max(1, prev + movement);
        setPriceHistory((hist) => [...hist.slice(-30), newPrice]);
        return newPrice;
      });
      setTickCount((t) => t + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const currentChange = price - basePrice;
  const currentChangePercent = (currentChange / basePrice) * 100;
  const isPriceUp = currentChange >= 0;

  // Mini chart
  const minPrice = Math.min(...priceHistory);
  const maxPrice = Math.max(...priceHistory);
  const range = maxPrice - minPrice || 1;

  return (
    <div
      className="rounded-lg border p-4 shadow-sm"
      style={{
        background: `
        repeating-linear-gradient(
          60deg,
          transparent 0px,
          transparent 1px,
          rgba(255, 255, 255, 0.05) 1px,
          rgba(255, 255, 255, 0.05) 2px
        ),
        repeating-linear-gradient(
          -60deg,
          transparent 0px,
          transparent 1px,
          rgba(255, 255, 255, 0.05) 1px,
          rgba(255, 255, 255, 0.05) 2px
        ),
        linear-gradient(
          60deg,
          rgba(43, 108, 176, 0.4) 0%,
          rgba(72, 126, 176, 0.4) 33%,
          rgba(95, 142, 176, 0.4) 66%,
          rgba(116, 157, 176, 0.4) 100%
        ),
        radial-gradient(
          circle at 50% 50%,
          rgba(255, 255, 255, 0.2) 0%,
          transparent 50%
        )
      `,
        backgroundBlendMode: "overlay, overlay, normal, screen",
        animation: "crystal-shimmer 15s ease-in-out infinite",
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1 text-xs">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-600"></span>
              <span className="font-medium text-green-600">LIVE</span>
              <span className="text-gray-600">• {tickCount} updates</span>
            </div>
          </div>
        </div>
        <div
          className={`rounded px-2 py-1 font-medium text-sm transition-colors ${
            isPriceUp
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isPriceUp ? "▲" : "▼"} {Math.abs(currentChangePercent).toFixed(2)}%
        </div>
      </div>

      {/* Live Price with flash effect */}
      <div className="mb-3">
        <span
          className={`font-bold text-3xl transition-colors duration-150 ${
            tickCount % 2 === 0
              ? "text-gray-900"
              : isPriceUp
                ? "text-green-600"
                : "text-red-700"
          }`}
        >
          ${price.toFixed(2)}
        </span>
        <span
          className={`ml-2 text-sm ${isPriceUp ? "text-green-600" : "text-red-600"}`}
        >
          {isPriceUp ? "+" : ""}
          {currentChange.toFixed(2)} today
        </span>
      </div>

      {/* Live Sparkline Chart */}
      <div className="mb-3 flex h-16 items-end gap-0.5 rounded bg-gray-700 p-2">
        {priceHistory.map((p, i) => {
          const height = ((p - minPrice) / range) * 100;
          const isLast = i === priceHistory.length - 1;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all duration-300 ${
                isLast
                  ? isPriceUp
                    ? "bg-green-500"
                    : "bg-red-500"
                  : isPriceUp
                    ? "bg-green-500"
                    : "bg-red-500"
              }`}
              style={{ height: `${Math.max(5, height)}%` }}
            />
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 border-gray-100 border-t pt-3 text-gray-800 text-xs">
        <div>Open: ${basePrice.toFixed(2)}</div>
        <div>High: ${maxPrice.toFixed(2)}</div>
        <div>Low: ${minPrice.toFixed(2)}</div>
      </div>
    </div>
  );
}
