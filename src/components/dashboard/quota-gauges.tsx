"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface QuotaAccount {
  id: string;
  provider: string;
  label: string;
  quotaFiveHrPercent: number | null;
  quotaFiveHrResetsAt: string | null;
  quotaWeeklyPercent: number | null;
  quotaWeeklyResetsAt: string | null;
  quotaLastCheckedAt: string | null;
  rateLimitedUntil: string | null;
  rateLimitStatus: string | null;
}

function formatTimeUntil(isoDate: string | null): string {
  if (!isoDate) return "—";
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

export function QuotaGauges() {
  const [accounts, setAccounts] = useState<QuotaAccount[]>([]);

  useEffect(() => {
    const fetchQuota = () => {
      fetch("/api/quota")
        .then((r) => r.json())
        .then(setAccounts)
        .catch(() => {});
    };
    fetchQuota();
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
  }, []);

  if (accounts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Quota Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((account) => (
          <div key={account.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{account.label}</span>
                <Badge variant="outline" className="text-xs">
                  {account.provider}
                </Badge>
                {account.rateLimitStatus === "rate_limited" && (
                  <Badge variant="destructive" className="text-xs">Rate Limited</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Updated {account.quotaLastCheckedAt
                  ? new Date(account.quotaLastCheckedAt).toLocaleTimeString()
                  : "never"}
              </span>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5-hour</span>
                  <span>
                    {account.quotaFiveHrPercent?.toFixed(1) ?? "—"}%
                    {account.quotaFiveHrResetsAt && (
                      <span className="ml-1">resets in {formatTimeUntil(account.quotaFiveHrResetsAt)}</span>
                    )}
                  </span>
                </div>
                <Progress
                  value={account.quotaFiveHrPercent ?? 0}
                  className={`[--progress-height:10px] ${getBarColor(account.quotaFiveHrPercent)}`}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Weekly</span>
                  <span>
                    {account.quotaWeeklyPercent?.toFixed(1) ?? "—"}%
                    {account.quotaWeeklyResetsAt && (
                      <span className="ml-1">resets in {formatTimeUntil(account.quotaWeeklyResetsAt)}</span>
                    )}
                  </span>
                </div>
                <Progress
                  value={account.quotaWeeklyPercent ?? 0}
                  className={`[--progress-height:10px] ${getBarColor(account.quotaWeeklyPercent)}`}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
