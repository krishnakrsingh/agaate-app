"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useServerList } from "@/components/data/use-server-list";
import { ServerTable } from "@/components/data/server-table";

type Client = {
  id: string;
  code: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  district?: string | null;
  status: string;
  totalFarms: number;
  activeFarmsCount: number;
  setupFarmsCount: number;
  totalAcreage: number;
};

/**
 * Clients directory — server-paginated via /api/admin/clients. Replaces the
 * dashboard tab that filtered the first 20 clients in memory and reported
 * wrong counts at scale.
 */
export function ClientsDirectory() {
  const [status, setStatus] = useState("ALL");
  const extraParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (status !== "ALL") p.status = status;
    return p;
  }, [status]);
  const list = useServerList<Client>("/api/admin/clients", { initialLimit: 25, extraParams });

  return (
    <ServerTable<Client>
      columns={[
        { key: "client", header: "Client", render: (c) => (
          <div style={{ minWidth: 220 }}>
            <div style={{ fontWeight: 650 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{c.code}{c.companyName ? ` • ${c.companyName}` : ""}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{[c.phone, c.email].filter(Boolean).join(" • ")}</div>
          </div>
        ) },
        { key: "geo", header: "Region", render: (c) => <span style={{ fontSize: 12 }}>{[c.district, c.state].filter(Boolean).join(", ") || "—"}</span> },
        { key: "farms", header: "Farms", render: (c) => (
          <span style={{ fontSize: 12 }} className="font-mono">{c.totalFarms} total • {c.activeFarmsCount} active • {c.setupFarmsCount} setup</span>
        ) },
        { key: "acreage", header: "Acreage", render: (c) => <span style={{ fontSize: 12 }} className="font-mono">{Number(c.totalAcreage || 0).toFixed(1)}</span> },
        { key: "open", header: "", render: (c) => <Link href={`/farms?clientId=${c.id}`} style={{ fontSize: 12 }}>Farms →</Link> },
      ]}
      rows={list.rows}
      total={list.total}
      page={list.page}
      limit={list.limit}
      loading={list.loading}
      error={list.error}
      search={list.search}
      onSearch={list.setSearch}
      onPage={list.setPage}
      onLimit={list.setLimit}
      onRetry={list.reload}
      searchPlaceholder="Search name, code, phone, company… (server-side)"
      emptyTitle="No clients match"
      emptyHint="The directory queries the server per page — a million-client portfolio stays responsive."
      toolbar={
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ height: 36, fontSize: 12 }}>
          {["ALL", "ACTIVE", "INACTIVE"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      }
    />
  );
}
