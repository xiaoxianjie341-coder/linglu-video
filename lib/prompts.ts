interface PlannerPromptOptions {
  sourceContent: string;
  brandTone?: string;
  shotCount: number;
}

export function buildPlannerPrompt({
  sourceContent,
  brandTone,
  shotCount,
}: PlannerPromptOptions): string {
  const trimmedSource = sourceContent.trim().slice(0, 8000);
  const normalizedBrandTone = brandTone?.trim() || "Keep the output platform-ready, cinematic, and cohesive.";

  return [
    "You are an expert short-form video director.",
    "Turn the source material into a compact storyboard plan for an 8-second social video prototype.",
    "Return valid JSON only. Do not use markdown fences. Do not add explanations outside the JSON.",
    "IMPORTANT: You MUST write all the values in the JSON (except IDs) in Simplified Chinese (简体中文). The title, content_summary, narrative_beat, image_prompt, video_prompt, camera, and all other descriptive fields must be in Chinese.",
    `Create exactly ${shotCount} shots.`,
    "Each shot must include: id, goal, narrative_beat, image_prompt, video_prompt, camera, duration_seconds.",
    "Use vivid, production-ready prompts suitable for OpenAI image generation and Sora.",
    "Default every shot duration_seconds to 8.",
    `Brand tone: ${normalizedBrandTone}`,
    "Keep the prompts safe for OpenAI video policy. Avoid real public figures and copyrighted characters.",
    "",
    "Required JSON shape:",
    JSON.stringify(
      {
        title: "string",
        content_summary: "string",
        brand_tone: normalizedBrandTone,
        visual_style: "string",
        overall_prompt_guardrails: "string",
        shots: [
          {
            id: "shot_1",
            goal: "string",
            narrative_beat: "string",
            image_prompt: "string",
            video_prompt: "string",
            camera: "string",
            duration_seconds: 8,
          },
        ],
      },
      null,
      2,
    ),
    "",
    "Source material:",
    trimmedSource,
  ].join("\n");
}
