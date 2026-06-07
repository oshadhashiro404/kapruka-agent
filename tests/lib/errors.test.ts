import { describe, expect, it } from "vitest";
import {
  normalizeApiError,
  parseApiErrorPayload,
  toUserFriendlyError,
} from "@/lib/errors";

describe("errors", () => {
  it("parses API error payload", () => {
    expect(parseApiErrorPayload({ error: "Bad request" })).toBe("Bad request");
  });

  it("sanitizes raw JSON errors", () => {
    expect(
      toUserFriendlyError('{"error":{"type":"invalid_request_error"}}')
    ).toBe("Oops, something went wrong on my end. Mind trying again or rephrasing that?");
  });

  it("maps rate limits", () => {
    expect(normalizeApiError("too many", 429)).toContain("a lot of requests");
  });
});
