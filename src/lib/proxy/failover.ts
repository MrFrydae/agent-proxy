import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import type { Provider } from "@/types";

export interface AccountWithKey {
  id: string;
  provider: Provider;
  label: string;
  decryptedKey: string;
  priority: number;
  quotaFiveHrPercent: number | null;
  quotaWeeklyPercent: number | null;
  authMethod: string;
}

const RETRYABLE_STATUS_CODES = new Set([429, 402, 529, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

export function getOrderedAccounts(provider: Provider): AccountWithKey[] {
  const db = getDb();
  const now = new Date().toISOString();

  const rows = db
    .select()
    .from(accounts)
    .where(and(eq(accounts.provider, provider), eq(accounts.isActive, 1)))
    .orderBy(accounts.priority)
    .all();

  // Filter out rate-limited accounts, then sort by quota utilization
  const available = rows.filter((row) => {
    if (row.rateLimitedUntil && row.rateLimitedUntil > now) return false;
    return true;
  });

  // Sort: prefer accounts with lower max quota utilization
  available.sort((a, b) => {
    const aQuota = Math.max(a.quotaFiveHrPercent ?? 0, a.quotaWeeklyPercent ?? 0);
    const bQuota = Math.max(b.quotaFiveHrPercent ?? 0, b.quotaWeeklyPercent ?? 0);
    // If both have quota data, sort by utilization
    if (aQuota !== bQuota) return aQuota - bQuota;
    // Fall back to priority
    return a.priority - b.priority;
  });

  return available.map((row) => ({
    id: row.id,
    provider: row.provider as Provider,
    label: row.label,
    decryptedKey: decrypt(row.apiKey),
    priority: row.priority,
    quotaFiveHrPercent: row.quotaFiveHrPercent,
    quotaWeeklyPercent: row.quotaWeeklyPercent,
    authMethod: row.authMethod ?? "api_key",
  }));
}

export function markAccountRateLimited(accountId: string, resetSeconds?: number): void {
  const db = getDb();
  const resetMs = (resetSeconds ?? 300) * 1000; // default 5 min
  const until = new Date(Date.now() + resetMs).toISOString();
  db.update(accounts)
    .set({ rateLimitedUntil: until, rateLimitStatus: "rate_limited", updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, accountId))
    .run();
}
