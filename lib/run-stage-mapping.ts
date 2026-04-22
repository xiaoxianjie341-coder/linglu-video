import {
  DEFAULT_IMAGE_COUNT,
  toUserFacingImageErrorMessage,
} from "./image-generation";
import type { RunRecord } from "./schemas";

export type RunStageId =
  | "input"
  | "planning"
  | "storyboarding"
  | "videoing"
  | "imaging";
export type RunStageState =
  | "completed"
  | "active"
  | "failed"
  | "blocked"
  | "pending";

export interface RunStageView {
  id: RunStageId;
  title: string;
  description: string;
  state: RunStageState;
  error?: string | null;
}

const videoPhaseOrder = {
  planning: 1,
  storyboarding: 2,
  videoing: 3,
} as const;

const imagePhaseOrder = {
  imaging: 1,
} as const;

function isImageRun(run: RunRecord): boolean {
  return run.request.generationMode === "image";
}

function resolveCurrentProgressOrder(
  run: RunRecord,
  phaseOrder: Record<string, number>,
): number {
  if (run.status === "completed") {
    return Math.max(...Object.values(phaseOrder));
  }

  if (run.activePhase && run.activePhase in phaseOrder) {
    return phaseOrder[run.activePhase];
  }

  if (run.failedPhase && run.failedPhase in phaseOrder) {
    return phaseOrder[run.failedPhase];
  }

  return 0;
}

function resolvePhaseState(
  run: RunRecord,
  phase: string,
  hasArtifact: boolean,
  phaseOrder: Record<string, number>,
): RunStageState {
  if (run.failedPhase === phase) {
    return "failed";
  }

  if (
    run.failedPhase &&
    run.failedPhase in phaseOrder &&
    phaseOrder[run.failedPhase] < phaseOrder[phase]
  ) {
    return "blocked";
  }

  if (run.activePhase === phase || run.status === phase) {
    return "active";
  }

  if (hasArtifact) {
    return "completed";
  }

  return resolveCurrentProgressOrder(run, phaseOrder) > phaseOrder[phase]
    ? "completed"
    : "pending";
}

export function mapRunToStages(run: RunRecord): RunStageView[] {
  if (isImageRun(run)) {
    const imageRequest = run.request as Extract<
      RunRecord["request"],
      { generationMode: "image" }
    >;

    return [
      {
        id: "input",
        title: "你的想法",
        description: run.source.input,
        state: "completed",
      },
      {
        id: "imaging",
        title: "图片结果",
        description:
          run.status === "completed"
            ? `已准备好 ${run.images.length || imageRequest.imageCount || DEFAULT_IMAGE_COUNT} 张候选画面，直接挑你更喜欢的方向。`
            : run.images.length > 0
              ? `已先生成 ${run.images.length} 张候选画面，剩下的方向会继续补上。`
              : `先给你铺 ${imageRequest.imageCount || DEFAULT_IMAGE_COUNT} 张不同方向的预览图，方便直接挑喜欢的感觉。`,
        state: resolvePhaseState(
          run,
          "imaging",
          run.images.length > 0,
          imagePhaseOrder,
        ),
        error:
          run.failedPhase === "imaging" && run.error
            ? toUserFacingImageErrorMessage(run.error)
            : null,
      },
    ];
  }

  return [
    {
      id: "input",
      title: "你的想法",
      description: run.source.input,
      state: "completed",
    },
    {
      id: "planning",
      title: "故事梳理",
      description: run.planner?.content_summary || "正在整理故事方向与情绪节奏。",
      state: resolvePhaseState(
        run,
        "planning",
        Boolean(run.planner),
        videoPhaseOrder,
      ),
      error: run.failedPhase === "planning" ? run.error : null,
    },
    {
      id: "storyboarding",
      title: "画面方案",
      description:
        run.storyboards.find((item) => item.kind === "grid")?.videoPrompt ||
        "正在生成这一条视频的整体画面方案。",
      state: resolvePhaseState(
        run,
        "storyboarding",
        run.storyboards.length > 0,
        videoPhaseOrder,
      ),
      error: run.failedPhase === "storyboarding" ? run.error : null,
    },
    {
      id: "videoing",
      title: "生成结果",
      description:
        run.video
          ? `${run.video.model} · ${run.video.seconds} 秒`
          : "正在生成最终视频。",
      state: resolvePhaseState(
        run,
        "videoing",
        Boolean(run.video),
        videoPhaseOrder,
      ),
      error: run.failedPhase === "videoing" ? run.error : null,
    },
  ];
}
