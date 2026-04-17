import { describe, expect, it, vi } from "vitest";
import { SourceProviderFailure } from "../../../lib/source-providers/types";
import {
  extractXiaohongshuText,
  fetchXiaohongshuSource,
} from "../../../lib/source-providers/xiaohongshu";

describe("Xiaohongshu provider", () => {
  it("extracts readable note text from the CLI json envelope", () => {
    const text = extractXiaohongshuText({
      ok: true,
      schema_version: "1",
      data: {
        title: "夜市茶壶吉祥物",
        desc: "一只长满青苔的茶壶吉祥物穿过灯笼夜市，最终看见一扇发光的门。",
      },
    });

    expect(text).toContain("夜市茶壶吉祥物");
    expect(text).toContain(
      "一只长满青苔的茶壶吉祥物穿过灯笼夜市，最终看见一扇发光的门。",
    );
  });

  it("runs xhs read with --json and parses the note content", async () => {
    const runCommand = vi.fn(async () => ({
      stdout: JSON.stringify({
        ok: true,
        schema_version: "1",
        data: {
          title: "夜市茶壶吉祥物",
          desc: "一只长满青苔的茶壶吉祥物穿过灯笼夜市，最终看见一扇发光的门。",
        },
      }),
    }));

    const result = await fetchXiaohongshuSource(
      "https://www.xiaohongshu.com/explore/abc?xsec_token=token",
      {
        runCommand,
      },
    );

    expect(runCommand).toHaveBeenCalledWith("xhs", [
      "read",
      "https://www.xiaohongshu.com/explore/abc?xsec_token=token",
      "--json",
    ]);
    expect(result).toMatchObject({
      provider: "xiaohongshu",
    });
    expect(result.text).toContain("夜市茶壶吉祥物");
  });

  it("maps cli failures to a provider failure", async () => {
    await expect(
      fetchXiaohongshuSource("https://www.xiaohongshu.com/explore/abc", {
        runCommand: vi.fn(async () => {
          throw new Error("login required");
        }),
      }),
    ).rejects.toThrow("无法抓取这个小红书链接，请直接粘贴正文内容。");

    await expect(
      fetchXiaohongshuSource("https://www.xiaohongshu.com/explore/abc", {
        runCommand: vi.fn(async () => {
          throw new Error("login required");
        }),
      }),
    ).rejects.toBeInstanceOf(SourceProviderFailure);
  });
});
