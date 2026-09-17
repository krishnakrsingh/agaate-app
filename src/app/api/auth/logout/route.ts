import { NextResponse } from "next/server";
import { clearSession } from "@modules/auth";
export async function POST() { await clearSession(); return NextResponse.json({ ok: true }); }
