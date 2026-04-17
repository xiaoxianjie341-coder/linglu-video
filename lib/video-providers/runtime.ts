import type { StoredSettings } from "../schemas";
import { getDefaultVideoModel, type VideoProviderId } from "./catalog";

type VideoSettings = Pick<
  StoredSettings,
  | "openaiApiKey"
  | "klingApiKey"
  | "klingBaseUrl"
  | "jimengApiKey"
  | "jimengBaseUrl"
>;

interface VideoSelection {
  videoProvider?: VideoProviderId;
  videoModel?: string;
}

export interface VideoProviderRuntime {
  provider: VideoProviderId;
  apiKey: string;
  model: string;
  implemented: boolean;
  baseURL?: string;
}

export function resolveVideoProviderRuntime(
  settings: VideoSettings,
  selection: VideoSelection,
  env: NodeJS.ProcessEnv = process.env,
): VideoProviderRuntime {
  const provider = selection.videoProvider ?? "openai";
  const model = selection.videoModel?.trim() || getDefaultVideoModel(provider);

  if (provider === "openai") {
    const apiKey = settings.openaiApiKey || env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "还没有配置 OpenAI API Key，请先在设置页保存，或设置 OPENAI_API_KEY 环境变量。",
      );
    }

    return {
      provider,
      apiKey,
      model,
      implemented: true,
    };
  }

  if (provider === "kling") {
    const apiKey = settings.klingApiKey || env.KLING_API_KEY;

    if (!apiKey) {
      throw new Error(
        "还没有配置 Kling API Key，请先在设置页保存，或设置 KLING_API_KEY 环境变量。",
      );
    }

    return {
      provider,
      apiKey,
      baseURL: settings.klingBaseUrl || env.KLING_BASE_URL || undefined,
      model,
      implemented: false,
    };
  }

  const apiKey = settings.jimengApiKey || env.JIMENG_API_KEY;

  if (!apiKey) {
    throw new Error(
      "还没有配置即梦 API Key，请先在设置页保存，或设置 JIMENG_API_KEY 环境变量。",
    );
  }

  return {
    provider: "jimeng",
    apiKey,
    baseURL: settings.jimengBaseUrl || env.JIMENG_BASE_URL || undefined,
    model,
    implemented: false,
  };
}
