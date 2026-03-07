"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import React, { useEffect, useState } from "react";

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
  if (!isoDate) return "No reset data available";
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
  if (!isoDate) return "No reset data available";
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

export function QuotaGauges(): React.JSX.Element | null {
  const [accounts, setAccounts] = useState<QuotaAccount[]>([]);

  useEffect(() => {
    const fetchQuota = (): void => {
      fetch("/api/quota")
        .then((r) => r.json())
        .then(setAccounts)
        .catch(() => {});
    };
    fetchQuota();
    const interval = setInterval(fetchQuota, 15000);
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
          <div key={account.id} className="space-y-3">
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
                  <span>{account.quotaFiveHrResetsAt ? `${formatTimeUntil(account.quotaFiveHrResetsAt)} until refresh` : "Data unavailable"}</span>
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
                  <span>{account.quotaWeeklyResetsAt ? `${formatTimeUntil(account.quotaWeeklyResetsAt)} until refresh` : "Data unavailable"}</span>
                  <span>{formatWeeklyResetTime(account.quotaWeeklyResetsAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
