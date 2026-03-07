import type { QuotaInfo } from "@/types";

const CHATGPT_BASE_URL = process.env.CHATGPT_BASE_URL || "https://chatgpt.com";

/**
 * Fetch Codex/OpenAI quota from the ChatGPT wham/usage endpoint.
 *
 * Response shape (real):
 * {
 *   "rate_limit": {
 *     "primary_window":   { "used_percent": 42.5, "reset_at": 1709712000 },
 *     "secondary_window": { "used_percent": 18.3, "reset_at": 1710316800 }
 *   }
 * }
 *
 * - `used_percent` is 0-100
 * - `reset_at` is epoch **seconds** (not milliseconds)
 */
export async function fetchOpenAIQuota(apiKey: string): Promise<QuotaInfo> {
  const res = await fetch(`${CHATGPT_BASE_URL}/backend-api/wham/usage`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`OpenAI quota API returned ${res.status}`);
  }

  const data = await res.json();

  const primary = data?.rate_limit?.primary_window;
  const secondary = data?.rate_limit?.secondary_window;

  return {
    fiveHour: {
      utilization: typeof primary?.used_percent === "number"
        ? Math.max(0, Math.min(100, primary.used_percent))
        : 0,
      resetsAt: typeof primary?.reset_at === "number"
        ? new Date(primary.reset_at * 1000).toISOString()
        : null,
    },
    sevenDay: {
      utilization: typeof secondary?.used_percent === "number"
        ? Math.max(0, Math.min(100, secondary.used_percent))
        : 0,
      resetsAt: typeof secondary?.reset_at === "number"
        ? new Date(secondary.reset_at * 1000).toISOString()
        : null,
    },
  };
}
