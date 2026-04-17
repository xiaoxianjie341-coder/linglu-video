// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { HistoryList } from "../../components/history-list";

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

describe("HistoryList", () => {
  it("links each history card to the dedicated run detail page with a user-friendly title", () => {
    render(
      <HistoryList
        runs={[
          {
            id: "run_123",
            createdAt: "2026-04-17T00:00:00.000Z",
            updatedAt: "2026-04-17T00:00:00.000Z",
            status: "completed",
            phaseLabel: "生成完成",
            activePhase: null,
            failedPhase: null,
            source: {
              type: "text",
              input: "一只茶壶吉祥物在夜市里发现发光的门。",
            },
            brandTone: "电影感",
            request: {
              sourceType: "text",
              sourceInput: "一只茶壶吉祥物在夜市里发现发光的门。",
              shotCount: 9,
              videoProvider: "openai",
              videoModel: "sora-2",
              videoSeconds: 8,
            },
            planner: {
              title: "茶壶夜市奇遇",
              content_summary: "一只茶壶吉祥物在夜市里发现发光的门。",
              brand_tone: "电影感",
              visual_style: "质感电影",
              overall_prompt_guardrails: "温暖夜景",
              shots: [
                {
                  id: "shot_1",
                  goal: "建立夜市场景",
                  narrative_beat: "主角登场",
                  image_prompt: "夜市里的茶壶吉祥物",
                  video_prompt: "茶壶吉祥物穿过夜市",
                  camera: "wide shot",
                  duration_seconds: 4,
                },
              ],
            },
            storyboards: [],
            video: null,
            error: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("茶壶夜市奇遇")).toBeTruthy();
    expect(screen.queryByText("run_123")).toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/runs/run_123");
  });
});
