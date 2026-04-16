import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRun,
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
      },
      tempDir,
    );

    expect(updated.status).toBe("planning");
    expect(updated.phaseLabel).toBe("Building shot list");

    const reloaded = await getRun(run.id, tempDir);
    expect(reloaded?.id).toBe(run.id);

    const runs = await listRuns(tempDir);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe(run.id);
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
      },
      tempDir,
    );

    const settings = await readSettings(tempDir);

    expect(settings.plannerProvider).toBe("linglu");
    expect(settings.lingluApiKey).toBe("ll-test-123");
    expect(settings.lingluBaseUrl).toBe("https://gateway.linglu.ai/v1");
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
