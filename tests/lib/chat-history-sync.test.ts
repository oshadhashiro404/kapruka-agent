import { describe, expect, it } from "vitest";
import { shouldPreferRemote } from "@/lib/chat-history-sync";

describe("shouldPreferRemote", () => {
  it("prefers newer remote data", () => {
    expect(shouldPreferRemote(100, 200)).toBe(true);
  });

  it("keeps local when remote is older", () => {
    expect(shouldPreferRemote(500, 100)).toBe(false);
  });

  it("prefers remote when it has more sessions and is not older", () => {
    expect(
      shouldPreferRemote(100, 100, {
        localSessionCount: 1,
        remoteSessionCount: 3,
      })
    ).toBe(true);
  });
});
