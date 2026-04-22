import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  createRun: vi.fn(),
  runGeneration: vi.fn(),
  loadRuntimePreflight: vi.fn(),
}));

vi.mock("../../../lib/storage", () => ({
  createRun: mocked.createRun,
}));

vi.mock("../../../lib/pipeline/run-generation", () => ({
  runGeneration: mocked.runGeneration,
}));

vi.mock("../../../lib/runtime-preflight", () => ({
  loadRuntimePreflight: mocked.loadRuntimePreflight,
}));

import { POST } from "../../../app/api/generate/route";

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createRun.mockResolvedValue({ id: "run_123" });
    mocked.loadRuntimePreflight.mockResolvedValue({
      plannerReady: true,
      storyboardImageReady: true,
      imageReady: true,
      availableVideoProviders: ["openai"],
      canGenerate: false,
      canGenerateImage: false,
      blockingReason: "Kling 当前还没有真实 API 适配器。",
      imageBlockingReason:
        "还没有配置 OpenAI API Key，请先在设置页保存，或设置 OPENAI_API_KEY 环境变量。",
    });
  });

  it("rejects generation requests when preflight says the requested provider cannot run", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceType: "text",
          sourceInput: "一只茶壶吉祥物在夜市里发现发光的门。",
          brandTone: "电影感",
          shotCount: 9,
          videoProvider: "kling",
          videoModel: "kling-v1",
          videoSeconds: 8,
        }),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Kling");
    expect(mocked.createRun).not.toHaveBeenCalled();
    expect(mocked.runGeneration).not.toHaveBeenCalled();
  });

  it("accepts image generation requests when image preflight is available even if video generation is blocked", async () => {
    mocked.loadRuntimePreflight.mockResolvedValueOnce({
      plannerReady: false,
      storyboardImageReady: true,
      imageReady: true,
      availableVideoProviders: ["openai"],
      canGenerate: false,
      canGenerateImage: true,
      blockingReason: "当前规划器链路仅支持 OpenAI，灵鹿已预留但暂不可执行。",
      imageBlockingReason: null,
    });

    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationMode: "image",
          sourceType: "text",
          sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
          brandTone: "广告质感",
          imageAspect: "portrait",
          imageCount: 4,
        }),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.runId).toBe("run_123");
    expect(mocked.loadRuntimePreflight).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        generationMode: "image",
      }),
    );
    expect(mocked.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        generationMode: "image",
        imageCount: 4,
      }),
    );
    expect(mocked.runGeneration).toHaveBeenCalledWith(
      "run_123",
      expect.objectContaining({
        generationMode: "image",
      }),
    );
  });
});
