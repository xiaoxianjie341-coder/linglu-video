import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mocked = vi.hoisted(() => ({
  runStoryboardPipeline: vi.fn(),
}));

vi.mock("../../../lib/storyboard-pipeline", () => ({
  runStoryboardPipeline: mocked.runStoryboardPipeline,
}));

import { runGeneration } from "../../../lib/pipeline/run-generation";
import { createRun, getRun } from "../../../lib/storage";

function buildResolvedPlanFixture() {
  return {
    title: "Demo plan",
    content_summary: "Summary",
    brand_tone: "cinematic",
    visual_style: "moody",
    storyboard_grid_prompt: "grid prompt",
    frozen_world: {
      subject_type: "object",
      subject_identity: "same teapot mascot",
      setting: "glowing hallway",
      time_of_day: "night",
      anchors: ["teapot", "door", "glow"],
      negative_constraints: ["no humans", "no reset", "no style drift"],
    },
    shots: [
      {
        id: "shot_01",
        goal: "Open on the mascot",
        narrative_beat: "The mascot sees the door",
        camera: "wide",
        grid_index: 1,
        frame_description: "same teapot mascot near the door",
        motion_extension: "subtle camera drift",
        qa_focus: ["same mascot"],
        duration_seconds: 8,
        video_prompt: "video prompt",
      },
    ],
  };
}

describe("runGeneration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "linglu-video-run-generation-"));
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reruns the full pipeline once after a retryable failure", async () => {
    const run = await createRun(
      {
        sourceType: "text",
        sourceInput: "A teapot mascot finds a glowing door.",
        brandTone: "cinematic",
        shotCount: 9,
        videoProvider: "openai",
        videoModel: "sora-2",
        videoSeconds: 8,
      },
      tempDir,
    );

    mocked.runStoryboardPipeline
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockImplementationOnce(async ({ outputDir, runId }: { outputDir: string; runId: string }) => {
        const manifestsDir = join(outputDir, "manifests");
        await mkdir(manifestsDir, { recursive: true });
        const planPath = join(manifestsDir, "plan.json");
        await writeFile(
          planPath,
          JSON.stringify({
            title: "Demo plan",
            content_summary: "Summary",
            brand_tone: "cinematic",
            visual_style: "moody",
            storyboard_grid_prompt: "grid prompt",
            frozen_world: {
              subject_type: "object",
              subject_identity: "same teapot mascot",
              setting: "glowing hallway",
              time_of_day: "night",
              anchors: ["teapot", "door", "glow"],
              negative_constraints: ["no humans", "no reset", "no style drift"],
            },
            shots: [
              {
                id: "shot_01",
                goal: "Open on the mascot",
                narrative_beat: "The mascot sees the door",
                image_prompt: "image prompt",
                video_prompt: "video prompt",
                camera: "wide",
                grid_index: 1,
                frame_description: "same teapot mascot near the door",
                motion_extension: "subtle camera drift",
                qa_focus: ["same mascot"],
                duration_seconds: 8,
              },
            ],
          }),
          "utf8",
        );

        return {
          runId,
          outputDir,
          sourcePath: join(manifestsDir, "source.txt"),
          planPath,
          gridPath: join(outputDir, "storyboard", "grid.png"),
          generationMode: "grid_preview",
          selectedShots: ["shot_01"],
          finalVideoPath: join(outputDir, "video", "preview.mp4"),
          finalVideo: {
            provider: "openai",
            model: "sora-2",
            path: join(outputDir, "video", "preview.mp4"),
            seconds: 8,
            size: "1280x720",
            jobId: "video_retry_success",
          },
          summaryPath: join(manifestsDir, "summary.json"),
          shots: [],
        };
      });

    await runGeneration(run.id, run.request, tempDir);

    const savedRun = await getRun(run.id, tempDir);
    expect(mocked.runStoryboardPipeline).toHaveBeenCalledTimes(2);
    expect(savedRun?.status).toBe("completed");
    expect(savedRun?.video?.jobId).toBe("video_retry_success");
  });

  it("persists planner and storyboard artifacts before the final video completes", async () => {
    const run = await createRun(
      {
        sourceType: "text",
        sourceInput: "A teapot mascot finds a glowing door.",
        brandTone: "cinematic",
        shotCount: 9,
        videoProvider: "openai",
        videoModel: "sora-2",
        videoSeconds: 8,
      },
      tempDir,
    );

    let plannerPersistedBeforeResolve = false;
    let storyboardsPersistedBeforeResolve = false;

    mocked.runStoryboardPipeline.mockImplementationOnce(
      async ({
        outputDir,
        runId,
        onPlanner,
        onStoryboard,
      }: {
        outputDir: string;
        runId: string;
        onPlanner?: (plan: ReturnType<typeof buildResolvedPlanFixture>) => Promise<void>;
        onStoryboard?: (payload: {
          plan: ReturnType<typeof buildResolvedPlanFixture>;
          gridPath: string;
          generationMode: "grid_preview";
          selectedShotIds: string[];
        }) => Promise<void>;
      }) => {
        const manifestsDir = join(outputDir, "manifests");
        const storyboardDir = join(outputDir, "storyboard");
        const plan = buildResolvedPlanFixture();
        const planPath = join(manifestsDir, "plan.json");
        const gridPath = join(storyboardDir, "grid.png");
        await mkdir(manifestsDir, { recursive: true });
        await mkdir(storyboardDir, { recursive: true });
        await writeFile(planPath, JSON.stringify(plan), "utf8");
        await writeFile(gridPath, "grid", "utf8");

        await onPlanner?.(plan);
        plannerPersistedBeforeResolve = Boolean((await getRun(runId, tempDir))?.planner);

        await onStoryboard?.({
          plan,
          gridPath,
          generationMode: "grid_preview",
          selectedShotIds: ["shot_01"],
        });
        storyboardsPersistedBeforeResolve =
          ((await getRun(runId, tempDir))?.storyboards.length ?? 0) > 0;

        return {
          runId,
          outputDir,
          sourcePath: join(manifestsDir, "source.txt"),
          planPath,
          gridPath,
          generationMode: "grid_preview" as const,
          selectedShots: ["shot_01"],
          finalVideoPath: join(outputDir, "video", "preview.mp4"),
          finalVideo: {
            provider: "openai" as const,
            model: "sora-2",
            path: join(outputDir, "video", "preview.mp4"),
            seconds: 8,
            size: "1280x720",
            jobId: "video_incremental",
          },
          summaryPath: join(manifestsDir, "summary.json"),
          shots: [],
        };
      },
    );

    await runGeneration(run.id, run.request, tempDir);

    expect(plannerPersistedBeforeResolve).toBe(true);
    expect(storyboardsPersistedBeforeResolve).toBe(true);
  });

  it("fails after the single full-pipeline rerun is exhausted", async () => {
    const run = await createRun(
      {
        sourceType: "text",
        sourceInput: "A teapot mascot finds a glowing door.",
        brandTone: "cinematic",
        shotCount: 9,
        videoProvider: "openai",
        videoModel: "sora-2",
        videoSeconds: 8,
      },
      tempDir,
    );

    mocked.runStoryboardPipeline
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockRejectedValueOnce(new Error("fetch failed"));

    await runGeneration(run.id, run.request, tempDir);

    const savedRun = await getRun(run.id, tempDir);
    expect(mocked.runStoryboardPipeline).toHaveBeenCalledTimes(2);
    expect(savedRun?.status).toBe("failed");
    expect(savedRun?.error).toBe("fetch failed");
  });

  it("stores the failed phase from the last active pipeline stage", async () => {
    const run = await createRun(
      {
        sourceType: "text",
        sourceInput: "A teapot mascot finds a glowing door.",
        brandTone: "cinematic",
        shotCount: 9,
        videoProvider: "openai",
        videoModel: "sora-2",
        videoSeconds: 8,
      },
      tempDir,
    );

    mocked.runStoryboardPipeline.mockImplementationOnce(
      async ({
        onPhase,
      }: {
        onPhase?: (status: "planning" | "storyboarding" | "videoing", phaseLabel: string) => Promise<void>;
      }) => {
        await onPhase?.("storyboarding", "正在生成 3x3 总分镜");
        throw new Error("grid failed");
      },
    );

    await runGeneration(run.id, run.request, tempDir);

    const savedRun = await getRun(run.id, tempDir);
    expect(savedRun?.status).toBe("failed");
    expect(savedRun?.failedPhase).toBe("storyboarding");
  });
});
