// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { RecentRunsStrip } from "../../components/recent-runs-strip";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("RecentRunsStrip", () => {
  afterEach(() => {
    cleanup();
  });

  it("only shows runs with video and hides machine ids from homepage cards", () => {
    render(
      <RecentRunsStrip
        runs={[
          {
            id: "KxcXBhvtqW",
            createdAt: "2026-04-17T00:00:00.000Z",
            updatedAt: "2026-04-17T00:00:00.000Z",
            status: "completed",
            phaseLabel: "生成完成",
            activePhase: null,
            failedPhase: null,
            source: {
              type: "text",
              input: "妈妈最近来问我手机怎么截图。起初我笑了，但后面我想起来我小时候她教我。",
            },
            brandTone: "质感电影",
            request: {
              sourceType: "text",
              sourceInput: "妈妈最近来问我手机怎么截图。起初我笑了，但后面我想起来我小时候她教我。",
              shotCount: 9,
              videoProvider: "openai",
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
                  goal: "建立人物关系",
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
              provider: "openai",
              model: "sora-2",
              seconds: 8,
              path: "/Users/xiaoxianjie/888/data/runs/KxcXBhvtqW/video/final.mp4",
            },
            error: null,
          },
          {
            id: "ta3cXfYCzc",
            createdAt: "2026-04-17T01:00:00.000Z",
            updatedAt: "2026-04-17T01:00:00.000Z",
            status: "failed",
            phaseLabel: "生成失败",
            activePhase: null,
            failedPhase: "videoing",
            source: {
              type: "text",
              input: "失败任务不应该出现在首页。",
            },
            brandTone: "质感电影",
            request: {
              sourceType: "text",
              sourceInput: "失败任务不应该出现在首页。",
              shotCount: 9,
              videoProvider: "openai",
              videoModel: "sora-2",
              videoSeconds: 8,
            },
            planner: null,
            storyboards: [],
            video: null,
            error: "生成失败",
          },
        ]}
      />,
    );

    expect(screen.getByText("妈妈教会我的事")).toBeTruthy();
    expect(screen.queryByText("ta3cXfYCzc")).toBeNull();
    expect(screen.queryByText("KxcXBhvtqW")).toBeNull();
    expect(screen.queryByText("失败任务不应该出现在首页。")).toBeNull();
  });

  it("renders a non-empty cover fallback when a video has no thumbnail", () => {
    render(
      <RecentRunsStrip
        runs={[
          {
            id: "run_no_thumb",
            createdAt: "2026-04-17T00:00:00.000Z",
            updatedAt: "2026-04-17T00:00:00.000Z",
            status: "completed",
            phaseLabel: "生成完成",
            activePhase: null,
            failedPhase: null,
            source: {
              type: "text",
              input: "Sam Altman 和 Sydney Sweeney 宣布 Sydney 成为新任 CTO",
            },
            brandTone: "广告质感",
            request: {
              sourceType: "text",
              sourceInput: "Sam Altman 和 Sydney Sweeney 宣布 Sydney 成为新任 CTO",
              shotCount: 9,
              videoProvider: "openai",
              videoModel: "sora-2",
              videoSeconds: 8,
            },
            planner: {
              title: "Sydney 成为新任 CTO",
              content_summary: "一条发布会风格的短片。",
              brand_tone: "利落冷静",
              visual_style: "广告质感",
              overall_prompt_guardrails: "舞台发布会",
              shots: [
                {
                  id: "shot_1",
                  goal: "建立发布会场景",
                  narrative_beat: "宣布任命",
                  image_prompt: "发布会大屏",
                  video_prompt: "聚光灯下的舞台",
                  camera: "wide shot",
                  duration_seconds: 4,
                },
              ],
            },
            storyboards: [],
            video: {
              provider: "openai",
              model: "sora-2",
              seconds: 8,
              path: "/Users/xiaoxianjie/888/data/runs/run_no_thumb/video/final.mp4",
            },
            error: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("已生成视频")).toBeTruthy();
  });
});
