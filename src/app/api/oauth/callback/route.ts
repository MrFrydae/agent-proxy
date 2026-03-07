import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { consumePending } from "@/lib/oauth/state-store";
import { exchangeCodeForTokens } from "@/lib/oauth/tokens";
import { getOAuthConfig } from "@/lib/oauth/config";
import { encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/accounts?oauth=error&reason=missing_params", req.nextUrl.origin),
    );
  }

  const pending = consumePending(state);
  if (!pending) {
    return NextResponse.redirect(
      new URL("/accounts?oauth=error&reason=invalid_state", req.nextUrl.origin),
    );
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/oauth/callback`;
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

    return NextResponse.redirect(new URL("/accounts?oauth=success", req.nextUrl.origin));
  } catch (err) {
    console.error("[oauth/callback] Token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/accounts?oauth=error&reason=exchange_failed", req.nextUrl.origin),
    );
  }
}
