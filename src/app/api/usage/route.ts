import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requestLogs, accounts } from "@/lib/db/schema";
import { sql, gte, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "7");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Total requests today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRequests = db
    .select({ count: sql<number>`count(*)` })
    .from(requestLogs)
    .where(gte(requestLogs.createdAt, todayStart.toISOString()))
    .get();

  // Active accounts
  const activeAccounts = db
    .select({ count: sql<number>`count(*)` })
    .from(accounts)
    .where(eq(accounts.isActive, 1))
    .get();

  // Failover events in period
  const failoverEvents = db
    .select({ count: sql<number>`count(*)` })
    .from(requestLogs)
    .where(sql`${requestLogs.isFailover} = 1 AND ${requestLogs.createdAt} >= ${since}`)
    .get();

  // Error rate in period
  const totalInPeriod = db
    .select({ count: sql<number>`count(*)` })
    .from(requestLogs)
    .where(gte(requestLogs.createdAt, since))
    .get();

  const errorsInPeriod = db
    .select({ count: sql<number>`count(*)` })
    .from(requestLogs)
    .where(sql`${requestLogs.createdAt} >= ${since} AND ${requestLogs.statusCode} >= 400`)
    .get();

  const total = totalInPeriod?.count ?? 0;
  const errors = errorsInPeriod?.count ?? 0;
  const errorRate = total > 0 ? (errors / total) * 100 : 0;

  // Daily breakdown for chart
  const dailyStats = db
    .select({
      date: sql<string>`date(${requestLogs.createdAt})`,
      count: sql<number>`count(*)`,
      tokens: sql<number>`coalesce(sum(${requestLogs.inputTokens}), 0) + coalesce(sum(${requestLogs.outputTokens}), 0)`,
    })
    .from(requestLogs)
    .where(gte(requestLogs.createdAt, since))
    .groupBy(sql`date(${requestLogs.createdAt})`)
    .orderBy(sql`date(${requestLogs.createdAt})`)
    .all();

  return NextResponse.json({
    stats: {
      totalRequests: todayRequests?.count ?? 0,
      activeAccounts: activeAccounts?.count ?? 0,
      failoverEvents: failoverEvents?.count ?? 0,
      errorRate: Math.round(errorRate * 10) / 10,
    },
    dailyStats,
  });
}
