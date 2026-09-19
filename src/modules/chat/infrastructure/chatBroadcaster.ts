import { EventEmitter } from "events";
import type { ChatMessage } from "../ui/chat-client";

interface BroadcastPayload {
  conversationId: string;
  message: ChatMessage;
  timestamp: number;
}

interface ConversationPayload {
  farmId: string;
  conversationId: string;
  status: string;
  subject?: string | null;
  lastMessageAt: string;
}

// ponytail: In-process EventEmitter hub handles single-instance setups (local dev, single-node VM/container).
// Ceiling: Horizontally scaled multi-pod production environments where instance A cannot directly broadcast to instance B.
// Upgrade path: Swap EventEmitter emit/listen with Redis/Valkey Pub/Sub (ioredis) or PostgreSQL LISTEN/NOTIFY when REDIS_URL is configured.
// Interface signature (broadcastMessage, broadcastConversationUpdate, on) remains identical.

class ChatBroadcaster extends EventEmitter {
  private recentMessages = new Map<string, ChatMessage[]>();

  constructor() {
    super();
    this.setMaxListeners(200);
  }

  public broadcastMessage(conversationId: string, message: any) {
    const shaped: ChatMessage = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.senderName ?? "User",
      senderRole: message.senderRole ?? null,
      body: message.body,
      deleted: !!message.deleted,
      clientMessageId: message.clientMessageId,
      createdAt: typeof message.createdAt === "string" ? message.createdAt : new Date(message.createdAt).toISOString(),
      editedAt: message.editedAt ? (typeof message.editedAt === "string" ? message.editedAt : new Date(message.editedAt).toISOString()) : null,
      refs: message.refs ?? [],
      attachments: message.attachments ?? [],
      attachment: message.attachment ?? null,
    };

    // Cache recent messages (keep last 30 per conversation)
    const list = this.recentMessages.get(conversationId) ?? [];
    list.push(shaped);
    if (list.length > 30) list.shift();
    this.recentMessages.set(conversationId, list);

    const payload: BroadcastPayload = {
      conversationId,
      message: shaped,
      timestamp: Date.now(),
    };

    // Emit to conversation-specific listeners
    this.emit(`message:${conversationId}`, payload);
    // Emit to global message listener
    this.emit("message", payload);
  }

  public broadcastConversationUpdate(farmId: string, conversation: any) {
    const payload: ConversationPayload = {
      farmId,
      conversationId: conversation.id,
      status: conversation.status,
      subject: conversation.subject,
      lastMessageAt: typeof conversation.lastMessageAt === "string" ? conversation.lastMessageAt : new Date(conversation.lastMessageAt).toISOString(),
    };

    this.emit(`farm:${farmId}`, payload);
    this.emit("conversation", payload);
  }

  public getRecent(conversationId: string): ChatMessage[] {
    return this.recentMessages.get(conversationId) ?? [];
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __agaate_chat_broadcaster: ChatBroadcaster | undefined;
}

export const chatBroadcaster: ChatBroadcaster =
  globalThis.__agaate_chat_broadcaster ?? (globalThis.__agaate_chat_broadcaster = new ChatBroadcaster());
