import { startQuotaPoller } from "./poller";

// Module-level side effect: starts the poller once on first import in the server process
let initialized = false;

export function ensureQuotaPoller(): void {
  if (!initialized) {
    initialized = true;
    startQuotaPoller();
  }
}
