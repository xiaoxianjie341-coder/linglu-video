import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { getDataDir } from "./storage";

const DEFAULT_LINGLU_CONTROL_ORIGIN = "https://test.linglu.ai";

const lingluControlPlaneSessionSchema = z.object({
  teamId: z.string().min(1),
  cookieHeader: z.string().min(1),
  origin: z.string().url().optional().default(DEFAULT_LINGLU_CONTROL_ORIGIN),
});

export type LingluControlPlaneSession = z.infer<
  typeof lingluControlPlaneSessionSchema
>;

export interface LingluControlPlaneChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LingluControlPlaneChatCompletion {
  id?: string;
  choices: Array<{
    index?: number;
    message?: {
      role?: string;
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

export interface LingluControlPlaneImageGeneration {
  created?: number;
  data?: Array<{
    b64_json?: string | null;
    url?: string | null;
  }>;
}

function getLingluControlPlaneSessionPath(baseDir?: string): string {
  return join(getDataDir(baseDir), "linglu-control-plane-session.json");
}

export async function readLingluControlPlaneSession(
  baseDir?: string,
): Promise<LingluControlPlaneSession> {
  try {
    const raw = await readFile(getLingluControlPlaneSessionPath(baseDir), "utf8");
    return lingluControlPlaneSessionSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        "还没有找到灵路 control-plane 会话文件，请先同步当前浏览器登录态。",
      );
    }

    throw error;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return fallback;
}

export async function createLingluControlPlaneChatCompletion({
  model,
  messages,
  session,
  baseDir,
  fetchImpl = globalThis.fetch.bind(globalThis) as typeof fetch,
}: {
  model: string;
  messages: LingluControlPlaneChatMessage[];
  session?: LingluControlPlaneSession;
  baseDir?: string;
  fetchImpl?: typeof fetch;
}): Promise<LingluControlPlaneChatCompletion> {
  const resolvedSession =
    session ?? (await readLingluControlPlaneSession(baseDir));
  const origin = resolvedSession.origin || DEFAULT_LINGLU_CONTROL_ORIGIN;
  const url = `${origin}/api/control-plane/playground/chat?teamId=${encodeURIComponent(
    resolvedSession.teamId,
  )}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: resolvedSession.cookieHeader,
      Origin: origin,
      Referer: `${origin}/zh/console/chat?teamId=${resolvedSession.teamId}`,
    },
    body: JSON.stringify({
      model,
      messages,
      metadata: {
        selected_model_slug: model,
      },
    }),
  });

  const raw = await response.text();
  const payload = raw
    ? (JSON.parse(raw) as LingluControlPlaneChatCompletion | { error?: unknown })
    : null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, `灵路 control-plane 请求失败（${response.status}）`),
    );
  }

  return payload as LingluControlPlaneChatCompletion;
}

export async function createLingluControlPlaneImageGeneration({
  model,
  prompt,
  size,
  session,
  baseDir,
  fetchImpl = globalThis.fetch.bind(globalThis) as typeof fetch,
}: {
  model: string;
  prompt: string;
  size: string;
  session?: LingluControlPlaneSession;
  baseDir?: string;
  fetchImpl?: typeof fetch;
}): Promise<LingluControlPlaneImageGeneration> {
  const resolvedSession =
    session ?? (await readLingluControlPlaneSession(baseDir));
  const origin = resolvedSession.origin || DEFAULT_LINGLU_CONTROL_ORIGIN;
  const url = `${origin}/api/control-plane/playground/images?teamId=${encodeURIComponent(
    resolvedSession.teamId,
  )}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: resolvedSession.cookieHeader,
      Origin: origin,
      Referer: `${origin}/zh/console?teamId=${resolvedSession.teamId}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
    }),
  });

  const raw = await response.text();
  const payload = raw
    ? (JSON.parse(raw) as LingluControlPlaneImageGeneration | { error?: unknown })
    : null;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, `灵路 control-plane 生图失败（${response.status}）`),
    );
  }

  return payload as LingluControlPlaneImageGeneration;
}

export function extractLingluChatCompletionText(
  payload: LingluControlPlaneChatCompletion,
): string {
  const content = payload.choices[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error("灵路 control-plane 没有返回可用的文本结果。");
}
