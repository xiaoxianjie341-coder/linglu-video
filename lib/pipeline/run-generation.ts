import type { GenerationRequest, RunRecord, Shot } from "../schemas";
import { fetchSourceContent } from "../fetch-source";
import {
  getRun,
  updateRun,
  writePlannerArtifact,
} from "../storage";
import { generateStoryboards } from "../openai/image";
import { planShots } from "../openai/planner";
import { generateVideoFromStoryboard } from "../openai/video";

function buildVideoPrompt(run: RunRecord): string {
  if (!run.planner) {
    return run.request.sourceInput;
  }

  const beatSummary = run.planner.shots
    .map(
      (shot: Shot, index: number) =>
        `Beat ${index + 1}: ${shot.video_prompt}`,
    )
    .join(" ");

  return [
    run.planner.content_summary,
    `Brand tone: ${run.brandTone || run.planner.brand_tone || "cinematic"}.`,
    `Visual style: ${run.planner.visual_style || "cohesive short-form social video"}.`,
    run.planner.overall_prompt_guardrails,
    beatSummary,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function runGeneration(
  runId: string,
  request: GenerationRequest,
  baseDir?: string,
): Promise<void> {
  try {
    await updateRun(
      runId,
      {
        status: "planning",
        phaseLabel: "正在读取原始内容",
        error: null,
      },
      baseDir,
    );

    const sourceContent = await fetchSourceContent(
      request.sourceType,
      request.sourceInput,
    );

    await updateRun(
      runId,
      {
        status: "planning",
        phaseLabel: "正在生成导演拆解",
      },
      baseDir,
    );

    const planner = await planShots({
      sourceContent,
      brandTone: request.brandTone,
      shotCount: request.shotCount,
      baseDir,
    });

    await writePlannerArtifact(runId, planner, baseDir);

    await updateRun(
      runId,
      {
        status: "storyboarding",
        phaseLabel: "正在生成分镜图",
      },
      baseDir,
    );

    const storyboards = await generateStoryboards({
      runId,
      planner,
      baseDir,
    });

    if (storyboards.length === 0) {
      throw new Error("没有成功生成任何分镜图。");
    }

    await updateRun(
      runId,
      {
        status: "videoing",
        phaseLabel: "正在生成 Sora 视频",
      },
      baseDir,
    );

    const run = await getRun(runId, baseDir);

    if (!run) {
      throw new Error(`生成分镜后找不到任务记录：${runId}`);
    }

    await generateVideoFromStoryboard({
      runId,
      prompt: buildVideoPrompt(run),
      storyboardPath: storyboards[0].path,
      videoModel: request.videoModel,
      videoSeconds: request.videoSeconds,
      baseDir,
    });

    await updateRun(
      runId,
      {
        status: "completed",
        phaseLabel: "生成完成",
      },
      baseDir,
    );
  } catch (error) {
    await updateRun(
      runId,
      {
        status: "failed",
        phaseLabel: "生成失败",
        error: error instanceof Error ? error.message : String(error),
      },
      baseDir,
    );
  }
}
