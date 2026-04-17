import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRun,
  deleteRun,
  getRun,
  listRuns,
  readSettings,
  updateSettings,
  updateRun,
  writeSettings,
} from "../../lib/storage";

describe("Storage: web MVP", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "clawvid-web-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates and updates a run record", async () => {
    const run = await createRun(
      {
        sourceType: "text",
        sourceInput: "A teapot mascot enters a glowing doorway.",
        brandTone: "cinematic, moody",
        shotCount: 3,
        videoModel: "sora-2",
        videoSeconds: 8,
      },
      tempDir,
    );

    expect(run.status).toBe("queued");

    const updated = await updateRun(
      run.id,
      {
        status: "planning",
        phaseLabel: "Building shot list",
        activePhase: "planning",
      },
      tempDir,
    );

    expect(updated.status).toBe("planning");
    expect(updated.phaseLabel).toBe("Building shot list");
    expect(updated.activePhase).toBe("planning");

    const reloaded = await getRun(run.id, tempDir);
    expect(reloaded?.id).toBe(run.id);

    const runs = await listRuns(tempDir);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe(run.id);
  });

  it("persists active and failed phases on a run record", async () => {
    const run = await createRun(
      {
        sourceType: "text",
        sourceInput: "A teapot mascot enters a glowing doorway.",
        brandTone: "cinematic, moody",
        shotCount: 9,
        videoModel: "sora-2",
        videoSeconds: 8,
      },
      tempDir,
    );

    const updated = await updateRun(
      run.id,
      {
        activePhase: "storyboarding",
        failedPhase: "storyboarding",
      },
      tempDir,
    );

    expect(updated.activePhase).toBe("storyboarding");
    expect(updated.failedPhase).toBe("storyboarding");

    const reloaded = await getRun(run.id, tempDir);
    expect(reloaded?.activePhase).toBe("storyboarding");
    expect(reloaded?.failedPhase).toBe("storyboarding");
  });

  it("deletes a run record and removes it from the list", async () => {
    const run = await createRun(
      {
        sourceType: "text",
        sourceInput: "A teapot mascot enters a glowing doorway.",
        brandTone: "cinematic, moody",
        shotCount: 9,
        videoModel: "sora-2",
        videoSeconds: 8,
      },
      tempDir,
    );

    await deleteRun(run.id, tempDir);

    expect(await getRun(run.id, tempDir)).toBeNull();
    expect(await listRuns(tempDir)).toHaveLength(0);
  });

  it("persists and reloads local settings", async () => {
    await writeSettings({ openaiApiKey: "sk-test-123" }, tempDir);

    const settings = await readSettings(tempDir);

    expect(settings.openaiApiKey).toBe("sk-test-123");
  });

  it("persists planner gateway settings for Linglu", async () => {
    await writeSettings(
      {
        openaiApiKey: "sk-test-123",
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://gateway.linglu.ai/v1",
        klingApiKey: "kling-key-123",
        klingBaseUrl: "https://api.kling.example/v1",
        jimengApiKey: "jimeng-key-123",
        jimengBaseUrl: "https://api.jimeng.example/v1",
      },
      tempDir,
    );

    const settings = await readSettings(tempDir);

    expect(settings.plannerProvider).toBe("linglu");
    expect(settings.lingluApiKey).toBe("ll-test-123");
    expect(settings.lingluBaseUrl).toBe("https://gateway.linglu.ai/v1");
    expect(settings.klingApiKey).toBe("kling-key-123");
    expect(settings.jimengApiKey).toBe("jimeng-key-123");
  });

  it("merges planner-only updates without clearing the saved OpenAI key", async () => {
    await writeSettings({ openaiApiKey: "sk-test-123" }, tempDir);

    const settings = await updateSettings(
      {
        plannerProvider: "linglu",
        lingluApiKey: "ll-test-123",
        lingluBaseUrl: "https://gateway.linglu.ai/v1",
      },
      tempDir,
    );

    expect(settings.openaiApiKey).toBe("sk-test-123");
    expect(settings.plannerProvider).toBe("linglu");
    expect(settings.lingluApiKey).toBe("ll-test-123");
  });
});
