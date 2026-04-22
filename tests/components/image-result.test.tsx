// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImageResult } from "../../components/image-result";

describe("ImageResult", () => {
  it("renders two candidate slots, keeps loading placeholders, and hides raw prompts", () => {
    render(
      <ImageResult
        runId="run_image_123"
        expectedCount={2}
        isGenerating
        images={[
          {
            imageId: "image_1",
            index: 1,
            prompt: "RAW_PROMPT_ENGLISH_1",
            aspect: "portrait",
            path: "/mock/data/runs/run_image_123/images/image_1.png",
          },
        ]}
      />,
    );

    expect(screen.getByText("图片结果")).toBeTruthy();
    expect(screen.getAllByText("1 / 2 张已就绪")).toHaveLength(2);
    expect(screen.getByText("先看 2 张候选画面")).toBeTruthy();
    expect(screen.queryByText("RAW_PROMPT_ENGLISH_1")).toBeNull();
    expect(screen.getAllByText("生成中")).toHaveLength(1);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
