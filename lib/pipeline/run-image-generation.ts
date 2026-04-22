import { join } from "node:path";
import { toUserFacingImageErrorMessage } from "../image-generation";
import type { GenerationRequest } from "../schemas";
import { generateImageCandidate } from "../openai/image";
import { getRunsDir, updateRun, writeImageArtifact } from "../storage";

const IMAGE_VARIANTS = [
  "主视觉构图，适合品牌封面与首图展示",
  "环境氛围镜头，突出空间与光线层次",
  "产品与主体近景，强调质感和细节",
  "陈列与版式留白，适合后续加文案排版",
] as const;

function buildImagePrompts(
  request: Extract<GenerationRequest, { generationMode: "image" }>,
): string[] {
  return Array.from({ length: request.imageCount }, (_, index) => {
    const variant =
      IMAGE_VARIANTS[index] ?? `构图方案 ${index + 1}，保证与前几张画面明显区分`;

    return [
      request.sourceInput.trim(),
      request.brandTone?.trim()
        ? `风格要求：${request.brandTone.trim()}`
        : null,
      `画面方向：${request.imageAspect}`,
      `候选意图：${variant}`,
      "输出高完成度、适合直接筛选为素材的静态图片。",
    ]
      .filter(Boolean)
      .join("\n");
  });
}

export async function runImageGeneration(
  runId: string,
  request: Extract<GenerationRequest, { generationMode: "image" }>,
  baseDir?: string,
): Promise<void> {
  try {
    await updateRun(
      runId,
      {
        status: "imaging",
        phaseLabel: "正在生成图片素材",
        activePhase: "imaging",
        failedPhase: null,
        error: null,
        images: [],
        storyboards: [],
        video: null,
      },
      baseDir,
    );

    const imagesDir = join(getRunsDir(baseDir), runId, "images");
    const prompts = buildImagePrompts(request);

    for (const [offset, prompt] of prompts.entries()) {
      const index = offset + 1;
      const imageId = `image_${index}`;
      const outputPath = join(imagesDir, `${imageId}.png`);

      await generateImageCandidate({
        index,
        prompt,
        aspect: request.imageAspect,
        outputPath,
        baseDir,
      });

      await writeImageArtifact(
        runId,
        {
          imageId,
          index,
          prompt,
          aspect: request.imageAspect,
          path: outputPath,
        },
        baseDir,
      );
    }

    await updateRun(
      runId,
      {
        status: "completed",
        phaseLabel: "生成完成",
        activePhase: null,
        failedPhase: null,
        error: null,
      },
      baseDir,
    );
  } catch (error) {
    await updateRun(
      runId,
      {
        status: "failed",
        phaseLabel: "生成失败",
        activePhase: null,
        failedPhase: "imaging",
        error: toUserFacingImageErrorMessage(error),
      },
      baseDir,
    );
  }
}
