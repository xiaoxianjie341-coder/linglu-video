import type { RunRecord } from "./schemas";

export type RunStageId = "input" | "planning" | "storyboarding" | "videoing";
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

const phaseOrder = {
  planning: 1,
  storyboarding: 2,
  videoing: 3,
} as const;

function resolveCurrentProgressOrder(run: RunRecord): number {
  if (run.status === "completed") {
    return phaseOrder.videoing;
  }

  if (run.activePhase) {
    return phaseOrder[run.activePhase];
  }

  if (run.failedPhase) {
    return phaseOrder[run.failedPhase];
  }

  return 0;
}

function resolvePhaseState(
  run: RunRecord,
  phase: keyof typeof phaseOrder,
  hasArtifact: boolean,
): RunStageState {
  if (run.failedPhase === phase) {
    return "failed";
  }

  if (
    run.failedPhase &&
    phaseOrder[run.failedPhase] < phaseOrder[phase]
  ) {
    return "blocked";
  }

  if (hasArtifact) {
    return "completed";
  }

  if (run.activePhase === phase || run.status === phase) {
    return "active";
  }

  return resolveCurrentProgressOrder(run) > phaseOrder[phase]
    ? "completed"
    : "pending";
}

export function mapRunToStages(run: RunRecord): RunStageView[] {
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
      state: resolvePhaseState(run, "planning", Boolean(run.planner)),
      error: run.failedPhase === "planning" ? run.error : null,
    },
    {
      id: "storyboarding",
      title: "画面方案",
      description:
        run.storyboards.find((item) => item.kind === "grid")?.videoPrompt ||
        "正在生成这一条视频的整体画面方案。",
      state: resolvePhaseState(run, "storyboarding", run.storyboards.length > 0),
      error: run.failedPhase === "storyboarding" ? run.error : null,
    },
    {
      id: "videoing",
      title: "生成结果",
      description:
        run.video
          ? `${run.video.model} · ${run.video.seconds} 秒`
          : "正在生成最终视频。",
      state: resolvePhaseState(run, "videoing", Boolean(run.video)),
      error: run.failedPhase === "videoing" ? run.error : null,
    },
  ];
}
