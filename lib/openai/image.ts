import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { createLingluControlPlaneImageGeneration } from "../linglu-control-plane";
import type { ImageAspect, PlannerOutput, StoryboardAsset } from "../schemas";
import { getRunsDir, writeStoryboardArtifact } from "../storage";
import { getImageGenerationRuntime, getOpenAIClient } from "./client";
import { withOpenAIReconnectRetry } from "./retry";

const VIDEO_FRAME_WIDTH = 720;
const VIDEO_FRAME_HEIGHT = 1280;
const LANDSCAPE_VIDEO_FRAME_WIDTH = 1280;
const LANDSCAPE_VIDEO_FRAME_HEIGHT = 720;
const SQUARE_IMAGE_SIZE = 1024;

export async function normalizeStoryboardImage(
  source: Buffer,
): Promise<Buffer> {
  return sharp(source)
    .resize(VIDEO_FRAME_WIDTH, VIDEO_FRAME_HEIGHT, {
      fit: "cover",
      position: "attention",
    })
    .png()
    .toBuffer();
}

export async function normalizeLandscapeStoryboardImage(
  source: Buffer,
): Promise<Buffer> {
  return sharp(source)
    .resize(LANDSCAPE_VIDEO_FRAME_WIDTH, LANDSCAPE_VIDEO_FRAME_HEIGHT, {
      fit: "cover",
      position: "attention",
    })
    .png()
    .toBuffer();
}

export async function normalizeSquareImage(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize(SQUARE_IMAGE_SIZE, SQUARE_IMAGE_SIZE, {
      fit: "cover",
      position: "attention",
    })
    .png()
    .toBuffer();
}

function resolveOpenAIImageSize(aspect: ImageAspect): "1024x1536" | "1024x1024" | "1536x1024" {
  if (aspect === "landscape") {
    return "1536x1024";
  }

  if (aspect === "square") {
    return "1024x1024";
  }

  return "1024x1536";
}

async function readImageResponseData(
  data: Array<{ b64_json?: string | null; url?: string | null }> | undefined,
): Promise<Buffer | null> {
  const firstImage = data?.[0];

  if (!firstImage) {
    return null;
  }

  if (firstImage.b64_json) {
    return Buffer.from(firstImage.b64_json, "base64");
  }

  if (firstImage.url) {
    const response = await fetch(firstImage.url);

    if (!response.ok) {
      throw new Error(`图片结果下载失败（${response.status}）。`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return null;
}

async function generateLingluImage({
  prompt,
  aspect,
  baseDir,
}: Pick<GenerateImageCandidateOptions, "prompt" | "aspect" | "baseDir">): Promise<Buffer> {
  const runtime = await getImageGenerationRuntime(baseDir);

  if (runtime.provider !== "linglu") {
    throw new Error("当前图片运行时不是灵路。");
  }

  const payload = await createLingluControlPlaneImageGeneration({
    model: runtime.model,
    prompt,
    size: resolveOpenAIImageSize(aspect),
    baseDir,
  });
  const imageBuffer = await readImageResponseData(payload.data);

  if (!imageBuffer) {
    throw new Error("灵路图片生成没有返回图片数据。");
  }

  return imageBuffer;
}

async function normalizeGeneratedImage(
  source: Buffer,
  aspect: ImageAspect,
): Promise<Buffer> {
  if (aspect === "landscape") {
    return normalizeLandscapeStoryboardImage(source);
  }

  if (aspect === "square") {
    return normalizeSquareImage(source);
  }

  return normalizeStoryboardImage(source);
}

interface GenerateImageCandidateOptions {
  index: number;
  prompt: string;
  aspect: ImageAspect;
  outputPath: string;
  baseDir?: string;
}

export async function generateImageCandidate({
  index,
  prompt,
  aspect,
  outputPath,
  baseDir,
}: GenerateImageCandidateOptions): Promise<void> {
  const runtime = await getImageGenerationRuntime(baseDir);
  const generatedImage =
    runtime.provider === "linglu"
      ? await generateLingluImage({ prompt, aspect, baseDir })
      : await withOpenAIReconnectRetry(
          `生成图片素材 ${index}`,
          async () => getOpenAIClient(baseDir),
          async (openai) => {
            const image = await openai.images.generate({
              model: runtime.model,
              prompt,
              size: resolveOpenAIImageSize(aspect),
            });
            const imageBuffer = await readImageResponseData(image.data);

            if (!imageBuffer) {
              throw new Error(`图片素材 ${index} 没有返回图片。`);
            }

            return imageBuffer;
          },
        );

  if (!generatedImage) {
    throw new Error(`图片素材 ${index} 没有返回图片。`);
  }

  const normalizedImage = await normalizeGeneratedImage(
    generatedImage,
    aspect,
  );
  await writeFile(outputPath, normalizedImage);
}

interface GenerateStoryboardsOptions {
  runId: string;
  planner: PlannerOutput;
  baseDir?: string;
}

export async function generateStoryboards({
  runId,
  planner,
  baseDir,
}: GenerateStoryboardsOptions): Promise<StoryboardAsset[]> {
  const storyboardDir = join(getRunsDir(baseDir), runId, "storyboards");
  await mkdir(storyboardDir, { recursive: true });

  const assets: StoryboardAsset[] = [];

  for (const shot of planner.shots) {
    const image = await withOpenAIReconnectRetry(
      `生成分镜图 ${shot.id}`,
      async () => getOpenAIClient(baseDir),
      async (openai) =>
        openai.images.generate({
          model: "gpt-image-1.5",
          prompt: shot.image_prompt,
          size: "1024x1536",
        }),
    );

    const imageBase64 = image.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error(`镜头 ${shot.id} 没有返回分镜图片。`);
    }

    const filePath = join(storyboardDir, `${shot.id}.png`);
    const normalizedImage = await normalizeStoryboardImage(
      Buffer.from(imageBase64, "base64"),
    );
    await writeFile(filePath, normalizedImage);

    const asset: StoryboardAsset = {
      shotId: shot.id,
      imagePrompt: shot.image_prompt,
      videoPrompt: shot.video_prompt,
      path: filePath,
    };

    await writeStoryboardArtifact(runId, asset, baseDir);
    assets.push(asset);
  }

  return assets;
}
