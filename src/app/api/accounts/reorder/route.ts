import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orderedIds } = body as { orderedIds: string[] };

  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds must be an array of account IDs" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  for (let i = 0; i < orderedIds.length; i++) {
    db.update(accounts)
      .set({ priority: i + 1, updatedAt: now })
      .where(eq(accounts.id, orderedIds[i]))
      .run();
  }

  return NextResponse.json({ ok: true });
}
