"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

interface ToolConfig {
  id: "claude" | "codex";
  name: string;
  description: string;
  envVars: { key: string; value: string }[];
}

const tools: ToolConfig[] = [
  {
    id: "claude",
    name: "Claude",
    description: "Anthropic desktop app with proxy routing",
    envVars: [
      { key: "ANTHROPIC_BASE_URL", value: "http://localhost:1455/api/v1/anthropic" },
      { key: "ANTHROPIC_API_KEY", value: "sk-proxy-intern-hopper" },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    description: "OpenAI desktop app with proxy routing",
    envVars: [
      { key: "OPENAI_BASE_URL", value: "http://localhost:1455/api/v1/openai" },
      { key: "OPENAI_API_KEY", value: "sk-proxy-intern-hopper" },
    ],
  },
];

type LaunchState = "idle" | "launching" | "launched" | "error";

interface InstallStatus {
  platform: string;
  tools: Record<string, { appName: string; installed: boolean }>;
}

function ToolCard({
  tool,
  installed,
}: {
  tool: ToolConfig;
  installed: boolean | null;
}): React.JSX.Element {
  const [state, setState] = useState<LaunchState>("idle");

  const handleLaunch = async (): Promise<void> => {
    setState("launching");
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: tool.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Launch failed");
      }
      setState("launched");
      toast.success(`${tool.name} launched`);
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      setState("error");
      toast.error(err instanceof Error ? err.message : "Failed to launch");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
          {installed === true && (
            <Badge variant="default" className="text-xs">Installed</Badge>
          )}
          {installed === false && (
            <Badge variant="destructive" className="text-xs">Not Found</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{tool.description}</p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Injected environment variables
          </label>
          <div className="rounded-md border bg-muted p-3 space-y-1">
            {tool.envVars.map((ev) => (
              <div key={ev.key} className="text-xs font-mono">
                <span className="text-primary">{ev.key}</span>
                <span className="text-muted-foreground">=</span>
                {ev.value}
              </div>
            ))}
          </div>
        </div>
        <Button
          className="w-full"
          onClick={handleLaunch}
          disabled={state === "launching" || installed === false}
        >
          <Rocket className="mr-2 h-4 w-4" />
          {state === "idle" && `Launch ${tool.name}`}
          {state === "launching" && "Launching\u2026"}
          {state === "launched" && "Launched!"}
          {state === "error" && "Failed \u2014 Try Again"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LaunchPage(): React.JSX.Element {
  const [status, setStatus] = useState<InstallStatus | null>(null);

  useEffect(() => {
    fetch("/api/launch")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  return (
    <div>
      <Header
        title="Launch"
        subtitle="Open desktop apps with proxy routing"
      />
      <div className="grid gap-6 p-6 md:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            installed={status?.tools[tool.id]?.installed ?? null}
          />
        ))}
      </div>
    </div>
  );
}
