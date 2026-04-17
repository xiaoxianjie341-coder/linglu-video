import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readSettings: vi.fn(),
  updateSettings: vi.fn(),
  loadRuntimePreflight: vi.fn(),
}));

vi.mock("../../../lib/storage", () => ({
  readSettings: mocked.readSettings,
  updateSettings: mocked.updateSettings,
}));

vi.mock("../../../lib/runtime-preflight", () => ({
  loadRuntimePreflight: mocked.loadRuntimePreflight,
}));

import { GET, POST } from "../../../app/api/settings/route";

describe("/api/settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.readSettings.mockResolvedValue({
      openaiApiKey: "sk-test-123",
      plannerProvider: "openai",
      lingluApiKey: "",
      lingluBaseUrl: "https://gateway.linglu.ai/v1",
      klingApiKey: "",
      klingBaseUrl: "",
      jimengApiKey: "",
      jimengBaseUrl: "",
    });
    mocked.updateSettings.mockResolvedValue({
      openaiApiKey: "sk-test-123",
      plannerProvider: "openai",
      lingluApiKey: "",
      lingluBaseUrl: "https://gateway.linglu.ai/v1",
      klingApiKey: "",
      klingBaseUrl: "",
      jimengApiKey: "",
      jimengBaseUrl: "",
    });
    mocked.loadRuntimePreflight.mockResolvedValue({
      plannerReady: true,
      storyboardImageReady: true,
      availableVideoProviders: ["openai"],
      canGenerate: true,
      blockingReason: null,
    });
  });

  it("returns homepage runtime preflight metadata from GET", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(payload.runtimePreflight).toEqual(
      expect.objectContaining({
        canGenerate: true,
        availableVideoProviders: ["openai"],
      }),
    );
  });

  it("returns the latest runtime preflight after POST updates", async () => {
    const response = await POST(
      new Request("http://localhost/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          openaiApiKey: "sk-next-123",
        }),
      }),
    );
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.runtimePreflight).toEqual(
      expect.objectContaining({
        canGenerate: true,
      }),
    );
  });
});
