"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

function CopyableUrl({ label, url }: { label: string; url: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono">
          {url}
        </code>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage(): React.JSX.Element {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return (
    <div>
      <Header title="Settings" subtitle="Configure your proxy endpoints and preferences" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Proxy Base URLs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Point your API clients to these URLs instead of the provider&apos;s API.
              The proxy will inject your configured API key and handle failover automatically.
            </p>
            <CopyableUrl
              label="Anthropic (Claude)"
              url={`${baseUrl}/api/v1/anthropic`}
            />
            <CopyableUrl
              label="OpenAI (Codex)"
              url={`${baseUrl}/api/v1/openai`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Encryption</span>
              <Badge variant="default">Active (AES-256-GCM)</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-sm font-mono text-muted-foreground">codex-flare.db</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Quota Polling</span>
              <Badge variant="default">Every ~15s</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Usage Example</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              For Anthropic, set your base URL and remove the API key header — the proxy injects it:
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs font-mono">
{`curl ${baseUrl}/api/v1/anthropic/v1/messages \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
