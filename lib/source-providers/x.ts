import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import {
  SourceProviderFailure,
  type SourceProviderResult,
} from "./types";

const X_FETCH_ERROR = "无法抓取这个 X 链接，请直接粘贴正文内容。";
const execFileAsync = promisify(execFile);

interface XProviderDeps {
  scriptPath?: string;
  runCommand?: (
    command: string,
    args: string[],
  ) => Promise<{ stdout: string; stderr?: string }>;
  readFile?: (path: string, encoding: BufferEncoding) => Promise<string>;
}

function resolveDefaultScriptPath(): string {
  const home = process.env.HOME?.trim();

  if (!home) {
    throw new SourceProviderFailure(
      "x",
      X_FETCH_ERROR,
      "HOME is not set, so the X extraction script cannot be resolved",
    );
  }

  return path.join(
    home,
    ".claude/skills/baoyu-danger-x-to-markdown/scripts/main.ts",
  );
}

async function defaultRunCommand(command: string, args: string[]) {
  const result = await execFileAsync(command, args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 20_000,
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function extractXMarkdownText(markdown: string): string {
  return markdown.replace(/^---[\s\S]*?\n---\s*/u, "").trim();
}

export async function fetchXSource(
  url: string,
  deps: XProviderDeps = {},
): Promise<SourceProviderResult> {
  try {
    const scriptPath = deps.scriptPath ?? resolveDefaultScriptPath();
    const runCommand = deps.runCommand ?? defaultRunCommand;
    const readMarkdown = deps.readFile ?? readFile;

    const { stdout } = await runCommand("npx", [
      "-y",
      "bun",
      scriptPath,
      url,
      "--json",
    ]);

    const payload = JSON.parse(stdout.trim()) as {
      markdownPath?: string;
    };

    if (!payload.markdownPath) {
      throw new Error("X provider output did not include markdownPath");
    }

    const markdown = await readMarkdown(payload.markdownPath, "utf8");

    return {
      provider: "x",
      text: extractXMarkdownText(markdown),
    };
  } catch (error) {
    if (error instanceof SourceProviderFailure) {
      throw error;
    }

    throw new SourceProviderFailure(
      "x",
      X_FETCH_ERROR,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}
