"use client";
import { useEffect } from "react";
import { useState } from "react";
import Image from "next/image";
export function EvidenceGallery({ mediaIds }: { mediaIds: string[] }) { const [urls, setUrls] = useState<string[]>([]); const idsKey = mediaIds.join(","); useEffect(() => { let cancelled = false; const ids = idsKey ? idsKey.split(",") : []; Promise.all(ids.map(id => fetch(`/api/media/${id}/url`).then(r => r.ok ? r.json() : null).then(v => v?.url).catch(() => null))).then(values => { if (!cancelled) setUrls(values.filter((v): v is string => Boolean(v))); }); return () => { cancelled = true; }; }, [idsKey]); if (!urls.length) return null; return <div className="evidence-gallery">{urls.map(url => <a href={url} target="_blank" rel="noreferrer" key={url}><Image src={url} alt="Uploaded field evidence" width={88} height={66} unoptimized /></a>)}</div>; }
