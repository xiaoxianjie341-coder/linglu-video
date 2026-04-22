import { describe, expect, it } from "vitest";
import type { RunRecord } from "../../lib/schemas";
import { mapRunToStages } from "../../lib/run-stage-mapping";

function buildRunFixture(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run_123",
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z",
    status: "planning",
    phaseLabel: "正在理解内容",
    activePhase: "planning",
    failedPhase: null,
    source: {
      type: "text",
      input: "一只茶壶吉祥物发现发光的门。",
    },
    brandTone: "电影感",
    request: {
      sourceType: "text",
      sourceInput: "一只茶壶吉祥物发现发光的门。",
      shotCount: 9,
      videoProvider: "openai",
      videoModel: "sora-2",
      videoSeconds: 8,
    },
    planner: {
      title: "茶壶夜行",
      content_summary: "同一个茶壶吉祥物在夜市里发现发光的门，并最终穿门而入。",
      brand_tone: "电影感",
      visual_style: "潮湿、霓虹、克制",
      overall_prompt_guardrails: "主体一致，故事连贯。",
      storyboard_grid_prompt: "3x3 storyboard prompt",
      frozen_world: {
        subject_type: "mascot",
        subject_identity: "same teapot mascot",
        setting: "lantern night market",
        time_of_day: "night",
        anchors: ["same teapot", "lanterns", "glowing door"],
        negative_constraints: ["no reset", "no humans", "no drift"],
      },
      shots: [
        {
          id: "shot_01",
          goal: "引入角色",
          narrative_beat: "茶壶吉祥物在夜市中前行",
          image_prompt: "shot one",
          video_prompt: "animate shot one",
          camera: "wide",
          grid_index: 1,
          frame_description: "teapot walks in night market",
          motion_extension: "slow push",
          qa_focus: ["same character"],
          duration_seconds: 8,
        },
      ],
    },
    storyboards: [],
    video: null,
    error: null,
    ...overrides,
  };
}

describe("mapRunToStages", () => {
  it("marks downstream stages as blocked after a storyboard failure", () => {
    const result = mapRunToStages(
      buildRunFixture({
        status: "failed",
        phaseLabel: "生成失败",
        activePhase: null,
        failedPhase: "storyboarding",
        storyboards: [],
        video: null,
        error: "grid failed",
      }),
    );

    expect(result[2]?.state).toBe("failed");
    expect(result[3]?.state).toBe("blocked");
  });

  it("marks the video stage as active once planner and storyboard are ready", () => {
    const result = mapRunToStages(
      buildRunFixture({
        status: "videoing",
        phaseLabel: "正在根据总分镜生成完整视频",
        activePhase: "videoing",
        failedPhase: null,
        storyboards: [
          {
            shotId: "grid_master",
            kind: "grid",
            aspect: "landscape",
            imagePrompt: "3x3 storyboard prompt",
            videoPrompt: "基于整张 3x3 总分镜，一次性生成完整视频。",
            path: "/tmp/grid.png",
          },
        ],
      }),
    );

    expect(result[1]?.state).toBe("completed");
    expect(result[2]?.state).toBe("completed");
    expect(result[3]?.state).toBe("active");
  });

  it("uses a shorter stage flow for image generation runs", () => {
    const result = mapRunToStages(
      buildRunFixture({
        status: "imaging",
        phaseLabel: "正在生成图片素材",
        activePhase: "imaging",
        failedPhase: null,
        request: {
          generationMode: "image",
          sourceType: "text",
          sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
          brandTone: "广告质感",
          imageAspect: "portrait",
          imageCount: 4,
        },
        planner: null,
        storyboards: [],
        images: [
          {
            imageId: "image_1",
            index: 1,
            prompt: "适合品牌首图的主视觉构图",
            aspect: "portrait",
            path: "/tmp/image_1.png",
          },
        ],
        video: null,
      }),
    );

    expect(result.map((stage) => stage.id)).toEqual(["input", "imaging"]);
    expect(result[1]?.state).toBe("active");
  });
});
