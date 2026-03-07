import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Per-tool env vars ────────────────────────────────────────────────────────

interface ToolDef {
  appName: string;
  env: Record<string, string>;
  paths: {
    darwin: string[];
    win32: string[];
    linux: string[];
  };
}

const TOOLS: Record<string, ToolDef> = {
  claude: {
    appName: "Claude",
    env: {
      ANTHROPIC_BASE_URL: "http://localhost:1455/api/v1/anthropic",
      ANTHROPIC_API_KEY: "sk-proxy-intern-hopper",
    },
    paths: {
      darwin: [
        "/Applications/Claude.app/Contents/MacOS/Claude",
      ],
      win32: [
        `${process.env.LOCALAPPDATA ?? ""}\\Programs\\Claude\\Claude.exe`,
        `${process.env.LOCALAPPDATA ?? ""}\\Claude\\Claude.exe`,
      ],
      linux: [
        "/usr/bin/claude-desktop",
        "/usr/local/bin/claude-desktop",
        "/opt/Claude/claude-desktop",
      ],
    },
  },
  codex: {
    appName: "Codex",
    env: {
      OPENAI_BASE_URL: "http://localhost:1455/api/v1/openai",
      OPENAI_API_KEY: "sk-proxy-intern-hopper",
    },
    paths: {
      darwin: [
        "/Applications/Codex.app/Contents/MacOS/Codex",
      ],
      win32: [
        `${process.env.LOCALAPPDATA ?? ""}\\Programs\\Codex\\Codex.exe`,
        `${process.env.LOCALAPPDATA ?? ""}\\Codex\\Codex.exe`,
      ],
      linux: [
        "/usr/bin/codex",
        "/usr/local/bin/codex",
        "/opt/Codex/codex",
      ],
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

type SupportedPlatform = "darwin" | "win32" | "linux";

function currentPlatform(): SupportedPlatform | null {
  const os = platform();
  if (os === "darwin" || os === "win32" || os === "linux") return os;
  return null;
}

function findBinary(tool: ToolDef, os: SupportedPlatform): string | null {
  for (const candidate of tool.paths[os]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function launchApp(binary: string, env: Record<string, string>, os: SupportedPlatform): void {
  const mergedEnv = { ...process.env, ...env };

  if (os === "darwin" || os === "linux") {
    const child = spawn(binary, [], {
      env: mergedEnv,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } else {
    // Windows: use cmd /c start to detach properly
    const child = spawn("cmd", ["/c", "start", "", binary], {
      env: mergedEnv,
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    child.unref();
  }
}

// ── Route ────────────────────────────────────────────────────────────────────

function isToolName(value: unknown): value is string {
  return typeof value === "string" && value in TOOLS;
}

export async function GET(): Promise<NextResponse> {
  const os = currentPlatform();
  if (!os) {
    return NextResponse.json({ platform: platform(), tools: {} });
  }

  const result: Record<string, { appName: string; installed: boolean }> = {};
  for (const [id, tool] of Object.entries(TOOLS)) {
    result[id] = {
      appName: tool.appName,
      installed: findBinary(tool, os) !== null,
    };
  }

  return NextResponse.json({ platform: os, tools: result });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();

  const toolName: unknown = body.tool;
  if (!isToolName(toolName)) {
    return NextResponse.json(
      { error: `Invalid tool. Must be one of: ${Object.keys(TOOLS).join(", ")}` },
      { status: 400 },
    );
  }

  const os = currentPlatform();
  if (!os) {
    return NextResponse.json(
      { error: `Unsupported platform: ${platform()}` },
      { status: 400 },
    );
  }

  const tool = TOOLS[toolName];
  const binary = findBinary(tool, os);

  if (!binary) {
    return NextResponse.json(
      { error: `${tool.appName} not found. Checked: ${tool.paths[os].join(", ")}` },
      { status: 404 },
    );
  }

  try {
    launchApp(binary, tool.env, os);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[launch] Failed to spawn ${tool.appName}:`, err);
    return NextResponse.json(
      { error: `Failed to launch ${tool.appName}` },
      { status: 500 },
    );
  }
}
