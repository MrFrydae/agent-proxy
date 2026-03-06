import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = db
    .select({
      id: accounts.id,
      provider: accounts.provider,
      label: accounts.label,
      priority: accounts.priority,
      isActive: accounts.isActive,
      quotaFiveHrPercent: accounts.quotaFiveHrPercent,
      quotaFiveHrResetsAt: accounts.quotaFiveHrResetsAt,
      quotaWeeklyPercent: accounts.quotaWeeklyPercent,
      quotaWeeklyResetsAt: accounts.quotaWeeklyResetsAt,
      quotaLastCheckedAt: accounts.quotaLastCheckedAt,
      rateLimitedUntil: accounts.rateLimitedUntil,
      rateLimitStatus: accounts.rateLimitStatus,
    })
    .from(accounts)
    .where(eq(accounts.isActive, 1))
    .orderBy(accounts.provider, accounts.priority)
    .all();

  return NextResponse.json(rows);
}
