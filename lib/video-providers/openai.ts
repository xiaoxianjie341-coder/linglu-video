import { readFile, writeFile } from "node:fs/promises";
import { getOpenAIClient, getOpenAITransport } from "../openai/client";
import { normalizeLandscapeStoryboardImage } from "../openai/image";
import { isRetryableOpenAIError, withOpenAIRetry } from "../openai/retry";

const VIDEO_POLL_INTERVAL_MS = 10_000;
const VIDEO_STAGE_ATTEMPTS = 2;
const VIDEO_STAGE_RETRY_DELAY_MS = 1_500;

type ClipSeconds = 4 | 8 | 12;

interface OpenAIVideoJob {
  id?: string;
  status?: string;
  progress?: number;
  error?: { message?: string | null } | null;
  seconds?: string | number;
}

export interface OpenAIVideoArtifact {
  path: string;
  seconds: number;
  size: string;
  thumbnailPath?: string;
  jobId?: string;
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function createLandscapeVideoJob(
  prompt: string,
  referenceDataUrl: string,
  clipSeconds: ClipSeconds,
  videoModel: string,
  baseDir?: string,
): Promise<OpenAIVideoJob> {
  const transport = await getOpenAITransport(baseDir);
  const response = await transport.fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${transport.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: videoModel,
      prompt,
      size: "1280x720",
      seconds: toVideoSecondsLiteral(clipSeconds),
      input_reference: {
        image_url: referenceDataUrl,
      },
    }),
    ...(transport.extraFetchOptions ?? {}),
  } as RequestInit);
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

async function retrieveVideoJob(
  videoId: string,
  baseDir?: string,
): Promise<OpenAIVideoJob> {
  return withOpenAIRetry("轮询视频任务状态", async () => {
    const openai = await getOpenAIClient(baseDir);
    return openai.videos.retrieve(videoId);
  });
}

async function downloadVideoContent(
  videoId: string,
  baseDir?: string,
): Promise<Response> {
  return withOpenAIRetry("下载视频结果", async () => {
    const openai = await getOpenAIClient(baseDir);
    return openai.videos.downloadContent(videoId);
  });
}

async function downloadVideoThumbnail(
  videoId: string,
  baseDir?: string,
): Promise<Response> {
  return withOpenAIRetry("下载视频缩略图", async () => {
    const openai = await getOpenAIClient(baseDir);
    return openai.videos.downloadContent(videoId, {
      variant: "thumbnail",
    });
  });
}

async function generateOpenAIVideoFromReferenceOnce(
  prompt: string,
  referencePath: string,
  outputPath: string,
  clipSeconds: ClipSeconds,
  videoModel: string,
  baseDir?: string,
): Promise<OpenAIVideoArtifact> {
  const referenceBuffer = await normalizeLandscapeStoryboardImage(
    await readFile(referencePath),
  );
  const referenceDataUrl = ensureDataUrl(referenceBuffer, "image/png");

  let job = await withOpenAIRetry("创建视频任务", async () =>
    createLandscapeVideoJob(
      prompt,
      referenceDataUrl,
      clipSeconds,
      videoModel,
      baseDir,
    ),
  );

  if (!job.id) {
    throw new Error("视频任务创建成功，但没有返回任务 ID。");
  }

  const videoId = job.id;

  while (job.status === "queued" || job.status === "in_progress") {
    await sleep(VIDEO_POLL_INTERVAL_MS);
    job = await retrieveVideoJob(videoId, baseDir);
  }

  if (job.status !== "completed") {
    throw new Error(job.error?.message || `视频 ${outputPath} 生成失败。`);
  }

  const response = await downloadVideoContent(videoId, baseDir);
  const videoBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, videoBuffer);

  let thumbnailPath: string | undefined;

  try {
    const thumbnailResponse = await downloadVideoThumbnail(videoId, baseDir);
    const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
    thumbnailPath = outputPath.replace(/\.mp4$/i, ".webp");
    await writeFile(thumbnailPath, thumbnailBuffer);
  } catch {
    thumbnailPath = undefined;
  }

  return {
    path: outputPath,
    seconds: Number(job.seconds ?? clipSeconds),
    size: "1280x720",
    thumbnailPath,
    jobId: videoId,
  };
}

export async function generateOpenAIVideoFromReference(
  prompt: string,
  referencePath: string,
  outputPath: string,
  clipSeconds: ClipSeconds,
  videoModel: string,
  baseDir?: string,
): Promise<OpenAIVideoArtifact> {
  let lastError: unknown;

  for (
    let stageAttempt = 1;
    stageAttempt <= VIDEO_STAGE_ATTEMPTS;
    stageAttempt += 1
  ) {
    try {
      return await generateOpenAIVideoFromReferenceOnce(
        prompt,
        referencePath,
        outputPath,
        clipSeconds,
        videoModel,
        baseDir,
      );
    } catch (error) {
      lastError = error;

      if (
        stageAttempt >= VIDEO_STAGE_ATTEMPTS ||
        !isRetryableOpenAIError(error)
      ) {
        throw error;
      }

      console.warn(
        `[retry] 完整视频阶段失败，准备整体重试 ${stageAttempt}/${VIDEO_STAGE_ATTEMPTS - 1}: ${getErrorMessage(error)}`,
      );
      await sleep(VIDEO_STAGE_RETRY_DELAY_MS);
    }
  }

  throw (lastError instanceof Error
    ? lastError
    : new Error(getErrorMessage(lastError)));
}
