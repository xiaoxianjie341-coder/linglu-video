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
          availableVideoProviders: ["openai"],
          canGenerate: true,
          blockingReason: null,
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
          availableVideoProviders: ["openai"],
          canGenerate: true,
          blockingReason: null,
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
              path: "/Users/xiaoxianjie/888/data/runs/run_123/video/final.mp4",
            },
            error: null,
          },
        ]}
        preflight={{
          plannerReady: true,
          storyboardImageReady: true,
          availableVideoProviders: ["openai"],
          canGenerate: true,
          blockingReason: null,
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
