import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
import {
  SourceProviderFailure,
  type SourceProviderResult,
} from "./types";

const URL_FETCH_ERROR = "无法抓取这个公开链接，请直接粘贴正文内容。";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractPlainWebText(
  html: string,
  url: string,
): Promise<string> {
  const { document } = parseHTML(html);
  const result = await Defuddle(document, url, {
    markdown: false,
    useAsync: false,
  });

  const title = result.title?.trim() ?? "";
  const content = stripHtml(result.content ?? "");

  return [title, content].filter(Boolean).join(" ").trim();
}

export async function fetchPlainWebSource(
  url: string,
): Promise<SourceProviderResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const html = await response.text();

    return {
      provider: "plain-web",
      text: await extractPlainWebText(html, url),
    };
  } catch (error) {
    throw new SourceProviderFailure(
      "plain-web",
      URL_FETCH_ERROR,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}
