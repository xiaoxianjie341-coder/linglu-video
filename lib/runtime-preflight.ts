import type { GenerationRequest, RuntimePreflight, StoredSettings } from "./schemas";
import { runtimePreflightSchema } from "./schemas";
import { readSettings } from "./storage";
import { resolveImageGenerationRuntime, resolvePlannerRuntime } from "./openai/client";
import {
  VIDEO_PROVIDER_IDS,
  type VideoProviderId,
} from "./video-providers/catalog";
import { resolveVideoProviderRuntime } from "./video-providers/runtime";

const OPENAI_MISSING_MESSAGE =
  "还没有配置 OpenAI API Key，请先在设置页保存，或设置 OPENAI_API_KEY 环境变量。";
type VideoPreflightRequest = {
  generationMode?: "video";
  videoProvider?: VideoProviderId;
  videoModel?: string;
};

type PreflightRequest =
  | GenerationRequest
  | VideoPreflightRequest
  | undefined;

function getProviderLabel(provider: VideoProviderId): string {
  if (provider === "linglu") return "灵路";
  if (provider === "openai") return "OpenAI";
  if (provider === "kling") return "Kling";
  return "即梦";
}

function canResolveImageRuntime(
  settings: StoredSettings,
  env: NodeJS.ProcessEnv,
): boolean {
  try {
    resolveImageGenerationRuntime(settings, env);
    return true;
  } catch {
    return false;
  }
}

function canResolvePlannerRuntime(
  settings: StoredSettings,
  env: NodeJS.ProcessEnv,
): boolean {
  try {
    resolvePlannerRuntime(settings, env);
    return true;
  } catch {
    return false;
  }
}

function resolveImplementedVideoProviders(
  settings: StoredSettings,
  env: NodeJS.ProcessEnv,
): VideoProviderId[] {
  return VIDEO_PROVIDER_IDS.filter((provider) => {
    try {
      const runtime = resolveVideoProviderRuntime(
        settings,
        { videoProvider: provider },
        env,
      );
      return runtime.implemented;
    } catch {
      return false;
    }
  });
}

function resolveRequestedProviderBlockingReason(
  settings: StoredSettings,
  request: VideoPreflightRequest | undefined,
  env: NodeJS.ProcessEnv,
): string | null {
  if (!request) {
    return null;
  }

  try {
    const runtime = resolveVideoProviderRuntime(settings, request, env);
    if (runtime.implemented) {
      return null;
    }

    return `${getProviderLabel(runtime.provider)} 当前还没有真实 API 适配器。`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function resolveRuntimePreflight(
  settings: StoredSettings,
  request?: PreflightRequest,
  env: NodeJS.ProcessEnv = process.env,
): RuntimePreflight {
  const imageReady = canResolveImageRuntime(settings, env);
  const storyboardImageReady = imageReady;
  const plannerReady = canResolvePlannerRuntime(settings, env);
  const availableVideoProviders = resolveImplementedVideoProviders(settings, env);
  const videoRequest =
    !request || request.generationMode !== "image" ? request : undefined;
  const requestedProviderBlockingReason = resolveRequestedProviderBlockingReason(
    settings,
    videoRequest,
    env,
  );
  const imageBlockingReason = imageReady
    ? null
    : settings.plannerProvider === "linglu"
      ? "还没有配置灵路运行时信息，请先保存灵路配置或设置 LINGLU_API_KEY。"
      : OPENAI_MISSING_MESSAGE;

  let blockingReason: string | null = null;

  if (!imageReady) {
    blockingReason = imageBlockingReason;
  } else if (!plannerReady) {
    blockingReason =
      "还没有配置灵路运行时信息，请先保存灵路配置或设置 LINGLU_API_KEY。";
  } else if (requestedProviderBlockingReason) {
    blockingReason = requestedProviderBlockingReason;
  } else if (availableVideoProviders.length === 0) {
    blockingReason = "当前还没有可用的视频引擎。";
  }

  return runtimePreflightSchema.parse({
    plannerReady,
    storyboardImageReady,
    imageReady,
    availableVideoProviders,
    canGenerate: blockingReason === null,
    canGenerateImage: imageBlockingReason === null,
    blockingReason,
    imageBlockingReason,
  });
}

export async function loadRuntimePreflight(
  baseDir?: string,
  request?: PreflightRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<RuntimePreflight> {
  const settings = await readSettings(baseDir);
  return resolveRuntimePreflight(settings, request, env);
}
