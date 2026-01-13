import { NextRequest, NextResponse } from "next/server";
import { exportWidget, createDefaultExportConfig } from "@/lib/export";
import type { ExportConfig } from "@/lib/export";
import path from "node:path";

export const runtime = "nodejs";

function isPathWithinProjectRoot(
  projectRoot: string,
  userPath: string,
): boolean {
  const absolutePath = path.resolve(projectRoot, userPath);
  const relative = path.relative(projectRoot, absolutePath);
  return !(relative.startsWith("..") || path.isAbsolute(relative));
}

export interface ExportRequestBody {
  widgetEntryPoint?: string;
  widgetExportName?: string;
  widgetName?: string;
  outputDir?: string;
  inline?: boolean;
  manifest?: {
    name?: string;
    description?: string;
    version?: string;
    author?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        {
          success: false,
          errors: [
            "This endpoint is only available in development. Use `npm run export` locally to generate production files.",
          ],
        },
        { status: 403 },
      );
    }

    const body: ExportRequestBody = await request.json();

    const widgetEntryPoint =
      body.widgetEntryPoint ?? "lib/workbench/wrappers/poi-map-sdk.tsx";
    const widgetExportName = body.widgetExportName ?? "POIMapSDK";
    const widgetName = body.widgetName ?? "My ChatGPT App";
    const outputDir = body.outputDir ?? "export";

    const projectRoot = process.cwd();
    if (!isPathWithinProjectRoot(projectRoot, widgetEntryPoint)) {
      return NextResponse.json(
        { success: false, errors: ["Invalid widgetEntryPoint path"] },
        { status: 400 },
      );
    }
    if (!isPathWithinProjectRoot(projectRoot, outputDir)) {
      return NextResponse.json(
        { success: false, errors: ["Invalid outputDir path"] },
        { status: 400 },
      );
    }

    const config: ExportConfig = {
      ...createDefaultExportConfig(widgetEntryPoint, widgetName),
      widget: {
        entryPoint: widgetEntryPoint,
        exportName: widgetExportName,
        name: widgetName,
      },
      output: {
        dir: outputDir,
        inline: body.inline ?? false,
      },
    };

    if (body.manifest) {
      config.manifest = {
        ...config.manifest,
        ...body.manifest,
      };
    }

    const result = await exportWidget({
      config,
      projectRoot,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      outputDir: result.outputDir,
      files: result.files.map((f) => ({
        relativePath: f.relativePath,
        size: f.size,
      })),
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("Export error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        errors: [message],
      },
      { status: 500 },
    );
  }
}
