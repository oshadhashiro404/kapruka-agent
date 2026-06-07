import { describe, expect, it } from "vitest";
import {
  buildRefinedQuery,
  isNarrativeMessage,
  matchScenario,
  parseCategoryBrowse,
} from "@/lib/server/config/product-keywords";

describe("isNarrativeMessage", () => {
  it("detects emotional story", () => {
    expect(
      isNarrativeMessage(
        "I broke up with my girlfriend and I need to send some flowers"
      )
    ).toBe(true);
  });

  it("detects short product query as non-narrative", () => {
    expect(isNarrativeMessage("flowers under 5000")).toBe(false);
  });
});

describe("matchScenario", () => {
  it("maps breakup to apology flowers", () => {
    const s = matchScenario("I broke up with my girlfriend");
    expect(s?.occasion).toBe("apology");
    expect(s?.query).toContain("roses");
  });
});

describe("buildRefinedQuery", () => {
  it("uses scenario query for breakup", () => {
    const q = buildRefinedQuery("I broke up, need flowers", ["flowers"]);
    expect(q).toContain("roses");
  });
});

describe("parseCategoryBrowse", () => {
  it("extracts category from browse message", () => {
    expect(parseCategoryBrowse("Show me products in Flowers category")).toBe(
      "Flowers"
    );
  });
});
