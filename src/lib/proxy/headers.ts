import { markAccountRateLimited } from "./failover";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface RateLimitInfo {
  status: string | null;
  resetSeconds: number | null;
  remaining: number | null;
}

export function parseAnthropicHeaders(headers: Headers): RateLimitInfo {
  return {
    status: headers.get("anthropic-ratelimit-unified-status"),
    resetSeconds: parseFloat(headers.get("anthropic-ratelimit-unified-reset") || "") || null,
    remaining: parseInt(headers.get("anthropic-ratelimit-unified-remaining") || "") || null,
  };
}

export function parseOpenAIHeaders(headers: Headers): RateLimitInfo {
  const resetStr = headers.get("x-ratelimit-reset-requests") || headers.get("x-ratelimit-reset-tokens");
  let resetSeconds: number | null = null;
  if (resetStr) {
    // OpenAI returns values like "6m30s" or "2s"
    const match = resetStr.match(/(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/);
    if (match) {
      resetSeconds = (parseInt(match[1] || "0") * 60) + parseFloat(match[2] || "0");
    }
  }
  return {
    status: null,
    resetSeconds,
    remaining: parseInt(headers.get("x-ratelimit-remaining-requests") || "") || null,
  };
}

export function updateAccountFromHeaders(
  accountId: string,
  provider: "anthropic" | "openai",
  responseHeaders: Headers,
  statusCode: number
) {
  const info = provider === "anthropic"
    ? parseAnthropicHeaders(responseHeaders)
    : parseOpenAIHeaders(responseHeaders);

  // Mark rate limited if 429 or status indicates rate limiting
  if (statusCode === 429 || info.status === "rate_limited" || info.status === "blocked") {
    markAccountRateLimited(accountId, info.resetSeconds ?? undefined);
  }

  // Update rate limit status if Anthropic provides it
  if (info.status) {
    const db = getDb();
    db.update(accounts)
      .set({ rateLimitStatus: info.status, updatedAt: new Date().toISOString() })
      .where(eq(accounts.id, accountId))
      .run();
  }
}
