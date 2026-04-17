import { describe, expect, it, vi } from "vitest";
import { SourceProviderFailure } from "../../../lib/source-providers/types";
import { extractXMarkdownText, fetchXSource } from "../../../lib/source-providers/x";

describe("X provider", () => {
  it("strips YAML front matter from generated markdown", () => {
    const text = extractXMarkdownText(`---
url: "https://x.com/openai/status/123"
author: "OpenAI"
---

The more AI can do, the more we need to ask what it should do.
`);

    expect(text).toContain(
      "The more AI can do, the more we need to ask what it should do.",
    );
    expect(text).not.toContain('url: "https://x.com/openai/status/123"');
  });

  it("runs the local x-to-markdown script and reads back the markdown file", async () => {
    const runCommand = vi.fn(async () => ({
      stdout: JSON.stringify({
        markdownPath: "/tmp/openai-x.md",
      }),
    }));
    const readFile = vi.fn(async () => `---
url: "https://x.com/openai/status/123"
---

OpenAI shipped a new model.
`);

    const result = await fetchXSource("https://x.com/openai/status/123", {
      scriptPath: "/Users/demo/x-to-markdown/main.ts",
      runCommand,
      readFile,
    });

    expect(runCommand).toHaveBeenCalledWith("npx", [
      "-y",
      "bun",
      "/Users/demo/x-to-markdown/main.ts",
      "https://x.com/openai/status/123",
      "--json",
    ]);
    expect(readFile).toHaveBeenCalledWith("/tmp/openai-x.md", "utf8");
    expect(result).toMatchObject({
      provider: "x",
    });
    expect(result.text).toContain("OpenAI shipped a new model.");
    expect(result.text).not.toContain('url: "https://x.com/openai/status/123"');
  });

  it("maps malformed command output to a provider failure", async () => {
    await expect(
      fetchXSource("https://x.com/openai/status/123", {
        runCommand: vi.fn(async () => ({
          stdout: "not-json",
        })),
      }),
    ).rejects.toThrow("无法抓取这个 X 链接，请直接粘贴正文内容。");

    await expect(
      fetchXSource("https://x.com/openai/status/123", {
        runCommand: vi.fn(async () => ({
          stdout: "not-json",
        })),
      }),
    ).rejects.toBeInstanceOf(SourceProviderFailure);
  });
});
