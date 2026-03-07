"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { QuotaGauges } from "@/components/dashboard/quota-gauges";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import type { RequestLog, UsageStats } from "@/types";

interface UsageResponse {
  stats: UsageStats;
  dailyStats: { date: string; count: number; tokens: number }[];
}

export default function DashboardPage(): React.JSX.Element {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [recentLogs, setRecentLogs] = useState<RequestLog[]>([]);

  useEffect(() => {
    const fetchData = (): void => {
      fetch("/api/usage?days=7")
        .then((r) => r.json())
        .then(setUsage)
        .catch(() => {});

      fetch("/api/logs?limit=10")
        .then((r) => r.json())
        .then((r) => setRecentLogs(r.data || []))
        .catch(() => {});
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of your proxy activity and quotas" />
      <div className="space-y-6 p-6">
        <StatsCards
          totalRequests={usage?.stats.totalRequests ?? 0}
          activeAccounts={usage?.stats.activeAccounts ?? 0}
          failoverEvents={usage?.stats.failoverEvents ?? 0}
          errorRate={usage?.stats.errorRate ?? 0}
        />
        <QuotaGauges />
        <div className="grid gap-6 lg:grid-cols-2">
          <UsageChart data={usage?.dailyStats ?? []} />
          <RecentActivity logs={recentLogs} />
        </div>
      </div>
    </div>
  );
}
