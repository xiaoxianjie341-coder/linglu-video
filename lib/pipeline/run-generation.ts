import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  plannerOutputSchema,
  type GenerationRequest,
  type PlannerOutput,
  type StoryboardAsset,
  type VideoAsset,
} from "../schemas";
import {
  runStoryboardPipeline,
  type ResolvedPlan,
  type StoryboardGenerationMode,
  type StoryboardPipelineResult,
} from "../storyboard-pipeline";
import { isRetryableOpenAIError } from "../openai/retry";
import {
  getRunsDir,
  updateRun,
  writePlannerArtifact,
  writeStoryboardArtifact,
  writeVideoArtifact,
} from "../storage";
import { runImageGeneration } from "./run-image-generation";

const GENERATION_CHAIN_ATTEMPTS = 2;
const GENERATION_CHAIN_RETRY_DELAY_MS = 1_500;

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
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

function buildGuardrailsText(plan: ResolvedPlan): string {
  return [
    ...plan.frozen_world.anchors.map((anchor) => `Anchor: ${anchor}`),
    ...plan.frozen_world.negative_constraints.map(
      (constraint) => `Forbid: ${constraint}`,
    ),
  ].join(" | ");
}

function buildPlanner(plan: ResolvedPlan): PlannerOutput {
  return plannerOutputSchema.parse({
    title: plan.title,
    content_summary: plan.content_summary,
    brand_tone: plan.brand_tone,
    visual_style: plan.visual_style,
    overall_prompt_guardrails: buildGuardrailsText(plan),
    storyboard_grid_prompt: plan.storyboard_grid_prompt,
    frozen_world: plan.frozen_world,
    shots: plan.shots.map((shot) => ({
      id: shot.id,
      goal: shot.goal,
      narrative_beat: shot.narrative_beat,
      image_prompt: shot.frame_description,
      video_prompt: shot.video_prompt,
      camera: shot.camera,
      grid_index: shot.grid_index,
      frame_description: shot.frame_description,
      motion_extension: shot.motion_extension,
      qa_focus: shot.qa_focus,
      duration_seconds: shot.duration_seconds,
    })),
  });
}

function buildMasterBoardVideoPrompt(
  plan: ResolvedPlan,
  selectedShotIds: string[],
): string {
  return selectedShotIds.length === plan.shots.length
    ? "基于整张 3x3 总分镜，一次性生成完整视频。"
    : `基于整张 3x3 总分镜，一次性生成前 ${selectedShotIds.length} 格对应的视频。`;
}

function buildGridMasterStoryboard(
  plan: ResolvedPlan,
  gridPath: string,
  selectedShotIds: string[],
  clipPath?: string,
): StoryboardAsset {
  return {
    shotId: "grid_master",
    kind: "grid",
    aspect: "landscape",
    imagePrompt: plan.storyboard_grid_prompt,
    videoPrompt: buildMasterBoardVideoPrompt(plan, selectedShotIds),
    path: gridPath,
    clipPath,
  };
}

function buildStoryboardAssets(
  plan: ResolvedPlan,
  result: StoryboardPipelineResult,
  mode: StoryboardGenerationMode,
): StoryboardAsset[] {
  const masterBoard =
    mode === "grid_preview"
      ? buildGridMasterStoryboard(
          plan,
          result.gridPath,
          result.selectedShots,
          result.finalVideo?.path,
        )
      : {
          ...buildGridMasterStoryboard(plan, result.gridPath, result.selectedShots),
          videoPrompt: buildGuardrailsText(plan),
        };

  if (mode === "grid_preview") {
    return [masterBoard];
  }

  const runRoot = result.outputDir;
  const shotArtifacts = result.shots;
  const artifactByShotId = new Map(
    shotArtifacts.map((artifact) => [artifact.shotId, artifact]),
  );

  const panelBoards = plan.shots.map((shot) => {
    const artifact = artifactByShotId.get(shot.id);
    const latestQa = artifact?.attempts
      ?.map((attempt) => attempt.qa)
      .filter(Boolean)
      .at(-1);

    return {
      shotId: shot.id,
      kind: "panel" as const,
      aspect: "landscape" as const,
      gridIndex: shot.grid_index,
      imagePrompt: shot.frame_description,
      videoPrompt: shot.video_prompt,
      path: join(runRoot, "storyboard", "crops", `${shot.id}.png`),
      clipPath: artifact?.acceptedVideoPath,
      qaVerdict: latestQa?.verdict,
      qaScore: latestQa?.score,
    } satisfies StoryboardAsset;
  });

  return [masterBoard, ...panelBoards];
}

function buildFinalVideoAsset(
  finalVideo: NonNullable<StoryboardPipelineResult["finalVideo"]>,
): VideoAsset {
  return {
    provider: finalVideo.provider,
    model: finalVideo.model,
    seconds: finalVideo.seconds,
    size: finalVideo.size,
    path: finalVideo.path,
    thumbnailPath: finalVideo.thumbnailPath,
    jobId: finalVideo.jobId,
  };
}

export async function runGeneration(
  runId: string,
  request: GenerationRequest,
  baseDir?: string,
): Promise<void> {
  if (request.generationMode === "image") {
    await runImageGeneration(runId, request, baseDir);
    return;
  }

  let lastActivePhase: "planning" | "storyboarding" | "videoing" = "planning";

  try {
    await updateRun(
      runId,
      {
        status: "planning",
        phaseLabel: "正在理解内容",
        activePhase: "planning",
        failedPhase: null,
        error: null,
        planner: null,
        storyboards: [],
        video: null,
      },
      baseDir,
    );
    const runRoot = join(getRunsDir(baseDir), runId);
    let result: StoryboardPipelineResult | null = null;
    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= GENERATION_CHAIN_ATTEMPTS;
      attempt += 1
    ) {
      try {
        result = await runStoryboardPipeline({
          runId,
          sourceType: request.sourceType,
          sourceInput: request.sourceInput,
          brandTone: request.brandTone,
          videoProvider: request.videoProvider,
          videoModel: request.videoModel,
          clipSeconds: request.videoSeconds,
          generationMode: "grid_preview",
          maxRetries: 0,
          skipQa: true,
          outputDir: runRoot,
          baseDir,
          onPhase: async (status, phaseLabel) => {
            lastActivePhase = status;
            await updateRun(
              runId,
              {
                status,
                phaseLabel,
                activePhase: status,
              },
              baseDir,
            );
          },
          onPlanner: async (plan) => {
            await writePlannerArtifact(runId, buildPlanner(plan), baseDir);
          },
          onStoryboard: async ({
            plan,
            gridPath,
            selectedShotIds,
          }) => {
            await writeStoryboardArtifact(
              runId,
              buildGridMasterStoryboard(plan, gridPath, selectedShotIds),
              baseDir,
            );
          },
          onVideo: async (videoArtifact) => {
            await writeVideoArtifact(
              runId,
              buildFinalVideoAsset(videoArtifact),
              baseDir,
            );
          },
        });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;

        if (
          attempt >= GENERATION_CHAIN_ATTEMPTS ||
          !isRetryableOpenAIError(error)
        ) {
          throw error;
        }

        console.warn(
          `[retry] 完整生成链路失败，准备整体重试 ${attempt}/${GENERATION_CHAIN_ATTEMPTS - 1}: ${getErrorMessage(error)}`,
        );
        await sleep(GENERATION_CHAIN_RETRY_DELAY_MS);
      }
    }

    if (!result) {
      throw (lastError instanceof Error
        ? lastError
        : new Error(getErrorMessage(lastError)));
    }

    const plan = await readJsonFile<ResolvedPlan>(result.planPath);
    const planner = buildPlanner(plan);
    const storyboards = buildStoryboardAssets(plan, result, result.generationMode);
    const video = result.finalVideo
      ? buildFinalVideoAsset(result.finalVideo)
      : null;

    await updateRun(
      runId,
      {
        status: "completed",
        phaseLabel: "生成完成",
        activePhase: null,
        failedPhase: null,
        planner,
        storyboards,
        video,
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
        failedPhase: lastActivePhase,
        error: error instanceof Error ? error.message : String(error),
      },
      baseDir,
    );
  }
}
