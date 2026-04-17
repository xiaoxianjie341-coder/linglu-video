import { describe, expect, it } from "vitest";
import { normalizeStringArray } from "../../lib/string-array";

describe("normalizeStringArray", () => {
  it("pads partially returned arrays up to the required minimum", () => {
    const result = normalizeStringArray(
      ["same face or same species identity", "same clothing silhouette"],
      [
        "same face or same species identity",
        "same clothing, fur pattern, or surface features",
        "same body proportion and visual style",
      ],
      3,
    );

    expect(result).toEqual([
      "same face or same species identity",
      "same clothing silhouette",
      "same clothing, fur pattern, or surface features",
    ]);
  });

  it("falls back when the source array is empty", () => {
    const result = normalizeStringArray([], ["a", "b", "c"], 3);

    expect(result).toEqual(["a", "b", "c"]);
  });
});
