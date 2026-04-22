import { z } from "zod";
import { getDefaultVideoModel, VIDEO_PROVIDER_IDS } from "./video-providers/catalog";
import { DEFAULT_IMAGE_COUNT } from "./image-generation";

const generationModeSchema = z.enum(["video", "image"]);
const imageAspectSchema = z.enum(["portrait", "square", "landscape"]);
const plannerProviderSchema = z.enum(["openai", "linglu"]);
const videoProviderSchema = z.enum(VIDEO_PROVIDER_IDS);
const optionalUrlSchema = z.union([z.string().url(), z.literal("")]);

const requestBaseSchema = z.object({
  sourceType: z.enum(["text", "url"]),
  sourceInput: z.string().min(1),
  brandTone: z.string().optional(),
});

const videoGenerationRequestSchema = requestBaseSchema.extend({
  generationMode: z.literal("video").default("video"),
  shotCount: z.number().int().min(1).max(9).default(9),
  videoProvider: videoProviderSchema.default("openai"),
  videoModel: z.string().min(1).default(getDefaultVideoModel("openai")),
  videoSeconds: z.number().int().min(4).max(20).default(8),
});

const imageGenerationRequestSchema = requestBaseSchema.extend({
  generationMode: z.literal("image"),
  sourceType: z.literal("text"),
  imageAspect: imageAspectSchema.default("portrait"),
  imageCount: z.number().int().min(1).max(9).default(DEFAULT_IMAGE_COUNT),
});

export const generationRequestSchema = z.union([
  imageGenerationRequestSchema,
  videoGenerationRequestSchema,
]);

export const settingsSchema = z.object({
  openaiApiKey: z.string().min(1),
  plannerProvider: plannerProviderSchema.optional().default("openai"),
  lingluApiKey: z.string().optional().default(""),
  lingluBaseUrl: z
    .string()
    .url()
    .optional()
    .default("https://gateway.linglu.ai/v1"),
  klingApiKey: z.string().optional().default(""),
  klingBaseUrl: optionalUrlSchema.optional().default(""),
  jimengApiKey: z.string().optional().default(""),
  jimengBaseUrl: optionalUrlSchema.optional().default(""),
});

export const settingsUpdateSchema = z.object({
  openaiApiKey: z.string().min(1).optional(),
  plannerProvider: plannerProviderSchema.optional(),
  lingluApiKey: z.string().min(1).optional(),
  lingluBaseUrl: z.string().url().optional(),
  klingApiKey: z.string().min(1).optional(),
  klingBaseUrl: optionalUrlSchema.optional(),
  jimengApiKey: z.string().min(1).optional(),
  jimengBaseUrl: optionalUrlSchema.optional(),
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
  klingApiKey: z.string().optional().default(""),
  klingBaseUrl: optionalUrlSchema.optional().default(""),
  jimengApiKey: z.string().optional().default(""),
  jimengBaseUrl: optionalUrlSchema.optional().default(""),
});

export const shotSchema = z.object({
  id: z.string(),
  goal: z.string(),
  narrative_beat: z.string(),
  image_prompt: z.string(),
  video_prompt: z.string(),
  camera: z.string(),
  grid_index: z.number().int().min(1).max(9).optional(),
  frame_description: z.string().optional(),
  motion_extension: z.string().optional(),
  qa_focus: z.array(z.string()).optional(),
  duration_seconds: z.number().int().min(1).max(20),
});

export const plannerOutputSchema = z.object({
  title: z.string(),
  content_summary: z.string(),
  brand_tone: z.string(),
  visual_style: z.string(),
  overall_prompt_guardrails: z.string(),
  storyboard_grid_prompt: z.string().optional(),
  frozen_world: z
    .object({
      subject_type: z.string(),
      subject_identity: z.string(),
      setting: z.string(),
      time_of_day: z.string(),
      anchors: z.array(z.string()),
      negative_constraints: z.array(z.string()),
    })
    .optional(),
  shots: z.array(shotSchema).min(1).max(9),
});

export const storyboardAssetSchema = z.object({
  shotId: z.string(),
  imagePrompt: z.string(),
  videoPrompt: z.string(),
  path: z.string(),
  kind: z.enum(["grid", "panel"]).optional(),
  aspect: z.enum(["landscape", "portrait", "square"]).optional(),
  gridIndex: z.number().int().min(1).max(9).optional(),
  clipPath: z.string().optional(),
  qaVerdict: z.enum(["PASS", "FAIL"]).optional(),
  qaScore: z.number().min(0).max(100).optional(),
});

export const imageAssetSchema = z.object({
  imageId: z.string(),
  index: z.number().int().min(1).max(9),
  prompt: z.string(),
  aspect: imageAspectSchema,
  path: z.string(),
});

export const videoAssetSchema = z.object({
  provider: videoProviderSchema.default("openai"),
  model: z.string().min(1),
  seconds: z.number().int().min(1).max(300),
  path: z.string(),
  size: z.string().optional(),
  thumbnailPath: z.string().optional(),
  jobId: z.string().optional(),
});

export const runtimePreflightSchema = z.object({
  plannerReady: z.boolean(),
  storyboardImageReady: z.boolean(),
  imageReady: z.boolean().default(false),
  availableVideoProviders: z.array(videoProviderSchema),
  canGenerate: z.boolean(),
  canGenerateImage: z.boolean().default(false),
  blockingReason: z.string().nullable(),
  imageBlockingReason: z.string().nullable().default(null),
});

export const runPhaseSchema = z.enum([
  "planning",
  "storyboarding",
  "videoing",
  "imaging",
]);

export const runStatusSchema = z.enum([
  "queued",
  "planning",
  "storyboarding",
  "videoing",
  "imaging",
  "completed",
  "failed",
]);

export const runRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: runStatusSchema,
  phaseLabel: z.string(),
  activePhase: runPhaseSchema.nullable().default(null),
  failedPhase: runPhaseSchema.nullable().default(null),
  source: z.object({
    type: z.enum(["text", "url"]),
    input: z.string(),
  }),
  brandTone: z.string().default(""),
  request: generationRequestSchema,
  planner: plannerOutputSchema.nullable().default(null),
  storyboards: z.array(storyboardAssetSchema).default([]),
  images: z.array(imageAssetSchema).default([]),
  video: videoAssetSchema.nullable().default(null),
  error: z.string().nullable().default(null),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type GenerationMode = z.infer<typeof generationModeSchema>;
export type ImageAspect = z.infer<typeof imageAspectSchema>;
export type WebSettings = z.infer<typeof settingsSchema>;
export type WebSettingsUpdate = z.infer<typeof settingsUpdateSchema>;
export type StoredSettings = z.infer<typeof storedSettingsSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type PlannerOutput = z.infer<typeof plannerOutputSchema>;
export type StoryboardAsset = z.infer<typeof storyboardAssetSchema>;
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type VideoAsset = z.infer<typeof videoAssetSchema>;
export type RuntimePreflight = z.infer<typeof runtimePreflightSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
