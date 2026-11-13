"use client";

import { GenerativeWeatherCurrentDemo } from "../generative-demos";
import { DemoSurface } from "./surface";

export function AuiGenerativeUIDemo() {
  return (
    <DemoSurface>
      <div data-aui-theme="elements" className="aui-gallery scale-[0.85]">
        <GenerativeWeatherCurrentDemo />
      </div>
    </DemoSurface>
  );
}
