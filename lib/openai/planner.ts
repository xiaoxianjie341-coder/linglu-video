import { plannerOutputSchema, type PlannerOutput } from "../schemas";
import { buildPlannerPrompt } from "../prompts";
import { getPlannerClient, getPlannerRuntime } from "./client";
import { withOpenAIReconnectRetry } from "./retry";

function stripCodeFences(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function extractJson(value: string): unknown {
  const normalized = stripCodeFences(value.trim());

  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf("{");
    const end = normalized.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("分镜规划结果不是合法的 JSON。");
    }

    return JSON.parse(normalized.slice(start, end + 1));
  }
}

type ChatCompletionTextPart = {
  type?: string;
  text?: string;
};

type PlannerChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | ChatCompletionTextPart[] | null;
    };
  }>;
};

export function extractPlannerTextFromChatCompletion(
  completion: PlannerChatCompletion,
): string {
  const content = completion.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error("分镜规划结果为空。");
}

type LooseShot = Partial<PlannerOutput["shots"][number]> & {
  id?: string;
};

type LoosePlannerOutput = Partial<Omit<PlannerOutput, "shots">> & {
  shots?: LooseShot[];
};

export function normalizePlannerOutput(
  input: LoosePlannerOutput,
): PlannerOutput {
  const shots = Array.isArray(input?.shots) ? input.shots.slice(0, 4) : [];

  if (shots.length === 0) {
    throw new Error("分镜规划结果里没有可用镜头。");
  }

  const normalized = {
    title: input.title ?? "",
    content_summary: input.content_summary ?? "",
    brand_tone: input.brand_tone ?? "",
    visual_style: input.visual_style ?? "",
    overall_prompt_guardrails: input.overall_prompt_guardrails ?? "",
    shots: shots.map((shot, index) => ({
      id: shot.id ?? `shot_${index + 1}`,
      goal: shot.goal ?? "",
      narrative_beat: shot.narrative_beat ?? "",
      image_prompt: shot.image_prompt ?? "",
      video_prompt: shot.video_prompt ?? "",
      camera: shot.camera ?? "",
      duration_seconds: 8,
    })),
  };

  return plannerOutputSchema.parse(normalized);
}

interface PlanShotsOptions {
  sourceContent: string;
  brandTone?: string;
  shotCount: number;
  baseDir?: string;
}

export async function planShots({
  sourceContent,
  brandTone,
  shotCount,
  baseDir,
}: PlanShotsOptions): Promise<PlannerOutput> {
  const runtime = await getPlannerRuntime(baseDir);
  const plannerPrompt = buildPlannerPrompt({
    sourceContent,
    brandTone,
    shotCount,
  });

  const rawText =
    runtime.apiMode === "chat"
      ? extractPlannerTextFromChatCompletion(
          await withOpenAIReconnectRetry(
            "分镜规划",
            async () => getPlannerClient(baseDir),
            async ({ client }) =>
              client.chat.completions.create({
                model: runtime.model,
                messages: [{ role: "user", content: plannerPrompt }],
              }),
          ),
        )
      : (
          await withOpenAIReconnectRetry(
            "分镜规划",
            async () => getPlannerClient(baseDir),
            async ({ client }) =>
              client.responses.create({
                model: runtime.model,
                input: plannerPrompt,
                reasoning: { effort: "medium" },
                text: { verbosity: "low" },
              }),
          )
        ).output_text;

  const rawOutput = extractJson(rawText);
  return normalizePlannerOutput(rawOutput as LoosePlannerOutput);
}
