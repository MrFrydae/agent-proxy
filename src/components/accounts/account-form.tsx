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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AccountForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<string>("anthropic");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      setLabel("");
      setApiKey("");
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add API Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
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
      </DialogContent>
    </Dialog>
  );
}
