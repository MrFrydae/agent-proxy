import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/crypto";
import { fetchAnthropicQuota } from "./anthropic";
import { fetchOpenAIQuota } from "./openai";
import { refreshAccessToken } from "@/lib/oauth/tokens";
import type { Provider } from "@/types";

const POLL_INTERVAL_MS = 15_000; // 15 seconds
const CACHE_FRESHNESS_MS = 15_000; // Skip if polled within 15s
const MAX_BACKOFF_MS = 60 * 60 * 1000; // 1 hour
const BASE_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

// Track backoff per account
const backoffMap = new Map<string, { attempts: number; nextTryAt: number }>();

let pollerInterval: ReturnType<typeof setInterval> | null = null;

export function startQuotaPoller() {
  if (pollerInterval) return; // Already running
  console.log("[quota-poller] Starting background quota polling");
  pollerInterval = setInterval(pollAllAccounts, POLL_INTERVAL_MS);
  // Initial poll after short delay
  setTimeout(pollAllAccounts, 5000);
}

export function stopQuotaPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}

async function pollAllAccounts() {
  const db = getDb();
  const activeAccounts = db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, 1))
    .all();

  for (const account of activeAccounts) {
    // Check cache freshness
    if (account.quotaLastCheckedAt) {
      const lastChecked = new Date(account.quotaLastCheckedAt).getTime();
      if (Date.now() - lastChecked < CACHE_FRESHNESS_MS) continue;
    }

    // Check backoff
    const backoff = backoffMap.get(account.id);
    if (backoff && Date.now() < backoff.nextTryAt) continue;

    try {
      // Refresh OAuth token if expiring soon
      if (account.authMethod === "oauth" && account.accessTokenExpiresAt) {
        const expiresAt = new Date(account.accessTokenExpiresAt).getTime();
        const bufferMs = 5 * 60 * 1000; // 5 minutes before expiry
        if (Date.now() >= expiresAt - bufferMs) {
          await refreshOAuthToken(account);
          // Re-read the account to get the fresh token
          const refreshed = db.select().from(accounts).where(eq(accounts.id, account.id)).get();
          if (refreshed) Object.assign(account, refreshed);
        }
      }

      const apiKey = decrypt(account.apiKey);
      const quota = account.provider === "anthropic"
        ? await fetchAnthropicQuota(apiKey)
        : await fetchOpenAIQuota(apiKey);

      db.update(accounts)
        .set({
          quotaFiveHrPercent: quota.fiveHour.utilization,
          quotaFiveHrResetsAt: quota.fiveHour.resetsAt,
          quotaWeeklyPercent: quota.sevenDay.utilization,
          quotaWeeklyResetsAt: quota.sevenDay.resetsAt,
          quotaLastCheckedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, account.id))
        .run();

      // Clear backoff on success
      backoffMap.delete(account.id);
    } catch (err) {
      console.error(`[quota-poller] Failed to poll ${account.label}:`, err);
      const current = backoffMap.get(account.id);
      const attempts = (current?.attempts ?? 0) + 1;
      const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempts - 1), MAX_BACKOFF_MS);
      backoffMap.set(account.id, { attempts, nextTryAt: Date.now() + delay });
    }
  }
}

async function refreshOAuthToken(account: typeof accounts.$inferSelect): Promise<void> {
  if (!account.refreshToken) throw new Error("No refresh token");
  const decryptedRefresh = decrypt(account.refreshToken);
  const provider = account.provider as "anthropic" | "openai";
  const tokens = await refreshAccessToken(provider, decryptedRefresh);

  const db = getDb();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  db.update(accounts)
    .set({
      apiKey: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : account.refreshToken,
      accessTokenExpiresAt: expiresAt,
      updatedAt: now,
    })
    .where(eq(accounts.id, account.id))
    .run();

  console.log(`[quota-poller] Refreshed OAuth token for ${account.label}`);
}

export async function refreshSingleAccount(accountId: string): Promise<void> {
  const db = getDb();
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!account) throw new Error("Account not found");

  // Refresh OAuth token if needed
  if (account.authMethod === "oauth" && account.accessTokenExpiresAt) {
    const expiresAt = new Date(account.accessTokenExpiresAt).getTime();
    if (Date.now() >= expiresAt - 5 * 60 * 1000) {
      await refreshOAuthToken(account);
    }
  }

  const freshAccount = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!freshAccount) throw new Error("Account not found");
  const apiKey = decrypt(freshAccount.apiKey);
  const quota = account.provider === "anthropic"
    ? await fetchAnthropicQuota(apiKey)
    : await fetchOpenAIQuota(apiKey);

  db.update(accounts)
    .set({
      quotaFiveHrPercent: quota.fiveHour.utilization,
      quotaFiveHrResetsAt: quota.fiveHour.resetsAt,
      quotaWeeklyPercent: quota.sevenDay.utilization,
      quotaWeeklyResetsAt: quota.sevenDay.resetsAt,
      quotaLastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(accounts.id, accountId))
    .run();

  backoffMap.delete(accountId);
}
