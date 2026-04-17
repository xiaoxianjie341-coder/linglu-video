import { describe, expect, it } from "vitest";
import { resolveRuntimePreflight } from "../../lib/runtime-preflight";

describe("runtime preflight", () => {
  it("blocks generation when the OpenAI execution chain is unavailable", () => {
    const result = resolveRuntimePreflight(
      {
        openaiApiKey: "",
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

    expect(result.canGenerate).toBe(false);
    expect(result.blockingReason).toContain("OpenAI");
  });

  it("still blocks generation when linglu is configured but the real planner chain is not executable", () => {
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

    expect(result.plannerReady).toBe(false);
    expect(result.canGenerate).toBe(false);
    expect(result.blockingReason).toContain("当前规划器链路仅支持 OpenAI");
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
});
