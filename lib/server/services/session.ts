import type {
  CartItem,
  ChatMessage,
  ChatMode,
  ClientChatTurn,
  Session,
  SessionContext,
} from "../types";

const MAX_CLIENT_MESSAGES = 20;

/**
 * Stateless session for serverless — built from each request body.
 */
export function buildSessionFromRequest(params: {
  sessionId: string;
  mode?: ChatMode;
  cart?: CartItem[];
  messages?: ClientChatTurn[];
  context?: SessionContext;
}): Session {
  const serverMessages: ChatMessage[] = (params.messages ?? [])
    .filter((m) => m.content?.trim())
    .slice(-MAX_CLIENT_MESSAGES)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      content: m.content,
      timestamp: new Date(),
    }));

  return {
    id: params.sessionId,
    messages: serverMessages,
    cart: params.cart ?? [],
    mode: params.mode === "auto" || !params.mode ? "auto" : params.mode,
    context: { ...(params.context ?? {}) },
    created_at: new Date(),
    last_active: new Date(),
  };
}

export function appendMessage(session: Session, message: ChatMessage): void {
  session.messages.push(message);
  session.last_active = new Date();
}

export function updateCart(session: Session, cart: CartItem[]): void {
  session.cart = cart;
  session.last_active = new Date();
}

export function patchSessionContext(
  session: Session,
  patch: Partial<SessionContext>
): void {
  session.context = { ...session.context, ...patch };
}
