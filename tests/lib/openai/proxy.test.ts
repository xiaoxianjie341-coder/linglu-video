import {
  FormData as UndiciFormData,
} from "undici";
import { describe, expect, it } from "vitest";
import {
  createProxyFetch,
  parseScutilProxyOutput,
  resolveProxyUrlFromEnv,
} from "../../../lib/openai/proxy";

describe("OpenAI proxy helpers", () => {
  it("prefers HTTPS proxy values from environment", () => {
    const proxyUrl = resolveProxyUrlFromEnv({
      HTTPS_PROXY: "http://127.0.0.1:7897",
      HTTP_PROXY: "http://127.0.0.1:8888",
    });

    expect(proxyUrl).toBe("http://127.0.0.1:7897");
  });

  it("parses macOS scutil HTTPS proxy settings", () => {
    const proxyUrl = parseScutilProxyOutput(`
<dictionary> {
  HTTPEnable : 1
  HTTPPort : 7897
  HTTPProxy : 127.0.0.1
  HTTPSEnable : 1
  HTTPSPort : 7897
  HTTPSProxy : 127.0.0.1
}
`);

    expect(proxyUrl).toBe("http://127.0.0.1:7897");
  });

  it("returns null when no proxy is enabled", () => {
    const proxyUrl = parseScutilProxyOutput(`
<dictionary> {
  HTTPEnable : 0
  HTTPSEnable : 0
}
`);

    expect(proxyUrl).toBeNull();
  });

  it("provides a Response helper that supports multipart uploads", async () => {
    const proxyFetch = createProxyFetch();
    const data = new FormData();
    data.append("x", "1");
    const text = await new proxyFetch.Response(data).text();

    expect(proxyFetch.Response.name).toContain("Response");
    expect(globalThis.FormData).not.toBe(UndiciFormData);
    expect(data.toString()).not.toBe(text);
  });
});
