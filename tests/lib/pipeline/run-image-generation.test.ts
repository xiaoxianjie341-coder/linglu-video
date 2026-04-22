import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mocked = vi.hoisted(() => ({
  generateImageCandidate: vi.fn(),
}));

vi.mock("../../../lib/openai/image", () => ({
  generateImageCandidate: mocked.generateImageCandidate,
}));

import { runImageGeneration } from "../../../lib/pipeline/run-image-generation";
import { createRun, getRun } from "../../../lib/storage";

describe("runImageGeneration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "linglu-image-generation-"));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("writes image assets incrementally before marking the run completed", async () => {
    const run = await createRun(
      {
        generationMode: "image",
        sourceType: "text",
        sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
        brandTone: "广告质感",
        imageAspect: "portrait",
        imageCount: 2,
      },
      tempDir,
    );
    let persistedCountBeforeSecondCandidate = 0;

    mocked.generateImageCandidate.mockImplementation(
      async ({
        index,
        prompt,
        outputPath,
      }: {
        index: number;
        prompt: string;
        outputPath: string;
      }) => {
        if (index === 2) {
          persistedCountBeforeSecondCandidate =
            (await getRun(run.id, tempDir))?.images.length ?? 0;
        }

        await writeFile(outputPath, `image-${index}`, "utf8");

        return {
          imageId: `image_${index}`,
          index,
          prompt,
          aspect: "portrait" as const,
          path: outputPath,
        };
      },
    );

    await runImageGeneration(
      run.id,
      {
        generationMode: "image",
        sourceType: "text",
        sourceInput: "春天清晨的咖啡馆橱窗，适合做品牌素材。",
        brandTone: "广告质感",
        imageAspect: "portrait",
        imageCount: 2,
      },
      tempDir,
    );

    const savedRun = await getRun(run.id, tempDir);

    expect(persistedCountBeforeSecondCandidate).toBe(1);
    expect(savedRun?.status).toBe("completed");
    expect(savedRun?.images).toHaveLength(2);
    expect(savedRun?.activePhase).toBeNull();
    expect(savedRun?.failedPhase).toBeNull();
  });

  it("stores a user-facing Chinese error when the provider returns a raw safety rejection", async () => {
    const run = await createRun(
      {
        generationMode: "image",
        sourceType: "text",
        sourceInput: "海边拥抱的情侣海报。",
        brandTone: "广告质感",
        imageAspect: "portrait",
        imageCount: 2,
      },
      tempDir,
    );

    mocked.generateImageCandidate.mockRejectedValueOnce(
      new Error(
        "400 Your request was rejected by the safety system. If you believe this is an error, contact us at help.openai.com and include the request ID req_xxx, safety_violations=[sexual].",
      ),
    );

    await runImageGeneration(
      run.id,
      {
        generationMode: "image",
        sourceType: "text",
        sourceInput: "海边拥抱的情侣海报。",
        brandTone: "广告质感",
        imageAspect: "portrait",
        imageCount: 2,
      },
      tempDir,
    );

    const savedRun = await getRun(run.id, tempDir);

    expect(savedRun?.status).toBe("failed");
    expect(savedRun?.error).toBe(
      "这次画面描述触发了安全限制，换个更日常、克制一点的说法再试。",
    );
  });
});
