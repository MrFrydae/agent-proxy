import { getDb } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/crypto";
import { fetchAnthropicQuota } from "./anthropic";
import { fetchOpenAIQuota } from "./openai";
import { refreshAccessToken } from "@/lib/oauth/tokens";

// ── Intervals ────────────────────────────────────────────────────────────────
const QUOTA_POLL_MS = 15_000; // Quota refresh every 15s
const OAUTH_REFRESH_MS = 60_000; // OAuth check every 60s
const OAUTH_BUFFER_MS = 10 * 60_000; // Refresh tokens 10 min before expiry
const CACHE_FRESHNESS_MS = 15_000; // Skip quota if polled within this window
const MAX_BACKOFF_MS = 60 * 60_000; // 1 hour ceiling
const BASE_BACKOFF_MS = 5 * 60_000; // 5 minute base

// ── Survive HMR / module re-evaluation via globalThis ────────────────────────
interface PollerState {
  quotaTimer: ReturnType<typeof setInterval> | null;
  oauthTimer: ReturnType<typeof setInterval> | null;
  backoff: Map<string, { attempts: number; nextTryAt: number }>;
}

const KEY = "__internHopperPoller" as const;

function getState(): PollerState {
  const gt = globalThis as unknown as Record<string, PollerState>;
  if (!gt[KEY]) {
    gt[KEY] = { quotaTimer: null, oauthTimer: null, backoff: new Map() };
  }
  return gt[KEY];
}

// ── Public API ───────────────────────────────────────────────────────────────

export function startQuotaPoller(): void {
  const state = getState();

  if (!state.quotaTimer) {
    console.warn("[poller] Starting quota polling every %ds", QUOTA_POLL_MS / 1000);
    state.quotaTimer = setInterval(pollAllQuotas, QUOTA_POLL_MS);
    setTimeout(pollAllQuotas, 3_000); // first run after 3 s
  }

  if (!state.oauthTimer) {
    console.warn("[poller] Starting OAuth refresh loop every %ds", OAUTH_REFRESH_MS / 1000);
    state.oauthTimer = setInterval(refreshAllOAuthTokens, OAUTH_REFRESH_MS);
    setTimeout(refreshAllOAuthTokens, 5_000); // first run after 5 s
  }
}

export function stopQuotaPoller(): void {
  const state = getState();
  if (state.quotaTimer) { clearInterval(state.quotaTimer); state.quotaTimer = null; }
  if (state.oauthTimer) { clearInterval(state.oauthTimer); state.oauthTimer = null; }
}

// ── Quota polling ────────────────────────────────────────────────────────────

async function pollAllQuotas(): Promise<void> {
  const state = getState();

  let rows: (typeof accounts.$inferSelect)[];
  try {
    const db = getDb();
    rows = db.select().from(accounts).where(eq(accounts.isActive, 1)).all();
  } catch (err) {
    console.error("[poller:quota] DB read failed:", err);
    return;
  }

  for (const row of rows) {
    // Skip if recently polled
    if (row.quotaLastCheckedAt) {
      const lastChecked = new Date(row.quotaLastCheckedAt).getTime();
      if (Date.now() - lastChecked < CACHE_FRESHNESS_MS) continue;
    }

    // Skip if in backoff
    const bo = state.backoff.get(row.id);
    if (bo && Date.now() < bo.nextTryAt) continue;

    try {
      const apiKey = decrypt(row.apiKey);
      const quota = row.provider === "anthropic"
        ? await fetchAnthropicQuota(apiKey)
        : await fetchOpenAIQuota(apiKey);

      const db = getDb();
      db.update(accounts)
        .set({
          quotaFiveHrPercent: quota.fiveHour.utilization,
          quotaFiveHrResetsAt: quota.fiveHour.resetsAt,
          quotaWeeklyPercent: quota.sevenDay.utilization,
          quotaWeeklyResetsAt: quota.sevenDay.resetsAt,
          quotaLastCheckedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, row.id))
        .run();

      state.backoff.delete(row.id);
    } catch (err) {
      console.error(`[poller:quota] ${row.label}:`, err);
      const prev = state.backoff.get(row.id);
      const attempts = (prev?.attempts ?? 0) + 1;
      const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempts - 1), MAX_BACKOFF_MS);
      state.backoff.set(row.id, { attempts, nextTryAt: Date.now() + delay });
    }
  }
}

// ── OAuth token refresh ──────────────────────────────────────────────────────

async function refreshAllOAuthTokens(): Promise<void> {
  let rows: (typeof accounts.$inferSelect)[];
  try {
    const db = getDb();
    rows = db.select().from(accounts).where(eq(accounts.isActive, 1)).all();
  } catch (err) {
    console.error("[poller:oauth] DB read failed:", err);
    return;
  }

  for (const row of rows) {
    if (row.authMethod !== "oauth") continue;
    if (!row.refreshToken) continue;

    // Refresh if expires within the buffer window, or if no expiry is recorded
    const expiresAt = row.accessTokenExpiresAt
      ? new Date(row.accessTokenExpiresAt).getTime()
      : 0;

    if (expiresAt > Date.now() + OAUTH_BUFFER_MS) continue; // Still fresh

    try {
      await refreshOAuthToken(row);
      console.warn("[poller:oauth] Refreshed token for %s", row.label);
    } catch (err) {
      console.error(`[poller:oauth] Failed to refresh ${row.label}:`, err);
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
}

// ── Single-account manual refresh (used by the refresh button) ───────────────

export async function refreshSingleAccount(accountId: string): Promise<void> {
  const db = getDb();
  let account = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!account) throw new Error("Account not found");

  // Refresh OAuth token if needed
  if (account.authMethod === "oauth" && account.refreshToken) {
    const expiresAt = account.accessTokenExpiresAt
      ? new Date(account.accessTokenExpiresAt).getTime()
      : 0;
    if (expiresAt <= Date.now() + OAUTH_BUFFER_MS) {
      await refreshOAuthToken(account);
      const refreshed = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
      if (!refreshed) throw new Error("Account not found after refresh");
      account = refreshed;
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
    .where(eq(accounts.id, accountId))
    .run();

  getState().backoff.delete(accountId);
}
