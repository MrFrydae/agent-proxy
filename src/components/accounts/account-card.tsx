"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { GripVertical, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { AccountPublic } from "@/types";

interface AccountCardProps {
  account: AccountPublic;
  onUpdate: () => void;
  onDelete: () => void;
}

function formatTimeUntil(isoDate: string | null): string {
  if (!isoDate) return "";
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return "now";
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

function getBarColor(percent: number | null): string {
  if (percent === null) return "";
  if (percent >= 90) return "[&>div]:bg-red-500";
  if (percent >= 70) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-green-500";
}

export function AccountCard({ account, onUpdate, onDelete }: AccountCardProps) {
  const handleToggle = async (checked: boolean) => {
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: checked }),
    });
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete account "${account.label}"?`)) return;
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    toast.success("Account deleted");
    onDelete();
  };

  const handleRefreshQuota = async () => {
    try {
      const res = await fetch(`/api/quota/${account.id}/refresh`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Quota refreshed");
      onUpdate();
    } catch {
      toast.error("Failed to refresh quota");
    }
  };

  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardContent className="flex items-start gap-3 p-4">
        <GripVertical className="mt-1 h-4 w-4 cursor-grab text-muted-foreground" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{account.label}</span>
              <Badge variant="outline">{account.provider}</Badge>
              <Badge variant="secondary">#{account.priority}</Badge>
              {account.rateLimitStatus === "rate_limited" && (
                <Badge variant="destructive">Rate Limited</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                ****{account.apiKeyLast4}
              </span>
              <Switch
                checked={account.isActive === 1}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>

          {/* Quota bars */}
          {(account.quotaFiveHrPercent !== null || account.quotaWeeklyPercent !== null) && (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5-hour</span>
                  <span>
                    {account.quotaFiveHrPercent?.toFixed(1) ?? "—"}%
                    {account.quotaFiveHrResetsAt && (
                      <span className="ml-1">({formatTimeUntil(account.quotaFiveHrResetsAt)})</span>
                    )}
                  </span>
                </div>
                <Progress
                  value={account.quotaFiveHrPercent ?? 0}
                  className={`h-1.5 ${getBarColor(account.quotaFiveHrPercent)}`}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Weekly</span>
                  <span>
                    {account.quotaWeeklyPercent?.toFixed(1) ?? "—"}%
                    {account.quotaWeeklyResetsAt && (
                      <span className="ml-1">({formatTimeUntil(account.quotaWeeklyResetsAt)})</span>
                    )}
                  </span>
                </div>
                <Progress
                  value={account.quotaWeeklyPercent ?? 0}
                  className={`h-1.5 ${getBarColor(account.quotaWeeklyPercent)}`}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefreshQuota}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh Quota
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
