import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long").max(256),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = passwordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("[Password Update] Error:", err);
    return NextResponse.json({ error: "Failed to update password. Please try again." }, { status: 500 });
  }
}
