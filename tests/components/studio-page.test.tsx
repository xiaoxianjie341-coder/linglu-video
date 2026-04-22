// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioPage } from "../../components/studio-page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("StudioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("switches mode from the small hero arrow menu and syncs the input panel", async () => {
    render(
      <StudioPage
        initialRuns={[]}
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
      screen.getByRole("button", { name: "顶部创作模式" }).textContent,
    ).toContain("视频生成");

    await userEvent.click(
      screen.getByRole("button", { name: "顶部创作模式" }),
    );
    await userEvent.click(
      screen.getByRole("menuitemradio", { name: "切换到图片生成" }),
    );

    expect(
      screen.getByRole("button", { name: "顶部创作模式" }).textContent,
    ).toContain("图片生成");
    expect(
      screen.getByText(/先写下一句话，先生成 2 张可挑选的图片素材/),
    ).toBeTruthy();
    expect(screen.getByLabelText("图片画幅")).toBeTruthy();
    expect(screen.queryByLabelText("视频引擎")).toBeNull();
    expect(screen.queryByRole("button", { name: "公开链接" })).toBeNull();
  });

  it("navigates to /runs/[id] after a successful homepage submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runId: "run_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StudioPage
        initialRuns={[]}
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

    await userEvent.clear(screen.getByLabelText(/一句话灵感/i));
    await userEvent.type(
      screen.getByLabelText(/一句话灵感/i),
      "一只茶壶吉祥物在夜市里发现发光的门。",
    );
    await userEvent.click(screen.getByRole("button", { name: /开始生成/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/runs/run_123");
    });
  });

  it("submits the selected style preset instead of free text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ runId: "run_456" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StudioPage
        initialRuns={[]}
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

    await userEvent.type(
      screen.getByLabelText(/一句话灵感/i),
      "一只茶壶吉祥物在夜市里发现发光的门。",
    );
    await userEvent.selectOptions(screen.getByLabelText(/风格预设/i), "质感电影");
    await userEvent.click(screen.getByRole("button", { name: /开始生成/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.body).toContain("质感电影");
  });

  it("removes a recent run from the homepage after deletion", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/runs/run_123" && init?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ runId: "unused" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StudioPage
        initialRuns={[
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
            brandTone: "质感电影",
            request: {
              sourceType: "text",
              sourceInput: "一只茶壶吉祥物在夜市里发现发光的门。",
              shotCount: 9,
              videoProvider: "openai",
              videoModel: "sora-2",
              videoSeconds: 8,
            },
            planner: null,
            storyboards: [],
            video: {
              provider: "openai",
              model: "sora-2",
              seconds: 8,
              path: "/mock/data/runs/run_123/video/final.mp4",
            },
            error: null,
          },
        ]}
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
      screen.getAllByText(/一只茶壶吉祥物在夜市里发现发光的门/).length,
    ).toBeGreaterThan(0);

    await userEvent.click(
      screen.getByRole("button", { name: /删除 一只茶壶吉祥物在夜市里发现发光的门/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryAllByText(/一只茶壶吉祥物在夜市里发现发光的门/),
      ).toHaveLength(0);
    });
  });
});
