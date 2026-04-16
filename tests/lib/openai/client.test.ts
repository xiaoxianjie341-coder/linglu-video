import { describe, expect, it } from "vitest";
import { resolvePlannerRuntime } from "../../../lib/openai/client";

describe("OpenAI client routing", () => {
  it("uses the official OpenAI responses API by default", () => {
    const runtime = resolvePlannerRuntime(
      {
        openaiApiKey: "sk-openai-test",
      },
      {},
    );

    expect(runtime).toMatchObject({
      provider: "openai",
      apiKey: "sk-openai-test",
      apiMode: "responses",
      model: "gpt-5.4",
    });
    expect(runtime.baseURL).toBeUndefined();
  });

  it("uses Linglu chat completions when a planner gateway is configured", () => {
    const runtime = resolvePlannerRuntime(
      {
        openaiApiKey: "sk-openai-test",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://gateway.linglu.ai/v1",
      },
      {},
    );

    expect(runtime).toMatchObject({
      provider: "linglu",
      apiKey: "ll-test-123",
      apiMode: "chat",
      baseURL: "https://gateway.linglu.ai/v1",
      model: "gpt-5.4",
    });
  });
});
