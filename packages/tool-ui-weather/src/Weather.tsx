import { CSSProperties, FC } from "react";

export declare namespace Weather {
  export interface ForecastItem {
    time: string;
    temperature: number;
    weatherIcon: "sunny" | "partly-cloudy";
  }

  export interface WeatherData {
    currentTemperature: number;
    currentWeatherIcon: string;
    weatherDescription: string;
    forecast: ForecastItem[];
  }

  export type WeatherProps = {
    data: WeatherData | undefined;
  };
}

export const Weather: FC<Weather.WeatherProps> = ({ data }) => {
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    borderRadius: "0.5rem",
    backgroundColor: "#409edc",
    padding: "1rem",
    width: "360px",
    alignSelf: "center",
    margin: "0.5rem 0",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  };

  const dateStyle: CSSProperties = {
    color: "rgba(239, 246, 255, 1)",
    marginBottom: "0.25rem",
    textTransform: "capitalize",
  };

  const temperatureContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "0.5rem",
  };

  const temperatureStyle: CSSProperties = {
    color: "rgba(239, 246, 255, 1)",
    fontSize: "3rem",
    fontWeight: "bold",
  };

  const weatherIconStyle: CSSProperties = {
    height: "2.5rem",
    width: "2.5rem",
    borderRadius: "9999px",
    backgroundColor: "#fff082",
  };

  const weatherDescriptionStyle: CSSProperties = {
    color: "rgba(239, 246, 255, 1)",
    textTransform: "capitalize",
  };

  const forecastContainerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "1rem",
    marginBottom: "1rem",
  };

  const forecastItemStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const forecastTimeStyle: CSSProperties = {
    color: "rgba(239, 246, 255, 1)",
    marginBottom: "0.5rem",
    fontSize: "0.75rem",
  };

  const forecastIconStyle: CSSProperties = {
    height: "1.5rem",
    width: "1.5rem",
    borderRadius: "9999px",
    backgroundColor: "#fff082",
  };

  const forecastTemperatureStyle: CSSProperties = {
    color: "rgba(239, 246, 255, 1)",
    marginTop: "0.25rem",
    fontSize: "0.875rem",
  };

  const cloudIconStyle: CSSProperties = {
    position: "absolute",
    right: "-0.25rem",
    bottom: "0",
    height: "0.75rem",
    width: "1rem",
    borderRadius: "9999px",
    backgroundColor: "rgb(209, 213, 219)",
  };

  if (!data) return null;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <div style={dateStyle}>
            {new Date().toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div style={temperatureContainerStyle}>
            <div style={temperatureStyle}>{data.currentTemperature}°</div>
            <div style={weatherIconStyle}></div>
          </div>
        </div>
        <div>
          <div style={weatherDescriptionStyle}>{data.weatherDescription}</div>
        </div>
      </div>
      <div style={forecastContainerStyle}>
        {data.forecast.map((item) => (
          <div key={item.time} style={forecastItemStyle}>
            <div style={forecastTimeStyle}>{item.time}</div>
            <div style={{ position: "relative" }}>
              <div style={forecastIconStyle}></div>
              {item.weatherIcon === "partly-cloudy" && (
                <div style={cloudIconStyle}></div>
              )}
            </div>
            <div style={forecastTemperatureStyle}>{item.temperature}°</div>
          </div>
        ))}
      </div>
    </div>
  );
};
