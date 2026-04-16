import { describe, expect, it } from "vitest";
import {
  extractPlannerTextFromChatCompletion,
  normalizePlannerOutput,
} from "../../../lib/openai/planner";

describe("OpenAI planner helpers", () => {
  it("keeps only the first four shots", () => {
    const result = normalizePlannerOutput({
      title: "Demo",
      content_summary: "Summary",
      brand_tone: "Bold",
      visual_style: "Cinematic",
      overall_prompt_guardrails: "No humans",
      shots: new Array(6).fill(null).map((_, index) => ({
        id: `shot_${index + 1}`,
        goal: "Goal",
        narrative_beat: "Beat",
        image_prompt: "Image prompt",
        video_prompt: "Video prompt",
        camera: "Wide shot",
        duration_seconds: 12,
      })),
    });

    expect(result.shots).toHaveLength(4);
    expect(result.shots[0]?.duration_seconds).toBe(8);
  });

  it("fills missing optional text fields with empty strings", () => {
    const result = normalizePlannerOutput({
      title: "Demo",
      content_summary: "Summary",
      shots: [
        {
          id: "shot_1",
          goal: "Goal",
          image_prompt: "Image prompt",
          video_prompt: "Video prompt",
        },
      ],
    });

    expect(result.brand_tone).toBe("");
    expect(result.visual_style).toBe("");
    expect(result.shots[0]?.camera).toBe("");
  });

  it("extracts JSON text from chat completion content parts", () => {
    const text = extractPlannerTextFromChatCompletion({
      choices: [
        {
          message: {
            content: [
              {
                type: "text",
                text: "{\"title\":\"Demo\",\"content_summary\":\"Summary\",\"shots\":[{\"goal\":\"Goal\",\"image_prompt\":\"Image\",\"video_prompt\":\"Video\"}]}",
              },
            ],
          },
        },
      ],
    });

    expect(text).toContain("\"title\":\"Demo\"");
  });
});
