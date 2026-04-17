import { describe, expect, it, vi } from "vitest";
import {
  withOpenAIReconnectRetry,
  withOpenAIRetry,
} from "../../../lib/openai/retry";

describe("OpenAI retry helpers", () => {
  it("retries transient connection failures and eventually succeeds", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let attempts = 0;

    const result = await withOpenAIRetry(
      "生成总分镜图",
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("Connection error.");
        }
        return "ok";
      },
      {
        retries: 2,
        minTimeout: 1,
        maxTimeout: 1,
        factor: 1,
      },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable client errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let attempts = 0;
    const error = Object.assign(new Error("Invalid request body"), {
      status: 400,
    });

    await expect(
      withOpenAIRetry(
        "生成总分镜图",
        async () => {
          attempts += 1;
          throw error;
        },
        {
          retries: 2,
          minTimeout: 1,
          maxTimeout: 1,
          factor: 1,
        },
      ),
    ).rejects.toThrow("Invalid request body");

    expect(attempts).toBe(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("recreates the client on each retry attempt", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const createClient = vi
      .fn()
      .mockResolvedValueOnce({ id: "client-1" })
      .mockResolvedValueOnce({ id: "client-2" })
      .mockResolvedValueOnce({ id: "client-3" });
    const invoke = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection error."))
      .mockRejectedValueOnce(new Error("Connection error."))
      .mockResolvedValueOnce("ok");

    const result = await withOpenAIReconnectRetry(
      "分镜规划",
      createClient,
      invoke,
      {
        retries: 2,
        minTimeout: 1,
        maxTimeout: 1,
        factor: 1,
      },
    );

    expect(result).toBe("ok");
    expect(createClient).toHaveBeenCalledTimes(3);
    expect(invoke).toHaveBeenNthCalledWith(1, { id: "client-1" });
    expect(invoke).toHaveBeenNthCalledWith(2, { id: "client-2" });
    expect(invoke).toHaveBeenNthCalledWith(3, { id: "client-3" });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
