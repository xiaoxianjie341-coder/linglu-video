// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputPanel } from "../../components/input-panel";

describe("InputPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("switches to image mode from the dropdown and submits an image generation request", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <InputPanel
        onSubmit={handleSubmit}
        isSubmitting={false}
        preflight={{
          plannerReady: true,
          storyboardImageReady: true,
          imageReady: true,
          availableVideoProviders: ["openai"],
          canGenerate: true,
          canGenerateImage: true,
          blockingReason: null,
          imageBlockingReason: null,
        }}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "输入框创作模式" }),
    );
    await userEvent.click(
      screen.getByRole("menuitemradio", { name: "切换到图片生成" }),
    );

    expect(screen.queryByRole("button", { name: "公开链接" })).toBeNull();
    expect(screen.queryByLabelText("视频引擎")).toBeNull();
    expect(screen.queryByLabelText("视频模型")).toBeNull();
    expect(screen.queryByLabelText("视频时长")).toBeNull();
    expect(screen.getByLabelText("图片画幅")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "输入框创作模式" }).textContent,
    ).toContain("图片生成");

    await userEvent.type(
      screen.getByLabelText("一句话灵感"),
      "春天清晨的咖啡馆橱窗，适合做品牌素材。",
    );
    await userEvent.click(screen.getByRole("button", { name: /开始生成/i }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        generationMode: "image",
        sourceType: "text",
        sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
        imageAspect: "portrait",
        imageCount: 2,
      }),
    );
  });

  it("keeps the mode dropdown visible instead of clipping it inside the toolbar area", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <InputPanel
        onSubmit={handleSubmit}
        isSubmitting={false}
        preflight={{
          plannerReady: true,
          storyboardImageReady: true,
          imageReady: true,
          availableVideoProviders: ["openai"],
          canGenerate: true,
          canGenerateImage: true,
          blockingReason: null,
          imageBlockingReason: null,
        }}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "输入框创作模式" }),
    );

    const dropdownButton = screen.getByRole("button", { name: "输入框创作模式" });
    const toolbarWrapper = dropdownButton.parentElement?.parentElement;

    expect(toolbarWrapper?.className).toContain("overflow-visible");
    expect(screen.getByRole("menuitemradio", { name: "切换到视频生成" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "切换到图片生成" })).toBeTruthy();
  });
});
