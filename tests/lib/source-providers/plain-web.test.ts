import { describe, expect, it } from "vitest";
import { extractPlainWebText } from "../../../lib/source-providers/plain-web";

describe("plain web provider", () => {
  it("extracts the main article body from noisy HTML", async () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Example Article</title>
        </head>
        <body>
          <header>
            <nav>
              <a href="/home">Home</a>
              <a href="/pricing">Pricing</a>
            </nav>
          </header>
          <main>
            <article>
              <h1>Lantern Market Story</h1>
              <p>A glowing teapot mascot slips through a lantern night market.</p>
              <p>At the end of the alley, it discovers a humming door made of light.</p>
            </article>
          </main>
          <footer>
            <a href="/privacy">Privacy</a>
          </footer>
        </body>
      </html>
    `;

    const text = await extractPlainWebText(html, "https://example.com/post");

    expect(text).toContain("Lantern Market Story");
    expect(text).toContain(
      "A glowing teapot mascot slips through a lantern night market.",
    );
    expect(text).toContain(
      "At the end of the alley, it discovers a humming door made of light.",
    );
    expect(text).not.toContain("Pricing");
    expect(text).not.toContain("Privacy");
  });
});
