import OpenAI from "openai";
import { ProxyAgent } from "undici";
import { readSettings } from "../storage";
import type { StoredSettings } from "../schemas";
import { createProxyFetch, resolveOpenAIProxyUrl } from "./proxy";

const proxyFetch = createProxyFetch();
export const DEFAULT_LINGLU_BASE_URL = "https://gateway.linglu.ai/v1";

export interface OpenAITransport {
  apiKey: string;
  fetch: typeof fetch;
  extraFetchOptions?: Record<string, unknown>;
  usesProxy: boolean;
}

export interface PlannerRuntime {
  provider: "openai" | "linglu";
  apiKey: string;
  apiMode: "responses" | "chat";
  model: "gpt-5.4";
  baseURL?: string;
}

export interface PlannerClient {
  client: OpenAI;
  runtime: PlannerRuntime;
}

export function resolvePlannerRuntime(
  settings: Pick<
    StoredSettings,
    "openaiApiKey" | "plannerProvider" | "lingluApiKey" | "lingluBaseUrl"
  >,
  env: NodeJS.ProcessEnv = process.env,
): PlannerRuntime {
  if (settings.plannerProvider === "linglu") {
    const apiKey = settings.lingluApiKey || env.LINGLU_API_KEY;

    if (!apiKey) {
      throw new Error(
        "还没有配置灵鹿运行时 API Key，请先在设置页保存，或设置 LINGLU_API_KEY 环境变量。",
      );
    }

    return {
      provider: "linglu",
      apiKey,
      apiMode: "chat",
      model: "gpt-5.4",
      baseURL:
        settings.lingluBaseUrl ||
        env.LINGLU_BASE_URL ||
        DEFAULT_LINGLU_BASE_URL,
    };
  }

  const apiKey = settings.openaiApiKey || env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "还没有配置 OpenAI API Key，请先在设置页保存，或设置 OPENAI_API_KEY 环境变量。",
    );
  }

  return {
    provider: "openai",
    apiKey,
    apiMode: "responses",
    model: "gpt-5.4",
  };
}

async function resolveOpenAIApiKey(baseDir?: string): Promise<string> {
  const settings = await readSettings(baseDir);
  const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "还没有配置 OpenAI API Key，请先在设置页保存，或设置 OPENAI_API_KEY 环境变量。",
    );
  }

  return apiKey;
}

async function buildTransport(apiKey: string): Promise<OpenAITransport> {
  const proxyUrl = await resolveOpenAIProxyUrl();

  if (!proxyUrl) {
    return {
      apiKey,
      fetch: globalThis.fetch.bind(globalThis) as typeof fetch,
      usesProxy: false,
    };
  }

  return {
    apiKey,
    fetch: proxyFetch,
    extraFetchOptions: {
      dispatcher: new ProxyAgent(proxyUrl),
    },
      usesProxy: true,
  };
}

export async function getOpenAITransport(
  baseDir?: string,
): Promise<OpenAITransport> {
  const apiKey = await resolveOpenAIApiKey(baseDir);
  return buildTransport(apiKey);
}

export async function getOpenAIClient(baseDir?: string): Promise<OpenAI> {
  const transport = await getOpenAITransport(baseDir);

  return new OpenAI({
    apiKey: transport.apiKey,
    timeout: 120000,
    ...(transport.usesProxy
      ? {
          fetch: transport.fetch,
          fetchOptions: transport.extraFetchOptions,
        }
      : {}),
  });
}

export async function getPlannerRuntime(baseDir?: string): Promise<PlannerRuntime> {
  const settings = await readSettings(baseDir);
  return resolvePlannerRuntime(settings);
}

export async function getPlannerClient(baseDir?: string): Promise<PlannerClient> {
  const runtime = await getPlannerRuntime(baseDir);
  const transport = await buildTransport(runtime.apiKey);

  return {
    runtime,
    client: new OpenAI({
      apiKey: runtime.apiKey,
      baseURL: runtime.baseURL,
      timeout: 120000,
      ...(transport.usesProxy
        ? {
            fetch: transport.fetch,
            fetchOptions: transport.extraFetchOptions,
          }
        : {}),
    }),
  };
}
