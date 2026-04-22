// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { HistoryList } from "../../components/history-list";

const mockRefresh = vi.fn();

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe("HistoryList", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

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

  it("uses the first generated image as the history preview for image runs", () => {
    render(
      <HistoryList
        runs={[
          {
            id: "run_image_123",
            createdAt: "2026-04-17T00:00:00.000Z",
            updatedAt: "2026-04-17T00:00:00.000Z",
            status: "completed",
            phaseLabel: "生成完成",
            activePhase: null,
            failedPhase: null,
            source: {
              type: "text",
              input: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
            },
            brandTone: "广告质感",
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
                path: "/mock/data/runs/run_image_123/images/image_1.png",
              },
            ],
            video: null,
            error: null,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("img", { name: "春天清晨的咖啡馆橱窗，适合做品牌素材。" }),
    ).toBeTruthy();
  });

  it("shows an in-progress fallback label for image runs without previews yet", () => {
    render(
      <HistoryList
        runs={[
          {
            id: "run_image_loading",
            createdAt: "2026-04-17T00:00:00.000Z",
            updatedAt: "2026-04-17T00:00:00.000Z",
            status: "imaging",
            phaseLabel: "正在生成图片素材",
            activePhase: "imaging",
            failedPhase: null,
            source: {
              type: "text",
              input: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
            },
            brandTone: "广告质感",
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
            images: [],
            video: null,
            error: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("图片生成中")).toBeTruthy();
  });

  it("deletes a history card from the list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <HistoryList
        runs={[
          {
            id: "run_delete_123",
            createdAt: "2026-04-17T00:00:00.000Z",
            updatedAt: "2026-04-17T00:00:00.000Z",
            status: "completed",
            phaseLabel: "生成完成",
            activePhase: null,
            failedPhase: null,
            source: {
              type: "text",
              input: "古风竹林里，穿着汉服的少女撑剑斩落漫天樱花。",
            },
            brandTone: "唯美梦幻",
            request: {
              generationMode: "image",
              sourceType: "text",
              sourceInput: "古风竹林里，穿着汉服的少女撑剑斩落漫天樱花。",
              brandTone: "唯美梦幻",
              imageAspect: "portrait",
              imageCount: 4,
            },
            planner: null,
            storyboards: [],
            images: [],
            video: null,
            error: null,
          },
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /删除 古风竹林里，穿着汉服的少女撑剑斩落/ }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/runs/run_delete_123", {
        method: "DELETE",
      });
      expect(mockRefresh).toHaveBeenCalled();
      expect(
        screen.getByText("还没有创作记录，先开始第一条吧。"),
      ).toBeTruthy();
    });
  });
});
