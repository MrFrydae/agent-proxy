import { NextRequest, NextResponse } from "next/server";
import { consumePending } from "@/lib/oauth/state-store";
import { exchangeCodeForTokens } from "@/lib/oauth/tokens";
import { getOAuthConfig } from "@/lib/oauth/config";
import { encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const { code, state } = await req.json();

  if (!code || !state) {
    return NextResponse.json({ error: "code and state are required" }, { status: 400 });
  }

  const pending = consumePending(state);
  if (!pending) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }

  try {
    const redirectUri = "https://console.anthropic.com/oauth/code/callback";
    const tokens = await exchangeCodeForTokens(
      pending.provider,
      code,
      pending.codeVerifier,
      redirectUri,
    );

    const db = getDb();
    const existing = db.select().from(accounts).where(eq(accounts.provider, pending.provider)).all();
    const maxPriority = existing.reduce((max, a) => Math.max(max, a.priority), 0);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const config = getOAuthConfig(pending.provider);

    db.insert(accounts)
      .values({
        id: nanoid(),
        provider: pending.provider,
        label: pending.label,
        apiKey: encrypt(tokens.access_token),
        authMethod: "oauth",
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        accessTokenExpiresAt: expiresAt,
        oauthScopes: config.scopes.join(" "),
        priority: maxPriority + 1,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    console.error("[oauth/exchange]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
