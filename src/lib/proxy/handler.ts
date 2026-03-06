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

interface ProxyResult {
  response: Response;
  accountUsed: string;
  isFailover: boolean;
}

export async function proxyRequest(
  provider: Provider,
  upstreamPath: string,
  incomingRequest: Request,
): Promise<Response> {
  ensureQuotaPoller();
  const orderedAccounts = getOrderedAccounts(provider);

  if (orderedAccounts.length === 0) {
    return new Response(
      JSON.stringify({ error: { type: "proxy_error", message: "No active accounts available for " + provider } }),
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

  let lastError: Response | null = null;

  for (let i = 0; i < orderedAccounts.length; i++) {
    const account = orderedAccounts[i];
    const isFailover = i > 0;
    const startTime = Date.now();

    try {
      const result = await makeUpstreamRequest(
        provider,
        upstreamPath,
        account,
        bodyBytes,
        incomingRequest.headers,
        isStreaming,
      );

      const latencyMs = Date.now() - startTime;

      // Update rate limit info from headers
      updateAccountFromHeaders(account.id, provider, result.headers, result.status);

      // If retryable error and more accounts available, try next
      if (isRetryableStatus(result.status) && i < orderedAccounts.length - 1) {
        markAccountRateLimited(account.id, 300);
        logRequest(provider, account.id, incomingRequest.method, upstreamPath, model, result.status, null, null, latencyMs, isFailover ? 1 : 0, `Retryable error: ${result.status}`);
        lastError = result;
        continue;
      }

      if (isStreaming && result.ok && result.body) {
        return handleStreamingResponse(result, provider, account.id, incomingRequest.method, upstreamPath, model, latencyMs, isFailover);
      }

      // Non-streaming: read body for usage, log, and return
      const responseBody = await result.arrayBuffer();
      let inputTokens: number | null = null;
      let outputTokens: number | null = null;

      try {
        const parsed = JSON.parse(new TextDecoder().decode(responseBody));
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

      logRequest(provider, account.id, incomingRequest.method, upstreamPath, model, result.status, inputTokens, outputTokens, latencyMs, isFailover ? 1 : 0, result.ok ? null : "Error: " + result.status);

      // Forward response with original headers
      const responseHeaders = new Headers();
      result.headers.forEach((value, key) => {
        // Skip hop-by-hop headers
        if (!["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      return new Response(responseBody, {
        status: result.status,
        headers: responseHeaders,
      });
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      logRequest(provider, account.id, incomingRequest.method, upstreamPath, model, 0, null, null, latencyMs, isFailover ? 1 : 0, errMsg);

      if (i < orderedAccounts.length - 1) {
        continue; // Try next account
      }

      return new Response(
        JSON.stringify({ error: { type: "proxy_error", message: "All accounts failed. Last error: " + errMsg } }),
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

async function makeUpstreamRequest(
  provider: Provider,
  path: string,
  account: AccountWithKey,
  body: ArrayBuffer,
  incomingHeaders: Headers,
  _isStreaming: boolean,
): Promise<Response> {
  const url = `${UPSTREAM_URLS[provider]}${path}`;
  const headers = new Headers();

  // Copy relevant headers from incoming request
  incomingHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "authorization" &&
      lower !== "x-api-key" &&
      lower !== "connection" &&
      !lower.startsWith("cf-")
    ) {
      headers.set(key, value);
    }
  });

  // Set auth headers per provider
  if (provider === "anthropic") {
    if (account.authMethod === "oauth") {
      headers.set("Authorization", `Bearer ${account.decryptedKey}`);
    } else {
      headers.set("x-api-key", account.decryptedKey);
    }
    if (!headers.has("anthropic-version")) {
      headers.set("anthropic-version", "2023-06-01");
    }
  } else {
    headers.set("Authorization", `Bearer ${account.decryptedKey}`);
  }

  return fetch(url, {
    method: "POST",
    headers,
    body,
  });
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
): Response {
  const { readable, writable, getUsage } = createStreamingPassthrough(provider);

  // Pipe upstream to transform stream, log when done
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
    );
  }).catch(() => {
    // Stream error, still log
    logRequest(provider, accountId, method, path, model, upstreamResponse.status, null, null, startLatency, isFailover ? 1 : 0, "Stream error");
  });

  // Forward headers
  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new Response(readable, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
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
) {
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
        createdAt: new Date().toISOString(),
      })
      .run();
  } catch {
    // Don't let logging failures break the proxy
    console.error("Failed to log request");
  }
}
