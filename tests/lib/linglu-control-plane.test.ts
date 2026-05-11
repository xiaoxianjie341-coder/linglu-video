import { describe, expect, it, vi } from "vitest";
import {
  createLingluControlPlaneChatCompletion,
  createLingluControlPlaneImageGeneration,
  extractLingluChatCompletionText,
  type LingluControlPlaneChatCompletion,
} from "../../lib/linglu-control-plane";

describe("Linglu control-plane planner", () => {
  it("forwards playground chat requests with the stored browser session", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl_test",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "pong",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const result = await createLingluControlPlaneChatCompletion({
      model: "gpt-5.4",
      messages: [{ role: "user", content: "只回复 pong" }],
      session: {
        teamId: "team_123",
        cookieHeader: "session=abc",
        origin: "https://test.linglu.ai",
      },
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://test.linglu.ai/api/control-plane/playground/chat?teamId=team_123",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Cookie: "session=abc",
          Origin: "https://test.linglu.ai",
          Referer: "https://test.linglu.ai/zh/console/chat?teamId=team_123",
        }),
        body: JSON.stringify({
          model: "gpt-5.4",
          messages: [{ role: "user", content: "只回复 pong" }],
          metadata: { selected_model_slug: "gpt-5.4" },
        }),
      }),
    );
    expect(extractLingluChatCompletionText(result)).toBe("pong");
  });

  it("extracts assistant text from the playground response", () => {
    const payload: LingluControlPlaneChatCompletion = {
      id: "chatcmpl_test",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "pong",
          },
        },
      ],
    };

    expect(extractLingluChatCompletionText(payload)).toBe("pong");
  });

  it("forwards playground image requests without OpenAI-only extra fields", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          created: 1778252819,
          data: [{ b64_json: "aW1hZ2U=" }],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const result = await createLingluControlPlaneImageGeneration({
      model: "gpt-image-1",
      prompt: "红苹果",
      size: "1024x1024",
      session: {
        teamId: "team_123",
        cookieHeader: "session=abc",
        origin: "https://test.linglu.ai",
      },
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://test.linglu.ai/api/control-plane/playground/images?teamId=team_123",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Cookie: "session=abc",
          Origin: "https://test.linglu.ai",
        }),
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: "红苹果",
          n: 1,
          size: "1024x1024",
        }),
      }),
    );
    expect(result.data[0]?.b64_json).toBe("aW1hZ2U=");
  });

  it("throws when the playground response does not include assistant text", () => {
    expect(() =>
      extractLingluChatCompletionText({
        id: "chatcmpl_test",
        choices: [],
      }),
    ).toThrow("灵路 control-plane 没有返回可用的文本结果。");
  });
});
