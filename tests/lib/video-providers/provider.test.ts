import { describe, expect, it } from "vitest";
import { assertVideoProviderImplemented } from "../../../lib/video-providers/provider";

describe("Video provider execution guard", () => {
  it("allows the OpenAI provider to execute", () => {
    expect(() =>
      assertVideoProviderImplemented({
        provider: "openai",
        apiKey: "sk-openai-test",
        model: "sora-2",
        implemented: true,
      }),
    ).not.toThrow();
  });

  it("throws a clear message for a prewired but unimplemented Kling adapter", () => {
    expect(() =>
      assertVideoProviderImplemented({
        provider: "kling",
        apiKey: "kling-key-123",
        baseURL: "https://api.kling.example/v1",
        model: "kling-image-to-video",
        implemented: false,
      }),
    ).toThrow(/Kling.*已预留接入位.*待补 API 适配器/u);
  });
});
