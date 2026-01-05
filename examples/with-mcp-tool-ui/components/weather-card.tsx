"use client";

interface WeatherData {
  location: string;
  temperature: number;
  unit: "celsius" | "fahrenheit";
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  humidity: number;
  windSpeed: number;
  windDirection: string;
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

const conditionStyles: Record<string, string> = {
  sunny: "from-amber-400 to-orange-500",
  cloudy: "from-slate-400 to-slate-600",
  rainy: "from-blue-400 to-blue-600",
  snowy: "from-slate-100 to-slate-300 text-slate-800",
  stormy: "from-slate-700 to-purple-900",
};

const conditionIcons: Record<string, string> = {
  sunny: "\u2600\uFE0F",
  cloudy: "\u2601\uFE0F",
  rainy: "\uD83C\uDF27\uFE0F",
  snowy: "\u2744\uFE0F",
  stormy: "\u26C8\uFE0F",
};

export function WeatherCard({ data }: { data: WeatherData }) {
  const bgClass = conditionStyles[data.condition] ?? conditionStyles["cloudy"];
  const icon = conditionIcons[data.condition] ?? "\uD83C\uDF24\uFE0F";
  const tempUnit = data.unit === "celsius" ? "C" : "F";

  return (
    <div
      className={`my-4 rounded-2xl bg-gradient-to-br ${bgClass} max-w-md p-6 text-white shadow-lg`}
    >
      <div className="mb-2 font-semibold text-lg">{data.location}</div>

      <div className="mb-4 flex items-center gap-4">
        <span className="text-5xl">{icon}</span>
        <div>
          <div className="font-bold text-4xl">
            {data.temperature}&deg;{tempUnit}
          </div>
          <div className="text-lg capitalize opacity-90">{data.condition}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-sm opacity-90">
        <div>
          {"\uD83D\uDCA7"} Humidity: {data.humidity}%
        </div>
        <div>
          {"\uD83D\uDCA8"} Wind: {data.windSpeed} mph {data.windDirection}
        </div>
      </div>

      {data.forecast && data.forecast.length > 0 && (
        <div className="mt-4 border-white/20 border-t pt-4">
          <div className="flex justify-between">
            {data.forecast.map((day) => (
              <div key={day.day} className="text-center text-sm">
                <div className="font-medium">{day.day}</div>
                <div>
                  {conditionIcons[day.condition] ?? "\uD83C\uDF24\uFE0F"}
                </div>
                <div className="opacity-80">
                  {day.high}&deg; / {day.low}&deg;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
