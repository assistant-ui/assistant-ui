import { NextRequest, NextResponse } from "next/server";
import { getPresetById } from "@/components/builder/presets";
import { DEFAULT_CONFIG, type BuilderConfig } from "@/components/builder/types";
import { decodeConfig } from "@/lib/playground-url-state";
import { generateRegistryJson } from "@/lib/playground-registry";

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const presetId = searchParams.get("preset");
  const configEncoded = searchParams.get("c");

  let config: BuilderConfig;

  if (presetId) {
    const preset = getPresetById(presetId);
    if (!preset) {
      return NextResponse.json(
        { error: `Preset "${presetId}" not found` },
        { status: 404 },
      );
    }
    config = preset.config;
  } else if (configEncoded) {
    try {
      config = decodeConfig(configEncoded);
    } catch {
      return NextResponse.json(
        { error: "Invalid configuration encoding" },
        { status: 400 },
      );
    }
  } else {
    config = DEFAULT_CONFIG;
  }

  const registryJson = generateRegistryJson(config);

  return NextResponse.json(registryJson, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
