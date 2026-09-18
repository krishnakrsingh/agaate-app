"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { chatApi, formatChatTime } from "@modules/chat/ui/chat-client";

type Item = {
  id: string;
  title: string;
  deepLink: string;
  createdAt: string;
};

const CHAT_ROLES = ["AGRONOMIST", "FARM_OFFICER"];

export function NotificationBell({ role }: { role: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const d = await chatApi<{ count: number }>("/api/notifications/unread-count");
      setCount(d.count);
    } catch {
      // badge is best-effort
    }
  }, []);

  useEffect(() => {
    if (!CHAT_ROLES.includes(role)) return;
    const t = setTimeout(loadCount, 0);
    const id = setInterval(() => {
      if (!document.hidden) loadCount();
    }, 30000);
    const onFocus = () => loadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(t);
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [role, loadCount]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open ]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const d = await chatApi<Item[]>("/api/notifications?limit=15");
        setItems(d);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const openItem = async (item: Item) => {
    try {
      await chatApi("/api/notifications", { method: "PATCH", body: JSON.stringify({ ids: [item.id] }) });
    } catch {
      // navigation still works; badge refreshes on next poll
    }
    setOpen(false);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setCount((c) => Math.max(0, c - 1));
    router.push(item.deepLink);
  };

  const markAll = async () => {
    try {
      await chatApi("/api/notifications", { method: "PATCH", body: JSON.stringify({ allRead: true }) });
    } catch {
      // ignore
    }
    setItems([]);
    setCount(0);
    setOpen(false);
  };

  if (!CHAT_ROLES.includes(role)) return null;

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={toggle}
        title={count > 0 ? `${count} unread message${count === 1 ? "" : "s"}` : "No unread messages"}
        aria-label="Message notifications"
        aria-expanded={open}
        style={{ position: "relative" }}
      >
        <Icons.Mail size={16} />
        {count > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute", top: -6, right: -6, minWidth: 18, height: 18,
              borderRadius: 9, background: "var(--danger)", color: "#fff",
              fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, maxWidth: "86vw",
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 70, overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: 13 }}>Messages</strong>
            {items.length > 0 && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={markAll}>Mark all read</button>
            )}
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {loading && <p className="muted" style={{ padding: "12px", fontSize: 13 }}>Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="muted" style={{ padding: "16px 12px", fontSize: 13, textAlign: "center", margin: 0 }}>You are all caught up.</p>
            )}
            {items.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => openItem(i)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--line)", background: "transparent", cursor: "pointer", borderLeft: "none", borderRight: "none", borderTop: "none" }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{i.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{formatChatTime(i.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
