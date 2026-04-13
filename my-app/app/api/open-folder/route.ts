import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

function resolvePathWithinProjectRoot(
  projectRoot: string,
  userPath: string,
): string | null {
  const absolutePath = path.resolve(projectRoot, userPath);
  const relative = path.relative(projectRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return absolutePath;
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This endpoint is only available in development. Run `npm run export` locally to generate production files.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const folderPath =
      typeof body?.path === "string" && body.path.trim() ? body.path : "export";

    const projectRoot = process.cwd();
    const absolutePath = resolvePathWithinProjectRoot(projectRoot, folderPath);
    if (!absolutePath) {
      return NextResponse.json(
        { success: false, error: "Invalid path" },
        { status: 400 },
      );
    }

    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isDirectory()) {
        return NextResponse.json(
          { success: false, error: "Path is not a directory" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Folder does not exist" },
        { status: 404 },
      );
    }

    const platform = process.platform;
    let command: string;
    let args: string[];

    if (platform === "darwin") {
      command = "open";
      args = [absolutePath];
    } else if (platform === "win32") {
      command = "explorer";
      args = [absolutePath];
    } else {
      command = "xdg-open";
      args = [absolutePath];
    }

    execFile(command, args, (error) => {
      if (error) {
        console.error("Failed to open folder:", error);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
