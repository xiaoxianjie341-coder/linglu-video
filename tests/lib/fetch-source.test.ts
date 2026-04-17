import { describe, expect, it, vi } from "vitest";
import {
  detectSourceProviderKind,
  fetchSourceContent,
  SourceProviderFailure,
  type SourceProviderRuntime,
} from "../../lib/fetch-source";

function createRuntime(
  overrides: Partial<SourceProviderRuntime> = {},
): SourceProviderRuntime {
  return {
    plainWeb: vi.fn(async () => ({
      provider: "plain-web",
      text: "plain web body",
    })),
    x: vi.fn(async () => ({
      provider: "x",
      text: "tweet body",
    })),
    xiaohongshu: vi.fn(async () => ({
      provider: "xiaohongshu",
      text: "note body",
    })),
    ...overrides,
  };
}

describe("source provider detection", () => {
  it("routes x.com and twitter.com links to the X provider", () => {
    expect(detectSourceProviderKind("https://x.com/openai/status/123")).toBe("x");
    expect(detectSourceProviderKind("https://twitter.com/openai/status/123")).toBe(
      "x",
    );
  });

  it("routes Xiaohongshu share and note domains to the Xiaohongshu provider", () => {
    expect(detectSourceProviderKind("https://www.xiaohongshu.com/explore/abc")).toBe(
      "xiaohongshu",
    );
    expect(detectSourceProviderKind("http://xhslink.com/a/abc")).toBe(
      "xiaohongshu",
    );
  });

  it("routes all other valid urls to the plain web provider", () => {
    expect(detectSourceProviderKind("https://example.com/post")).toBe("plain-web");
  });
});

describe("fetchSourceContent", () => {
  it("returns trimmed text input without invoking providers", async () => {
    await expect(fetchSourceContent("text", "  hello world  ")).resolves.toBe(
      "hello world",
    );
  });

  it("rejects invalid URL input before selecting a provider", async () => {
    await expect(fetchSourceContent("url", "not-a-url")).rejects.toThrow(
      "无效的公开链接。",
    );
  });

  it("uses the plain web provider for non-social URLs", async () => {
    const runtime = createRuntime();

    await expect(
      fetchSourceContent("url", "https://example.com/post", runtime),
    ).resolves.toBe("plain web body");

    expect(runtime.plainWeb).toHaveBeenCalledWith("https://example.com/post");
    expect(runtime.x).not.toHaveBeenCalled();
    expect(runtime.xiaohongshu).not.toHaveBeenCalled();
  });

  it("does not fall back to plain web when the X provider fails", async () => {
    const runtime = createRuntime({
      x: vi.fn(async () => {
        throw new SourceProviderFailure(
          "x",
          "无法抓取这个 X 链接，请直接粘贴正文内容。",
          "x command timed out",
        );
      }),
    });

    await expect(
      fetchSourceContent("url", "https://x.com/openai/status/123", runtime),
    ).rejects.toThrow("无法抓取这个 X 链接，请直接粘贴正文内容。");

    expect(runtime.x).toHaveBeenCalled();
    expect(runtime.plainWeb).not.toHaveBeenCalled();
  });

  it("does not fall back to plain web when the Xiaohongshu provider fails", async () => {
    const runtime = createRuntime({
      xiaohongshu: vi.fn(async () => {
        throw new SourceProviderFailure(
          "xiaohongshu",
          "无法抓取这个小红书链接，请直接粘贴正文内容。",
          "missing xsec_token",
        );
      }),
    });

    await expect(
      fetchSourceContent(
        "url",
        "https://www.xiaohongshu.com/explore/abc",
        runtime,
      ),
    ).rejects.toThrow("无法抓取这个小红书链接，请直接粘贴正文内容。");

    expect(runtime.xiaohongshu).toHaveBeenCalled();
    expect(runtime.plainWeb).not.toHaveBeenCalled();
  });

  it("rejects empty provider output after normalization", async () => {
    const runtime = createRuntime({
      plainWeb: vi.fn(async () => ({
        provider: "plain-web",
        text: "    ",
      })),
    });

    await expect(
      fetchSourceContent("url", "https://example.com/post", runtime),
    ).rejects.toThrow("抓取结果为空。");
  });
});
