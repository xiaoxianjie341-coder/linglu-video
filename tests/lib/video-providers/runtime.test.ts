import { describe, expect, it } from "vitest";
import { resolveVideoProviderRuntime } from "../../../lib/video-providers/runtime";

describe("Video provider runtime", () => {
  it("uses the official OpenAI video runtime by default", () => {
    const runtime = resolveVideoProviderRuntime(
      {
        openaiApiKey: "sk-openai-test",
      },
      {
        videoProvider: "openai",
        videoModel: "sora-2",
      },
      {},
    );

    expect(runtime).toMatchObject({
      provider: "openai",
      apiKey: "sk-openai-test",
      model: "sora-2",
      implemented: true,
    });
    expect(runtime.baseURL).toBeUndefined();
  });

  it("resolves a Kling runtime from saved settings", () => {
    const runtime = resolveVideoProviderRuntime(
      {
        openaiApiKey: "sk-openai-test",
        klingApiKey: "kling-key-123",
        klingBaseUrl: "https://api.kling.example/v1",
      },
      {
        videoProvider: "kling",
        videoModel: "kling-image-to-video",
      },
      {},
    );

    expect(runtime).toMatchObject({
      provider: "kling",
      apiKey: "kling-key-123",
      baseURL: "https://api.kling.example/v1",
      model: "kling-image-to-video",
      implemented: false,
    });
  });

  it("falls back to environment variables for Jimeng", () => {
    const runtime = resolveVideoProviderRuntime(
      {
        openaiApiKey: "sk-openai-test",
      },
      {
        videoProvider: "jimeng",
        videoModel: "jimeng-image-to-video",
      },
      {
        JIMENG_API_KEY: "jimeng-key-123",
        JIMENG_BASE_URL: "https://api.jimeng.example/v1",
      } as NodeJS.ProcessEnv,
    );

    expect(runtime).toMatchObject({
      provider: "jimeng",
      apiKey: "jimeng-key-123",
      baseURL: "https://api.jimeng.example/v1",
      model: "jimeng-image-to-video",
      implemented: false,
    });
  });
});
