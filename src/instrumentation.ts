export async function register(): Promise<void> {
  // Only run on the Node.js server runtime, not Edge or client
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureQuotaPoller } = await import("@/lib/quota/init");
    ensureQuotaPoller();
  }
}
