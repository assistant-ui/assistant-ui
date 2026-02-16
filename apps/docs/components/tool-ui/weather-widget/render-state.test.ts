import { describe, expect, it } from "vitest";
import {
  getWeatherWidgetBackgroundClass,
  getWeatherWidgetMountClass,
} from "./render-state";

describe("weather widget flash prevention", () => {
  it("keeps the widget hidden until mount is complete", () => {
    expect(getWeatherWidgetMountClass(false)).toContain("opacity-0");
    expect(getWeatherWidgetMountClass(true)).toContain("opacity-100");
  });

  it("uses a non-white dark base background class", () => {
    expect(getWeatherWidgetBackgroundClass("dark")).toContain("bg-zinc-950");
  });
});
