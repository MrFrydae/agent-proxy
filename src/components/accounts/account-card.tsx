"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { GripVertical, Pencil, RefreshCw, Pause, Play, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import type { AccountPublic } from "@/types";

interface AccountCardProps {
  account: AccountPublic;
  onUpdate: () => void;
  onDelete: () => void;
  isReordering?: boolean;
  isFirst?: boolean;
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLElement>;
    listeners: Record<string, Function> | undefined;
  };
}

function formatTimeUntil(isoDate: string | null): string {
  if (!isoDate) return "";
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return "now";
  const totalMins = Math.floor(ms / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}hr`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

function formatResetTime(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `Resets ${time} today`;
  }
  const month = date.toLocaleDateString([], { month: "long" });
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd"
    : "th";
  return `Resets ${time} on ${month} ${day}${suffix}`;
}

function formatWeeklyResetTime(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const month = date.toLocaleDateString([], { month: "long" });
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd"
    : "th";
  return `Resets ${time} on ${month} ${day}${suffix}`;
}

export function AccountCard({
  account, onUpdate, onDelete, isReordering = false, isFirst = false, dragHandleProps,
}: AccountCardProps): React.JSX.Element {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newLabel, setNewLabel] = useState(account.label);

  const handleRename = async (): Promise<void> => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === account.label) {
      setRenameOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Account renamed");
      setRenameOpen(false);
      onUpdate();
    } catch {
      toast.error("Failed to rename account");
    }
  };

  const handleToggle = async (): Promise<void> => {
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: account.isActive === 1 ? 0 : 1 }),
    });
    onUpdate();
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirm(`Delete account "${account.label}"?`)) return;
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    toast.success("Account deleted");
    onDelete();
  };

  const handleRefreshQuota = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/quota/${account.id}/refresh`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Quota refreshed");
      onUpdate();
    } catch {
      toast.error("Failed to refresh quota");
    }
  };

  const isActive = account.isActive === 1;

  return (
    <Card className={cn(
      "transition-colors",
      isFirst && "shadow-[0_0px_16px_-2px_oklch(0.75_0.183_55/0.5),0_0px_28px_-4px_oklch(0.75_0.183_55/0.25)]"
    )}>
      <CardContent className="flex items-start gap-3 px-6 py-4">
        {isReordering && dragHandleProps ? (
          <div
            className="mt-1 cursor-grab touch-none rounded p-0.5 hover:bg-muted"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : null}
        <div className="flex-1 space-y-3">
          {/* Top row: name + badges left, action icons right */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{account.label}</span>
              {isFirst && <Badge variant="default">Active</Badge>}
              {account.authMethod === "oauth" && (
                <Badge variant="outline" className="text-primary border-primary/30">OAuth</Badge>
              )}
              {account.rateLimitStatus === "rate_limited" && (
                <Badge variant="destructive">Rate Limited</Badge>
              )}
            </div>
            <div className={cn(
              "flex items-center gap-1",
              isReordering && "opacity-30 pointer-events-none"
            )}>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setNewLabel(account.label); setRenameOpen(true); }} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefreshQuota} title="Refresh Quota">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggle} title={isActive ? "Pause" : "Resume"}>
                {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quota bars */}
          {(account.quotaFiveHrPercent !== null || account.quotaWeeklyPercent !== null) && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Usage (5-hour)</span>
                  <span>{account.quotaFiveHrPercent != null ? Math.round(account.quotaFiveHrPercent) : "N/A"}%</span>
                </div>
                <Progress
                  value={account.quotaFiveHrPercent ?? 0}
                  className="[--progress-height:6px]"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{account.quotaFiveHrResetsAt ? `${formatTimeUntil(account.quotaFiveHrResetsAt)} until refresh` : ""}</span>
                  <span>{formatResetTime(account.quotaFiveHrResetsAt)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Usage (Weekly)</span>
                  <span>{account.quotaWeeklyPercent != null ? Math.round(account.quotaWeeklyPercent) : "N/A"}%</span>
                </div>
                <Progress
                  value={account.quotaWeeklyPercent ?? 0}
                  className="[--progress-height:6px]"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{account.quotaWeeklyResetsAt ? `${formatTimeUntil(account.quotaWeeklyResetsAt)} until refresh` : ""}</span>
                  <span>{formatWeeklyResetTime(account.quotaWeeklyResetsAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
          </DialogHeader>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleRename(); }}
            placeholder="Account name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
