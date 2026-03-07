import { startQuotaPoller } from "./poller";

const KEY = "__internHopperPollerInit" as const;

export function ensureQuotaPoller(): void {
  const gt = globalThis as unknown as Record<string, boolean>;
  if (gt[KEY]) return;
  gt[KEY] = true;
  startQuotaPoller();
}
