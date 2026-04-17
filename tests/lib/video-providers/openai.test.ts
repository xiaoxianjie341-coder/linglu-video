import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mocked = vi.hoisted(() => ({
  getOpenAITransport: vi.fn(),
  getOpenAIClient: vi.fn(),
  normalizeLandscapeStoryboardImage: vi.fn(async (buffer: Buffer) => buffer),
  isRetryableOpenAIError: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return /fetch failed|connection error/i.test(message);
  }),
  withOpenAIRetry: vi.fn(async (_label: string, fn: () => Promise<unknown>) => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }),
}));

vi.mock("../../../lib/openai/client", () => ({
  getOpenAITransport: mocked.getOpenAITransport,
  getOpenAIClient: mocked.getOpenAIClient,
}));

vi.mock("../../../lib/openai/image", () => ({
  normalizeLandscapeStoryboardImage: mocked.normalizeLandscapeStoryboardImage,
}));

vi.mock("../../../lib/openai/retry", () => ({
  isRetryableOpenAIError: mocked.isRetryableOpenAIError,
  withOpenAIRetry: mocked.withOpenAIRetry,
}));

import { generateOpenAIVideoFromReference } from "../../../lib/video-providers/openai";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function binaryResponse(body: string): Response {
  return new Response(Buffer.from(body));
}

describe("OpenAI video provider", () => {
  let tempDir: string;
  let referencePath: string;
  let outputPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "clawvid-openai-video-"));
    referencePath = join(tempDir, "reference.png");
    outputPath = join(tempDir, "output.mp4");
    await writeFile(referencePath, Buffer.from("reference"));
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reruns the whole video stage once after a transient create failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "video_stage_retry",
          status: "completed",
          seconds: "8",
        }),
      );

    mocked.getOpenAITransport.mockResolvedValue({
      apiKey: "sk-test-123",
      fetch: fetchMock,
      usesProxy: false,
    });

    mocked.getOpenAIClient.mockImplementation(async () => ({
      videos: {
        retrieve: vi.fn(),
        downloadContent: vi.fn(async (_videoId: string, options?: { variant?: string }) =>
          binaryResponse(options?.variant === "thumbnail" ? "thumb" : "video"),
        ),
      },
    }));

    const artifact = await generateOpenAIVideoFromReference(
      "A calm cinematic shot.",
      referencePath,
      outputPath,
      8,
      "sora-2",
    );

    expect(artifact.jobId).toBe("video_stage_retry");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
    await expect(readFile(outputPath, "utf8")).resolves.toBe("video");
  });

  it("recreates the OpenAI client for each download retry and thumbnail step", async () => {
    mocked.getOpenAITransport.mockResolvedValue({
      apiKey: "sk-test-123",
      fetch: vi.fn().mockResolvedValue(
        jsonResponse({
          id: "video_reconnect",
          status: "completed",
          seconds: "8",
        }),
      ),
      usesProxy: false,
    });

    mocked.getOpenAIClient
      .mockResolvedValueOnce({
        videos: {
          retrieve: vi.fn().mockResolvedValue({
            id: "video_reconnect",
            status: "completed",
            seconds: "8",
          }),
          downloadContent: vi
            .fn()
            .mockRejectedValueOnce(new Error("Connection error."))
            .mockResolvedValueOnce(binaryResponse("video"))
            .mockResolvedValueOnce(binaryResponse("thumb")),
        },
      })
      .mockResolvedValueOnce({
        videos: {
          retrieve: vi.fn(),
          downloadContent: vi.fn(async () => binaryResponse("video")),
        },
      })
      .mockResolvedValueOnce({
        videos: {
          retrieve: vi.fn(),
          downloadContent: vi.fn(async () => binaryResponse("thumb")),
        },
      });

    const artifact = await generateOpenAIVideoFromReference(
      "A calm cinematic shot.",
      referencePath,
      outputPath,
      8,
      "sora-2",
    );

    expect(artifact.jobId).toBe("video_reconnect");
    expect(mocked.getOpenAIClient).toHaveBeenCalledTimes(3);
    await expect(readFile(outputPath, "utf8")).resolves.toBe("video");
  });
});
