import { describe, expect, it } from "vitest";
import {
  generationRequestSchema,
  runRecordSchema,
  runtimePreflightSchema,
  settingsSchema,
  settingsUpdateSchema,
} from "../../lib/schemas";

describe("Schema: web MVP", () => {
  it("defaults image requests to two portrait candidates", () => {
    const result = generationRequestSchema.parse({
      generationMode: "image",
      sourceType: "text",
      sourceInput: "A spring cafe window for a brand moodboard.",
      brandTone: "广告质感",
    });

    expect(result.generationMode).toBe("image");
    expect(result.imageAspect).toBe("portrait");
    expect(result.imageCount).toBe(2);
  });

  it("rejects image requests that try to use url input", () => {
    const result = generationRequestSchema.safeParse({
      generationMode: "image",
      sourceType: "url",
      sourceInput: "https://example.com/article",
      brandTone: "广告质感",
    });

    expect(result.success).toBe(false);
  });

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
      imageReady: true,
      availableVideoProviders: ["openai"],
      canGenerate: false,
      canGenerateImage: true,
      blockingReason: "当前规划器链路仅支持 OpenAI",
      imageBlockingReason: null,
    });

    expect(result.canGenerate).toBe(false);
    expect(result.canGenerateImage).toBe(true);
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

  it("accepts image runs with imaging status and image assets", () => {
    const result = runRecordSchema.parse({
      id: "run_image_123",
      createdAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z",
      status: "imaging",
      phaseLabel: "正在生成图片素材",
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
          prompt: "春天清晨的咖啡馆橱窗，柔和日光，适合品牌海报。",
          aspect: "portrait",
          path: "/tmp/run_image_123/images/image_1.png",
        },
      ],
      video: null,
      error: null,
      activePhase: "imaging",
      failedPhase: null,
    });

    expect(result.status).toBe("imaging");
    expect(result.images).toHaveLength(1);
    expect(result.request.generationMode).toBe("image");
  });
});
