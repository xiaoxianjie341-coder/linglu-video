import type { GenerationRequest, RuntimePreflight, StoredSettings } from "./schemas";
import { runtimePreflightSchema } from "./schemas";
import { readSettings } from "./storage";
import {
  VIDEO_PROVIDER_IDS,
  type VideoProviderId,
} from "./video-providers/catalog";
import { resolveVideoProviderRuntime } from "./video-providers/runtime";

const OPENAI_MISSING_MESSAGE =
  "还没有配置 OpenAI API Key，请先在设置页保存，或设置 OPENAI_API_KEY 环境变量。";
const LINGLU_BLOCKED_MESSAGE =
  "当前规划器链路仅支持 OpenAI，灵鹿已预留但暂不可执行。";

function getProviderLabel(provider: VideoProviderId): string {
  if (provider === "openai") return "OpenAI";
  if (provider === "kling") return "Kling";
  return "即梦";
}

function canUseOpenAIMedia(
  settings: Pick<StoredSettings, "openaiApiKey">,
  env: NodeJS.ProcessEnv,
): boolean {
  return Boolean(settings.openaiApiKey || env.OPENAI_API_KEY);
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
  request: Pick<GenerationRequest, "videoProvider" | "videoModel"> | undefined,
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
  request?: Pick<GenerationRequest, "videoProvider" | "videoModel">,
  env: NodeJS.ProcessEnv = process.env,
): RuntimePreflight {
  const storyboardImageReady = canUseOpenAIMedia(settings, env);
  const plannerReady =
    settings.plannerProvider === "openai" && storyboardImageReady;
  const availableVideoProviders = resolveImplementedVideoProviders(settings, env);
  const requestedProviderBlockingReason = resolveRequestedProviderBlockingReason(
    settings,
    request,
    env,
  );

  let blockingReason: string | null = null;

  if (!storyboardImageReady) {
    blockingReason = OPENAI_MISSING_MESSAGE;
  } else if (settings.plannerProvider !== "openai") {
    blockingReason = LINGLU_BLOCKED_MESSAGE;
  } else if (requestedProviderBlockingReason) {
    blockingReason = requestedProviderBlockingReason;
  } else if (availableVideoProviders.length === 0) {
    blockingReason = "当前还没有可用的视频引擎。";
  }

  return runtimePreflightSchema.parse({
    plannerReady,
    storyboardImageReady,
    availableVideoProviders,
    canGenerate: blockingReason === null,
    blockingReason,
  });
}

export async function loadRuntimePreflight(
  baseDir?: string,
  request?: Pick<GenerationRequest, "videoProvider" | "videoModel">,
  env: NodeJS.ProcessEnv = process.env,
): Promise<RuntimePreflight> {
  const settings = await readSettings(baseDir);
  return resolveRuntimePreflight(settings, request, env);
}
