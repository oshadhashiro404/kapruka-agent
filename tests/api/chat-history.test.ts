import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/services/chat-history", () => ({
  loadUserChatHistory: vi.fn().mockResolvedValue({
    sessions: [{ id: "s1", title: "Chat", messages: [], createdAt: 1 }],
    activeSessionId: "s1",
    updated_at: 100,
  }),
  saveUserChatHistory: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "@/app/api/users/chat-history/route";

describe("/api/users/chat-history", () => {
  it("GET requires user_id", async () => {
    const res = await GET(new Request("http://localhost/api/users/chat-history"));
    expect(res.status).toBe(400);
  });

  it("GET returns history", async () => {
    const res = await GET(
      new Request("http://localhost/api/users/chat-history?user_id=u1")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.history.activeSessionId).toBe("s1");
  });

  it("POST rejects invalid body", async () => {
    const res = await POST(new Request("http://localhost/api/users/chat-history", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }));
    expect(res.status).toBe(400);
  });

  it("POST saves history", async () => {
    const res = await POST(new Request("http://localhost/api/users/chat-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "u1",
        sessions: [{ id: "s1", title: "Chat", messages: [], createdAt: 1 }],
        activeSessionId: "s1",
      }),
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
