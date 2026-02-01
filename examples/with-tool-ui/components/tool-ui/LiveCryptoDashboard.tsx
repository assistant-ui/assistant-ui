import { useEffect, useState } from "react";

export function LiveCryptoDashboard({ initialData }: { initialData: any }) {
  const [prices, setPrices] = useState<Record<string, number>>({
    BTC: initialData?.btc || 45000,
    ETH: initialData?.eth || 2500,
    SOL: initialData?.sol || 100,
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) => ({
        BTC: Math.max(1, prev.BTC + (Math.random() - 0.5) * 500),
        ETH: Math.max(1, prev.ETH + (Math.random() - 0.5) * 50),
        SOL: Math.max(1, prev.SOL + (Math.random() - 0.5) * 5),
      }));
      setLastUpdate(new Date());
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const coins = [
    { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "orange" },
    { symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "blue" },
    { symbol: "SOL", name: "Solana", icon: "◎", color: "purple" },
  ];

  return (
    <div className="rounded-lg border bg-slate-900 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-200">Live Crypto Prices</h3>
        <div className="flex items-center gap-1 text-green-600 text-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
          LIVE
        </div>
      </div>

      <div
        className="space-y-3 bg-black"
        style={{
          background: `
            radial-gradient(
              circle at center,
              rgba(6, 182, 212, 0.12) 0%,
              rgba(6, 182, 212, 0.06) 20%,
              rgba(0, 0, 0, 0.0) 60%
            )
          `,
        }}
      >
        {coins.map((coin) => (
          <div
            key={coin.symbol}
            className="flex items-center justify-between rounded bg-white/10 p-2 backdrop-blur-2xl"
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xl ${
                  coin.color === "orange"
                    ? "text-orange-500"
                    : coin.color === "blue"
                      ? "text-blue-500"
                      : "text-purple-500"
                }`}
              >
                {coin.icon}
              </span>
              <div className="flex items-center gap-2">
                <div className="font-medium text-gray-200">{coin.symbol}</div>
                <div className="text-gray-300 text-xs">{coin.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-thin text-gray-200">
                $
                {prices[coin.symbol].toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-gray-700 border-t pt-3 text-gray-400 text-xs">
        Last update: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}
