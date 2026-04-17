import { describe, expect, it } from "vitest";
import {
  generationRequestSchema,
  runRecordSchema,
  runtimePreflightSchema,
  settingsSchema,
  settingsUpdateSchema,
} from "../../lib/schemas";

describe("Schema: web MVP", () => {
  it("defaults to full 9-shot generation for text requests", () => {
    const result = generationRequestSchema.parse({
      sourceType: "text",
      sourceInput: "A moss-covered teapot mascot explores a lantern-lit night market.",
      videoModel: "sora-2",
      videoSeconds: 8,
    });

    expect(result.sourceType).toBe("text");
    expect(result.shotCount).toBe(9);
    expect(result.videoProvider).toBe("openai");
    expect(result.videoModel).toBe("sora-2");
  });

  it("rejects requests with more than nine shots", () => {
    const result = generationRequestSchema.safeParse({
      sourceType: "text",
      sourceInput: "Too many shots",
      shotCount: 10,
      videoModel: "sora-2",
      videoSeconds: 8,
    });

    expect(result.success).toBe(false);
  });

  it("validates settings payloads with an OpenAI API key", () => {
    const result = settingsSchema.parse({
      openaiApiKey: "sk-test-123",
    });

    expect(result.openaiApiKey).toContain("sk-");
  });

  it("accepts Linglu planner settings alongside the local OpenAI key", () => {
    const result = settingsSchema.parse({
      openaiApiKey: "sk-test-123",
      plannerProvider: "linglu",
      lingluApiKey: "ll-test-123",
      lingluBaseUrl: "https://gateway.linglu.ai/v1",
      klingApiKey: "kling-key-123",
      klingBaseUrl: "https://api.kling.example/v1",
      jimengApiKey: "jimeng-key-123",
      jimengBaseUrl: "https://api.jimeng.example/v1",
    });

    expect(result.plannerProvider).toBe("linglu");
    expect(result.lingluApiKey).toBe("ll-test-123");
    expect(result.lingluBaseUrl).toBe("https://gateway.linglu.ai/v1");
    expect(result.klingApiKey).toBe("kling-key-123");
    expect(result.jimengApiKey).toBe("jimeng-key-123");
  });

  it("accepts planner-only settings updates without requiring a new OpenAI key", () => {
    const result = settingsUpdateSchema.parse({
      plannerProvider: "linglu",
      lingluApiKey: "ll-test-123",
      lingluBaseUrl: "https://gateway.linglu.ai/v1",
    });

    expect(result.plannerProvider).toBe("linglu");
    expect(result.lingluApiKey).toBe("ll-test-123");
  });

  it("validates homepage runtime preflight payloads", () => {
    const result = runtimePreflightSchema.parse({
      plannerReady: false,
      storyboardImageReady: true,
      availableVideoProviders: ["openai"],
      canGenerate: false,
      blockingReason: "当前规划器链路仅支持 OpenAI",
    });

    expect(result.canGenerate).toBe(false);
    expect(result.availableVideoProviders).toEqual(["openai"]);
  });

  it("accepts run records with active and failed phase metadata", () => {
    const result = runRecordSchema.parse({
      id: "run_123",
      createdAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z",
      status: "failed",
      phaseLabel: "生成失败",
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
      planner: null,
      storyboards: [],
      video: null,
      error: "grid failed",
      activePhase: "storyboarding",
      failedPhase: "storyboarding",
    });

    expect(result.activePhase).toBe("storyboarding");
    expect(result.failedPhase).toBe("storyboarding");
  });
});
