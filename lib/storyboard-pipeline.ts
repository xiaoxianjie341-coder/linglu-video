import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { z } from "zod";
import { fetchSourceContent } from "./fetch-source";
import {
  getOpenAIClient,
  getOpenAITransport,
  getPlannerClient,
  getPlannerRuntime,
} from "./openai/client";
import { normalizeLandscapeStoryboardImage } from "./openai/image";
import { withOpenAIReconnectRetry, withOpenAIRetry } from "./openai/retry";
import { normalizeStringArray } from "./string-array";
import { getDataDir } from "./storage";
import {
  generateVideoFromReference,
  type GeneratedVideoArtifact,
} from "./video-providers/provider";
import type { VideoProviderId } from "./video-providers/catalog";

const execFileAsync = promisify(execFile);
const VIDEO_POLL_INTERVAL_MS = 10_000;

type SourceType = "text" | "url";
type VideoModel = string;
type ClipSeconds = 4 | 8 | 12;
type PipelineStatus = "planning" | "storyboarding" | "videoing";
export type StoryboardGenerationMode = "grid_preview" | "panel_sequence";

const normalizedShotSchema = z.object({
  id: z.string(),
  grid_index: z.number().int().min(1).max(9),
  goal: z.string(),
  narrative_beat: z.string(),
  camera: z.string(),
  frame_description: z.string(),
  motion_extension: z.string(),
  qa_focus: z.array(z.string()).min(1),
  duration_seconds: z.number().int().min(4).max(12),
});

const normalizedPlanSchema = z.object({
  title: z.string(),
  content_summary: z.string(),
  brand_tone: z.string(),
  visual_style: z.string(),
  frozen_world: z.object({
    subject_type: z.string(),
    subject_identity: z.string(),
    setting: z.string(),
    time_of_day: z.string(),
    anchors: z.array(z.string()).min(3),
    negative_constraints: z.array(z.string()).min(3),
  }),
  shots: z.array(normalizedShotSchema).length(9),
});

const qaResultSchema = z.object({
  verdict: z.enum(["PASS", "FAIL"]),
  score: z.number().min(0).max(100),
  fail_reasons: z.array(z.string()),
  retry_instructions: z.string(),
});

type NormalizedShot = z.infer<typeof normalizedShotSchema>;
type NormalizedPlan = z.infer<typeof normalizedPlanSchema>;
type QaResult = z.infer<typeof qaResultSchema>;

export interface StoryboardPipelineOptions {
  runId?: string;
  sourceType: SourceType;
  sourceInput: string;
  brandTone?: string;
  videoProvider?: VideoProviderId;
  videoModel?: VideoModel;
  clipSeconds?: number;
  limitShots?: number;
  maxRetries?: number;
  skipVideo?: boolean;
  skipQa?: boolean;
  generationMode?: StoryboardGenerationMode;
  outputDir?: string;
  baseDir?: string;
  onPhase?: (
    status: PipelineStatus,
    phaseLabel: string,
  ) => Promise<void> | void;
  onPlanner?: (plan: ResolvedPlan) => Promise<void> | void;
  onStoryboard?: (payload: {
    plan: ResolvedPlan;
    gridPath: string;
    generationMode: StoryboardGenerationMode;
    selectedShotIds: string[];
  }) => Promise<void> | void;
  onVideo?: (video: GeneratedVideoArtifact) => Promise<void> | void;
}

export interface ShotExecutionArtifact {
  shotId: string;
  gridIndex: number;
  cropPath: string;
  referencePath: string;
  acceptedVideoPath?: string;
  acceptedFirstFramePath?: string;
  attempts: Array<{
    attempt: number;
    videoPath?: string;
    firstFramePath?: string;
    qaPath?: string;
    qa?: QaResult;
  }>;
}

export interface StoryboardPipelineResult {
  runId: string;
  outputDir: string;
  sourcePath: string;
  planPath: string;
  gridPath: string;
  generationMode: StoryboardGenerationMode;
  selectedShots: string[];
  finalVideoPath?: string;
  finalVideo?: {
    provider: VideoProviderId;
    model: string;
    path: string;
    seconds: number;
    size: string;
    thumbnailPath?: string;
    jobId?: string;
  };
  summaryPath: string;
  shots: ShotExecutionArtifact[];
}

export interface ResolvedShot extends NormalizedShot {
  video_prompt: string;
}

export interface ResolvedPlan extends Omit<NormalizedPlan, "shots"> {
  storyboard_grid_prompt: string;
  shots: ResolvedShot[];
}

interface Directories {
  root: string;
  storyboard: string;
  crops: string;
  references: string;
  video: string;
  qa: string;
  frames: string;
  manifests: string;
}

interface OpenAIVideoJob {
  id?: string;
  status?: string;
  progress?: number;
  error?: { message?: string | null } | null;
  seconds?: string | number;
}

function normalizeClipSeconds(value: number | undefined): ClipSeconds {
  if (!value || Number.isNaN(value)) return 8;
  if (value <= 4) return 4;
  if (value <= 8) return 8;
  return 12;
}

function toVideoSecondsLiteral(seconds: ClipSeconds): "4" | "8" | "12" {
  return String(seconds) as "4" | "8" | "12";
}

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
      throw new Error("模型输出不是合法 JSON。");
    }

    return JSON.parse(normalized.slice(start, end + 1));
  }
}

function clampText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizePlannerOutput(
  raw: unknown,
  brandTone: string,
  clipSeconds: ClipSeconds,
): NormalizedPlan {
  const input = (raw ?? {}) as Record<string, unknown>;
  const rawShots = Array.isArray(input.shots)
    ? (input.shots as Array<Record<string, unknown>>)
    : [];

  if (rawShots.length < 9) {
    throw new Error(
      `规划结果里的镜头数量不足 9 个，当前只有 ${rawShots.length} 个。`,
    );
  }

  const normalizedShots = rawShots
    .slice(0, 9)
    .map((shot, index) => {
      const qaFallback = [
        "主体必须还是同一个个体",
        "外观锚点不能漂移",
        "镜头意图必须与当前格一致",
      ];

      return {
        id: `shot_${String(index + 1).padStart(2, "0")}`,
        grid_index: index + 1,
        goal: clampText(shot.goal, `推进第 ${index + 1} 格叙事`),
        narrative_beat: clampText(
          shot.narrative_beat,
          `第 ${index + 1} 格承担连续剧情推进。`,
        ),
        camera: clampText(shot.camera, "中景镜头，保持电影感连贯性"),
        frame_description: clampText(
          shot.frame_description,
          "同一主体在连贯的画面中继续剧情",
        ),
        motion_extension: clampText(
          shot.motion_extension,
          "通过克制而自然的动作让画面生动起来",
        ),
        qa_focus: normalizeStringArray(shot.qa_focus, qaFallback),
        duration_seconds: clipSeconds,
      };
    })
    .sort((left, right) => left.grid_index - right.grid_index);

  const frozenWorldInput =
    typeof input.frozen_world === "object" && input.frozen_world
      ? (input.frozen_world as Record<string, unknown>)
      : {};

  return normalizedPlanSchema.parse({
    title: clampText(input.title, "3x3 分镜工作流任务"),
    content_summary: clampText(
      input.content_summary,
      "根据原始内容补全后得到的一条短视频连续剧情。",
    ),
    brand_tone: clampText(input.brand_tone, brandTone),
    visual_style: clampText(
      input.visual_style,
      "电影感、风格统一、物理逻辑合理、情绪易读",
    ),
    frozen_world: {
      subject_type: clampText(frozenWorldInput.subject_type, "单一主体"),
      subject_identity: clampText(
        frozenWorldInput.subject_identity,
        "九格画面中保持同一个核心主体",
      ),
      setting: clampText(
        frozenWorldInput.setting,
        "一个连贯的环境，场景可以有合理的局部变化",
      ),
      time_of_day: clampText(
        frozenWorldInput.time_of_day,
        "除非剧情有明确跳转，否则保持相同的时间和光照氛围",
      ),
      anchors: normalizeStringArray(
        frozenWorldInput.anchors,
        [
          "相同的面部特征或物种特征",
          "相同的服装、毛发纹理或表面特征",
          "相同的身体比例和视觉风格",
        ],
        3,
      ),
      negative_constraints: normalizeStringArray(
        frozenWorldInput.negative_constraints,
        [
          "不要更换角色",
          "不要改变服装、毛发或材质",
          "不要出现风格突变、年龄突变或无关场景重置",
        ],
        3,
      ),
    },
    shots: normalizedShots,
  });
}

function buildPlannerPrompt(sourceContent: string, brandTone: string): string {
  const trimmedSource = sourceContent.trim().slice(0, 8000);

  return [
    "You are a professional film storyboard director building a backend-only generation pipeline.",
    "The input is raw source content. It may be a single sentence, not a complete script.",
    "You must do one-time completion only once, freeze the subject/world, then decompose the story into exactly 9 shots for a 3x3 storyboard master image.",
    "This is for a production pipeline that will generate one 3x3 storyboard master image, then use the whole board to generate one continuous video.",
    "Return valid JSON only. No markdown fences. No prose outside JSON.",
    "",
    "Hard rules:",
    "- Exactly 9 shots.",
    "- One coherent story from top-left to bottom-right.",
    "- Same main subject identity across all 9 shots unless the raw source explicitly contains multiple fixed characters.",
    "- Freeze identity, setting, time, anchors, and negative constraints so later steps do not re-invent them.",
    "- Make the beat flow smoothly with varied but connected camera language.",
    "- Do not produce 9 independent illustrations or disconnected moments.",
    "",
    "Language rules:",
    "- IMPORTANT: YOU MUST WRITE ALL VALUES IN THE JSON (EXCEPT IDs) IN SIMPLIFIED CHINESE (简体中文).",
    "- title, content_summary, visual_style, frozen_world.*, and shots.* fields MUST ALL be written in Chinese.",
    "- For prompt fragments (camera, frame_description, motion_extension, etc.), write descriptive Chinese sentences.",
    "",
    "Required JSON shape:",
    JSON.stringify(
      {
        title: "string",
        content_summary: "string",
        brand_tone: brandTone,
        visual_style: "chinese prompt fragment",
        frozen_world: {
          subject_type: "human | animal | object | mixed cast (in chinese)",
          subject_identity: "chinese prompt fragment",
          setting: "chinese prompt fragment",
          time_of_day: "chinese prompt fragment",
          anchors: ["chinese prompt fragment", "chinese prompt fragment"],
          negative_constraints: ["chinese prompt fragment", "chinese prompt fragment"],
        },
        shots: [
          {
            id: "shot_01",
            grid_index: 1,
            goal: "string",
            narrative_beat: "string",
            camera: "chinese prompt fragment",
            frame_description: "chinese prompt fragment",
            motion_extension: "chinese prompt fragment",
            qa_focus: ["string", "string"],
          },
        ],
      },
      null,
      2,
    ),
    "",
    `Brand tone: ${brandTone}`,
    "Source content:",
    trimmedSource,
  ].join("\n");
}

function buildStoryboardGridPrompt(plan: NormalizedPlan): string {
  const shotLines = plan.shots
    .map(
      (shot) =>
        `Panel ${shot.grid_index}: ${shot.camera}; ${shot.frame_description}; purpose: ${shot.goal}.`,
    )
    .join("\n");

  return [
    "You are a professional film storyboard artist.",
    "Generate one single 3x3 storyboard master image on a landscape canvas.",
    "This is one image, not nine separate images.",
    "The 3x3 grid must read from top-left to bottom-right as the exact playback order.",
    "All nine panels must be tightly packed with no gaps, no gutters, no white margin, and no divider lines.",
    "Each panel must be the same size and clearly part of one continuous story.",
    "",
    "Consistency requirements:",
    `- Frozen subject identity: ${plan.frozen_world.subject_identity}`,
    `- Frozen setting: ${plan.frozen_world.setting}`,
    `- Frozen time / atmosphere: ${plan.frozen_world.time_of_day}`,
    `- Visual style: ${plan.visual_style}`,
    `- Identity anchors: ${plan.frozen_world.anchors.join("; ")}`,
    `- Negative constraints: ${plan.frozen_world.negative_constraints.join("; ")}`,
    "- Only camera angle, framing, expression, pose, and action progression may change between panels.",
    "- Do not change face, species, costume, pattern, accessory, body proportion, or world style across panels.",
    "- Do not add text, subtitles, numbers, labels, or decorative borders.",
    "",
    "Narrative panel plan:",
    shotLines,
  ].join("\n");
}

function buildShotVideoPrompt(
  plan: NormalizedPlan,
  shot: NormalizedShot,
  retryInstructions?: string,
): string {
  const sections = [
    "You are a strict shot-execution video director.",
    `This clip is ${shot.id} from a locked 3x3 storyboard master.`,
    "The reference image is the exact crop of the current panel.",
    "Do not re-invent the story, character, or setting.",
    "",
    "Frozen world:",
    `- Subject identity: ${plan.frozen_world.subject_identity}`,
    `- Setting: ${plan.frozen_world.setting}`,
    `- Time / atmosphere: ${plan.frozen_world.time_of_day}`,
    `- Visual style: ${plan.visual_style}`,
    `- Consistency anchors: ${plan.frozen_world.anchors.join("; ")}`,
    `- Strict negatives: ${plan.frozen_world.negative_constraints.join("; ")}`,
    "",
    "Current shot objective:",
    `- Goal: ${shot.goal}`,
    `- Narrative beat: ${shot.narrative_beat}`,
    `- Camera: ${shot.camera}`,
    `- Frame intent: ${shot.frame_description}`,
    `- Motion extension: ${shot.motion_extension}`,
    "",
    "Execution rules:",
    "- Make the clip look like this exact panel has come to life.",
    "- Keep the same subject identity and same visual anchors.",
    "- Keep the same setting and world state unless the panel itself already shows the change.",
    "- The clip may extend motion, expression, and camera movement, but may not swap the subject or reset the scene.",
  ];

  if (retryInstructions?.trim()) {
    sections.push("", "Retry correction:", retryInstructions.trim());
  }

  return sections.join("\n");
}

function buildGridPreviewVideoPrompt(
  plan: NormalizedPlan,
  selectedShots: NormalizedShot[],
): string {
  const orderedPanels = selectedShots
    .map(
      (shot) =>
        `Panel ${shot.grid_index} (${shot.id}): ${shot.frame_description} | camera: ${shot.camera} | motion: ${shot.motion_extension}`,
    )
    .join("\n");

  return [
    "You are a strict storyboard-to-video director.",
    "The reference image is a single 3x3 storyboard grid.",
    "Read the storyboard in playback order from left to right, top to bottom.",
    "Generate one continuous landscape preview video that follows the storyboard sequence.",
    "The storyboard grid is only a planning reference. Do not show nine panels, borders, gutters, labels, or split screens in the final video.",
    "",
    "Frozen world:",
    `- Subject identity: ${plan.frozen_world.subject_identity}`,
    `- Setting: ${plan.frozen_world.setting}`,
    `- Time / atmosphere: ${plan.frozen_world.time_of_day}`,
    `- Visual style: ${plan.visual_style}`,
    `- Consistency anchors: ${plan.frozen_world.anchors.join("; ")}`,
    `- Strict negatives: ${plan.frozen_world.negative_constraints.join("; ")}`,
    "",
    "Preview scope:",
    `- Animate only panels 1 through ${selectedShots.length}.`,
    `- Stop within the story beat of panel ${selectedShots.length}; do not continue into later panels.`,
    "- Preserve the same character, outfit, props, lighting logic, and world style across the whole clip.",
    "- Convert the panel sequence into a natural moving shot progression, not a collage animation.",
    "",
    "Storyboard sequence to execute:",
    orderedPanels,
  ].join("\n");
}

function buildResolvedPlan(plan: NormalizedPlan): ResolvedPlan {
  return {
    ...plan,
    storyboard_grid_prompt: buildStoryboardGridPrompt(plan),
    shots: plan.shots.map((shot) => ({
      ...shot,
      video_prompt: buildShotVideoPrompt(plan, shot),
    })),
  };
}

function ensureDataUrl(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function ensureDirectories(root: string): Promise<Directories> {
  const directories: Directories = {
    root,
    storyboard: join(root, "storyboard"),
    crops: join(root, "storyboard", "crops"),
    references: join(root, "storyboard", "references"),
    video: join(root, "video"),
    qa: join(root, "qa"),
    frames: join(root, "video", "frames"),
    manifests: join(root, "manifests"),
  };

  await Promise.all(
    Object.values(directories).map((dir) => mkdir(dir, { recursive: true })),
  );

  return directories;
}

async function planStoryboard(
  sourceContent: string,
  brandTone: string,
  clipSeconds: ClipSeconds,
  baseDir?: string,
): Promise<ResolvedPlan> {
  const runtime = await getPlannerRuntime(baseDir);
  const prompt = buildPlannerPrompt(sourceContent, brandTone);

  if (runtime.apiMode === "chat") {
    throw new Error("当前 storyboard planner 仅支持 responses 模式。");
  }

  const rawText = (
    await withOpenAIReconnectRetry(
      "分镜规划",
      async () => getPlannerClient(baseDir),
      async ({ client }) =>
        client.responses.create({
          model: runtime.model,
          input: prompt,
          reasoning: { effort: "medium" },
          text: { verbosity: "low" },
        }),
    )
  ).output_text;

  const normalized = normalizePlannerOutput(
    extractJson(rawText),
    brandTone,
    clipSeconds,
  );

  return buildResolvedPlan(normalized);
}

async function generateStoryboardGrid(
  resolvedPlan: ResolvedPlan,
  directories: Directories,
  baseDir?: string,
): Promise<string> {
  const image = await withOpenAIReconnectRetry(
    "生成 3x3 总分镜图",
    async () => getOpenAIClient(baseDir),
    async (openai) =>
      openai.images.generate({
        model: "gpt-image-1.5",
        prompt: resolvedPlan.storyboard_grid_prompt,
        size: "1536x1024",
      }),
  );

  const imageBase64 = image.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("3x3 总分镜没有返回图片数据。");
  }

  const gridPath = join(directories.storyboard, "grid.png");
  await writeFile(gridPath, Buffer.from(imageBase64, "base64"));
  return gridPath;
}

async function cropStoryboardGrid(
  gridPath: string,
  directories: Directories,
): Promise<Array<{ shotId: string; gridIndex: number; cropPath: string; referencePath: string }>> {
  const image = sharp(gridPath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("无法读取总分镜图尺寸。");
  }

  const width = metadata.width;
  const height = metadata.height;
  const crops: Array<{
    shotId: string;
    gridIndex: number;
    cropPath: string;
    referencePath: string;
  }> = [];

  for (let index = 0; index < 9; index += 1) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const left = Math.round((col * width) / 3);
    const top = Math.round((row * height) / 3);
    const right = Math.round(((col + 1) * width) / 3);
    const bottom = Math.round(((row + 1) * height) / 3);
    const cropWidth = right - left;
    const cropHeight = bottom - top;
    const shotId = `shot_${String(index + 1).padStart(2, "0")}`;
    const cropPath = join(directories.crops, `${shotId}.png`);
    const referencePath = join(directories.references, `${shotId}.png`);

    const cropBuffer = await sharp(gridPath)
      .extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer();

    await writeFile(cropPath, cropBuffer);

    const referenceBuffer = await sharp(cropBuffer)
      .resize(1280, 720, {
        fit: "cover",
        position: "attention",
      })
      .png()
      .toBuffer();

    await writeFile(referencePath, referenceBuffer);

    crops.push({
      shotId,
      gridIndex: index + 1,
      cropPath,
      referencePath,
    });
  }

  return crops;
}

async function extractFirstFrame(
  videoPath: string,
  outputPath: string,
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath,
  ]);
}

async function concatVideos(
  videoPaths: string[],
  outputPath: string,
  directories: Directories,
): Promise<void> {
  const concatListPath = join(directories.video, "concat-list.txt");
  const concatBody = videoPaths
    .map((videoPath) => `file '${videoPath.replace(/'/g, "'\\''")}'`)
    .join("\n");

  await writeFile(concatListPath, concatBody, "utf8");

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-c",
      "copy",
      outputPath,
    ]);
  } catch {
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
  } finally {
    await unlink(concatListPath).catch(() => undefined);
  }
}

async function createLandscapeVideoJob(
  prompt: string,
  referenceDataUrl: string,
  clipSeconds: ClipSeconds,
  videoModel: VideoModel,
  baseDir?: string,
): Promise<OpenAIVideoJob> {
  const transport = await getOpenAITransport(baseDir);
  const response = await transport.fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${transport.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: videoModel,
      prompt,
      size: "1280x720",
      seconds: toVideoSecondsLiteral(clipSeconds),
      input_reference: {
        image_url: referenceDataUrl,
      },
    }),
    ...(transport.extraFetchOptions ?? {}),
  } as RequestInit);
  const raw = await response.text();

  if (!response.ok) {
    let message = `视频生成失败（${response.status}）`;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          error?: { message?: string | null } | null;
          message?: string | null;
        };
        message = parsed.error?.message || parsed.message || raw;
      } catch {
        message = raw;
      }
    }

    throw new Error(message);
  }

  return JSON.parse(raw) as OpenAIVideoJob;
}

async function generateReferenceVideo(
  prompt: string,
  referencePath: string,
  outputPath: string,
  clipSeconds: ClipSeconds,
  videoProvider: VideoProviderId,
  videoModel: VideoModel,
  baseDir?: string,
): Promise<GeneratedVideoArtifact> {
  return generateVideoFromReference({
    prompt,
    referencePath,
    outputPath,
    clipSeconds,
    videoProvider,
    videoModel,
    baseDir,
  });
}

async function generateShotVideo(
  prompt: string,
  referencePath: string,
  outputPath: string,
  clipSeconds: ClipSeconds,
  videoProvider: VideoProviderId,
  videoModel: VideoModel,
  baseDir?: string,
): Promise<void> {
  await generateReferenceVideo(
    prompt,
    referencePath,
    outputPath,
    clipSeconds,
    videoProvider,
    videoModel,
    baseDir,
  );
}

async function evaluateShotConsistency(
  plan: ResolvedPlan,
  shot: ResolvedShot,
  referencePath: string,
  framePath: string,
  baseDir?: string,
): Promise<QaResult> {
  const referenceDataUrl = ensureDataUrl(
    await readFile(referencePath),
    "image/png",
  );
  const frameDataUrl = ensureDataUrl(await readFile(framePath), "image/jpeg");

  const qaPrompt = [
    "You are a strict storyboard consistency judge.",
    "Image 1 is the intended storyboard panel. Image 2 is the first frame of the generated video clip.",
    "Judge whether the generated clip strictly follows the panel and frozen-world constraints.",
    "",
    `Frozen subject identity: ${plan.frozen_world.subject_identity}`,
    `Frozen setting: ${plan.frozen_world.setting}`,
    `Frozen time / atmosphere: ${plan.frozen_world.time_of_day}`,
    `Visual style: ${plan.visual_style}`,
    `Anchors: ${plan.frozen_world.anchors.join("; ")}`,
    `Negative constraints: ${plan.frozen_world.negative_constraints.join("; ")}`,
    "",
    `Current shot: ${shot.id}`,
    `Shot goal: ${shot.goal}`,
    `Shot camera: ${shot.camera}`,
    `Frame intent: ${shot.frame_description}`,
    `Expected motion: ${shot.motion_extension}`,
    `QA focus: ${shot.qa_focus.join("；")}`,
    "",
    "PASS only if the same subject identity is preserved, the scene still belongs to the same story moment, and the camera / composition intent still matches the panel.",
    "FAIL if there is character drift, costume/fur/material drift, environment reset, style jump, or the shot intent no longer matches the panel.",
    "",
    "Return valid JSON only with this shape:",
    JSON.stringify(
      {
        verdict: "PASS",
        score: 93,
        fail_reasons: ["string"],
        retry_instructions: "string",
      },
      null,
      2,
    ),
  ].join("\n");

  const response = await withOpenAIReconnectRetry(
    "镜头一致性验收",
    async () => getOpenAIClient(baseDir),
    async (openai) =>
      openai.responses.create({
        model: "gpt-5.4",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: qaPrompt },
              { type: "input_image", image_url: referenceDataUrl, detail: "high" },
              { type: "input_image", image_url: frameDataUrl, detail: "high" },
            ],
          },
        ],
        reasoning: { effort: "medium" },
        text: { verbosity: "low" },
      }),
  );

  return qaResultSchema.parse(extractJson(response.output_text));
}

export async function runStoryboardPipeline(
  options: StoryboardPipelineOptions,
): Promise<StoryboardPipelineResult> {
  const baseDir = options.baseDir ?? process.cwd();
  const clipSeconds = normalizeClipSeconds(options.clipSeconds);
  const videoProvider = options.videoProvider ?? "openai";
  const videoModel = options.videoModel ?? "sora-2";
  const generationMode = options.generationMode ?? "grid_preview";
  const brandTone =
    options.brandTone?.trim() || "电影感、克制、叙事清晰、人物和场景稳定";
  const runId =
    options.runId ??
    `sb-${new Date().toISOString().replace(/[:.]/g, "-")}-${nanoid(6)}`;
  const outputRoot =
    options.outputDir?.trim()
      ? resolve(options.outputDir)
      : join(getDataDir(baseDir), "storyboard-runs", runId);
  const directories = await ensureDirectories(outputRoot);
  const sourcePath = join(directories.manifests, "source.txt");
  const planPath = join(directories.manifests, "plan.json");
  const summaryPath = join(directories.manifests, "summary.json");

  console.log(`\n[storyboard] run id: ${runId}`);
  console.log(`[storyboard] output: ${outputRoot}`);

  await options.onPhase?.("planning", "正在读取内容");
  console.log("[storyboard] 正在读取内容...");
  const sourceContent = await fetchSourceContent(
    options.sourceType,
    options.sourceInput,
  );
  await writeFile(sourcePath, sourceContent, "utf8");

  await options.onPhase?.("planning", "正在规划完整分镜");
  console.log("[storyboard] 正在规划完整分镜...");
  const resolvedPlan = await planStoryboard(
    sourceContent,
    brandTone,
    clipSeconds,
    baseDir,
  );
  await writeJson(planPath, resolvedPlan);
  await options.onPlanner?.(resolvedPlan);

  await options.onPhase?.("storyboarding", "正在生成 3x3 总分镜图");
  console.log("[storyboard] 正在生成 3x3 总分镜图...");
  const gridPath = await generateStoryboardGrid(resolvedPlan, directories, baseDir);
  const selectedShots = resolvedPlan.shots.slice(
    0,
    options.limitShots && options.limitShots > 0
      ? Math.min(options.limitShots, resolvedPlan.shots.length)
      : resolvedPlan.shots.length,
  );
  await options.onStoryboard?.({
    plan: resolvedPlan,
    gridPath,
    generationMode,
    selectedShotIds: selectedShots.map((shot) => shot.id),
  });

  let shotArtifacts: ShotExecutionArtifact[] = [];
  let finalVideoPath: string | undefined;
  let finalVideo: GeneratedVideoArtifact | undefined;

  if (generationMode === "panel_sequence") {
    await options.onPhase?.("storyboarding", "正在裁切 9 格分镜");
    console.log("[storyboard] 正在裁切 9 格分镜...");
    const crops = await cropStoryboardGrid(gridPath, directories);
    shotArtifacts = crops.slice(0, selectedShots.length).map((crop) => ({
      shotId: crop.shotId,
      gridIndex: crop.gridIndex,
      cropPath: crop.cropPath,
      referencePath: crop.referencePath,
      attempts: [],
    }));

    if (!options.skipVideo) {
      for (const shot of selectedShots) {
        const artifact = shotArtifacts.find((item) => item.shotId === shot.id);

        if (!artifact) {
          throw new Error(`找不到镜头裁切图：${shot.id}`);
        }

        const maxAttempts = Math.max(1, (options.maxRetries ?? 1) + 1);
        let retryInstructions = "";
        let accepted = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          await options.onPhase?.(
            "videoing",
            `正在生成 ${shot.id}（第 ${attempt}/${maxAttempts} 次尝试）`,
          );
          console.log(
            `[video] ${shot.id} attempt ${attempt}/${maxAttempts} 正在生成视频...`,
          );
          const attemptVideoPath = join(
            directories.video,
            `${shot.id}-attempt-${attempt}.mp4`,
          );
          const attemptFramePath = join(
            directories.frames,
            `${shot.id}-attempt-${attempt}.jpg`,
          );
          const qaPath = join(directories.qa, `${shot.id}-attempt-${attempt}.json`);

          await generateShotVideo(
            buildShotVideoPrompt(resolvedPlan, shot, retryInstructions),
            artifact.referencePath,
            attemptVideoPath,
            clipSeconds,
            videoProvider,
            videoModel,
            baseDir,
          );

          let qaResult: QaResult | undefined;

          if (!options.skipQa) {
            await extractFirstFrame(attemptVideoPath, attemptFramePath);
            await options.onPhase?.(
              "videoing",
              `正在验收 ${shot.id}（第 ${attempt}/${maxAttempts} 次尝试）`,
            );
            console.log(
              `[qa] ${shot.id} attempt ${attempt}/${maxAttempts} 正在验收...`,
            );
            qaResult = await evaluateShotConsistency(
              resolvedPlan,
              shot,
              artifact.referencePath,
              attemptFramePath,
              baseDir,
            );
            await writeJson(qaPath, qaResult);
          }

          artifact.attempts.push({
            attempt,
            videoPath: attemptVideoPath,
            firstFramePath: options.skipQa ? undefined : attemptFramePath,
            qaPath: options.skipQa ? undefined : qaPath,
            qa: qaResult,
          });

          if (options.skipQa || qaResult?.verdict === "PASS") {
            const acceptedVideoPath = join(directories.video, `${shot.id}.mp4`);
            const acceptedFramePath = options.skipQa
              ? undefined
              : join(directories.frames, `${shot.id}.jpg`);

            if (attemptVideoPath !== acceptedVideoPath) {
              await copyFile(attemptVideoPath, acceptedVideoPath);
            }
            if (acceptedFramePath && attemptFramePath !== acceptedFramePath) {
              await copyFile(attemptFramePath, acceptedFramePath);
            }

            artifact.acceptedVideoPath = acceptedVideoPath;
            artifact.acceptedFirstFramePath = acceptedFramePath;
            accepted = true;
            break;
          }

          retryInstructions =
            qaResult?.retry_instructions ||
            "Strengthen adherence to the storyboard panel and frozen identity anchors.";
        }

        if (!accepted) {
          throw new Error(`${shot.id} 在最大重试次数内仍未通过一致性验收。`);
        }
      }
    }

    const acceptedVideoPaths = shotArtifacts
      .map((item) => item.acceptedVideoPath)
      .filter((item): item is string => Boolean(item));

    if (acceptedVideoPaths.length > 0) {
      finalVideoPath = join(directories.video, "final.mp4");
      await options.onPhase?.("videoing", "正在拼接最终视频");
      console.log("[video] 正在拼接最终视频...");
      await concatVideos(acceptedVideoPaths, finalVideoPath, directories);
      finalVideo = {
        provider: videoProvider,
        model: videoModel,
        path: finalVideoPath,
        seconds: acceptedVideoPaths.length * clipSeconds,
        size: "1280x720",
      };
      await options.onVideo?.(finalVideo);
    }
  } else if (!options.skipVideo) {
    finalVideoPath = join(directories.video, "preview.mp4");
    const isPartialVideo = selectedShots.length < resolvedPlan.shots.length;
    await options.onPhase?.(
      "videoing",
      isPartialVideo
        ? `正在根据总分镜生成视频（前 ${selectedShots.length} 格）`
        : "正在根据总分镜生成完整视频",
    );
    console.log(
      isPartialVideo
        ? `[video] 正在根据总分镜生成视频，覆盖前 ${selectedShots.length} 格...`
        : "[video] 正在根据总分镜生成完整视频...",
    );
    finalVideo = await generateReferenceVideo(
      buildGridPreviewVideoPrompt(resolvedPlan, selectedShots),
      gridPath,
      finalVideoPath,
      clipSeconds,
      videoProvider,
      videoModel,
      baseDir,
    );
    await options.onVideo?.(finalVideo);
  }

  const summary = {
    runId,
    outputDir: outputRoot,
    sourceType: options.sourceType,
    sourceInput: options.sourceInput,
    brandTone,
    videoProvider,
    videoModel,
    clipSeconds,
    generationMode,
    skipVideo: options.skipVideo ?? false,
    skipQa: options.skipQa ?? false,
    selectedShots: selectedShots.map((shot) => shot.id),
    planTitle: resolvedPlan.title,
    gridPath,
    finalVideoPath,
    finalVideo,
    shots: shotArtifacts,
  };

  await writeJson(summaryPath, summary);

  console.log("[storyboard] 完成。");
  console.log(`[storyboard] plan: ${planPath}`);
  console.log(`[storyboard] grid: ${gridPath}`);
  if (finalVideoPath) {
    console.log(`[storyboard] final video: ${finalVideoPath}`);
  }

  return {
    runId,
    outputDir: outputRoot,
    sourcePath,
    planPath,
    gridPath,
    generationMode,
    selectedShots: selectedShots.map((shot) => shot.id),
    finalVideoPath,
    finalVideo,
    summaryPath,
    shots: shotArtifacts,
  };
}
