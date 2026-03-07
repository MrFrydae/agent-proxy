import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth/config";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/oauth/pkce";
import { storePending } from "@/lib/oauth/state-store";
import { randomBytes } from "crypto";

function generateState(): string {
  // 64 hex chars from 32 random bytes, matching better-ccflare
  return randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  let authUrl: string;

  if (provider === "anthropic") {
    const redirectUri = "https://console.anthropic.com/oauth/code/callback";
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
    // OpenAI/Codex: must match Codex CLI registered redirect path /auth/callback
    const redirectUri = `${baseUrl}/auth/callback`;
    const url = new URL(config.authUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", config.scopes.join(" "));
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    url.searchParams.set("id_token_add_organizations", "true");
    url.searchParams.set("codex_cli_simplified_flow", "true");
    url.searchParams.set("originator", "pi");
    authUrl = url.toString();
  }

  return NextResponse.json({ authUrl, state, externalRedirect: config.externalRedirect });
}
