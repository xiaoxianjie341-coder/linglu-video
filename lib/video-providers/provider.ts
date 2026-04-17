import { readSettings } from "../storage";
import { generateOpenAIVideoFromReference } from "./openai";
import { resolveVideoProviderRuntime, type VideoProviderRuntime } from "./runtime";

type ClipSeconds = 4 | 8 | 12;

export interface GenerateVideoFromReferenceOptions {
  prompt: string;
  referencePath: string;
  outputPath: string;
  clipSeconds: ClipSeconds;
  videoProvider: "openai" | "kling" | "jimeng";
  videoModel: string;
  baseDir?: string;
}

export interface GeneratedVideoArtifact {
  provider: "openai" | "kling" | "jimeng";
  model: string;
  path: string;
  seconds: number;
  size: string;
  thumbnailPath?: string;
  jobId?: string;
}

function getVideoProviderLabel(provider: VideoProviderRuntime["provider"]): string {
  if (provider === "kling") {
    return "Kling";
  }
  if (provider === "jimeng") {
    return "即梦";
  }
  return "OpenAI";
}

export function assertVideoProviderImplemented(runtime: VideoProviderRuntime): void {
  if (runtime.implemented) {
    return;
  }

  const label = getVideoProviderLabel(runtime.provider);

  throw new Error(
    `${label} 图参考视频已预留接入位，API Key / Base URL 已可配置；当前仍是待补 API 适配器状态。你拿到 ${label} 的 API 文档后，我可以直接把 provider 实现接进去。`,
  );
}

export async function generateVideoFromReference(
  options: GenerateVideoFromReferenceOptions,
): Promise<GeneratedVideoArtifact> {
  const settings = await readSettings(options.baseDir);
  const runtime = resolveVideoProviderRuntime(
    settings,
    {
      videoProvider: options.videoProvider,
      videoModel: options.videoModel,
    },
  );

  assertVideoProviderImplemented(runtime);

  const artifact = await generateOpenAIVideoFromReference(
    options.prompt,
    options.referencePath,
    options.outputPath,
    options.clipSeconds,
    runtime.model,
    options.baseDir,
  );

  return {
    provider: runtime.provider,
    model: runtime.model,
    path: artifact.path,
    seconds: artifact.seconds,
    size: artifact.size,
    thumbnailPath: artifact.thumbnailPath,
    jobId: artifact.jobId,
  };
}
