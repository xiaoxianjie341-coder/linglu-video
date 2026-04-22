export const DEFAULT_IMAGE_COUNT = 2;

const RAW_PROVIDER_ERROR_PATTERN =
  /help\.openai\.com|safety system|safety_violations|request ID req_|content_policy|violations=/i;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "");
}

export function toUserFacingImageErrorMessage(error: unknown): string {
  const message = getErrorMessage(error).trim();

  if (!message) {
    return "这次出图没有成功，请稍后再试一次。";
  }

  const normalized = message.toLowerCase();

  if (
    normalized.includes("safety") ||
    normalized.includes("policy") ||
    normalized.includes("violations") ||
    normalized.includes("sexual")
  ) {
    return "这次画面描述触发了安全限制，换个更日常、克制一点的说法再试。";
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("socket") ||
    normalized.includes("econnreset") ||
    normalized.includes("connection")
  ) {
    return "这次连接有点不稳定，图片还没完整出来，请稍后再试一次。";
  }

  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return "现在出图的人有点多，请稍等一下再试。";
  }

  if (/[\u4e00-\u9fff]/.test(message) && !RAW_PROVIDER_ERROR_PATTERN.test(message)) {
    return message;
  }

  return "这次出图没有成功，请稍后再试一次。";
}
