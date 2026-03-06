import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth/config";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/oauth/pkce";
import { storePending } from "@/lib/oauth/state-store";
import { randomBytes } from "crypto";

function generateState(): string {
  // 64 hex chars from 32 random bytes, matching better-ccflare
  return randomBytes(32).toString("hex");
}

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

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  storePending(state, { provider, label, codeVerifier, createdAt: Date.now() });

  const baseUrl = req.nextUrl.origin;
  const redirectUri = config.externalRedirect
    ? "https://console.anthropic.com/oauth/code/callback"
    : `${baseUrl}/api/oauth/callback`;

  let authUrl: string;

  if (provider === "anthropic") {
    // Match better-ccflare: use URL + searchParams.set() for exact same encoding
    const url = new URL(config.authUrl);
    url.searchParams.set("code", "true");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", config.scopes.join(" "));
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    authUrl = url.toString();
  } else {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    authUrl = `${config.authUrl}?${params}`;
  }

  return NextResponse.json({ authUrl, state, externalRedirect: config.externalRedirect });
}
