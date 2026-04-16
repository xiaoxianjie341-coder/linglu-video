import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  FormData as UndiciFormData,
  Response as UndiciResponse,
  fetch as undiciFetch,
} from "undici";

const execFileAsync = promisify(execFile);

const ENV_PROXY_KEYS = [
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
  "ALL_PROXY",
  "all_proxy",
] as const;

type ProxyEnv = Record<string, string | undefined>;

function buildProxyUrl(
  enabled: string | undefined,
  host: string | undefined,
  port: string | undefined,
): string | null {
  if (enabled !== "1" || !host || !port) {
    return null;
  }

  return `http://${host}:${port}`;
}

export function resolveProxyUrlFromEnv(
  env: ProxyEnv = process.env,
): string | null {
  for (const key of ENV_PROXY_KEYS) {
    const value = env[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function parseScutilProxyOutput(output: string): string | null {
  const values: Record<string, string> = {};

  for (const line of output.split("\n")) {
    const match = line.match(/^\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*(.+?)\s*$/);

    if (match) {
      values[match[1]] = match[2];
    }
  }

  return (
    buildProxyUrl(
      values.HTTPSEnable,
      values.HTTPSProxy,
      values.HTTPSPort,
    ) ?? buildProxyUrl(values.HTTPEnable, values.HTTPProxy, values.HTTPPort)
  );
}

function toUndiciBody(body: unknown): unknown {
  if (typeof FormData === "undefined" || !(body instanceof FormData)) {
    return body;
  }

  const converted = new UndiciFormData();

  for (const [key, value] of body.entries()) {
    if (typeof value === "string") {
      converted.append(key, value);
    } else {
      converted.append(key, value as never);
    }
  }

  return converted;
}

export function createProxyFetch(): typeof fetch & { Response: typeof Response } {
  const proxyFetch = ((
    input: string | URL | Request,
    init?: RequestInit,
  ) =>
    undiciFetch(
      typeof input === "string" || input instanceof URL ? input : input.url,
      init
        ? ({
            ...(init as Parameters<typeof undiciFetch>[1]),
            body: toUndiciBody(init.body),
          } as Parameters<typeof undiciFetch>[1])
        : undefined,
    ) as unknown as ReturnType<typeof fetch>) as typeof fetch & {
    Response: typeof Response;
  };

  proxyFetch.Response = class ProxyFetchResponse extends UndiciResponse {
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(
        toUndiciBody(body) as ConstructorParameters<typeof UndiciResponse>[0],
        init as ConstructorParameters<typeof UndiciResponse>[1],
      );
    }
  } as unknown as typeof Response;

  return proxyFetch;
}

async function resolveMacSystemProxyUrl(): Promise<string | null> {
  if (process.platform !== "darwin") {
    return null;
  }

  try {
    const { stdout } = await execFileAsync("scutil", ["--proxy"], {
      encoding: "utf8",
    });

    return parseScutilProxyOutput(String(stdout));
  } catch {
    return null;
  }
}

export async function resolveOpenAIProxyUrl(): Promise<string | null> {
  return resolveProxyUrlFromEnv() ?? (await resolveMacSystemProxyUrl());
}
