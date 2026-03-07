interface PendingAuth {
  provider: "anthropic" | "openai";
  label: string;
  codeVerifier: string;
  createdAt: number;
}

const pending = new Map<string, PendingAuth>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function storePending(state: string, data: PendingAuth): void {
  pending.set(state, data);
  // Cleanup expired entries
  for (const [key, val] of pending) {
    if (Date.now() - val.createdAt > TTL_MS) pending.delete(key);
  }
}

export function consumePending(state: string): PendingAuth | null {
  const data = pending.get(state);
  if (!data) return null;
  pending.delete(state);
  if (Date.now() - data.createdAt > TTL_MS) return null;
  return data;
}
