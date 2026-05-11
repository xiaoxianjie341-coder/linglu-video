import { describe, expect, it } from "vitest";
import {
  resolveImageGenerationRuntime,
  resolvePlannerRuntime,
} from "../../../lib/openai/client";

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

  it("allows the Linglu planner model to be changed by environment", () => {
    const runtime = resolvePlannerRuntime(
      {
        openaiApiKey: "",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://gateway.linglu.ai/v1",
      },
      {
        LINGLU_PLANNER_MODEL: "gpt-5.5",
      } as NodeJS.ProcessEnv,
    );

    expect(runtime.model).toBe("gpt-5.5");
  });

  it("uses the Linglu image model by default when Linglu is selected", () => {
    const runtime = resolveImageGenerationRuntime(
      {
        openaiApiKey: "",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://test.linglu.ai/v1",
      },
      {},
    );

    expect(runtime).toMatchObject({
      provider: "linglu",
      apiKey: "ll-test-123",
      baseURL: "https://test.linglu.ai/v1",
      model: "gpt-image-1",
    });
  });

  it("allows the Linglu image model to be changed by environment", () => {
    const runtime = resolveImageGenerationRuntime(
      {
        openaiApiKey: "",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://test.linglu.ai/v1",
      },
      {
        LINGLU_IMAGE_MODEL: "gpt-image-1.5",
      } as NodeJS.ProcessEnv,
    );

    expect(runtime.model).toBe("gpt-image-1.5");
  });
});
