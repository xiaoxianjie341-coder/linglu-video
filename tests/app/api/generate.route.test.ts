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
      availableVideoProviders: ["openai"],
      canGenerate: false,
      blockingReason: "Kling 当前还没有真实 API 适配器。",
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
});
