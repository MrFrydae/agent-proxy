import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { fetchAnthropicQuota } from "./anthropic";
import { fetchOpenAIQuota } from "./openai";
import type { Provider } from "@/types";

const POLL_INTERVAL_MS = 75_000; // ~75 seconds (between 60-90)
const CACHE_FRESHNESS_MS = 90_000; // Skip if polled within 90s
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

export async function refreshSingleAccount(accountId: string): Promise<void> {
  const db = getDb();
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!account) throw new Error("Account not found");

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
    .where(eq(accounts.id, accountId))
    .run();

  backoffMap.delete(accountId);
}
