import { describe, expect, it } from "vitest";
import {
  formatRunCreatedAt,
  getRunDisplaySummary,
  getRunDisplayTitle,
} from "../../lib/run-presenter";

describe("run-presenter", () => {
  const baseRun = {
    id: "KxcXBhvtqW",
    createdAt: "2026-04-17T15:57:25.000Z",
    updatedAt: "2026-04-17T15:57:25.000Z",
    status: "completed" as const,
    phaseLabel: "生成完成",
    activePhase: null,
    failedPhase: null,
    source: {
      type: "text" as const,
      input: "妈妈最近来问我手机怎么截图。起初我笑了，但后面我想起来我小时候她教我。",
    },
    brandTone: "质感电影",
    request: {
      sourceType: "text" as const,
      sourceInput: "妈妈最近来问我手机怎么截图。起初我笑了，但后面我想起来我小时候她教我。",
      shotCount: 9,
      videoProvider: "openai" as const,
      videoModel: "sora-2",
      videoSeconds: 8,
    },
    planner: {
      title: "妈妈教会我的事",
      content_summary: "一个关于代际反转的温暖短片。",
      brand_tone: "温暖克制",
      visual_style: "质感电影",
      overall_prompt_guardrails: "真实生活感",
      shots: [
        {
          id: "shot_1",
          goal: "建立关系",
          narrative_beat: "母亲提问",
          image_prompt: "母亲拿着手机",
          video_prompt: "母亲拿着手机请教",
          camera: "medium shot",
          duration_seconds: 4,
        },
      ],
    },
    storyboards: [],
    video: {
      provider: "openai" as const,
      model: "sora-2",
      seconds: 8,
      path: "/tmp/final.mp4",
    },
    error: null,
  };

  it("prefers planner title and summary over machine ids and raw input", () => {
    expect(getRunDisplayTitle(baseRun)).toBe("妈妈教会我的事");
    expect(getRunDisplaySummary(baseRun)).toBe("一个关于代际反转的温暖短片。");
  });

  it("formats created time into a compact user-facing label", () => {
    expect(formatRunCreatedAt(baseRun.createdAt, { timeZone: "UTC" })).toBe(
      "4月17日 15:57",
    );
  });
});
