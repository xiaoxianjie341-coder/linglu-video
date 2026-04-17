import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import {
  SourceProviderFailure,
  type SourceProviderResult,
} from "./types";

const XIAOHONGSHU_FETCH_ERROR =
  "无法抓取这个小红书链接，请直接粘贴正文内容。";
const execFileAsync = promisify(execFile);

interface XiaohongshuProviderDeps {
  command?: string;
  runCommand?: (
    command: string,
    args: string[],
  ) => Promise<{ stdout: string; stderr?: string }>;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pushIfString(parts: string[], value: unknown) {
  if (typeof value !== "string") {
    return;
  }

  const normalized = normalizeText(value);
  if (normalized) {
    parts.push(normalized);
  }
}

export function extractXiaohongshuText(payload: unknown): string {
  const parts: string[] = [];
  const root = payload as Record<string, unknown> | null;
  const data = (root?.data ?? root) as Record<string, unknown> | null;
  const note = (data?.note ??
    data?.noteCard ??
    data?.note_card) as Record<string, unknown> | null;

  pushIfString(parts, data?.title);
  pushIfString(parts, data?.desc);
  pushIfString(parts, data?.description);

  pushIfString(parts, note?.title);
  pushIfString(parts, note?.desc);
  pushIfString(parts, note?.description);
  pushIfString(parts, note?.content);

  return Array.from(new Set(parts)).join("\n").trim();
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

export async function fetchXiaohongshuSource(
  url: string,
  deps: XiaohongshuProviderDeps = {},
): Promise<SourceProviderResult> {
  try {
    const command = deps.command ?? process.env.XHS_COMMAND ?? "xhs";
    const runCommand = deps.runCommand ?? defaultRunCommand;
    const { stdout } = await runCommand(command, ["read", url, "--json"]);
    const payload = JSON.parse(stdout.trim()) as unknown;
    const text = extractXiaohongshuText(payload);

    return {
      provider: "xiaohongshu",
      text,
    };
  } catch (error) {
    if (error instanceof SourceProviderFailure) {
      throw error;
    }

    throw new SourceProviderFailure(
      "xiaohongshu",
      XIAOHONGSHU_FETCH_ERROR,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}
