import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const existing = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.label !== undefined) updates.label = body.label;
  if (body.apiKey !== undefined) {
    if (existing.authMethod === "oauth") {
      return NextResponse.json({ error: "Cannot manually set API key on OAuth accounts" }, { status: 400 });
    }
    updates.apiKey = encrypt(body.apiKey);
  }
  if (body.isActive !== undefined) updates.isActive = body.isActive ? 1 : 0;
  if (body.priority !== undefined) updates.priority = body.priority;

  db.update(accounts).set(updates).where(eq(accounts.id, id)).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest, { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const db = getDb();

  const existing = db.select().from(accounts).where(eq(accounts.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  db.delete(accounts).where(eq(accounts.id, id)).run();

  return NextResponse.json({ ok: true });
}
