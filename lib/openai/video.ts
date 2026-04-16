import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunStatus, VideoAsset } from "../schemas";
import { getRunsDir, writeVideoArtifact } from "../storage";
import { getOpenAIClient, getOpenAITransport } from "./client";

type OpenAIVideoJob = {
  id?: string;
  status?: string;
  progress?: number;
  error?: { message?: string | null } | null;
  seconds?: string | number;
};

function toDataUrl(buffer: Buffer, filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const mimeType =
    extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : extension === "webp"
        ? "image/webp"
        : "image/png";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeVideoSeconds(seconds: number): "4" | "8" | "12" {
  if (seconds <= 4) return "4";
  if (seconds <= 8) return "8";
  return "12";
}

export function mapVideoStatus(job: OpenAIVideoJob): RunStatus {
  if (job.status === "completed") return "completed";
  if (job.status === "failed") return "failed";
  if (job.status === "in_progress") return "videoing";
  return "queued";
}

interface BuildVideoCreateBodyOptions {
  prompt: string;
  imageUrl: string;
  model: "sora-2" | "sora-2-pro";
  seconds: number;
}

export function buildVideoCreateBody({
  prompt,
  imageUrl,
  model,
  seconds,
}: BuildVideoCreateBodyOptions) {
  return {
    model,
    prompt,
    size: "720x1280" as const,
    seconds: normalizeVideoSeconds(seconds),
    input_reference: {
      image_url: imageUrl,
    },
  };
}

async function createVideoJob(
  body: ReturnType<typeof buildVideoCreateBody>,
  baseDir?: string,
): Promise<OpenAIVideoJob> {
  const transport = await getOpenAITransport(baseDir);
  const response = await transport.fetch(
    "https://api.openai.com/v1/videos",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${transport.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      ...(transport.extraFetchOptions ?? {}),
    } as RequestInit,
  );
  const raw = await response.text();

  if (!response.ok) {
    let message = `视频生成失败（${response.status}）`;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          error?: { message?: string | null } | null;
          message?: string | null;
        };
        message = parsed.error?.message || parsed.message || raw;
      } catch {
        message = raw;
      }
    }

    throw new Error(message);
  }

  return JSON.parse(raw) as OpenAIVideoJob;
}

interface GenerateVideoOptions {
  runId: string;
  prompt: string;
  storyboardPath: string;
  videoModel: "sora-2" | "sora-2-pro";
  videoSeconds: number;
  baseDir?: string;
}

export async function generateVideoFromStoryboard({
  runId,
  prompt,
  storyboardPath,
  videoModel,
  videoSeconds,
  baseDir,
}: GenerateVideoOptions): Promise<VideoAsset> {
  const openai = await getOpenAIClient(baseDir);
  const videoDir = join(getRunsDir(baseDir), runId, "video");
  await mkdir(videoDir, { recursive: true });

  const imageBuffer = await readFile(storyboardPath);
  const imageUrl = toDataUrl(imageBuffer, storyboardPath);

  let job = await createVideoJob(
    buildVideoCreateBody({
      prompt,
      imageUrl,
      model: videoModel,
      seconds: videoSeconds,
    }),
    baseDir,
  );

  if (!job.id) {
    throw new Error("视频任务创建成功，但没有返回任务 ID。");
  }

  const videoId = job.id;

  while (job.status === "queued" || job.status === "in_progress") {
    await sleep(10_000);
    job = await openai.videos.retrieve(videoId);
  }

  if (job.status !== "completed") {
    throw new Error(job.error?.message || "视频生成失败。");
  }

  const videoResponse = await openai.videos.downloadContent(videoId);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const videoPath = join(videoDir, "final.mp4");
  await writeFile(videoPath, videoBuffer);

  let thumbnailPath: string | undefined;

  try {
    const thumbnailResponse = await openai.videos.downloadContent(videoId, {
      variant: "thumbnail",
    });
    const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
    thumbnailPath = join(videoDir, "thumbnail.webp");
    await writeFile(thumbnailPath, thumbnailBuffer);
  } catch {
    thumbnailPath = undefined;
  }

  const asset: VideoAsset = {
    model: videoModel,
    seconds: Number(job.seconds ?? videoSeconds),
    path: videoPath,
    thumbnailPath,
    jobId: videoId,
  };

  await writeVideoArtifact(runId, asset, baseDir);
  return asset;
}
