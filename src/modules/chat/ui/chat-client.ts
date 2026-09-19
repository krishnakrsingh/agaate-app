"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ChatRef = {
  id?: string;
  entityType: "PLOT" | "CROP_CYCLE" | "TASK" | "PRESCRIPTION" | "INCIDENT" | "MONITORING";
  entityId: string;
  label?: string | null;
};

export type ChatAttachment = { id: string; kind: string; mimeType: string; sizeBytes: number };

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  body: string;
  deleted: boolean;
  clientMessageId: string;
  createdAt: string;
  editedAt: string | null;
  refs: ChatRef[];
  attachments: ChatAttachment[];
  /** Back-compat: first attachment only. Prefer `attachments`. */
  attachment: ChatAttachment | null;
};

export type ChatConversation = {
  id: string;
  farmId: string;
  farmName: string;
  plotId: string | null;
  cropCycleId: string | null;
  subject: string | null;
  status: string;
  lastMessageAt: string;
  unreadCount: number;
  participants: { userId: string; name: string; role: string | null; lastReadAt: string | null }[];
  lastMessage: { id: string; body: string; senderId: string; senderName: string; createdAt: string } | null;
};

export type RefPlot = {
  id: string;
  name: string;
  cycles: { id: string; cropName: string }[];
};

export async function chatApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── Offline outbox (mirrors walk-queue.ts pattern) ──────────────────────────
// Pending sends survive reload via localStorage; each carries its idempotency
// key so retries and double-taps collapse onto one server row.

export type OutboxItem = {
  clientMessageId: string;
  body: string;
  refs: { entityType: ChatRef["entityType"]; entityId: string; label?: string | null }[];
  attachmentMediaIds: string[];
  status: "QUEUED" | "SENDING" | "FAILED";
  error?: string;
  queuedAt: number;
};

function outboxKey(conversationId: string) {
  return `agaate_chat_outbox_${conversationId}`;
}

export function loadOutbox(conversationId: string): OutboxItem[] {
  try {
    const raw = localStorage.getItem(outboxKey(conversationId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveOutbox(conversationId: string, items: OutboxItem[]) {
  try {
    localStorage.setItem(outboxKey(conversationId), JSON.stringify(items));
  } catch {
    // storage full / private mode — outbox becomes memory-only
  }
}

export function enqueueOutbox(conversationId: string, item: OutboxItem) {
  saveOutbox(conversationId, [...loadOutbox(conversationId), item]);
}

export function removeOutboxItem(conversationId: string, clientMessageId: string) {
  saveOutbox(
    conversationId,
    loadOutbox(conversationId).filter((i) => i.clientMessageId !== clientMessageId)
  );
}

export function markOutboxStatus(
  conversationId: string,
  clientMessageId: string,
  status: OutboxItem["status"],
  error?: string
) {
  saveOutbox(
    conversationId,
    loadOutbox(conversationId).map((i) =>
      i.clientMessageId === clientMessageId ? { ...i, status, error } : i
    )
  );
}

export function newClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (sameDay) return time;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${time}`;
}

// ── Polling hook: refetch on interval while tab visible + on focus ──────────

export function useChatPolling(enabled: boolean, intervalMs: number, onTick: () => void) {
  const tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  });
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (!document.hidden) tick.current();
    }, intervalMs);
    const onFocus = () => tick.current();
    window.addEventListener("focus", onFocus);
    const onOnline = () => tick.current();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, intervalMs]);
}

export function useDraft(conversationId: string): [string, (v: string) => void, () => void] {
  const key = `agaate_chat_draft_${conversationId}`;
  const [value, setValue] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setValue(localStorage.getItem(key) ?? "");
      } catch {
        setValue("");
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
  const set = useCallback(
    (v: string) => {
      setValue(v);
      try {
        if (v) localStorage.setItem(key, v);
        else localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
    [key]
  );
  const clear = useCallback(() => {
    setValue("");
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);
  return [value, set, clear];
}
