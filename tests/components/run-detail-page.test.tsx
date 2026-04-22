// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { RunDetailPage } from "../../components/run-detail-page";

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
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("RunDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows user-facing image candidates without exposing raw prompts", () => {
    render(
      <RunDetailPage
        runId="run_image_123"
        initialRun={{
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
              imageCount: 2,
          },
          planner: null,
          storyboards: [],
          images: [
            {
              imageId: "image_1",
              index: 1,
              prompt: "RAW_PROMPT_SHOULD_NOT_BE_VISIBLE",
              aspect: "portrait",
              path: "/mock/data/runs/run_image_123/images/image_1.png",
            },
          ],
          video: null,
          error: null,
        }}
        recentRuns={[]}
        preflight={{
          plannerReady: true,
          storyboardImageReady: true,
          imageReady: true,
          availableVideoProviders: ["openai"],
          canGenerate: true,
          canGenerateImage: true,
          blockingReason: null,
          imageBlockingReason: null,
        }}
      />,
    );

    expect(screen.queryByText("RAW_PROMPT_SHOULD_NOT_BE_VISIBLE")).toBeNull();
  });

  it("shows two preview slots while an image run is still generating", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "run_image_456",
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
            imageCount: 2,
          },
          planner: null,
          storyboards: [],
          images: [],
          video: null,
          error: null,
        }),
      }),
    );

    render(
      <RunDetailPage
        runId="run_image_456"
        initialRun={{
          id: "run_image_456",
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
            imageCount: 2,
          },
          planner: null,
          storyboards: [],
          images: [],
          video: null,
          error: null,
        }}
        recentRuns={[]}
        preflight={{
          plannerReady: true,
          storyboardImageReady: true,
          imageReady: true,
          availableVideoProviders: ["openai"],
          canGenerate: true,
          canGenerateImage: true,
          blockingReason: null,
          imageBlockingReason: null,
        }}
      />,
    );

    expect(screen.getAllByText("0 / 2 张已就绪")).toHaveLength(2);
    expect(screen.getAllByText("生成中")).toHaveLength(2);
  });

  it("converts raw provider safety errors into user-facing Chinese copy", () => {
    render(
      <RunDetailPage
        runId="run_image_failed"
        initialRun={{
          id: "run_image_failed",
          createdAt: "2026-04-17T00:00:00.000Z",
          updatedAt: "2026-04-17T00:00:00.000Z",
          status: "failed",
          phaseLabel: "生成失败",
          activePhase: null,
          failedPhase: "imaging",
          source: {
            type: "text",
            input: "海边拥抱的情侣海报。",
          },
          brandTone: "广告质感",
          request: {
            generationMode: "image",
            sourceType: "text",
            sourceInput: "海边拥抱的情侣海报。",
            brandTone: "广告质感",
            imageAspect: "portrait",
            imageCount: 2,
          },
          planner: null,
          storyboards: [],
          images: [],
          video: null,
          error:
            "400 Your request was rejected by the safety system. If you believe this is an error, contact us at help.openai.com and include the request ID req_xxx, safety_violations=[sexual].",
        }}
        recentRuns={[]}
        preflight={{
          plannerReady: true,
          storyboardImageReady: true,
          imageReady: true,
          availableVideoProviders: ["openai"],
          canGenerate: true,
          canGenerateImage: true,
          blockingReason: null,
          imageBlockingReason: null,
        }}
      />,
    );

    expect(
      screen.getByText("这次画面描述触发了安全限制，换个更日常、克制一点的说法再试。"),
    ).toBeTruthy();
    expect(screen.queryByText(/help\.openai\.com/i)).toBeNull();
    expect(screen.queryByText(/safety system/i)).toBeNull();
  });
});
