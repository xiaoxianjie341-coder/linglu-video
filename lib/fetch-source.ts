import {
  SourceProviderFailure,
  type SourceProviderKind,
  type SourceProviderRuntime,
} from "./source-providers/types";
import { fetchPlainWebSource } from "./source-providers/plain-web";
import { fetchXSource } from "./source-providers/x";
import { fetchXiaohongshuSource } from "./source-providers/xiaohongshu";

const INVALID_URL_ERROR = "无效的公开链接。";
const EMPTY_FETCH_ERROR = "抓取结果为空。";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseUrl(sourceInput: string): URL {
  try {
    return new URL(sourceInput);
  } catch (error) {
    throw new SourceProviderFailure(
      "plain-web",
      INVALID_URL_ERROR,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}

function isHost(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

export function detectSourceProviderKind(sourceInput: string): SourceProviderKind {
  const url = parseUrl(sourceInput);
  const hostname = url.hostname.toLowerCase();

  if (isHost(hostname, "x.com") || isHost(hostname, "twitter.com")) {
    return "x";
  }

  if (isHost(hostname, "xiaohongshu.com") || isHost(hostname, "xhslink.com")) {
    return "xiaohongshu";
  }

  return "plain-web";
}

const defaultRuntime: SourceProviderRuntime = {
  plainWeb: fetchPlainWebSource,
  x: fetchXSource,
  xiaohongshu: fetchXiaohongshuSource,
};

function getProvider(
  providerKind: SourceProviderKind,
  runtime: SourceProviderRuntime,
) {
  switch (providerKind) {
    case "plain-web":
      return runtime.plainWeb;
    case "x":
      return runtime.x;
    case "xiaohongshu":
      return runtime.xiaohongshu;
  }
}

export async function fetchSourceContent(
  sourceType: "text" | "url",
  sourceInput: string,
  runtime: SourceProviderRuntime = defaultRuntime,
): Promise<string> {
  if (sourceType === "text") {
    return normalizeText(sourceInput);
  }

  const providerKind = detectSourceProviderKind(sourceInput);
  const provider = getProvider(providerKind, runtime);
  const result = await provider(sourceInput);
  const text = normalizeText(result.text);

  if (!text) {
    throw new SourceProviderFailure(
      providerKind,
      EMPTY_FETCH_ERROR,
      `${providerKind} provider returned empty text`,
    );
  }

  return text;
}

export { SourceProviderFailure, type SourceProviderRuntime } from "./source-providers/types";
