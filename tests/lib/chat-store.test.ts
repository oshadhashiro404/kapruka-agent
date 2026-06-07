import { beforeEach, describe, expect, it } from "vitest";
import { computeSessionsUpdatedAt, useChatStore } from "@/lib/chat-store";

describe("chat store", () => {
  beforeEach(() => {
    const session = {
      id: "s1",
      title: "New chat",
      messages: [],
      createdAt: 1000,
    };
    useChatStore.setState({
      sessions: [session],
      activeSessionId: "s1",
      hydrated: true,
      updatedAt: 1000,
    });
  });

  it("creates and switches sessions", () => {
    const id = useChatStore.getState().addSession();
    expect(useChatStore.getState().activeSessionId).toBe(id);
    useChatStore.getState().switchSession("s1");
    expect(useChatStore.getState().activeSessionId).toBe("s1");
  });

  it("updates session title and bumps updatedAt", () => {
    const before = useChatStore.getState().updatedAt;
    useChatStore.getState().setSessionTitle("s1", "Birthday gifts");
    expect(useChatStore.getState().sessions[0].title).toBe("Birthday gifts");
    expect(useChatStore.getState().updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("computes updatedAt from messages", () => {
    const ts = computeSessionsUpdatedAt([
      {
        id: "s1",
        title: "Chat",
        createdAt: 100,
        messages: [
          {
            id: "m1",
            role: "user",
            content: "hi",
            timestamp: new Date(5000),
          },
        ],
      },
    ]);
    expect(ts).toBeGreaterThanOrEqual(5000);
  });
});
