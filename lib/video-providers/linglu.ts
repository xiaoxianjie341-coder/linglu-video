import { readFile, writeFile } from "node:fs/promises";
import { normalizeLandscapeStoryboardImage } from "../openai/image";
import type { VideoProviderRuntime } from "./runtime";

const VIDEO_POLL_INTERVAL_MS = 10_000;

type ClipSeconds = 4 | 8 | 12;

interface LingluVideoJob {
  id?: string;
  status?: string;
  progress?: number;
  error?: { message?: string | null } | null;
  message?: string | null;
  seconds?: string | number;
  data?: Array<{ url?: string | null }>;
}

export interface LingluVideoArtifact {
  path: string;
  seconds: number;
  size: string;
  thumbnailPath?: string;
  jobId?: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function ensureDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function toVideoSecondsLiteral(seconds: ClipSeconds): "4" | "8" | "12" {
  return String(seconds) as "4" | "8" | "12";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonResponse(response: Response): Promise<LingluVideoJob> {
  const raw = await response.text();
  return raw ? (JSON.parse(raw) as LingluVideoJob) : {};
}

async function fetchLinglu(
  runtime: VideoProviderRuntime,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseURL = trimTrailingSlash(runtime.baseURL ?? "https://test.linglu.ai/v1");

  return fetch(`${baseURL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${runtime.apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

async function createVideoJob(
  runtime: VideoProviderRuntime,
  prompt: string,
  referenceDataUrl: string,
  clipSeconds: ClipSeconds,
): Promise<LingluVideoJob> {
  const response = await fetchLinglu(runtime, "/videos", {
    method: "POST",
    body: JSON.stringify({
      model: runtime.model,
      model_name: runtime.model,
      prompt,
      size: "1280x720",
      seconds: toVideoSecondsLiteral(clipSeconds),
      input_reference: {
        image_url: referenceDataUrl,
      },
    }),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        payload.message ||
        `灵路视频任务创建失败（${response.status}）。`,
    );
  }

  return payload;
}

async function retrieveVideoJob(
  runtime: VideoProviderRuntime,
  videoId: string,
): Promise<LingluVideoJob> {
  const response = await fetchLinglu(runtime, `/videos/${encodeURIComponent(videoId)}`);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        payload.message ||
        `灵路视频任务查询失败（${response.status}）。`,
    );
  }

  return payload;
}

async function downloadBinary(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`灵路视频结果下载失败（${response.status}）。`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function downloadVideoContent(
  runtime: VideoProviderRuntime,
  job: LingluVideoJob,
): Promise<Buffer> {
  const videoUrl = job.data?.find((item) => item.url)?.url;

  if (videoUrl) {
    return downloadBinary(videoUrl);
  }

  if (!job.id) {
    throw new Error("灵路视频任务没有返回任务 ID。");
  }

  const response = await fetchLinglu(
    runtime,
    `/videos/${encodeURIComponent(job.id)}/content`,
  );

  if (!response.ok) {
    throw new Error(`灵路视频结果下载失败（${response.status}）。`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function generateLingluVideoFromReference(
  prompt: string,
  referencePath: string,
  outputPath: string,
  clipSeconds: ClipSeconds,
  runtime: VideoProviderRuntime,
): Promise<LingluVideoArtifact> {
  const referenceBuffer = await normalizeLandscapeStoryboardImage(
    await readFile(referencePath),
  );
  const referenceDataUrl = ensureDataUrl(referenceBuffer, "image/png");

  let job = await createVideoJob(runtime, prompt, referenceDataUrl, clipSeconds);

  if (!job.id && !job.data?.some((item) => item.url)) {
    throw new Error("灵路视频任务创建成功，但没有返回任务 ID。");
  }

  while (job.id && (job.status === "queued" || job.status === "in_progress")) {
    await sleep(VIDEO_POLL_INTERVAL_MS);
    job = await retrieveVideoJob(runtime, job.id);
  }

  if (job.status && job.status !== "completed") {
    throw new Error(job.error?.message || job.message || `视频 ${outputPath} 生成失败。`);
  }

  const videoBuffer = await downloadVideoContent(runtime, job);
  await writeFile(outputPath, videoBuffer);

  return {
    path: outputPath,
    seconds: Number(job.seconds ?? clipSeconds),
    size: "1280x720",
    jobId: job.id,
  };
}
