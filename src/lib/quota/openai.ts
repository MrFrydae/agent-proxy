import type { QuotaInfo } from "@/types";

const CHATGPT_BASE_URL = process.env.CHATGPT_BASE_URL || "https://chatgpt.com";

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

  // The response contains primary (5hr) and secondary (weekly) windows
  // Adapt to our QuotaInfo shape
  const primary = data.primary || data.five_hour || {};
  const secondary = data.secondary || data.seven_day || {};

  return {
    fiveHour: {
      utilization: primary.usedPercent ?? primary.utilization ?? 0,
      resetsAt: primary.resetAt ?? primary.resets_at ?? null,
    },
    sevenDay: {
      utilization: secondary.usedPercent ?? secondary.utilization ?? 0,
      resetsAt: secondary.resetAt ?? secondary.resets_at ?? null,
    },
  };
}
