import { type NextRequest, NextResponse } from "next/server";
import { getPresetById } from "@/components/pages/playground/presets";
import {
  DEFAULT_CONFIG,
  type BuilderConfig,
} from "@/components/pages/playground/types";
import { decodeConfig } from "@/lib/playground-config-codec";
import { registryConfigSchema } from "@/lib/playground-config-schema";
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
      if (!registryConfigSchema.safeParse(config).success) {
        throw new Error("Invalid configuration");
      }
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
