import { z } from "zod";

const plannerProviderSchema = z.enum(["openai", "linglu"]);

export const generationRequestSchema = z.object({
  sourceType: z.enum(["text", "url"]),
  sourceInput: z.string().min(1),
  brandTone: z.string().optional(),
  shotCount: z.number().int().min(1).max(4).default(3),
  videoModel: z.enum(["sora-2", "sora-2-pro"]).default("sora-2"),
  videoSeconds: z.number().int().min(4).max(20).default(8),
});

export const settingsSchema = z.object({
  openaiApiKey: z.string().min(1),
  plannerProvider: plannerProviderSchema.optional().default("openai"),
  lingluApiKey: z.string().optional().default(""),
  lingluBaseUrl: z
    .string()
    .url()
    .optional()
    .default("https://gateway.linglu.ai/v1"),
});

export const settingsUpdateSchema = z.object({
  openaiApiKey: z.string().min(1).optional(),
  plannerProvider: plannerProviderSchema.optional(),
  lingluApiKey: z.string().min(1).optional(),
  lingluBaseUrl: z.string().url().optional(),
});

export const storedSettingsSchema = z.object({
  openaiApiKey: z.string().optional().default(""),
  plannerProvider: plannerProviderSchema.optional().default("openai"),
  lingluApiKey: z.string().optional().default(""),
  lingluBaseUrl: z
    .string()
    .url()
    .optional()
    .default("https://gateway.linglu.ai/v1"),
});

export const shotSchema = z.object({
  id: z.string(),
  goal: z.string(),
  narrative_beat: z.string(),
  image_prompt: z.string(),
  video_prompt: z.string(),
  camera: z.string(),
  duration_seconds: z.number().int().min(1).max(20),
});

export const plannerOutputSchema = z.object({
  title: z.string(),
  content_summary: z.string(),
  brand_tone: z.string(),
  visual_style: z.string(),
  overall_prompt_guardrails: z.string(),
  shots: z.array(shotSchema).min(1).max(4),
});

export const storyboardAssetSchema = z.object({
  shotId: z.string(),
  imagePrompt: z.string(),
  videoPrompt: z.string(),
  path: z.string(),
});

export const videoAssetSchema = z.object({
  model: z.enum(["sora-2", "sora-2-pro"]),
  seconds: z.number().int().min(1).max(20),
  path: z.string(),
  thumbnailPath: z.string().optional(),
  jobId: z.string().optional(),
});

export const runStatusSchema = z.enum([
  "queued",
  "planning",
  "storyboarding",
  "videoing",
  "completed",
  "failed",
]);

export const runRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: runStatusSchema,
  phaseLabel: z.string(),
  source: z.object({
    type: z.enum(["text", "url"]),
    input: z.string(),
  }),
  brandTone: z.string().default(""),
  request: generationRequestSchema,
  planner: plannerOutputSchema.nullable().default(null),
  storyboards: z.array(storyboardAssetSchema).default([]),
  video: videoAssetSchema.nullable().default(null),
  error: z.string().nullable().default(null),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type WebSettings = z.infer<typeof settingsSchema>;
export type WebSettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type StoredSettings = z.infer<typeof storedSettingsSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type PlannerOutput = z.infer<typeof plannerOutputSchema>;
export type StoryboardAsset = z.infer<typeof storyboardAssetSchema>;
export type VideoAsset = z.infer<typeof videoAssetSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
