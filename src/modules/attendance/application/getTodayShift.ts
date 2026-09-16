import { prisma } from "@/infrastructure/db";
import { utcDateOnly } from "@/shared/dates";
import { getTodayShift as readTodayShift } from "../infrastructure/attendanceQueries";

type Db = typeof prisma;

/** Today's shift row for display (GET): latest start, any farm. No role gate. */
export async function getTodayShift(opts: { userId: string; db?: Db; now?: Date }) {
  const { userId, db = prisma, now = new Date() } = opts;
  return readTodayShift(db, userId, utcDateOnly(now));
}
