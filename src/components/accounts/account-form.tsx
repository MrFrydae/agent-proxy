"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, KeyRound, LogIn } from "lucide-react";
import { toast } from "sonner";

type AuthTab = "api_key" | "oauth";

export function AccountForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("api_key");
  const [provider, setProvider] = useState<string>("anthropic");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  // OAuth state
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [oauthCode, setOauthCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);

  const resetForm = () => {
    setLabel("");
    setApiKey("");
    setOauthState(null);
    setOauthCode("");
    setAwaitingCode(false);
    setLoading(false);
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, label, apiKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create account");
      }
      toast.success("Account added");
      resetForm();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthStart = async () => {
    if (!label.trim()) {
      toast.error("Please enter a label first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, label }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start OAuth");
      }
      const data = await res.json();

      if (data.externalRedirect) {
        // Anthropic: open popup, user will paste code back
        setOauthState(data.state);
        setAwaitingCode(true);
        window.open(data.authUrl, "_blank", "width=600,height=700");
      } else {
        // OpenAI: full page redirect
        window.location.href = data.authUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start OAuth");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthState || !oauthCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/oauth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: oauthCode.trim(), state: oauthState }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to exchange code");
      }
      toast.success("Account added via OAuth");
      resetForm();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete OAuth");
    } finally {
      setLoading(false);
    }
  };

  const providerLabel = provider === "anthropic" ? "Claude" : "OpenAI";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add API Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setAwaitingCode(false); setOauthState(null); }}
              className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (Codex)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              placeholder="e.g. Personal, Work, Backup..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          {/* Auth method tabs */}
          <div className="flex rounded-lg border border-input p-1 gap-1">
            <button
              type="button"
              onClick={() => { setAuthTab("api_key"); setAwaitingCode(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                authTab === "api_key"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              API Key
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("oauth")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                authTab === "oauth"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              OAuth Login
            </button>
          </div>

          {/* API Key form */}
          {authTab === "api_key" && (
            <form onSubmit={handleApiKeySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Account"}
              </Button>
            </form>
          )}

          {/* OAuth flow */}
          {authTab === "oauth" && !awaitingCode && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Sign in with your {providerLabel} account to authorize access.
                {provider === "anthropic" && " You'll be asked to paste a code after authorizing."}
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={loading || !label.trim()}
                onClick={handleOAuthStart}
              >
                {loading ? "Redirecting..." : `Sign in with ${providerLabel}`}
              </Button>
            </div>
          )}

          {/* Anthropic: paste code step */}
          {authTab === "oauth" && awaitingCode && (
            <form onSubmit={handleCodeExchange} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Authorize in the popup window, then copy the code shown and paste it below.
              </p>
              <div className="space-y-2">
                <Label>Authorization Code</Label>
                <Input
                  placeholder="Paste the code from the authorization page..."
                  value={oauthCode}
                  onChange={(e) => setOauthCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !oauthCode.trim()}>
                {loading ? "Completing..." : "Complete Login"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
