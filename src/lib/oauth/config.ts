export interface OAuthProviderConfig {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string[];
  /** Whether this provider redirects to their own domain (requiring manual code paste) */
  externalRedirect: boolean;
}

export function getOAuthConfig(provider: "anthropic" | "openai"): OAuthProviderConfig {
  if (provider === "anthropic") {
    return {
      authUrl: "https://claude.ai/oauth/authorize",
      tokenUrl: "https://console.anthropic.com/v1/oauth/token",
      clientId: process.env.ANTHROPIC_OAUTH_CLIENT_ID || "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
      scopes: ["org:create_api_key", "user:profile", "user:inference"],
      externalRedirect: true,
    };
  }
  return {
    authUrl: "https://auth.openai.com/oauth/authorize",
    tokenUrl: "https://auth.openai.com/oauth/token",
    clientId: process.env.OPENAI_OAUTH_CLIENT_ID || "app_EMoamEEZ73f0CkXaXp7hrann",
    scopes: [
      "openid", "profile", "email", "offline_access",
    ],
    externalRedirect: false,
  };
}
