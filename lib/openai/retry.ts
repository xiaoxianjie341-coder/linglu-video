import pRetry, { AbortError, type Options as PRetryOptions } from "p-retry";

interface RetryableErrorShape {
  message?: string | null;
  status?: number;
  code?: string | number;
  cause?: unknown;
}

export interface OpenAIRetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as RetryableErrorShape;
  return typeof candidate.status === "number"
    ? candidate.status
    : getErrorStatus(candidate.cause);
}

export function isRetryableOpenAIError(error: unknown): boolean {
  const status = getErrorStatus(error);

  if (status === 408 || status === 409 || status === 429) {
    return true;
  }
  if (typeof status === "number" && status >= 500) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();

  return [
    "connection error",
    "fetch failed",
    "network error",
    "timeout",
    "timed out",
    "socket hang up",
    "econnreset",
    "econnrefused",
    "enotfound",
    "eai_again",
    "rate limit",
    "too many requests",
  ].some((fragment) => message.includes(fragment));
}

export async function withOpenAIRetry<T>(
  actionLabel: string,
  fn: () => Promise<T>,
  options: OpenAIRetryOptions = {},
): Promise<T> {
  const retryOptions: PRetryOptions = {
    retries: options.retries ?? 2,
    minTimeout: options.minTimeout ?? 1_500,
    maxTimeout: options.maxTimeout ?? 8_000,
    factor: options.factor ?? 2,
    randomize: false,
    onFailedAttempt: (error) => {
      console.warn(
        `[retry] ${actionLabel} 失败，准备重试 ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber}: ${error.message}`,
      );
    },
  };

  return pRetry(async () => {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableOpenAIError(error)) {
        throw new AbortError(getErrorMessage(error));
      }
      throw error instanceof Error ? error : new Error(getErrorMessage(error));
    }
  }, retryOptions);
}

export async function withOpenAIReconnectRetry<TClient, TResult>(
  actionLabel: string,
  createClient: () => Promise<TClient>,
  fn: (client: TClient) => Promise<TResult>,
  options: OpenAIRetryOptions = {},
): Promise<TResult> {
  return withOpenAIRetry(
    actionLabel,
    async () => {
      const client = await createClient();
      return fn(client);
    },
    options,
  );
}
