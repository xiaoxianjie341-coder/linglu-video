import { describe, expect, it } from "vitest";
import {
  generationRequestSchema,
  settingsSchema,
  settingsUpdateSchema,
} from "../../lib/schemas";

describe("Schema: web MVP", () => {
  it("accepts a minimal text generation request", () => {
    const result = generationRequestSchema.parse({
      sourceType: "text",
      sourceInput: "A moss-covered teapot mascot explores a lantern-lit night market.",
      shotCount: 3,
      videoModel: "sora-2",
      videoSeconds: 8,
    });

    expect(result.sourceType).toBe("text");
    expect(result.shotCount).toBe(3);
    expect(result.videoModel).toBe("sora-2");
  });

  it("rejects requests with more than four shots", () => {
    const result = generationRequestSchema.safeParse({
      sourceType: "text",
      sourceInput: "Too many shots",
      shotCount: 5,
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
    });

    expect(result.plannerProvider).toBe("linglu");
    expect(result.lingluApiKey).toBe("ll-test-123");
    expect(result.lingluBaseUrl).toBe("https://gateway.linglu.ai/v1");
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
});
