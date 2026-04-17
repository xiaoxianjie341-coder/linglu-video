#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { runStoryboardPipeline } from "./lib/storyboard-pipeline";
import {
  normalizeVideoSelection,
  VIDEO_PROVIDER_IDS,
} from "./lib/video-providers/catalog";

async function resolveInput(options: {
  text?: string;
  textFile?: string;
  url?: string;
}): Promise<{ sourceType: "text" | "url"; sourceInput: string }> {
  if (options.url?.trim()) {
    return {
      sourceType: "url",
      sourceInput: options.url.trim(),
    };
  }

  if (options.text?.trim()) {
    return {
      sourceType: "text",
      sourceInput: options.text.trim(),
    };
  }

  if (options.textFile?.trim()) {
    return {
      sourceType: "text",
      sourceInput: await readFile(options.textFile.trim(), "utf8"),
    };
  }

  throw new Error("请提供 `--text`、`--text-file` 或 `--url` 其中之一。");
}

const program = new Command()
  .name("storyboard-pipeline")
  .description("Backend-only 3x3 storyboard preview pipeline")
  .option("--text <content>", "原始文本内容")
  .option("--text-file <path>", "从文件读取原始文本内容")
  .option("--url <url>", "公开链接，后台先抓正文")
  .option("--brand-tone <tone>", "品牌调性 / 视觉倾向")
  .option(
    "--provider <provider>",
    `视频引擎: ${VIDEO_PROVIDER_IDS.join(" | ")}`,
    "openai",
  )
  .option("--model <model>", "视频模型标识", "sora-2")
  .option("--clip-seconds <seconds>", "视频时长: 4 | 8 | 12", "8")
  .option(
    "--mode <mode>",
    "视频生成模式: grid_preview | panel_sequence",
    "grid_preview",
  )
  .option("--limit-shots <count>", "grid_preview 只覆盖前 N 格；panel_sequence 只跑前 N 个镜头")
  .option("--max-retries <count>", "仅 panel_sequence 模式下的 QA 最大重试次数", "1")
  .option("--skip-video", "只生成规划和总分镜，不生成视频", false)
  .option("--skip-qa", "仅 panel_sequence 模式：跳过逐镜一致性验收", false)
  .option("--output-dir <path>", "指定输出目录");

program.action(async (options) => {
  try {
    const input = await resolveInput(options);
    const normalizedVideo = normalizeVideoSelection(
      VIDEO_PROVIDER_IDS.includes(options.provider) ? options.provider : "openai",
      options.model,
    );
    const result = await runStoryboardPipeline({
      ...input,
      brandTone: options.brandTone,
      videoProvider: normalizedVideo.videoProvider,
      videoModel: normalizedVideo.videoModel,
      clipSeconds: Number(options.clipSeconds),
      generationMode:
        options.mode === "panel_sequence" ? "panel_sequence" : "grid_preview",
      limitShots: options.limitShots ? Number(options.limitShots) : undefined,
      maxRetries: Number(options.maxRetries),
      skipVideo: Boolean(options.skipVideo),
      skipQa: Boolean(options.skipQa),
      outputDir: options.outputDir,
    });

    console.log("\n[storyboard] 输出摘要");
    console.log(`- runId: ${result.runId}`);
    console.log(`- outputDir: ${result.outputDir}`);
    console.log(`- plan: ${result.planPath}`);
    console.log(`- grid: ${result.gridPath}`);
    if (result.finalVideoPath) {
      console.log(`- finalVideo: ${result.finalVideoPath}`);
    }
    console.log(`- summary: ${result.summaryPath}`);
  } catch (error) {
    console.error(
      "[storyboard] 失败:",
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
});

void program.parseAsync(process.argv);
