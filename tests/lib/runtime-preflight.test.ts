import { describe, expect, it } from "vitest";
import { resolveRuntimePreflight } from "../../lib/runtime-preflight";

describe("runtime preflight", () => {
  it("allows generation through Linglu when the OpenAI execution chain is unavailable", () => {
    const result = resolveRuntimePreflight(
      {
        openaiApiKey: "",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://test.linglu.ai/v1",
        klingApiKey: "",
        klingBaseUrl: "",
        jimengApiKey: "",
        jimengBaseUrl: "",
      },
      undefined,
      {},
    );

    expect(result.plannerReady).toBe(true);
    expect(result.storyboardImageReady).toBe(true);
    expect(result.canGenerate).toBe(true);
    expect(result.canGenerateImage).toBe(true);
    expect(result.availableVideoProviders).toEqual(["linglu"]);
    expect(result.blockingReason).toBeNull();
    expect(result.imageBlockingReason).toBeNull();
  });

  it("allows generation when linglu planner is configured and the OpenAI media chain remains available", () => {
    const result = resolveRuntimePreflight(
      {
        openaiApiKey: "sk-test-123",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://gateway.linglu.ai/v1",
        klingApiKey: "",
        klingBaseUrl: "",
        jimengApiKey: "",
        jimengBaseUrl: "",
      },
      undefined,
      {},
    );

    expect(result.plannerReady).toBe(true);
    expect(result.canGenerate).toBe(true);
    expect(result.canGenerateImage).toBe(true);
    expect(result.blockingReason).toBeNull();
  });

  it("only exposes implemented video providers on the homepage", () => {
    const result = resolveRuntimePreflight(
      {
        openaiApiKey: "sk-test-123",
        plannerProvider: "openai",
        lingluApiKey: "",
        lingluBaseUrl: "https://gateway.linglu.ai/v1",
        klingApiKey: "kling-key-123",
        klingBaseUrl: "https://api.kling.example/v1",
        jimengApiKey: "jimeng-key-123",
        jimengBaseUrl: "https://api.jimeng.example/v1",
      },
      undefined,
      {},
    );

    expect(result.availableVideoProviders).toEqual(["openai"]);
  });

  it("keeps image generation available when linglu planner is selected for image workflows", () => {
    const result = resolveRuntimePreflight(
      {
        openaiApiKey: "sk-test-123",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://gateway.linglu.ai/v1",
        klingApiKey: "",
        klingBaseUrl: "",
        jimengApiKey: "",
        jimengBaseUrl: "",
      },
      {
        generationMode: "image",
        sourceType: "text",
        sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
        imageAspect: "portrait",
        imageCount: 4,
      },
      {},
    );

    expect(result.canGenerate).toBe(true);
    expect(result.canGenerateImage).toBe(true);
    expect(result.imageBlockingReason).toBeNull();
    expect(result.blockingReason).toBeNull();
  });
});
