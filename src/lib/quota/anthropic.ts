import type { QuotaInfo } from "@/types";

export async function fetchAnthropicQuota(apiKey: string): Promise<QuotaInfo> {
  const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "anthropic-beta": "oauth-2025-04-20",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Anthropic quota API returned ${res.status}`);
  }

  const data = await res.json();

  return {
    fiveHour: {
      utilization: data.five_hour?.utilization ?? 0,
      resetsAt: data.five_hour?.resets_at ?? null,
    },
    sevenDay: {
      utilization: data.seven_day?.utilization ?? 0,
      resetsAt: data.seven_day?.resets_at ?? null,
    },
  };
}
