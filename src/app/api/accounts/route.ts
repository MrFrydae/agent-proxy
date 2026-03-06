import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { encrypt, decrypt } from "@/lib/crypto";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import type { AccountPublic } from "@/types";

export async function GET() {
  const db = getDb();
  const rows = db.select().from(accounts).orderBy(accounts.provider, accounts.priority).all();
  const result: AccountPublic[] = rows.map((row) => {
    const decrypted = decrypt(row.apiKey);
    return {
      ...row,
      apiKey: undefined as never,
      apiKeyLast4: decrypted.slice(-4),
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, label, apiKey } = body;

  if (!provider || !label || !apiKey) {
    return NextResponse.json({ error: "provider, label, and apiKey are required" }, { status: 400 });
  }
  if (provider !== "anthropic" && provider !== "openai") {
    return NextResponse.json({ error: "provider must be 'anthropic' or 'openai'" }, { status: 400 });
  }

  const db = getDb();

  // Get next priority for this provider
  const existing = db
    .select()
    .from(accounts)
    .where(eq(accounts.provider, provider))
    .all();
  const maxPriority = existing.reduce((max, a) => Math.max(max, a.priority), 0);

  const now = new Date().toISOString();
  const id = nanoid();
  const encrypted = encrypt(apiKey);

  db.insert(accounts)
    .values({
      id,
      provider,
      label,
      apiKey: encrypted,
      priority: maxPriority + 1,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return NextResponse.json({ id, provider, label, priority: maxPriority + 1 }, { status: 201 });
}
