export interface StreamUsage {
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

/**
 * Creates a TransformStream that passes through SSE data while extracting
 * usage information from the final events.
 */
export function createStreamingPassthrough(provider: "anthropic" | "openai"): {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  getUsage: () => StreamUsage;
} {
  const usage: StreamUsage = {};
  const decoder = new TextDecoder();
  let buffer = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Pass through immediately
      controller.enqueue(chunk);

      // Parse SSE events for usage data on the side
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (provider === "anthropic") {
            parseAnthropicEvent(parsed, usage);
          } else {
            parseOpenAIEvent(parsed, usage);
          }
        } catch {
          // Not JSON, skip
        }
      }
    },
    flush() {
      // Process remaining buffer
      if (buffer.startsWith("data: ")) {
        const data = buffer.slice(6).trim();
        if (data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            if (provider === "anthropic") {
              parseAnthropicEvent(parsed, usage);
            } else {
              parseOpenAIEvent(parsed, usage);
            }
          } catch {
            // ignore
          }
        }
      }
    },
  });

  return {
    readable: transform.readable,
    writable: transform.writable,
    getUsage: () => usage,
  };
}

function parseAnthropicEvent(event: Record<string, unknown>, usage: StreamUsage) {
  if (event.type === "message_start") {
    const message = event.message as Record<string, unknown> | undefined;
    if (message?.model) usage.model = message.model as string;
    const u = message?.usage as Record<string, number> | undefined;
    if (u?.input_tokens) usage.inputTokens = u.input_tokens;
  }
  if (event.type === "message_delta") {
    const u = event.usage as Record<string, number> | undefined;
    if (u?.output_tokens) usage.outputTokens = u.output_tokens;
  }
}

function parseOpenAIEvent(event: Record<string, unknown>, usage: StreamUsage) {
  if (event.model) usage.model = event.model as string;
  const u = event.usage as Record<string, number> | undefined;
  if (u) {
    if (u.prompt_tokens) usage.inputTokens = u.prompt_tokens;
    if (u.completion_tokens) usage.outputTokens = u.completion_tokens;
  }
}
