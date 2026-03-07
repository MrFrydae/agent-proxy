import { getOrderedAccounts, isRetryableStatus, markAccountRateLimited, type AccountWithKey } from "./failover";
import { createStreamingPassthrough } from "./streaming";
import { updateAccountFromHeaders } from "./headers";
import { ensureQuotaPoller } from "@/lib/quota/init";
import { getDb } from "@/lib/db";
import { requestLogs } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import type { Provider } from "@/types";

const UPSTREAM_URLS: Record<Provider, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
};

export async function proxyRequest(
  provider: Provider,
  upstreamPath: string,
  incomingRequest: Request,
): Promise<Response> {
  ensureQuotaPoller();
  const orderedAccounts = getOrderedAccounts(provider);

  if (orderedAccounts.length === 0) {
    return new Response(
      JSON.stringify({ error: { type: "proxy_error", message: `No active accounts available for ${provider}` } }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  // Clone the body once for potential retries
  const bodyBytes = await incomingRequest.arrayBuffer();
  const bodyForParsing = new Uint8Array(bodyBytes);

  // Extract model from request body if JSON
  let model: string | null = null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bodyForParsing));
    model = parsed.model || null;
  } catch {
    // Not JSON body, that's fine
  }

  const isStreaming = (() => {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(bodyForParsing));
      return parsed.stream === true;
    } catch {
      return false;
    }
  })();

  // Capture request details for logging
  const bodyText = new TextDecoder().decode(bodyForParsing);
  const incomingHeadersJson = JSON.stringify(maskHeaders(incomingRequest.headers));

  let lastError: Response | null = null;

  for (let i = 0; i < orderedAccounts.length; i++) {
    const account = orderedAccounts[i];
    const isFailover = i > 0;
    const startTime = Date.now();

    try {
      const upstream = await makeUpstreamRequest(
        provider,
        upstreamPath,
        account,
        bodyBytes,
        incomingRequest.headers,
      );

      const latencyMs = Date.now() - startTime;
      const details: LogDetails = {
        requestBody: truncateBody(bodyText),
        requestHeaders: incomingHeadersJson,
        upstreamUrl: upstream.url,
        proxyHeaders: JSON.stringify(maskHeaders(upstream.headers)),
      };

      // Update rate limit info from headers
      updateAccountFromHeaders(account.id, provider, upstream.response.headers, upstream.response.status);

      // If retryable error and more accounts available, try next
      if (isRetryableStatus(upstream.response.status) && i < orderedAccounts.length - 1) {
        markAccountRateLimited(account.id, 300);
        logRequest(
          provider, account.id, incomingRequest.method, upstreamPath, model,
          upstream.response.status, null, null, latencyMs, isFailover ? 1 : 0,
          `Retryable error: ${upstream.response.status}`, details,
        );
        lastError = upstream.response;
        continue;
      }

      if (isStreaming && upstream.response.ok && upstream.response.body) {
        return handleStreamingResponse(
          upstream.response, provider, account.id, incomingRequest.method,
          upstreamPath, model, latencyMs, isFailover, details,
        );
      }

      // Non-streaming: read body for usage, log, and return
      const responseBody = await upstream.response.arrayBuffer();
      const responseText = new TextDecoder().decode(responseBody);
      let inputTokens: number | null = null;
      let outputTokens: number | null = null;

      try {
        const parsed = JSON.parse(responseText);
        if (provider === "anthropic" && parsed.usage) {
          inputTokens = parsed.usage.input_tokens ?? null;
          outputTokens = parsed.usage.output_tokens ?? null;
          if (!model && parsed.model) model = parsed.model;
        } else if (provider === "openai" && parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? null;
          outputTokens = parsed.usage.completion_tokens ?? null;
          if (!model && parsed.model) model = parsed.model;
        }
      } catch {
        // Non-JSON response
      }

      details.responseBody = truncateBody(responseText);

      logRequest(
        provider, account.id, incomingRequest.method, upstreamPath, model,
        upstream.response.status, inputTokens, outputTokens, latencyMs,
        isFailover ? 1 : 0, upstream.response.ok ? null : `Error: ${upstream.response.status}`, details,
      );

      // Forward response with original headers
      const responseHeaders = new Headers();
      upstream.response.headers.forEach((value, key) => {
        // Skip hop-by-hop and encoding headers (body is already decompressed by fetch)
        if (!["transfer-encoding", "connection", "keep-alive", "content-encoding", "content-length"].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      return new Response(responseBody, {
        status: upstream.response.status,
        headers: responseHeaders,
      });
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      logRequest(
        provider, account.id, incomingRequest.method, upstreamPath, model,
        0, null, null, latencyMs, isFailover ? 1 : 0, errMsg, {
          requestBody: truncateBody(bodyText),
          requestHeaders: incomingHeadersJson,
        },
      );

      if (i < orderedAccounts.length - 1) {
        continue; // Try next account
      }

      return new Response(
        JSON.stringify({ error: { type: "proxy_error", message: `All accounts failed. Last error: ${errMsg}` } }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }
  }

  // All accounts exhausted
  if (lastError) {
    const body = await lastError.arrayBuffer();
    return new Response(body, {
      status: lastError.status,
      headers: lastError.headers,
    });
  }

  return new Response(
    JSON.stringify({ error: { type: "proxy_error", message: "All accounts exhausted" } }),
    { status: 503, headers: { "content-type": "application/json" } },
  );
}

interface UpstreamResult {
  response: Response;
  url: string;
  headers: Headers;
}

async function makeUpstreamRequest(
  provider: Provider,
  path: string,
  account: AccountWithKey,
  body: ArrayBuffer,
  incomingHeaders: Headers,
): Promise<UpstreamResult> {
  const url = `${UPSTREAM_URLS[provider]}${path}`;
  const headers = new Headers();

  // Copy relevant headers from incoming request
  incomingHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "authorization" &&
      lower !== "x-api-key" &&
      lower !== "accept-encoding" &&
      !lower.startsWith("cf-")
    ) {
      headers.set(key, value);
    }
  });

  // Ensure keep-alive for upstream connection
  headers.set("connection", "keep-alive");

  // Set auth headers per provider
  if (provider === "anthropic") {
    if (account.authMethod === "oauth") {
      headers.set("Authorization", `Bearer ${account.decryptedKey}`);
      // Anthropic requires this beta flag for OAuth token requests
      const existing = headers.get("anthropic-beta");
      const betaFlags = existing ? `${existing},oauth-2025-04-20` : "oauth-2025-04-20";
      headers.set("anthropic-beta", betaFlags);
    } else {
      headers.set("x-api-key", account.decryptedKey);
    }
    if (!headers.has("anthropic-version")) {
      headers.set("anthropic-version", "2023-06-01");
    }
  } else {
    headers.set("Authorization", `Bearer ${account.decryptedKey}`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  return { response, url, headers };
}

function handleStreamingResponse(
  upstreamResponse: Response,
  provider: Provider,
  accountId: string,
  method: string,
  path: string,
  model: string | null,
  startLatency: number,
  isFailover: boolean,
  details?: LogDetails,
): Response {
  const { readable, writable, getUsage } = createStreamingPassthrough(provider);

  // Pipe upstream to transform stream, log when done
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- caller verifies body exists
  const upstreamBody = upstreamResponse.body!;
  upstreamBody.pipeTo(writable).then(() => {
    const usage = getUsage();
    if (usage.model && !model) model = usage.model;
    logRequest(
      provider,
      accountId,
      method,
      path,
      model,
      upstreamResponse.status,
      usage.inputTokens ?? null,
      usage.outputTokens ?? null,
      startLatency,
      isFailover ? 1 : 0,
      null,
      { ...details, responseBody: "[streaming response]" },
    );
  }).catch(() => {
    // Stream error, still log
    logRequest(provider, accountId, method, path, model, upstreamResponse.status, null, null, startLatency, isFailover ? 1 : 0, "Stream error", details);
  });

  // Forward headers (strip encoding headers since we don't forward accept-encoding)
  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!["transfer-encoding", "connection", "keep-alive", "content-encoding", "content-length"].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new Response(readable, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

interface LogDetails {
  requestBody?: string | null;
  requestHeaders?: string | null;
  upstreamUrl?: string | null;
  proxyHeaders?: string | null;
  responseBody?: string | null;
}

function logRequest(
  provider: string,
  accountId: string,
  method: string,
  path: string,
  model: string | null,
  statusCode: number,
  inputTokens: number | null,
  outputTokens: number | null,
  latencyMs: number,
  isFailover: number,
  errorMessage: string | null,
  details?: LogDetails,
): void {
  try {
    const db = getDb();
    db.insert(requestLogs)
      .values({
        id: nanoid(),
        provider,
        accountId,
        method,
        path,
        model,
        statusCode,
        inputTokens,
        outputTokens,
        latencyMs,
        isFailover,
        errorMessage,
        requestBody: details?.requestBody ?? null,
        requestHeaders: details?.requestHeaders ?? null,
        upstreamUrl: details?.upstreamUrl ?? null,
        proxyHeaders: details?.proxyHeaders ?? null,
        responseBody: details?.responseBody ?? null,
        createdAt: new Date().toISOString(),
      })
      .run();
  } catch {
    // Don't let logging failures break the proxy
    console.error("Failed to log request");
  }
}

/** Mask sensitive header values */
function maskHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "authorization" || lower === "x-api-key") {
      result[key] = value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : "***";
    } else {
      result[key] = value;
    }
  });
  return result;
}

/** Truncate body to avoid bloating the DB (max 32KB) */
function truncateBody(body: string): string {
  const maxLen = 32768;
  if (body.length <= maxLen) return body;
  return `${body.slice(0, maxLen)}\n... [truncated, ${body.length} bytes total]`;
}
