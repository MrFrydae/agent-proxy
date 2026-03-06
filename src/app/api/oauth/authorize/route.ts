import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth/config";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/oauth/pkce";
import { storePending } from "@/lib/oauth/state-store";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const { provider, label } = await req.json();
  if (!provider || !label) {
    return NextResponse.json({ error: "provider and label required" }, { status: 400 });
  }

  const config = getOAuthConfig(provider);
  if (!config.clientId) {
    return NextResponse.json(
      { error: `OAuth not configured for ${provider}. Set the client ID env var.` },
      { status: 400 },
    );
  }

  const state = nanoid();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  storePending(state, { provider, label, codeVerifier, createdAt: Date.now() });

  const baseUrl = req.nextUrl.origin;
  const redirectUri = config.externalRedirect
    ? "https://console.anthropic.com/oauth/code/callback"
    : `${baseUrl}/api/oauth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${config.authUrl}?${params}`;

  return NextResponse.json({ authUrl, state, externalRedirect: config.externalRedirect });
}
