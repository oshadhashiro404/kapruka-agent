import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/services/groq", () => ({
  runKapruwaChat: vi.fn().mockResolvedValue({ reply: "Hello!" }),
  toUserFriendlyGroqError: vi.fn().mockReturnValue({ message: "Error" }),
}));

vi.mock("@/lib/server/services/session", () => ({
  buildSessionFromRequest: vi.fn().mockReturnValue({
    context: {},
    messages: [],
  }),
  updateCart: vi.fn(),
  appendMessage: vi.fn(),
}));

import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  it("rejects invalid JSON", async () => {
    const res = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      body: "not json",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects missing required fields", async () => {
    const res = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns SSE stream on success", async () => {
    const res = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Show me cakes",
        session_id: "sess-1",
        cart: [],
        mode: "shopping",
      }),
    }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });
});
