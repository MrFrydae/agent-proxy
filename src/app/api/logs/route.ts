import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requestLogs } from "@/lib/db/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const db = getDb();
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const provider = url.searchParams.get("provider");
  const accountId = url.searchParams.get("accountId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const conditions = [];
  if (provider) conditions.push(eq(requestLogs.provider, provider));
  if (accountId) conditions.push(eq(requestLogs.accountId, accountId));
  if (from) conditions.push(gte(requestLogs.createdAt, from));
  if (to) conditions.push(lte(requestLogs.createdAt, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select()
    .from(requestLogs)
    .where(where)
    .orderBy(desc(requestLogs.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  const countResult = db
    .select({ count: sql<number>`count(*)` })
    .from(requestLogs)
    .where(where)
    .get();

  return NextResponse.json({
    data: rows,
    total: countResult?.count ?? 0,
    page,
    limit,
  });
}
