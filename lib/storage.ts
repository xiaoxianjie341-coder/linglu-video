import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { nanoid } from "nanoid";
import {
  generationRequestSchema,
  plannerOutputSchema,
  runRecordSchema,
  settingsSchema,
  settingsUpdateSchema,
  storedSettingsSchema,
  storyboardAssetSchema,
  videoAssetSchema,
  type GenerationRequest,
  type PlannerOutput,
  type RunRecord,
  type StoryboardAsset,
  type StoredSettings,
  type WebSettings,
  type WebSettingsUpdate,
  type VideoAsset,
} from "./schemas";

function resolveBaseDir(baseDir?: string): string {
  return baseDir ?? process.cwd();
}

export function getDataDir(baseDir?: string): string {
  return join(resolveBaseDir(baseDir), "data");
}

export function getRunsDir(baseDir?: string): string {
  return join(getDataDir(baseDir), "runs");
}

function getSettingsPath(baseDir?: string): string {
  return join(getDataDir(baseDir), "settings.json");
}

function getRunDir(runId: string, baseDir?: string): string {
  return join(getRunsDir(baseDir), runId);
}

function getRunPath(runId: string, baseDir?: string): string {
  return join(getRunDir(runId, baseDir), "run.json");
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureDir(join(path, ".."));
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

export async function readSettings(baseDir?: string): Promise<StoredSettings> {
  const raw = await readJson<unknown>(getSettingsPath(baseDir));
  return storedSettingsSchema.parse(raw ?? {});
}

export async function writeSettings(
  settings: WebSettings,
  baseDir?: string,
): Promise<StoredSettings> {
  const parsed = settingsSchema.parse(settings);
  const stored = storedSettingsSchema.parse(parsed);
  await ensureDir(getDataDir(baseDir));
  await writeJson(getSettingsPath(baseDir), stored);
  return stored;
}

export async function updateSettings(
  settingsPatch: WebSettingsUpdate,
  baseDir?: string,
): Promise<StoredSettings> {
  const existing = await readSettings(baseDir);
  const patch = settingsUpdateSchema.parse(settingsPatch);
  const stored = storedSettingsSchema.parse({
    ...existing,
    ...patch,
  });

  await ensureDir(getDataDir(baseDir));
  await writeJson(getSettingsPath(baseDir), stored);
  return stored;
}

export async function createRun(
  requestInput: GenerationRequest,
  baseDir?: string,
): Promise<RunRecord> {
  const request = generationRequestSchema.parse(requestInput);
  const now = new Date().toISOString();
  const run: RunRecord = runRecordSchema.parse({
    id: nanoid(10),
    createdAt: now,
    updatedAt: now,
    status: "queued",
    phaseLabel: "Queued",
    activePhase: null,
    failedPhase: null,
    source: {
      type: request.sourceType,
      input: request.sourceInput,
    },
    brandTone: request.brandTone ?? "",
    request,
    planner: null,
    storyboards: [],
    video: null,
    error: null,
  });

  await ensureDir(join(getRunDir(run.id, baseDir), "storyboards"));
  await ensureDir(join(getRunDir(run.id, baseDir), "video"));
  await writeJson(getRunPath(run.id, baseDir), run);

  return run;
}

export async function getRun(
  runId: string,
  baseDir?: string,
): Promise<RunRecord | null> {
  const raw = await readJson<unknown>(getRunPath(runId, baseDir));
  if (!raw) return null;
  return runRecordSchema.parse(raw);
}

export async function updateRun(
  runId: string,
  patch: Partial<RunRecord>,
  baseDir?: string,
): Promise<RunRecord> {
  const existing = await getRun(runId, baseDir);
  if (!existing) {
    throw new Error(`Run not found: ${runId}`);
  }

  const updated = runRecordSchema.parse({
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  await writeJson(getRunPath(runId, baseDir), updated);
  return updated;
}

export async function listRuns(baseDir?: string): Promise<RunRecord[]> {
  const runsDir = getRunsDir(baseDir);
  const { readdir } = await import("node:fs/promises");

  try {
    const entries = await readdir(runsDir, { withFileTypes: true });
    const runs = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => getRun(entry.name, baseDir)),
    );

    return runs
      .filter((run): run is RunRecord => Boolean(run))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function deleteRun(runId: string, baseDir?: string): Promise<boolean> {
  try {
    await rm(getRunDir(runId, baseDir), { recursive: true, force: false });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function writePlannerArtifact(
  runId: string,
  planner: PlannerOutput,
  baseDir?: string,
): Promise<void> {
  const parsed = plannerOutputSchema.parse(planner);
  await writeJson(join(getRunDir(runId, baseDir), "planner.json"), parsed);
  await updateRun(runId, { planner: parsed }, baseDir);
}

export async function writeStoryboardArtifact(
  runId: string,
  storyboard: StoryboardAsset,
  baseDir?: string,
): Promise<void> {
  const parsed = storyboardAssetSchema.parse(storyboard);
  const run = await getRun(runId, baseDir);

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  const storyboards = [...run.storyboards];
  const existingIndex = storyboards.findIndex((item) => item.shotId === parsed.shotId);

  if (existingIndex >= 0) {
    storyboards[existingIndex] = parsed;
  } else {
    storyboards.push(parsed);
  }

  await updateRun(runId, { storyboards }, baseDir);
}

export async function writeVideoArtifact(
  runId: string,
  video: VideoAsset,
  baseDir?: string,
): Promise<void> {
  const parsed = videoAssetSchema.parse(video);
  await updateRun(runId, { video: parsed }, baseDir);
}
