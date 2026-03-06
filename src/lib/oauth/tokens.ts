import { getOAuthConfig } from "./config";

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(
  provider: "anthropic" | "openai",
  code: string,
  codeVerifier: string,
  redirectUri: string,
  state?: string,
): Promise<TokenResponse> {
  const config = getOAuthConfig(provider);
  const params: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    client_id: config.clientId,
    redirect_uri: redirectUri,
  };

  // Anthropic requires state in the token exchange body
  if (provider === "anthropic" && state) {
    params.state = state;
  }

  // Anthropic expects JSON; OpenAI expects form-encoded
  const isJson = provider === "anthropic";
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": isJson ? "application/json" : "application/x-www-form-urlencoded",
    },
    body: isJson ? JSON.stringify(params) : new URLSearchParams(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  provider: "anthropic" | "openai",
  refreshToken: string,
): Promise<TokenResponse> {
  const config = getOAuthConfig(provider);
  const params: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
  };

  // Anthropic expects JSON; OpenAI expects form-encoded
  const isJson = provider === "anthropic";
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": isJson ? "application/json" : "application/x-www-form-urlencoded",
    },
    body: isJson ? JSON.stringify(params) : new URLSearchParams(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}
