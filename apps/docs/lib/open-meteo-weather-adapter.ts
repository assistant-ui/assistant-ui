import type {
  ForecastDay,
  PrecipitationLevel,
  WeatherConditionCode,
  WeatherWidgetPayload,
} from "@/components/tool-ui/weather-widget/runtime";

export interface WeatherSearchArgs {
  query: string;
  longitude: number;
  latitude: number;
}

type GeocodeResult =
  | {
      success: true;
      result: {
        name: string;
        latitude: number;
        longitude: number;
      };
    }
  | {
      success: false;
      error: string;
    };

type WeatherResult =
  | {
      success: true;
      widget: WeatherWidgetPayload;
    }
  | {
      success: false;
      error: string;
    };

const mapOpenMeteoCodeToCondition = (
  code: number,
  windSpeed?: number,
): WeatherConditionCode => {
  if (windSpeed !== undefined && windSpeed >= 45 && code <= 3) return "windy";

  switch (code) {
    case 0:
      return "clear";
    case 1:
    case 2:
      return "partly-cloudy";
    case 3:
      return "overcast";
    case 45:
    case 48:
      return "fog";
    case 51:
    case 53:
    case 55:
      return "drizzle";
    case 56:
    case 57:
    case 66:
    case 67:
      return "sleet";
    case 61:
    case 63:
    case 80:
    case 81:
      return "rain";
    case 65:
    case 82:
      return "heavy-rain";
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return "snow";
    case 95:
      return "thunderstorm";
    case 96:
    case 99:
      return "hail";
    default:
      return "cloudy";
  }
};

const mapPrecipitationLevel = (
  precipitation?: number,
): PrecipitationLevel | undefined => {
  if (precipitation === undefined) return undefined;
  if (precipitation <= 0) return "none";
  if (precipitation < 1) return "light";
  if (precipitation < 4) return "moderate";
  return "heavy";
};

const getLocalTimeOfDay = (time?: string): number => {
  if (!time) return new Date().getHours() / 24;
  const [, rawClock = "12:00"] = time.split("T");
  const [hours = "12", minutes = "0"] = rawClock.split(":");
  const parsedHours = Number.parseInt(hours, 10);
  const parsedMinutes = Number.parseInt(minutes, 10);
  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
    return new Date().getHours() / 24;
  }
  return (parsedHours + parsedMinutes / 60) / 24;
};

const formatForecastLabel = (date: string, index: number): string => {
  if (index === 0) return "Today";
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return `Day ${index + 1}`;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(parsedDate);
};

export const geocodeLocationWithOpenMeteo = async (
  query: string,
): Promise<GeocodeResult> => {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("No results found");
    }

    return {
      success: true,
      result: data.results[0],
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to geocode location",
    };
  }
};

export const fetchWeatherWidgetFromOpenMeteo = async ({
  query,
  longitude,
  latitude,
}: WeatherSearchArgs): Promise<WeatherResult> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto&temperature_unit=fahrenheit&current=temperature_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    if (
      !current ||
      !daily?.time ||
      !daily?.weather_code ||
      !daily?.temperature_2m_max ||
      !daily?.temperature_2m_min
    ) {
      throw new Error("Invalid API response format");
    }

    const forecast: ForecastDay[] = daily.time
      .slice(0, 5)
      .map((date: string, index: number) => ({
        label: formatForecastLabel(date, index),
        conditionCode: mapOpenMeteoCodeToCondition(daily.weather_code[index]),
        tempMin: daily.temperature_2m_min[index],
        tempMax: daily.temperature_2m_max[index],
      }));

    if (forecast.length === 0) {
      throw new Error("No forecast data available");
    }

    const precipitationLevel = mapPrecipitationLevel(current.precipitation);

    return {
      success: true,
      widget: {
        version: "3.1",
        id: `docs-weather-${query.toLowerCase().replaceAll(/\W+/g, "-")}`,
        location: { name: query },
        units: { temperature: "fahrenheit" },
        current: {
          conditionCode: mapOpenMeteoCodeToCondition(
            current.weather_code,
            current.wind_speed_10m,
          ),
          temperature: current.temperature_2m,
          tempMin: daily.temperature_2m_min[0],
          tempMax: daily.temperature_2m_max[0],
          windSpeed: current.wind_speed_10m,
          ...(precipitationLevel !== undefined ? { precipitationLevel } : {}),
        },
        forecast,
        time: {
          localTimeOfDay: getLocalTimeOfDay(current.time),
        },
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch weather",
    };
  }
};
