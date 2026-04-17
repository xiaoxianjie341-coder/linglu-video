// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsForm } from "../../components/settings-form";

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          hasOpenAiKey: true,
          plannerProvider: "openai",
          hasLingluKey: false,
          lingluBaseUrl: "https://gateway.linglu.ai/v1",
          hasKlingKey: false,
          klingBaseUrl: "",
          hasJimengKey: false,
          jimengBaseUrl: "",
          runtimePreflight: {
            plannerReady: true,
            storyboardImageReady: true,
            availableVideoProviders: ["openai"],
            canGenerate: true,
            blockingReason: null,
          },
        }),
      }),
    );
  });

  it("renders runtime preflight status and posts updates back to /api/settings", async () => {
    const fetchMock = vi.mocked(global.fetch);

    render(
      <SettingsForm
        initialSettings={{
          hasOpenAiKey: false,
          plannerProvider: "openai",
          hasLingluKey: false,
          lingluBaseUrl: "https://gateway.linglu.ai/v1",
          hasKlingKey: false,
          klingBaseUrl: "",
          hasJimengKey: false,
          jimengBaseUrl: "",
        }}
        runtimePreflight={{
          plannerReady: false,
          storyboardImageReady: false,
          availableVideoProviders: [],
          canGenerate: false,
          blockingReason: "暂时无法开始生成，请先补齐 OpenAI 配置。",
        }}
      />,
    );

    expect(screen.getAllByText(/暂时无法开始生成/).length).toBeGreaterThan(0);

    await userEvent.type(screen.getByLabelText(/OpenAI API Key/i), "sk-123");
    await userEvent.click(screen.getByRole("button", { name: /保存设置/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
